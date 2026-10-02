// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-frontend-controls-no-login.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-frontend-controls-no-login.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 750cab64d9240bf2868cacba47a779f2ea67edbdbb7d70632958c409276764fe
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: assert
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const assert = (cond, msg) => {
  if (!cond) {
    console.error(`[frontend-controls-no-login] FAIL: ${msg}`);
    process.exit(1);
  }
};
/**
 * Code-Teil: mustContain
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const mustContain = (text, needle, file) => assert(text.includes(needle), `${file} fehlt: ${needle}`);
/**
 * Code-Teil: mustNotMatch
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
