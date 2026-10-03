'use strict';
// Reproduzierbare lokale Lizenzprüfung. Keine Installation und keine Hardwarezugriffe.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const ui = path.join(root, 'components/ui');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const env = { ...process.env, NODE_PATH: [path.join(root, '.work/build-tools'), path.join(root, '.work/admission-parser-test/node_modules')].join(path.delimiter) };
const bin = path.join(root, '.work/license-check-bin');
fs.mkdirSync(bin, { recursive: true });
if (process.platform === 'win32') {
  const tsc = path.join(root, '.work/build-tools/typescript/lib/tsc.js');
  if (!fs.existsSync(tsc)) throw new Error('Prepared TypeScript compiler unavailable');
  fs.writeFileSync(path.join(bin, 'tsc.cmd'), '@echo off\r\n"' + process.execPath + '" "' + tsc + '" %*\r\n');
}
env.PATH = [bin, 'C:\\Program Files\\Git\\usr\\bin', env.PATH || env.Path || ''].join(path.delimiter);
const jobs = [
  ['central-license.tap', root, ['--test', '--test-reporter=tap', 'components/admin/test/eos-license-core.test.cjs', 'components/admin/test/eos-license-service.test.cjs', 'components/admin/test/eos-license-client.test.cjs', 'components/admin/test/eos-license-http.test.cjs', 'components/admin/test/eos-license-trust.test.cjs', 'components/ui/test/eos-license-entitlements.test.cjs', 'tests/system/first-start-license.test.cjs', 'tests/onboarding/configuration.test.cjs']],
  ['storage-power.txt', ui, ['scripts/verify-storage-license-power-profiles.js']],
  ['storage-counts.txt', ui, ['scripts/verify-stable-1.0.8-storage-licenses.cjs']],
  ['edition-contract.txt', ui, ['scripts/verify-license-editions.js']],
  ['runtime-mirror.txt', ui, ['scripts/build-ts-runtime-executables.js', '--check']],
  ['parallel-mirror.txt', ui, ['scripts/build-ts-runtime-mirrors.js', '--check']],
  ['source-syntax.txt', ui, ['scripts/verify-ts-source-syntax.js']],
  ['main-types.txt', ui, ['scripts/verify-ts-main-runtime-typing.js']],
  ['appcenter-types.txt', ui, ['scripts/verify-ts-ems-apps-runtime-typing.js']],
  ['role-boundary.tap', ui, ['--test', '--test-reporter=tap', 'test/eos-account-roles.test.cjs', 'test/eos-sse-authorization.test.cjs', 'test/eos-service-worker-auth.test.cjs']],
  ['documentation.txt', ui, ['scripts/verify-code-documentation.cjs']],
  ['artifact.txt', ui, ['scripts/verify-release-artifact.js']],
];
const reportFile = path.join(__dirname, 'verification.json');
const previous = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')).results || [] : [];
const selection = process.argv.slice(2);
const selected = name => selection.length === 0 || selection.includes(name);
const startedAt = new Date().toISOString(), results = previous.filter(row => !selected(row.name));
for (const [name, cwd, args] of jobs) {
  if (!selected(name)) continue;
  const started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error.message + '\n' : '');
  fs.writeFileSync(path.join(__dirname, name), output);
  results.push({ name, cwd: path.relative(root, cwd).replace(/\\/g, '/') || '.', command: ['node', ...args], exitCode: result.status,
    signal: result.signal, durationMs: Date.now() - started, sha256: hash(output), tests: Number(output.match(/^# tests (\d+)$/m)?.[1] || 0),
    pass: Number(output.match(/^# pass (\d+)$/m)?.[1] || 0), fail: Number(output.match(/^# fail (\d+)$/m)?.[1] || 0) });
  process.stdout.write(name + ': ' + result.status + '\n');
}
const sources = [
  'components/ui/src-ts/runtime-executables/main.ts', 'components/ui/main.js',
  'components/ui/src-ts/runtime-executables/www/ems-apps.ts', 'components/ui/www/ems-apps.js',
  'components/ui/src-ts/runtime-executables/ems/module-manager.ts', 'components/ui/ems/module-manager.js',
  'components/ui/src-ts/runtime-executables/ems/modules/storage-control.ts', 'components/ui/ems/modules/storage-control.js',
  'components/ui/src-ts/runtime-executables/ems/services/feature-flags.ts', 'components/ui/ems/services/feature-flags.js',
  'components/ui/src-ts/runtime-executables/lib/eos-integrated.ts', 'components/ui/packages/eos-license-client/index.js',
  'components/admin/src/lib/eosLicenseCore.js', 'components/admin/src/lib/eosLicenseService.js', 'components/admin/src/lib/eosLicenseHttp.js',
  'runtime/bootstrap/first-start-configuration.cjs', 'runtime/onboarding/configuration.cjs',
  'components/ui/test/eos-license-entitlements.test.cjs', 'components/ui/scripts/verify-license-editions.js',
  'components/ui/test/eos-account-roles.test.cjs',
  'components/ui/scripts/verify-storage-license-power-profiles.js', 'components/ui/scripts/verify-stable-1.0.3-home-appcenter-access.cjs',
  'components/ui/docs/security/EOS_LICENSE_ENTITLEMENTS_2026-10-03_DE.md',
  'components/admin/test/eos-license-trust.test.cjs', 'components/ui/scripts/release-artifact-manifest.json',
  'components/ui/src-ts/runtime-mirrors/main.ts', 'components/ui/src-ts/runtime-mirrors/www/ems-apps.ts',
  'components/ui/src-ts/runtime-mirrors/ems/module-manager.ts', 'components/ui/src-ts/runtime-mirrors/ems/modules/storage-control.ts',
].map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ schemaVersion: 1, startedAt, completedAt: new Date().toISOString(),
  environment: { platform: process.platform, arch: process.arch, node: process.version, compiler: '.work/build-tools/typescript', dependencyBoundary: 'Existing isolated Express parser dependencies; no dependency installation performed.' },
  scope: 'Real ephemeral NWL2 signatures, encrypted storage, Admin service, actual lease client, exact production UI/backend function bodies; controller/transport/DOM replaced where documented in tests.',
  open: ['Real browser rendering and interaction', 'Actual Linux service/session integration on target', 'Real hardware and engineering acceptance', 'Complete UI test:all/build:ts beyond recorded targeted checks'],
  results, sources }, null, 2) + '\n');
process.exitCode = results.some(row => row.exitCode !== 0) ? 1 : 0;
