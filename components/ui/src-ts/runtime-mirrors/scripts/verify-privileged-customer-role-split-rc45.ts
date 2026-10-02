// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-privileged-customer-role-split-rc45.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-privileged-customer-role-split-rc45.js
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
 * Original-Hash: 506fd6f6b272a22902c12dceaee416831bc9dfb1c12c12cd13006f241bb4fb4c
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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/main.ts'), 'utf8');

const installer = /installer:\s*\[([\s\S]*?)\]\s*,\s*customer:/.exec(source);
const customer = /customer:\s*\[([\s\S]*?)\]\s*,\s*display:/.exec(source);
assert.ok(installer && customer, 'Rollen-Capability-Blöcke nicht gefunden.');

for (const cap of ['appcenter.open', 'simulation.open', 'smarthome.configure', 'nexologic.configure']) {
  assert.match(installer[1], new RegExp(`['\"]${cap.replace('.', '\\.') }['\"]`), `Installer-Capability fehlt: ${cap}`);
  assert.doesNotMatch(customer[1], new RegExp(cap.replace('.', '\\.')), `Customer darf ${cap} nicht besitzen.`);
}
for (const cap of ['smarthome.configureCustomer', 'nexologic.configureCustomer']) {
  assert.doesNotMatch(customer[1], new RegExp(cap.replace('.', '\\.')), `Veraltete Customer-Capability: ${cap}`);
}

assert.match(source, /const\s+requireCustomerWorkspace\s*=\s*requireAuth/);
assert.match(source, /app\.get\('\/api\/smarthome\/config',\s*requireSmartHomeConfig/);
assert.match(source, /app\.post\('\/api\/smarthome\/config',\s*requireSmartHomeConfig/);
assert.match(source, /app\.get\('\/api\/smarthome\/dpsearch',\s*requireDpDiscovery/);
assert.match(source, /app\.get\('\/api\/logic\/editor',\s*requireNexoLogicConfig/);
assert.match(source, /app\.post\('\/api\/logic\/editor',\s*requireNexoLogicConfig/);

assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'appcenter\.open'/);
assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'simulation\.open'/);
assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'license\.manage'/);

const rawWrite = /api\/smarthome\/dptest-write[\s\S]{0,260}/.exec(source);
if (rawWrite) assert.match(rawWrite[0], /requireInstaller|requireCapability/, 'Beliebiger Roh-DP-Schreibtest muss Installer-geschützt bleiben.');

console.log('[rc45-role-split] OK: SmartHome/NexoLogic-Einrichtung bleibt Installer/Admin vorbehalten; Kundenrechte enthalten keine Konfiguration.');
