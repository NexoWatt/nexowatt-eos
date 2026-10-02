#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const guard = require('./check-repository-secrets.cjs');
const root = path.resolve(__dirname, '..');

// Dangerous fixtures exist only in disposable directories, with random values.
// Never commit scanner exceptions or reusable test credentials.
const value = crypto.randomBytes(32).toString('hex');
const bad = JSON.stringify({ host: 'smtp.example.invalid', auth: { user: 'local-test-user', pass: value }, password: value });
const scan = (text, name = 'fixture.js') => guard.inspectContent(name, Buffer.from(text));
assert.ok(scan(bad).some(f => f.rule === 'literal-smtp-password'));
assert.ok(scan('const smtpPassword = ' + JSON.stringify(value)).length);
assert.ok(scan('export SMTP_PASSWORD=' + value).length);
assert.ok(scan('smtps://' + 'local-test-user:' + value + '@smtp.example.invalid').length);
assert.ok(scan('-----BEGIN ' + 'PRIVATE KEY-----\n' + value).length);
assert.deepEqual(scan('const smtp = { password: "", user: "" };'), []);
assert.deepEqual(scan('const smtp = { password: process.env.SMTP_PASSWORD };'), []);
assert.deepEqual(scan('const smtp = { password: incoming.password };'), []);
assert.deepEqual(scan('SMTP_PASSWORD=${MAIL_SECRET}'), []);
assert.deepEqual(scan('SMTP_PASSWORD=""'), []);
assert.deepEqual(scan('input({id:"mailPassword",type:"password",value:entered}); // SMTP form'), []);
for (const name of ['notification-mail.json', 'data/notification-mail.json.123.tmp', 'data/notification-ledger.json', '.env', '.env.production', '.npmrc', 'nested/private.pem', 'iobroker-data/objects.jsonl']) {
  assert.ok(scan('{}', name).some(f => f.rule === 'installation-data-or-private-key'), name);
}
assert.deepEqual(scan('SMTP_PASSWORD=""', '.env.example'), []);
const entries = [
  { name: 'admin/react/index.html', read: () => Buffer.from('<script src="./assets/index-current.js"></script>') },
  { name: 'admin/react/assets/index-current.js', read: () => Buffer.from('') },
  { name: 'admin/react/assets/index-old.js', read: () => Buffer.from('') },
];
assert.equal(guard.assetFindings(entries)[0].file, entries[2].name);
assert.deepEqual(guard.assetFindings(entries.slice(0, 2)), []);

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-secret-guard-'));
const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
const write = (name, text) => { const target = path.join(directory, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text); };
try {
  git('init', '--quiet');
  git('config', 'user.name', 'Local test'); git('config', 'user.email', 'test@example.invalid');
  write('scripts/check-repository-secrets.cjs', fs.readFileSync(path.join(root, 'scripts/check-repository-secrets.cjs')));
  write('scripts/verify-release-artifact.js', fs.readFileSync(path.join(root, 'scripts/verify-release-artifact.js')));
  write('scripts/install-githooks.js', fs.readFileSync(path.join(root, 'scripts/install-githooks.js')));
  write('.githooks/pre-commit', fs.readFileSync(path.join(root, '.githooks/pre-commit')));
  fs.chmodSync(path.join(directory, '.githooks/pre-commit'), 0o644);
  execFileSync(process.execPath, ['scripts/install-githooks.js'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(git('config', 'core.hooksPath').toString().trim(), '.githooks');
  if (process.platform !== 'win32') assert.ok(fs.statSync(path.join(directory, '.githooks/pre-commit')).mode & 0o111);
  write('.gitignore', 'notification-mail.json*\n.env*\n');
  write('mail.js', bad);
  git('add', '.');
  // A clean working copy must not hide a previously staged secret.
  write('mail.js', 'const smtp = { password: process.env.SMTP_PASSWORD };\n');
  assert.deepEqual(guard.checkRepository(directory).findings, []);
  assert.ok(guard.checkRepository(directory, true).findings.length);
  const commit = spawnSync('git', ['commit', '-m', 'must be blocked'], { cwd: directory, encoding: 'utf8' });
  assert.notEqual(commit.status, 0);
  assert.ok((commit.stdout + commit.stderr).includes('literal-smtp-password'));
  assert.equal((commit.stdout + commit.stderr).includes(value), false, 'hook diagnostics redact all secret values');
  git('add', 'mail.js');
  assert.deepEqual(guard.checkRepository(directory, true).findings, []);
  git('commit', '--quiet', '-m', 'safe fixture');
  write('notification-mail.json', '{}');
  git('add', '--force', 'notification-mail.json');
  assert.ok(guard.checkRepository(directory, true).findings.some(f => f.rule === 'installation-data-or-private-key'), 'already indexed ignored files are checked');
  fs.unlinkSync(path.join(directory, 'notification-mail.json'));
  git('rm', '--cached', 'notification-mail.json');
  write('mail.js', bad);
  const release = spawnSync(process.execPath, ['scripts/verify-release-artifact.js'], { cwd: directory, encoding: 'utf8' });
  assert.notEqual(release.status, 0);
  assert.ok((release.stdout + release.stderr).includes('literal-smtp-password'), 'publish gate invokes scanner before metadata');
  assert.equal((release.stdout + release.stderr).includes(value), false);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}

const source = fs.readFileSync(path.join(root, 'src-admin-tab/src/pages/NotificationMailPage.tsx'), 'utf8');
assert.ok(source.includes("user: ''"), 'no baked-in SMTP login in the frontend');
assert.ok(source.includes("const [password, setPassword] = useState('')"));
assert.ok(source.includes('value="info@nexowatt.com"'), 'public sender remains unchanged');
assert.ok(source.includes('setPassword(\'\')'), 'password is cleared after save');
const repository = guard.checkRepository(root);
assert.equal(repository.findings.length, 0, JSON.stringify(repository.findings));
console.log('[1.0.10 security] OK: SMTP literals/URLs/env/private keys, runtime files, clean UI fields, obsolete bundles, real staged-index hook, redacted failures and publish gate.');
