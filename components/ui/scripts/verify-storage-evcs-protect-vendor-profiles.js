#!/usr/bin/env node
'use strict';

/**
 * Regression Baustein 7:
 * "Speicher schuetzen" arbeitet asymmetrisch.
 * - Entladen nur fuer Haus-/sonstige Last ohne geschuetzte E-Mobilitaet.
 * - Laden nur aus echtem Gesamtueberschuss nach Haus UND EVCS.
 * - Ein alter Ladebefehl wird bei fehlendem Ueberschuss mit einem expliziten
 *   0-W-Stop beendet und nicht von der Zero-Write-Firewall gehalten.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolveEvcsProtectedStorageTarget } = require('../ems/modules/storage-control');
const { decideStorageZeroWrite } = require('../ems/services/storage-zero-write-policy');

const root = path.resolve(__dirname, '..');
const storagePath = path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts');
const chargingPath = path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts');
const storage = fs.readFileSync(storagePath, 'utf8');
const charging = fs.readFileSync(chargingPath, 'utf8');

function assertContains(text, needle, label) {
  assert(text.includes(needle), `${label} fehlt:\n${needle}`);
}

function assertNotContains(text, needle, label) {
  assert(!text.includes(needle), `${label} darf nicht mehr enthalten sein:\n${needle}`);
}

function resolve(patch = {}) {
  return resolveEvcsProtectedStorageTarget({
    requestedTargetW: 0,
    lastTargetW: 0,
    protectedEvcsLoadW: 3000,
    nvpW: 0,
    targetNvpW: 50,
    storageActualW: 0,
    deadbandW: 50,
    ...patch,
  });
}

// Charging publiziert nur die explizit geschuetzte, frische EVCS-Leistung.
assertContains(charging, 'chargingManagement.control.storageProtectedLoadW', 'EVCS protected-load state');
assertContains(charging, 'publishEvStoragePolicyCaps', 'same-cycle EVCS storage policy');
assertContains(charging, "const modeAllowsStoragePolicy = normalizedMode === 'auto'", 'modegebundene EVCS-Speicherpolicy');
assertContains(charging, "const protect = allowed && modeAllowsStoragePolicy && !assist", 'explizite Protect/Assist-Trennung');
assertContains(charging, 'resolveEvcsStoragePolicy(storageAssistCustomerAllowed, userStorageAssistEnabled, userMode)', 'PV-Modus muss die Speicherpolicy zur Laufzeit neutralisieren');

// Der alte symmetrische NVP-Offset ist entfernt. Er hatte bei Teildeckung der
// Wallbox Netzladen des Speichers erzeugt.
assertContains(storage, 'const evcsStorageProtectedNvpTargetShiftW = 0;', 'Legacy-Offset ist neutralisiert');
assertNotContains(storage, 'const evcsStorageProtectedNvpTargetShiftW = evcsStorageProtectedLoadW;', 'symmetrischer EVCS-NVP-Offset');
assertNotContains(storage, 'const desiredNvpW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW', 'verschobenes Eigenverbrauchsziel');
assertNotContains(storage, 'num(cfg.sungrowTargetGridImportW, selfTargetGridW) + evcsStorageProtectedNvpTargetShiftW', 'verschobenes Sungrow-Ziel');
assertNotContains(storage, 'num(cfg.tariffTargetGridImportW, selfTargetGridW) + evcsStorageProtectedNvpTargetShiftW', 'verschobenes Tarifziel');

// Die finale Schranke muss NACH den Herstellerprofilen, aber VOR den finalen
// Budget-/Write-Gates liegen, damit alle AppCenter-Ausgangsarten dieselbe Regel erhalten.
const sungrowIndex = storage.indexOf('// Sungrow Hybrid ESS Herstellerprofil');
const protectionIndex = storage.indexOf('// Finale asymmetrische EVCS-Speicherschutzschranke');
const finalPvBudgetIndex = storage.indexOf('// Finaler zentraler PV-Budget-Cap NACH allen Herstellerprofilen');
assert(sungrowIndex >= 0 && protectionIndex > sungrowIndex, 'EVCS-Schutz muss nach Sungrow/FENECON-Herstellerlogik liegen');
assert(finalPvBudgetIndex > protectionIndex, 'EVCS-Schutz muss vor finalem PV-Budget/Write liegen');
assertContains(storage, 'resolveEvcsProtectedStorageTarget({', 'produktive asymmetrische Schutzschranke');
assertContains(storage, 'const protectionTargetNvpW = Math.max(0, selfTargetGridW);', 'Speicherschutz nutzt ausschliesslich das normale Eigenverbrauchsziel');
assertContains(storage, "sungrowWriteMode = 'write-stop-evcs-protection'", 'Sungrow expliziter 0-W-Stop');
assertContains(storage, '|| evcsProtectedChargeStop', 'Zero-Write-Firewall erkennt Lade-Stop');
assertContains(storage, '|| evcsProtectedDischargeStop', 'Zero-Write-Firewall erkennt Entlade-Stop');
assertContains(storage, 'speicher.regelung.evcsSpeicherSchutzJson', 'kompakte JSON-Diagnose ohne neue Statuskarten');
assertContains(storage, 'const e3dcResult = await this._writeE3dcRscpTargetW(w, reason, source, e3dcCommandCfg)', 'E3/DC bleibt am gemeinsamen finalen Zielpfad');
assertContains(storage, 'const e3dcCommandCfg = w === 0 && options.evcsProtectedLoadUnknown === true', 'IDLE-Override nur beim neuen Telemetrie-Schutzstopp');
assertContains(storage, "? { ...cfg, e3dcZeroMode: 'idle' } : cfg;", 'normale E3/DC-Konfiguration bleibt ausserhalb des Schutzstopps unveraendert');

// Exakter Kundenfall aus dem Screenshot:
// NVP +3,2 kW, Speicher laedt -2,3 kW, geschuetzte EVCS +3,58 kW.
// Hinter dem NVP verbleiben nur ca. 0,9 kW Gesamtdefizit; ohne EVCS gibt es
// keinen Hausbedarf. Der alte -1.869-W-Ladebefehl muss explizit gestoppt werden.
const customer = resolve({
  requestedTargetW: -1869,
  lastTargetW: -1869,
  protectedEvcsLoadW: 3580,
  nvpW: 3200,
  storageActualW: -2300,
});
assert.strictEqual(Math.round(customer.totalDesiredW), 850, 'Gesamtdefizit muss 850 W betragen');
assert.strictEqual(Math.round(customer.houseDesiredW), -2730, 'ohne EVCS besteht kein Haus-Entladebedarf');
assert.strictEqual(customer.targetW, 0, 'Speicher darf ohne Gesamtueberschuss nicht weiter laden');
assert.strictEqual(customer.chargeStop, true, 'alter Ladebefehl braucht expliziten Stop');
assert.strictEqual(customer.explicitStop, true, 'Stop muss die 0-W-Firewall passieren');
const customerZero = decideStorageZeroWrite({
  targetW: customer.targetW,
  lastTargetW: -1869,
  explicitStop: customer.explicitStop,
  reason: customer.reason,
  nvpW: 3200,
  nvpTargetW: 50,
  nvpDeadbandW: 50,
});
assert.strictEqual(customerZero.action, 'write-stop', 'Zero-Write-Firewall muss 0 W schreiben statt alten Ladebefehl zu halten');

// Umgekehrter Uebergang: Deckt PV Haus und EVCS bereits vollstaendig,
// darf eine noch laufende Entladung keinen Export erzeugen. Der nachgelagerte
// Ladewunsch ist ohne echten Restueberschuss blockiert; der alte Entladebefehl
// muss deshalb trotzdem mit einem ausdruecklichen 0-W-Stop beendet werden.
const pvCoversAllWhileDischarging = resolve({
  requestedTargetW: -2000,
  lastTargetW: 2300,
  protectedEvcsLoadW: 3580,
  nvpW: -2250,
  storageActualW: 2300,
});
assert.strictEqual(pvCoversAllWhileDischarging.targetW, 0, 'laufende Entladung muss stoppen, wenn PV Haus und EVCS bereits deckt');
assert.strictEqual(pvCoversAllWhileDischarging.dischargeStop, true, 'alter Entladebefehl braucht expliziten Stop');
assert.strictEqual(pvCoversAllWhileDischarging.explicitStop, true);

// Fehlt die Speicher-Telemetrie, darf der sichtbare Export eines zuletzt
// akzeptierten Entladebefehls ebenfalls nicht als echter PV-Ueberschuss gelten.
const pvCoversAllNoFeedback = resolve({
  requestedTargetW: -2000,
  lastTargetW: 2300,
  protectedEvcsLoadW: 3580,
  nvpW: -2250,
  storageActualW: null,
});
assert.strictEqual(pvCoversAllNoFeedback.targetW, 0, 'alter Entladebefehl darf ohne Feedback kein Laden aus vermeintlichem Export ausloesen');
assert.strictEqual(pvCoversAllNoFeedback.dischargeStop, true);

// Hausdefizit darf trotz geschuetzter EVCS aus dem Speicher gedeckt werden.
const houseStart = resolve({ requestedTargetW: 4000, nvpW: 5000, protectedEvcsLoadW: 3000, storageActualW: 0 });
assert.strictEqual(Math.round(houseStart.targetW), 1950, 'Entladung darf nur Hausdefizit abdecken');
assert.strictEqual(houseStart.action, 'cap-discharge-to-house');

// Bereits laufender Hausausgleich bleibt stabil und wird nicht 1950 -> 0 -> 1950 gepulst.
const houseStable = resolve({ requestedTargetW: 2600, lastTargetW: 1950, nvpW: 3050, protectedEvcsLoadW: 3000, storageActualW: 1950 });
assert.strictEqual(Math.round(houseStable.targetW), 1950, 'laufender Hausausgleich muss stabil bleiben');
assert.strictEqual(houseStable.explicitStop, false);

// Ohne bestaetigte Speicher-Istleistung darf ein alter Entlade-Sollwert nicht als
// physisch wirksam angenommen werden. Der Async-Feedback-Anker liefert im normalen
// Betrieb einen bestaetigten/geschaetzten Istwert; fehlt selbst dieser, ist der
// sichere Schutz-Fallback ein ausdruecklicher Stop statt EVCS-Mitversorgung.
const houseNoFeedbackSafeStop = resolve({
  requestedTargetW: 0,
  lastTargetW: 1950,
  nvpW: 3050,
  protectedEvcsLoadW: 3000,
  storageActualW: null,
});
assert.strictEqual(Math.round(houseNoFeedbackSafeStop.targetW), 0, 'ohne bestaetigtes Feedback muss der Schutz sicher stoppen');
assert.strictEqual(houseNoFeedbackSafeStop.dischargeStop, true);
assert.strictEqual(houseNoFeedbackSafeStop.storageActualKnown, false);

const chargeNoFeedback = resolve({
  requestedTargetW: 0,
  lastTargetW: -450,
  nvpW: 50,
  protectedEvcsLoadW: 3000,
  storageActualW: null,
});
assert.strictEqual(chargeNoFeedback.targetW, 0, 'alter Ladebefehl darf ohne Istfeedback und ohne sichtbaren Export nicht gehalten werden');
assert.strictEqual(chargeNoFeedback.chargeStop, true);

// Echter Gesamtexport darf den Speicher laden.
const realSurplus = resolve({ requestedTargetW: -1000, nvpW: -400, protectedEvcsLoadW: 3000, storageActualW: 0 });
assert.strictEqual(Math.round(realSurplus.targetW), -450, 'nur realer Gesamtueberschuss darf laden');
assert.strictEqual(realSurplus.chargeFromSurplus, true);

// Hat die laufende Ladung den Export bereits auf den Zielbezug gezogen, muss sie
// weiterlaufen. Die Speicher-Istleistung macht den zugrunde liegenden Ueberschuss sichtbar.
const chargeStable = resolve({ requestedTargetW: -450, lastTargetW: -450, nvpW: 50, protectedEvcsLoadW: 3000, storageActualW: -450 });
assert.strictEqual(Math.round(chargeStable.targetW), -450, 'PV-Ueberschussladung muss im Zielband gehalten werden');
assert.strictEqual(chargeStable.explicitStop, false);

// Auch ein guenstiges Tarif-/Netzladefenster darf unter aktivem Schutz nicht
// aus dem Netz laden. Der finale Schutz verwendet weiterhin das normale 50-W-NVP-Ziel.
const tariffGridChargeBlocked = resolve({
  requestedTargetW: -5000,
  lastTargetW: 0,
  nvpW: 2500,
  protectedEvcsLoadW: 3000,
  storageActualW: 0,
  targetNvpW: 50,
});
assert.strictEqual(tariffGridChargeBlocked.targetW, 0, 'Tarif-Netzlade-Wunsch muss ohne Gesamtueberschuss blockiert werden');
assert.strictEqual(tariffGridChargeBlocked.chargeFromSurplus, false);

// Ohne Schutz ist der Sollwert unveraendert.
const inactive = resolve({ requestedTargetW: -2200, protectedEvcsLoadW: 0, nvpW: 2000, storageActualW: -1000 });
assert.strictEqual(inactive.active, false);
assert.strictEqual(inactive.targetW, -2200);

console.log('[storage-evcs-protect-vendor-profiles] OK: asymmetrischer Speicherschutz stoppt Netzladen, deckt Hauslast und erlaubt nur echten Gesamtueberschuss.');
