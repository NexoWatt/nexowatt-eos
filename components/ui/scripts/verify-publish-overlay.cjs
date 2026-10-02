#!/usr/bin/env node
'use strict';
/**
 * Führt die echte prepublishOnly-Kette in einer vollständigen Repository-Kopie
 * ohne node_modules aus: frisch, nach ZIP-Überkopieren und mit echtem Secret-
 * Testfund. Eine lokale HTTP-Registry liefert kontrolliert 404; es wird weder
 * npm publish aufgerufen noch ein Paket ins Internet übertragen.
 * Aufruf: npm run test:publish-overlay. Gehört dauerhaft zur Release-Regression.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const source = path.resolve(__dirname, '..');
const container = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-publish-overlay-'));
const project = path.join(container, 'Repository mit Leerzeichen ä');
const npmCli = process.env.npm_execpath;
const skip = new Set(['node_modules', '.git', 'build', 'build-ts', 'build-types', '.cache']);
const outputs = [];
let requests = 0;
const server = http.createServer((_req, res) => { requests++; res.writeHead(404, { 'content-type': 'application/json' }); res.end('{}'); });

/** npm über seine JS-Einstiegsdatei starten: gleicher Aufruf unter Windows/Linux,
 * keine Shell-Escapes und kein Überspringen einzelner Publish-Prüfschritte. */
function lifecycle(registry) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'run', 'prepublishOnly'], {
      cwd: project, env: { ...process.env, NEXOWATT_NPM_REGISTRY: registry },
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
    });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => { outputs.push(output); resolve({ code, output }); });
  });
}

(async () => {
  try {
    assert.ok(npmCli && fs.existsSync(npmCli), 'Diesen Test mit npm run test:publish-overlay starten.');
    fs.cpSync(source, project, { recursive: true, filter: file => !skip.has(path.basename(file)) && !/\.(?:zip|tgz|log)$/.test(file) });
    assert.equal(fs.existsSync(path.join(project, 'node_modules')), false);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const registry = `http://127.0.0.1:${server.address().port}/`;
    const initial = await lifecycle(registry);
    assert.equal(initial.code, 0, initial.output);
    console.log('[publish-overlay] Frische Repository-Kopie: vollständige Publish-Prüfkette erfolgreich, ohne Entwicklungsabhängigkeiten.');

    const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json')));
    const current = pkg.files.filter(name => /^admin\/react\/assets\/index-.*\.(?:js|css)$/.test(name));
    assert.ok(current.some(name => name.endsWith('.js')));
    const snapshots = current.map(name => ({ name, data: fs.readFileSync(path.join(project, name)) }));
    const leftovers = snapshots.map(entry => {
      const name = 'admin/react/assets/index-PreviousRelease' + path.extname(entry.name);
      fs.writeFileSync(path.join(project, name), entry.data); return name;
    });
    const upgraded = await lifecycle(registry);
    assert.equal(upgraded.code, 0, upgraded.output);
    assert.match(upgraded.output, /Altes Admin-Bundle gesichert/);
    for (const name of leftovers) assert.equal(fs.existsSync(path.join(project, name)), false);
    for (const entry of snapshots) assert.deepEqual(fs.readFileSync(path.join(project, entry.name)), entry.data);
    console.log('[publish-overlay] ZIP-Überkopieren: alte JS/CSS gesichert, aktuelle Assets bytegleich, vollständige Publish-Prüfkette erfolgreich.');

    const secret = crypto.randomBytes(32).toString('hex');
    const secretFile = path.join(project, 'admin/react/assets/index-OldWithSecret.js');
    fs.writeFileSync(secretFile, JSON.stringify({ host: 'smtp.example.invalid', password: secret }));
    const unsafe = await lifecycle(registry);
    assert.notEqual(unsafe.code, 0);
    assert.match(unsafe.output, /literal-smtp-password/);
    assert.equal(unsafe.output.includes(secret), false);
    assert.ok(fs.existsSync(secretFile), 'secret is not hidden by cleanup');
    assert.equal(requests, 3, 'all three runs execute the real version guard');
    console.log('[publish-overlay] Echter Secret-Testfund blockiert unverändert, ohne Ausgabe des Werts. Keine externe Veröffentlichung.');
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    // Entferne ausschließlich die vom eigenen Test erstellten Sicherungen.
    for (const output of outputs) for (const match of output.matchAll(/^\[release-prepare\] Sicherung: (.+)\r?$/gm)) {
      const directory = match[1].trim();
      if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !/^nexowatt-admin-assets-/.test(path.basename(directory))) continue;
      const restore = JSON.parse(fs.readFileSync(path.join(directory, 'restore.json')));
      if (restore.project === project) fs.rmSync(directory, { recursive: true, force: true });
    }
    fs.rmSync(container, { recursive: true, force: true });
  }
})().catch(error => { console.error('[publish-overlay] ' + error.message); process.exitCode = 1; });
