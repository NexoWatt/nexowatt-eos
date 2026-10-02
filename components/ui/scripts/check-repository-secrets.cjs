#!/usr/bin/env node
'use strict';

// Targeted, dependency-free release/index guard; not a general secret scanner.
// Diagnostics contain locations and rule names only, never matched content.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules', 'build-ts', 'build-types', 'build', '.cache']);

function sensitivePath(name) {
  return /(?:^|\/)(?:\.env(?:\.(?!example$)[^/]*)?|\.npmrc|notification-(?:mail|ledger)\.json[^/]*|credentials[^/]*\.json|service-account[^/]*\.json|[^/]+\.(?:pem|key|p12|pfx))$/i.test(name)
    || /(?:^|\/)iobroker-data\//i.test(name);
}

function inspectContent(name, buffer) {
  const findings = [];
  const add = (rule, offset = 0, text = '') => findings.push({ file: name, line: text.slice(0, offset).split('\n').length, rule });
  if (sensitivePath(name)) add('installation-data-or-private-key');
  // Binary assets are not interpreted as source code. Their names are still checked.
  if (buffer.includes(0)) return findings;
  const text = buffer.toString('utf8');
  const smtpContext = /smtp|nodemailer|notification[-_]?mail|mailHost/i.test(text);
  const assignment = /\b((?:smtp|mail)[_-]?(?:password|passwd|pass|secret)|password|passwd|pass)["']?\s*[:=]\s*(["'`])((?:\\.|(?!\2)[^\\\r\n])*?)\2/gi;
  for (const match of text.matchAll(assignment)) {
    if (!smtpContext && !/^(smtp|mail)/i.test(match[1])) continue;
    if (!match[3] || (match[2] === '`' && match[3].includes('${'))) continue;
    add('literal-smtp-password', match.index, text);
  }
  const env = /^\s*(?:export\s+)?(?:SMTP|MAIL)[_-](?:PASSWORD|PASSWD|PASS|SECRET)\s*=\s*([^\r\n]+)/gim;
  for (const match of text.matchAll(env)) {
    const value = match[1].trim();
    if (value === '""' || value === "''" || /^\$\{[A-Z_][A-Z0-9_]*\}$/i.test(value)) continue;
    add('smtp-environment-value', match.index, text);
  }
  for (const match of text.matchAll(/smtps?:\/\/[^\s/@:]+:[^\s/@]+@/gi)) add('smtp-url-credentials', match.index, text);
  for (const match of text.matchAll(/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g)) add('private-key-content', match.index, text);
  return findings;
}

function assetFindings(entries) {
  const index = entries.find(entry => entry.name === 'admin/react/index.html');
  if (!index) return [];
  // Ein Entry kann weitere Chunks nachladen. Sowohl veröffentlichte Dateien als
  // auch indirekte Verweise zählen; nur die HTML-Datei zu prüfen wäre zu eng.
  const assets = entries.filter(entry => entry.name.startsWith('admin/react/assets/'));
  const current = new Set(['admin/react/index.html']);
  const pkgEntry = entries.find(entry => entry.name === 'package.json');
  if (pkgEntry) {
    const pkg = JSON.parse(pkgEntry.read().toString('utf8'));
    for (const name of Array.isArray(pkg.files) ? pkg.files : []) {
      if (typeof name === 'string' && name.startsWith('admin/react/')) current.add(name);
    }
  }
  const queue = entries.filter(entry => current.has(entry.name));
  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    if (!/\.(?:html|js|css)$/.test(entry.name)) continue;
    const text = entry.read().toString('utf8');
    for (const asset of assets) {
      // Absichtlich konservativ: Auch eine Erwähnung bewahrt die Datei. Damit
      // wird bei unklaren dynamischen Verbindungen nichts automatisch entfernt.
      if (!current.has(asset.name) && text.includes(path.posix.basename(asset.name))) {
        current.add(asset.name);
        queue.push(asset);
      }
    }
  }
  return assets.filter(entry => /^admin\/react\/assets\/index-[\w-]+\.(?:js|css)$/.test(entry.name)
    && !current.has(entry.name))
    .map(entry => ({ file: entry.name, line: 1, rule: 'obsolete-admin-entry-bundle' }));
}

function workingEntries(root) {
  const entries = [];
  function walk(relative) {
    for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      if (SKIP.has(item.name)) continue;
      const name = relative ? relative + '/' + item.name : item.name;
      if (item.isDirectory()) walk(name);
      else if (item.isFile()) entries.push({ name, read: () => fs.readFileSync(path.join(root, name)) });
      else throw new Error('Unsupported repository entry'); // Do not follow symlinks into secrets.
    }
  }
  walk('');
  return entries;
}

function stagedEntries(root) {
  const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  // Read every tracked index blob, including ignored/previously tracked files.
  // Scanning working files instead would miss a secret staged before an edit.
  return git(['ls-files', '--stage', '-z']).toString('utf8').split('\0').filter(Boolean).map(record => {
    const match = /^(\d+) ([a-f0-9]+) (\d)\t([\s\S]+)$/.exec(record);
    if (!match || match[3] !== '0' || !/^100(?:644|755)$/.test(match[1])) throw new Error('Unmerged or unsupported index entry');
    return { name: match[4], read: () => git(['cat-file', 'blob', match[2]]) };
  });
}

function checkRepository(root = ROOT, staged = false) {
  const entries = staged ? stagedEntries(root) : workingEntries(root);
  const findings = [];
  for (const entry of entries) findings.push(...inspectContent(entry.name, entry.read()));
  findings.push(...assetFindings(entries));
  return { files: entries.length, findings };
}

function report(result) {
  for (const finding of result.findings) {
    if (finding.rule === 'obsolete-admin-entry-bundle') {
      console.error(`[admin-build] BLOCKED ${JSON.stringify(finding.file)}: Altes, nicht mehr verwendetes Admin-Bundle. npm run release:prepare ausführen; danach Bereinigung gegebenenfalls mit git add -u -- admin/react/assets übernehmen.`);
    } else {
      console.error(`[secret-guard] BLOCKED ${JSON.stringify(finding.file)}:${finding.line} (${finding.rule}); value redacted`);
    }
  }
  if (result.findings.length) return false;
  console.log(`[secret-guard] OK: ${result.files} files; no findings in the supported rules.`);
  return true;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--staged')) throw new Error('Unsupported argument');
    process.exitCode = report(checkRepository(ROOT, args.includes('--staged'))) ? 0 : 1;
  } catch (_) {
    // Errors may themselves contain file contents or credentials; do not print them.
    console.error('[secret-guard] BLOCKED: repository/index could not be fully checked.');
    process.exitCode = 1;
  }
}

module.exports = { inspectContent, sensitivePath, checkRepository, report, assetFindings };
