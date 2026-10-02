#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (cond, msg) => {
  if (!cond) {
    console.error(`[frontend-controls-no-login] FAIL: ${msg}`);
    process.exit(1);
  }
};
const mustContain = (text, needle, file) => assert(text.includes(needle), `${file} fehlt: ${needle}`);
const mustNotMatch = (text, re, file, label) => assert(!re.test(text), `${file} enthält weiterhin gesperrte Frontend-Route: ${label || re}`);

const runtimeFiles = [
  'main.js',
  'src-ts/runtime-executables/main.ts'
];

for (const file of runtimeFiles) {
  const text = read(file);

  mustContain(text, 'const attachOptionalAuth = async', file);
  mustContain(text, 'Endkunden-Frontends sind bewusst ohne Passwort bedienbar', file);
  mustContain(text, "app.post('/api/set', attachOptionalAuth, async", file);
  mustContain(text, "if ((scope === 'installer' || scope === 'rfid') && authEnabled && protectWrites)", file);
  mustContain(text, 'const s = await getSetAccess();', file);
  mustContain(text, "const requireInstaller = requireCapability('appcenter.open');", file);
  mustContain(text, "app.get('/api/installer/config', requireInstaller, async", file);
  mustContain(text, "app.post('/api/installer/config', requireInstaller, async", file);
  mustContain(text, "app.get('/api/sim/status', requireInstaller, async", file);

  const publicRoutes = [
    ["post", "/api/smarthome/toggle"],
    ["post", "/api/smarthome/level"],
    ["post", "/api/smarthome/color"],
    ["post", "/api/smarthome/cover"],
    ["post", "/api/smarthome/player"],
    ["post", "/api/smarthome/rtrSetpoint"],
    ["get", "/api/smarthome/scenes"],
    ["post", "/api/smarthome/scene/run"],
    ["get", "/api/smarthome/timers"],
    ["post", "/api/smarthome/timers"],
    ["post", "/api/notify/test"],
    ["get", "/api/relay/summary"],
    ["get", "/api/relay/snapshot"],
    ["get", "/api/bhkw/snapshot"],
    ["get", "/api/generator/snapshot"]
  ];

  for (const [method, route] of publicRoutes) {
    const openPattern = new RegExp(`app\\.${method}\\('${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s+async`);
    assert(openPattern.test(text), `${file}: ${method.toUpperCase()} ${route} ist nicht als öffentliche Frontend-Route registriert`);
    const lockedPattern = new RegExp(`app\\.${method}\\('${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s+requireAuth`);
    mustNotMatch(text, lockedPattern, file, `${method.toUpperCase()} ${route}`);
  }

  mustContain(text, "app.get('/api/flow/qc/read', attachOptionalAuth, async", file);
  mustNotMatch(text, /app\.get\('\/api\/flow\/qc\/read',\s+requireAuth/, file, 'GET /api/flow/qc/read');
  mustNotMatch(text, /app\.post\('\/api\/set',\s+requireAuth/, file, 'POST /api/set');
}

const indexHtml = read('www/index.html');
const settingsHtml = read('www/settings.html');
assert(!/auth\.js/.test(indexHtml), 'www/index.html bindet auth.js im Kundenfrontend ein');
assert(!/auth\.js/.test(settingsHtml), 'www/settings.html bindet auth.js in den Kundeneinstellungen ein');

console.log('[frontend-controls-no-login] OK: LIVE-/Kundenfrontend-Steuerungen sind ohne Login erreichbar; Installer-/Admin-Gates bleiben geschützt.');
