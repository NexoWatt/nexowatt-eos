// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-appcenter-auth-modal-lock.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-appcenter-auth-modal-lock.js
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
 * Original-Hash: 27cfc3f3e8fd6bbd086f8eedfbd1570793685a8ad3b856d30857566ebeba0a4c
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

/** Fail-closed AppCenter password lock: no outside click, focus or API failure bypass. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const auth = read('src-ts/runtime-executables/www/auth.ts');
const html = read('www/ems-apps.html');
const main = read('src-ts/runtime-executables/main.ts');

assert.match(html, /data-nw-required-capability="appcenter\.open"/);
assert.match(html, /data-nw-required-role="Admin oder Installer"/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'appcenter\.open'/);
assert.match(auth, /child\.inert = true/);
assert.match(auth, /child\.style\.pointerEvents = 'none'/);
assert.match(auth, /document\.addEventListener\('focusin'/);
assert.match(auth, /\['pointerdown', 'mousedown', 'touchstart', 'click'\]/);
assert.match(auth, /e\.stopImmediatePropagation\(\)/);
assert.match(auth, /e\.key === 'Tab'/);
assert.match(auth, /e\.key !== 'Escape'/);
assert.match(auth, /if \(mandatoryLock \|\| protectedPageLocked\(\)\)/);
assert.match(auth, /cancelEl\.style\.display = mandatoryLock \? 'none' : ''/);
assert.match(auth, /state\.statusError = true/);
assert.match(auth, /Berechtigungsprüfung nicht erreichbar[\s\S]*Seite bleibt[\s\S]*gesperrt/);
assert.match(auth, /return !state\._loaded \|\| state\.statusError === true/);
assert.match(auth, /html\.nw-auth-capability-pending body>\*:not\(#nwAuthOverlay\)/);
assert.doesNotMatch(auth, /statusError\s*=\s*false;[\s\S]{0,120}authRequired\s*=\s*false/);

console.log('[appcenter-auth-modal-lock] OK: AppCenter is backend-gated and frontend-locked fail-closed against outside click, focus, Escape and auth-status failure.');
