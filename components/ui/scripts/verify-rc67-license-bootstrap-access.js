#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const mainTs = read('src-ts/runtime-executables/main.ts');
const mainJs = read('main.js');
const licenseHtml = read('www/license.html');
const licenseTs = read('src-ts/runtime-executables/www/license.ts');
const licenseJs = read('www/license.js');
const bootstrapTs = read('src-ts/runtime-executables/lib/license-bootstrap-access.ts');
const bootstrapJs = read('lib/license-bootstrap-access.js');
const { isUnlicensedLicenseBootstrapRequest } = require(path.join(root, 'lib', 'license-bootstrap-access.js'));

function semverAtLeast(actual, expected) {
  const a = String(actual || '').split('.').map(Number);
  const e = String(expected || '').split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) > (e[i] || 0)) return true;
    if ((a[i] || 0) < (e[i] || 0)) return false;
  }
  return true;
}

assert.equal(semverAtLeast(pkg.version, '0.8.192'), true, `Paketversion ${pkg.version} ist kleiner als 0.8.192.`);
assert.equal(pkg.scripts?.['test:rc67-license-bootstrap-access'], 'node scripts/verify-rc67-license-bootstrap-access.js');

const allowed = [
  ['GET', '/license.html', true],
  ['GET', '/license?nwAdmin=1', true],
  ['HEAD', '/license/', true],
  ['GET', '/static/license.html', true],
  ['GET', '/static/styles.css', true],
  ['GET', '/static/auth.js', true],
  ['GET', '/static/nw-i18n.js', true],
  ['GET', '/static/license.js', true],
  ['GET', '/static/nexowatt-logo.png', true],
  ['GET', '/static/i18n/de.json?v=0.8.192', true],
  ['GET', '/static/i18n/nl.json?v=0.8.192', true],
  ['GET', '/static/i18n/en.json?v=0.8.192', true],
  ['GET', '/api/strict-auth/status', true],
  ['POST', '/api/strict-auth/login', true],
  ['POST', '/api/strict-auth/logout', true],
  ['OPTIONS', '/api/strict-auth/login', true],
  ['GET', '/api/locale?ts=123', true],
  ['HEAD', '/api/locale', true],
  ['GET', '/api/license/info', true],
  ['POST', '/api/license/save', true],
  ['OPTIONS', '/api/license/save', true],
];
for (const [method, url, expected] of allowed) {
  assert.equal(isUnlicensedLicenseBootstrapRequest({ method, url }), expected, `${method} ${url} muss den Lizenz-Bootstrap passieren.`);
}

const blocked = [
  ['GET', '/', false],
  ['GET', '/index.html', false],
  ['GET', '/settings.html', false],
  ['GET', '/ems-apps.html', false],
  ['GET', '/simulation.html', false],
  ['GET', '/static/app.js', false],
  ['GET', '/static/ems-apps.js', false],
  ['GET', '/static/i18n/fr.json', false],
  ['GET', '/config', false],
  ['GET', '/api/state', false],
  ['POST', '/api/set', false],
  ['GET', '/api/auth/status', false],
  ['POST', '/api/auth/login', false],
  ['GET', '/api/installer/config', false],
  ['POST', '/license.html', false],
  ['GET', '/license-admin.html', false],
];
for (const [method, url, expected] of blocked) {
  assert.equal(isUnlicensedLicenseBootstrapRequest({ method, url }), expected, `${method} ${url} darf die allgemeine Lizenzsperre nicht umgehen.`);
}

for (const [source, label] of [[bootstrapTs, 'license-bootstrap-access.ts'], [bootstrapJs, 'license-bootstrap-access.js']]) {
  assert.match(source, /LICENSE_BOOTSTRAP_GET_PATHS/);
  assert.match(source, /LICENSE_BOOTSTRAP_API_METHODS/);
  assert.match(source, /\/api\/strict-auth\/login/);
  assert.match(source, /\/api\/locale/);
  assert.match(source, /\/api\/license\/save/);
  assert.doesNotMatch(source, /startsWith\('\/static\/'\)/, `${label}: pauschaler /static-Bypass wäre zu breit.`);
  assert.doesNotMatch(source, /startsWith\('\/static\/assets\/'\)/, `${label}: pauschaler /static/assets-Bypass wäre zu breit.`);
  assert.doesNotMatch(source, /startsWith\('\/api\/'\)/, `${label}: pauschaler /api-Bypass wäre zu breit.`);
}

function verifyMain(source, label) {
  assert.match(source, /require\('\.\/lib\/license-bootstrap-access'\)/, `${label}: Bootstrap-Helfer wird nicht geladen.`);
  // The integrated product obtains short-lived central capabilities; local key
  // validation is deliberately retired. Account recovery stays reachable, while
  // the earlier product login boundary still protects license metadata/pages.
  const loginIndex = source.indexOf('const access = await getStoredSession(req);', source.indexOf('const publicAuthPaths = new Set('));
  const gateIndex = source.indexOf('if (publicAuthPaths.has(req.path) || isUnlicensedLicenseBootstrapRequest(req)) return next();');
  const leaseIndex = source.indexOf('if (this._nwCentralLicense?.isAllowed() === true) return next();', gateIndex);
  assert.ok(loginIndex >= 0 && loginIndex < gateIndex && leaseIndex > gateIndex,
    `${label}: Anmeldung, enger Bootstrap und zentrales Lizenz-Gate müssen in dieser Reihenfolge stehen.`);
  const publicPathsSource = source.match(/const publicAuthPaths = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(publicPathsSource, `${label}: Exakte Account-Recovery-Pfade fehlen.`);
  const publicPaths = [...publicPathsSource[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(publicPaths, ['/api/auth/status', '/api/auth/login', '/api/auth/logout',
    '/api/strict-auth/status', '/api/strict-auth/login', '/api/strict-auth/logout',
    '/api/session/me', '/api/installer/login', '/api/installer/logout', '/api/account/password'].sort(),
    `${label}: Bootstrap darf nur ausdrücklich geprüfte Account-Pfade zusätzlich freigeben.`);
  assert.match(source, /app\.get\(\['\/license\.html', '\/license'\][\s\S]*?requirePageAccessOrRenderLock\(req, res, 'license\.manage'/,
    `${label}: Lizenzseite ist nach dem technischen Bootstrap nicht weiterhin rollen-geschützt.`);
  assert.match(source, /app\.get\('\/api\/license\/info'[\s\S]*?hasCapability\(access, 'license\.manage'\)/,
    `${label}: Lizenz-Lese-API ist nicht rollen-geschützt.`);
  assert.match(source, /app\.post\('\/api\/license\/save'[\s\S]*?hasCapability\(access, 'license\.manage'\)/,
    `${label}: Lizenz-Schreib-API ist nicht rollen-geschützt.`);
  assert.match(source, /href="\/license\.html\?nwAdmin=1">Lizenz aktivieren<\/a>/,
    `${label}: Sperrseite enthält keinen direkten Aktivierungsweg.`);
  assert.match(source, /Die Lizenz wird zentral im <b>EOS Admin<\/b> verwaltet/,
    `${label}: Hinweis auf die zentrale Lizenzverwaltung fehlt.`);
  assert.match(source, /return res\.status\(409\)\.json\(\{ ok: false, error: 'CENTRAL_LICENSE_MANAGEMENT'/,
    `${label}: lokale Lizenz-Schreib-API muss auf die zentrale Verwaltung verweisen.`);
  assert.doesNotMatch(source, /const\s+uuidLine\s*=|\$\{uuidLine\}/,
    `${label}: Die allgemeine Sperrseite darf die System-UUID vor Admin-/Installer-Anmeldung nicht ausgeben.`);
  assert.doesNotMatch(source, /Bitte im <b>NexoWatt EOS Admin<\/b> unter <code>NexoWatt EOS → Lizenz<\/code>/,
    `${label}: veralteter/falscher Admin-Hinweis ist noch vorhanden.`);
  assert.doesNotMatch(source, /Danach den Adapter neu starten \(oder kurz deaktivieren\/aktivieren\)/,
    `${label}: unnötiger Neustart-Hinweis ist noch vorhanden.`);
}
verifyMain(mainTs, 'main.ts');
verifyMain(mainJs, 'main.js');

assert.match(licenseHtml, /Die Lizenz wird zentral im EOS Admin verwaltet/);
assert.match(licenseHtml, /keine Lizenzschlüssel/);
assert.match(licenseHtml, /Admin-Anmeldung wird geprüft/);
assert.match(licenseHtml, /data-nw-required-capability="license\.manage"/);
assert.ok(licenseHtml.indexOf('/static/auth.js') < licenseHtml.indexOf('/static/license.js'));
assert.match(licenseHtml, /\/static\/nw-i18n\.js/);
assert.doesNotMatch(licenseHtml, /cockpit-shell\.js|nw-shell\.js/,
  'Lizenz-Bootstrap lädt unnötige Shell-/Config-Skripte, die ohne Lizenz gesperrt bleiben müssen.');
assert.doesNotMatch(licenseHtml, /<input[^>]+value="NW/i, 'Lizenz-HTML enthält einen Schlüssel.');

for (const [source, label] of [[licenseTs, 'license.ts'], [licenseJs, 'license.js']]) {
  assert.match(source, /requireCapability\('license\.manage'/, `${label}: Capability-Prüfung fehlt.`);
  assert.match(source, /Zentrale Lizenz gültig\. Gerätesteuerung bleibt im Testprofil gesperrt/,
    `${label}: Testprofil darf nach einer Lizenzfreigabe keine Gerätesteuerung versprechen.`);
  assert.match(source, /fetch\('\/api\/license\/info', \{ credentials: 'same-origin', cache: 'no-store'/,
    `${label}: Lizenzstatus muss authentifiziert und ohne Cache gelesen werden.`);
  assert.doesNotMatch(source, /fetch\('\/api\/license\/save'|localStorage\.setItem|sessionStorage\.setItem/,
    `${label}: Der zentrale Lizenzstatus darf keine Schlüssel schreiben oder speichern.`);
  assert.doesNotMatch(source, /localStorage\.setItem\([^\n]*license/i,
    `${label}: Lizenzschlüssel darf nicht im Browser persistiert werden.`);
}

assert.ok(pkg.files.includes('lib/license-bootstrap-access.js'), 'Bootstrap-Runtime fehlt in package.json files.');
assert.ok(pkg.files.includes('www/license.html') && pkg.files.includes('www/license.js'), 'Lizenzseite fehlt im Paket.');

console.log('[rc67-license-bootstrap-access] OK: Exakte Account-Recovery-Pfade bleiben erreichbar; Lizenzstatus ist rollen-geschützt und zentral verwaltet, übrige EOS-Bereiche benötigen eine zentrale Freigabe.');
