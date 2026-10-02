#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const mainTs = read('src-ts/runtime-executables/main.ts');
const mainJs = read('main.js');
const authTs = read('src-ts/runtime-executables/www/auth.ts');
const authJs = read('www/auth.js');
const licenseTs = read('src-ts/runtime-executables/www/license.ts');
const licenseJs = read('www/license.js');
const licenseHtml = read('www/license.html');
const adminSourceIndex = read('src-admin-tab/index.html');
const adminIndex = read('admin/react/index.html');
const adminLicense = read('admin/license.html');
const adminApp = read('src-admin-tab/src/App.tsx');
const adminConnection = read('src-admin-tab/src/lib/adminConnection.ts');
const adminLicensePage = read('src-admin-tab/src/pages/LicensePage.tsx');
const adminBundle = read('admin/react/assets/index-CCQUiWc9.js');
const pkg = JSON.parse(read('package.json'));

function verifyMain(source, label) {
  assert.match(source, /const\s+getStoredSession\s*=\s*\(req\)\s*=>/,
    `${label}: echte Cookie-Session-Auflösung fehlt.`);
  assert.match(source, /const\s+resolveStrictAccess\s*=\s*async\s*\(req\)[\s\S]*?getStoredSession\(req\)/,
    `${label}: strikte Rollenauflösung fehlt.`);
  assert.match(source, /const\s+requireCapability\s*=\s*\(cap\)[\s\S]*?resolveStrictAccess\(req\)/,
    `${label}: privilegierte APIs verwenden nicht die strikte Rollenauflösung.`);

  const strictBlock = /const\s+resolveStrictAccess\s*=\s*async\s*\(req\)[\s\S]*?\n\s*\};/.exec(source)?.[0] || '';
  assert.doesNotMatch(strictBlock, /!authEnabled|_bypass|getSession\(/,
    `${label}: strikte Rollenauflösung enthält einen Auth-deaktiviert-Bypass.`);

  assert.match(source, /installer:\s*\[[\s\S]*?'appcenter\.open'[\s\S]*?'simulation\.open'[\s\S]*?'license\.manage'/,
    `${label}: Installer-Capabilities für EMS, Simulation oder Lizenz fehlen.`);
  const customerBlock = /customer:\s*\[([\s\S]*?)\]\s*,\s*display:/.exec(source);
  assert.ok(customerBlock, `${label}: Customer-Capability-Block fehlt.`);
  assert.doesNotMatch(customerBlock[1], /appcenter\.open|simulation\.open|license\.manage/,
    `${label}: Customer besitzt eine privilegierte Capability.`);

  assert.match(source, /app\.get\('\/api\/strict-auth\/status'/,
    `${label}: strikter Status-Endpunkt fehlt.`);
  assert.match(source, /app\.post\('\/api\/strict-auth\/login',\s*doStrictAuthLogin\)/,
    `${label}: strikter Login-Endpunkt fehlt.`);
  assert.match(source, /if\s*\(!info\s*\|\|\s*!info\.isInstaller\)/,
    `${label}: striktes Login lässt Nicht-Installer zu.`);

  assert.match(source, /app\.get\('\/api\/license\/info'[\s\S]*?resolveStrictAccess\(req\)[\s\S]*?hasCapability\(access,\s*'license\.manage'\)/,
    `${label}: Lizenz-Lese-API ist nicht streng geschützt.`);
  assert.match(source, /app\.post\('\/api\/license\/save'[\s\S]*?resolveStrictAccess\(req\)[\s\S]*?hasCapability\(access,\s*'license\.manage'\)/,
    `${label}: Lizenz-Schreib-API ist nicht streng geschützt.`);
  assert.match(source, /app\.get\(\['\/license\.html',\s*'\/license'\][\s\S]*?requirePageAccessOrRenderLock\(req,\s*res,\s*'license\.manage'/,
    `${label}: Lizenzseite besitzt kein serverseitiges Route-Gate.`);
  assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'appcenter\.open'/,
    `${label}: EMS/App-Center-Seite besitzt kein serverseitiges Route-Gate.`);
  assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'simulation\.open'/,
    `${label}: Simulatorseite besitzt kein serverseitiges Route-Gate.`);

  const redirectIndex = source.indexOf("app.get('/static/license.html'");
  const staticIndex = source.indexOf("app.use('/static', express.static");
  assert.ok(redirectIndex >= 0 && staticIndex > redirectIndex,
    `${label}: /static/license.html kann die Rollenprüfung umgehen.`);
  assert.match(source, /app\.get\('\/static\/license\.html'[\s\S]*?res\.redirect\(302,\s*'\/license\.html'/,
    `${label}: Static-Lizenz-Bypass ist nicht geschlossen.`);
  assert.match(source, /app\.get\('\/static\/simulation\.html'[\s\S]*?res\.redirect\(302,\s*'\/simulation\.html'/,
    `${label}: Static-Simulator-Bypass ist nicht geschlossen.`);
  assert.match(source, /app\.get\('\/static\/ems-apps\.html'[\s\S]*?res\.redirect\(302,\s*'\/ems-apps\.html'/,
    `${label}: Static-EMS-Bypass ist nicht geschlossen.`);
}

verifyMain(mainTs, 'main.ts');
verifyMain(mainJs, 'main.js');

for (const [source, label] of [[authTs, 'auth.ts'], [authJs, 'auth.js']]) {
  assert.match(source, /STRICT_AUTH_PAGE[\s\S]*ems-apps[\s\S]*simulation[\s\S]*license/,
    `${label}: geschützte Seiten verwenden nicht den strikten Auth-Pfad.`);
  assert.match(source, /AUTH_STATUS_URL\s*=\s*STRICT_AUTH_PAGE\s*\?\s*'\/api\/strict-auth\/status'/,
    `${label}: strikter Status-Endpunkt fehlt.`);
  assert.match(source, /AUTH_LOGIN_URL\s*=\s*STRICT_AUTH_PAGE\s*\?\s*'\/api\/strict-auth\/login'/,
    `${label}: strikter Login-Endpunkt fehlt.`);
  assert.match(source, /AUTH_LOGOUT_URL\s*=\s*STRICT_AUTH_PAGE\s*\?\s*'\/api\/strict-auth\/logout'/,
    `${label}: strikter Logout-Endpunkt fehlt.`);
  assert.match(source, /const\s+ok\s*=\s*statusHealthy\s*&&\s*!!\(info\s*&&\s*info\.authed\s*&&\s*hasCapability/,
    `${label}: Capability-Prüfung ist nicht fail-closed.`);
  assert.doesNotMatch(source, /!authRequired\s*\|\|/,
    `${label}: geschützte Capability besitzt einen Auth-deaktiviert-Bypass.`);
}

assert.match(licenseHtml, /data-nw-required-capability="license\.manage"/);
assert.match(licenseHtml, /data-nw-required-role="Admin oder Installer"/);
assert.match(licenseHtml, /id="nw-license-key"[^>]*type="password"[^>]*value=""/);
assert.match(licenseHtml, /id="nw-license-uuid"[^>]*value=""/);
assert.doesNotMatch(licenseHtml, /NW1[A-Z0-9-]{10,}/i,
  'Lizenz-HTML enthält einen Schlüsselwert.');
assert.doesNotMatch(licenseHtml, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  'Lizenz-HTML enthält eine UUID.');
assert.ok(licenseHtml.indexOf('/static/auth.js') < licenseHtml.indexOf('/static/license.js'),
  'auth.js muss vor license.js geladen werden.');

for (const [source, label] of [[licenseTs, 'license.ts'], [licenseJs, 'license.js']]) {
  assert.match(source, /requireCapability\('license\.manage'/,
    `${label}: Capability-Prüfung fehlt.`);
  assert.ok(source.indexOf("requireCapability('license.manage'") < source.indexOf('fetchJson(`/api/license/info'),
    `${label}: Lizenzdaten werden vor der Capability-Prüfung geladen.`);
  assert.doesNotMatch(source, /localStorage\.setItem\([^\n]*license/i,
    `${label}: Lizenzschlüssel darf nicht im Browser gespeichert werden.`);
  assert.match(source, /startsWith\('nexowatt-ui\.licenseKey\.'\)[\s\S]*removeItem/,
    `${label}: Legacy-Lizenzcache wird nicht entfernt.`);
  assert.match(source, /nw-auth-logout[\s\S]*clearSensitiveFields/,
    `${label}: Logout löscht sensible Felder nicht.`);
  assert.match(source, /pagehide',\s*clearSensitiveFields/,
    `${label}: Seitenwechsel löscht sensible Felder nicht.`);
}

// Admin-Deep-Link leitet vor dem React-Render auf die serverseitig geschützte Runtime um.
for (const [source, label] of [[adminSourceIndex, 'src-admin-tab/index.html'], [adminIndex, 'admin/react/index.html']]) {
  assert.match(source, /redirectProtectedLicenseRoute/,
    `${label}: früher Deep-Link-Redirect fehlt.`);
  assert.match(source, /\^#\\\/license/,
    `${label}: Lizenz-Hash wird nicht erkannt.`);
  assert.match(source, /window\.location\.replace\('\.\.\/license\.html'/,
    `${label}: Lizenz-Deep-Link führt nicht zur geschützten Runtime.`);
  assert.match(source, /nexowatt-ui\\\.licenseKey/,
    `${label}: Legacy-Lizenzcache wird nicht vor dem Admin-Start entfernt.`);
}

assert.doesNotMatch(adminLicense, /<input[^>]+license/i,
  'Admin-Weiterleiter darf kein Lizenzfeld enthalten.');
assert.match(adminLicense, /\/license\.html\?nwAdmin=1/);
assert.match(adminLicense, /window\.location\.replace\(target\)/);

assert.match(adminApp, /ProtectedRuntimeRoute[^\n]*capability="license\.manage"[^\n]*requiredRole="(?:Installer oder Admin|Admin oder Installer)"/,
  'Admin-Quellroute besitzt keinen Lizenz-Capability-Vertrag.');
assert.match(adminConnection, /\/api\/strict-auth\/status/);
assert.match(adminConnection, /\/api\/strict-auth\/login/);
assert.match(adminConnection, /\/api\/strict-auth\/logout/);
assert.match(adminLicensePage, /RedirectPage targetKey="license"/,
  'Admin-Lizenzseite muss nur zur geschützten Runtime weiterleiten.');

// Das aktuell ausgelieferte Bundle öffnet die Runtime-Lizenzroute; die API-Sperre
// bleibt ausschließlich im Backend maßgeblich und kann nicht durch Bundle-Code umgangen werden.
assert.match(adminBundle, /license:\{title:"Lizenz",path:"\/license\.html(?:\?nwAdmin=1)?"/,
  'Admin-Bundle kennt die geschützte Runtime-Lizenzroute nicht.');
assert.match(adminBundle, /targetKey:"license"/,
  'Admin-Bundle enthält keine Lizenz-Weiterleitung.');

assert.ok(Array.isArray(pkg.files) && pkg.files.includes('www/license.html'),
  'www/license.html fehlt in package.json files.');
assert.ok(pkg.files.includes('www/license.js'),
  'www/license.js fehlt in package.json files.');

console.log('[protected-license-rc45] OK: Lizenzseite, API, Static-Pfade und Admin-Deep-Link sind strikt auf Installer/Admin begrenzt; vor Rollenprüfung werden keine Lizenzdaten geladen.');
