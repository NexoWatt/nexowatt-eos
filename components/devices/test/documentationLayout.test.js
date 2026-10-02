'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('technical Markdown documentation is publish-grouped under docs and local root notes cannot leak into the package', () => {
  const rootMarkdown = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.md')
    .map(entry => entry.name)
    .sort();

  assert.ok(rootMarkdown.includes('README.md'));

  for (const relativePath of [
    'docs/README.md',
    'docs/CHANGELOG.md',
    'docs/ALIAS_CONTRACT_V1_0.5.144.md',
    'docs/LEGACY_COMPATIBILITY_0.5.146.md',
    'docs/RELEASE_SAFETY.md',
    'docs/THIRD_PARTY_NOTICES.md',
  ]) {
    assert.ok(fs.existsSync(path.join(root, relativePath)), `missing ${relativePath}`);
  }

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /^#\s+nexowatt-devices\b/i);
  assert.match(readme, /\[Dokumentationsübersicht\]\(docs\/README\.md\)/);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('docs/'));
  assert.equal(pkg.files.includes('publish-safe.cmd'), false);

  const npmIgnore = fs.readFileSync(path.join(root, '.npmignore'), 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  for (const requiredEntry of ['publish-safe.cmd', '/test/', '/*.md', '!/README.md', '/.nexowatt-release-local/']) {
    assert.ok(npmIgnore.includes(requiredEntry), `missing npmignore entry ${requiredEntry}`);
  }
  assert.deepEqual(
    pkg.files.filter(entry => entry.toLowerCase().endsWith('.md')),
    ['README.md']
  );
  assert.equal(pkg.files.some(entry => /^test(?:\/|$)/i.test(entry)), false);
  assert.match(pkg.scripts.prepack, /package-sanitize\.cjs prepare/);
  assert.match(pkg.scripts.postpack, /package-sanitize\.cjs restore/);
  assert.ok(fs.existsSync(path.join(root, 'scripts', 'package-sanitize.cjs')));
});
