// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-appcenter-auth-smarthome-security.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-appcenter-auth-smarthome-security.js
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
 * Original-Hash: 39aedcc56879c31e47b062a98dd80b297fcadb58af9b68b83bb06bc82f09f662
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
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/auth.ts'), 'utf8');
const appsHtml = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const sh = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/smarthome-config.ts'), 'utf8');

assert(appsHtml.includes('data-nw-required-capability="appcenter.open"'), 'AppCenter page capability marker missing');
assert(main.includes("app.get('/static/ems-apps.html'"), 'Static AppCenter bypass route guard missing');
assert(main.includes("requirePageAccessOrRenderLock(req, res, 'appcenter.open'"), 'Server-side AppCenter page gate missing');
assert(main.includes("app.get('/api/smarthome/config', requireSmartHomeConfig"), 'Installer/Admin-protected SmartHome config GET missing');
assert(main.includes("app.post('/api/smarthome/config', requireSmartHomeConfig"), 'Installer/Admin SmartHome config save missing');
assert(main.includes("app.get(['/api/object/tree', '/api/smarthome/object/tree'], requireDpDiscovery"), 'Installer/Admin DP discovery gate missing');
assert(sh.includes("/api/object/tree?prefix="), 'SmartHome picker must use the protected object tree');
assert(sh.includes("hasCapability('smarthome.configure')"), 'Arbitrary test writes must remain installer-only');

assert(auth.includes('child.inert = true'), 'Background must become inert');
assert(auth.includes("['pointerdown', 'mousedown', 'touchstart', 'click']"), 'Outside pointer/touch capture missing');
assert(auth.includes("document.addEventListener('focusin'"), 'Focus trap missing');
assert(auth.includes("cancelEl.style.display = mandatoryLock ? 'none' : ''"), 'Cancel must be hidden for mandatory lock');
assert(auth.includes('state.statusError = true'), 'Auth status failure must be tracked');
assert(auth.includes('Die Seite bleibt aus Sicherheitsgründen gesperrt'), 'Fail-closed status error message missing');
assert(auth.includes("if (mandatoryLock || protectedPageLocked())"), 'Mandatory overlay close guard missing');

console.log('[appcenter-auth-smarthome-security] OK: AppCenter and SmartHome setup are fail-closed; DP discovery/assignment requires Installer/Admin.');
