// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-farm-auto-dispatch.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-farm-auto-dispatch.js
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
 * Original-Hash: adb277322c5141f3ff4295093e95318c024a35dda500b6f274a9c078cfca306e
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

/**
 * Regression 0.8.126: Eine echte Speicherfarm (App aktiv, >=2 Speicher,
 * beschreibbare Setpoints) wird als exklusive Schreibtopologie ausgewählt.
 * Der Farm-Dispatcher matched Statuszeilen ueber stabile Hardware-IDs und
 * aktualisiert einen fehlenden/veralteten Status vor dem ersten Write.
 */
const assert = require('assert');
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
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function has(file, needle, label = needle) {
  assert(read(file).includes(needle), `${label} fehlt in ${file}`);
}

const storageFiles = [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
];
for (const file of storageFiles) {
  has(file, 'const enabled = !!storageAuthorityEarly.writerActive;', 'zentrale Writer-Aktivierung');
  has(file, "const farmEnabledEarly = storageAuthorityEarly.selectedTopology === 'farm';", 'exklusive Farm-Topologie');
  has(file, "await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', farmAppPolicyActive);", 'Farm-Autostart Diagnose');
  has(file, 'const farmAppPolicyActive = !!storageAuthorityEarly.farmDispatchActive;', 'autoritativer Farm-Dispatchstatus');
  has(file, "const hasFarmSetpoints = storageAuthorityEarly.selectedTopology === 'farm';", 'Farm-Setpoint-Gate folgt Topologie');
  has(file, '_isStorageFarmDispatchEnabled()', 'beschreibbare Farm als Schreib-Gate');
}

const mainFiles = [
  'src-ts/runtime-executables/main.ts',
  'main.js',
];
for (const file of mainFiles) {
  has(file, 'dispatchKey: this._sfGetStorageDispatchKey(row, configured - 1)', 'Statuszeile mit stabilem Dispatch-Key');
  has(file, "return `set-signed:${setSigned}`", 'Signed-Setpoint als stabile Farm-ID');
  has(file, "return `set-split:${setCharge}|${setDischarge}`", 'Split-Setpoints als stabile Farm-ID');
  has(file, "await this.updateStorageFarmDerived('dispatch-preflight')", 'Status-Refresh vor Dispatch');
  has(file, 'const statusByKey = new Map();', 'Status-Matching per Hardware-Key');
  has(file, "statusMatch = 'legacy-hardware-match'", 'eindeutiger Legacy-Hardware-Fallback');
  assert(!read(file).includes("const st = (status && status[i] && typeof status[i] === 'object') ? status[i] : {};"), `${file}: nacktes Array-Index-Matching darf nicht mehr regulaer verwendet werden`);
  has(file, "resultReason = 'farm-status-missing'", 'eindeutiger Fehlergrund bei fehlendem Farmstatus');
}

console.log('[storage-farm-auto-dispatch] OK: Farm wird exklusiv ausgewählt, aktualisiert Status und matched Speicher stabil nach Hardware-ID.');
