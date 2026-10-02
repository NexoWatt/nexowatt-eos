// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-control-app-separation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-control-app-separation.js
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
 * Original-Hash: 6d430052367b1fa822db913f1e6e990512d8f26206556d30ab97b2b5e6a0797e
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
/** Regression 0.8.138: Writer-Topologie und Speicher-Policy bleiben getrennt. */
const fs = require('fs');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(file) { return fs.readFileSync(file, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle, label) { if (!read(file).includes(needle)) { console.error(`[storage-control-app-separation] FEHLT ${label}: ${needle}`); process.exit(1); } }
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle, label) { if (read(file).includes(needle)) { console.error(`[storage-control-app-separation] VERBOTEN ${label}: ${needle}`); process.exit(1); } }

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'const enabled = !!storageAuthorityEarly.writerActive;', 'genau ein Writer');
  must(file, 'Tarif, MultiUse, Peak-Shaving und Eigenverbrauch sind ausschliesslich', 'Policy/Writer-Trennung');
  must(file, "const farmEnabledEarly = storageAuthorityEarly.selectedTopology === 'farm';", 'exklusive Farmtopologie');
  must(file, "await this._setIfChanged('speicher.regelung.aktivAutoMultiUse', multiUseAppPolicyActive);", 'MultiUse-Diagnose');
  must(file, "await this._setIfChanged('speicher.regelung.topologie'", 'Topologie-Diagnose');
  must(file, 'const storageOnlyPolicyActive = !multiUsePolicyActive;', 'Standalone-Policy');
  must(file, "const multiUseOwnsZones = storageOperatingPolicy.mode === 'multiuse';", 'aktiver Zonenbesitzer');
  must(file, 'const evcsStorageAssistPolicyAllowed = !!multiUsePolicyActive;', 'EVCS-Assist bleibt MultiUse-Policy');
  must(file, 'pureSelfConsumptionWithoutMultiUse: !multiUsePolicyActive', 'Policy-JSON');
}

for (const file of [
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-mirrors/main.ts',
  'main.js',
]) {
  must(file, 'const active = !!(nativeObj.enableMultiUse === true && mu && mu.enabled === true);', 'MultiUse nur bei App+Policy aktiv');
  must(file, 'st.multiUsePolicyActive = active;', 'Policy-Marker');
  must(file, 'MultiUse-Zonen nicht mehr in `storage.*` kopiert', 'keine SoC-Spiegelung');
  must(file, '_nwGetStorageControlAuthority()', 'zentrale Steuerhoheit');
  must(file, 'Speicherfarm und Einzelregelung verwenden exakt dieselbe zentrale Policy', 'Farm-/Single-Gleichlauf');
  mustNot(file, 'nativeObj.enableStorageControl = true;', 'MultiUse darf Writer nicht aktivieren');
  mustNot(file, 'st.selfMinSocPct = selfMin;', 'MultiUse darf Standalone-Konfiguration nicht überschreiben');
  mustNot(file, 'delete st[k]', 'Storage-Konfiguration nicht löschen');
}

must('src-ts/runtime-executables/main.ts', 'Eine bewusst eingetragene 0-W-Vorgabe sperrt diese Richtung', 'Farm-0-W-Sperre');
must('src-ts/runtime-executables/main.ts', 'if (!Number.isFinite(n) || n < 0) return null;', '0-W nicht als leer');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Leer = unbegrenzt, 0 W = diese Richtung sperren', 'UI-Hinweis');
must('www/ems-apps.js', 'Leer = unbegrenzt, 0 W = diese Richtung sperren', 'Runtime-UI-Hinweis');

console.log('[storage-control-app-separation] OK: Policy, Writer-Topologie und Farm-Limits bleiben sauber getrennt.');
