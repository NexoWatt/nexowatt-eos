// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-storage-assist-policy.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-charging-storage-assist-policy.js
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
 * Original-Hash: 3e800c029f2b74c302a78ea3c65f70690e9dcad61624ce9013b067357afe5a30
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
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const fail = (msg) => {
  console.error(`[ts-charging-storage-assist-policy] ${msg}`);
  process.exit(1);
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
const mustContain = (rel, needle, label = needle) => {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel}: fehlt ${label}`);
};

mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'storageAssistCustomerAllowed', 'Installer-Freigabe storageAssistCustomerAllowed');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'Kunde darf Speicher-Mitnutzung bedienen', 'Installer-UI Haken');

mustContain('src-ts/runtime-executables/www/ems-apps.ts', "storageAssistAllowedInp.className = 'nw-config-checkbox'", 'Installer-Haken kompakt gestylt');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'nw-config-field-control--checkbox', 'Konfigurationszeile erkennt Checkboxen');
mustContain('www/styles.css', 'App-Center: kompakte Checkboxen in Konfigurationszeilen', 'CSS-Fix gegen übergroße Checkboxen');
mustContain('www/styles.css', 'input.nw-config-checkbox', 'Checkbox-Größe im App-Center begrenzt');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', "storageAssistAllowedInp.className = 'nw-config-checkbox'", 'kompakte Installer-Checkbox');
mustContain('www/styles.css', '.nw-config-checkbox', 'kompakte Checkbox-CSS-Klasse');
mustContain('src-ts/runtime-executables/www/app.ts', 'evcsStorageAssistRow', 'LIVE Speicher-Row');
mustContain('src-ts/runtime-executables/www/app.ts', 'data-storage-assist', 'LIVE Speicher-Buttons');
mustContain('www/index.html', 'evcsStorageAssistRow', 'LIVE Modal HTML Speicher-Row');
mustContain('src-ts/runtime-executables/www/evcs.ts', 'data-ems-storage-assist-btn', 'EVCS Detail Speicher-Buttons');
mustContain('src-ts/runtime-executables/www/evcs.ts', 'evcsStorageAssistCustomerAllowed', 'EVCS Detail Installer-Sichtbarkeit');
mustContain('src-ts/runtime-executables/main.ts', 'storage_assist_locked', 'Backend-Sperre bei fehlender Installer-Freigabe');
mustContain('src-ts/runtime-executables/main.ts', 'userStorageAssistEnabled', 'Backend User-State');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storageAssistCustomerAllowed', 'Runtime Installer-Freigabe');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'effectiveStorageAssist', 'Runtime effektive Speicher-Mitnutzung');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'batteryContributionW', 'Runtime Batterieanteil');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storageProtectionRequested', 'Runtime expliziter Speicher-Schutz');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'normal-self-consumption', 'Runtime Default Eigenverbrauch ohne Schutzfreigabe');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', "mode: assist ? 'assist' : (protect ? 'protect' : 'normal')", 'Keine implizite Schutzaktivierung ohne Installer-Freigabe');
mustContain('src-ts/runtime-executables/ems/modules/charging-management.ts', 'installer-locked', 'Runtime Sperrgrund');
mustContain('src-ts/ems/charging-management/charging-allocation.ts', 'storageAssistCustomerAllowed', 'TS Allocation Storage-Felder');
mustContain('src-ts/ems/charging-management/charging-allocation.ts', 'batteryContributionW', 'TS Allocation Batterieanteil');

console.log('[ts-charging-storage-assist-policy] OK: Installer-Freigabe, Kundenwahl, Backend-Gate und EVCS-Storage-Policy sind verdrahtet.');
