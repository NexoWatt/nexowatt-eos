// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/pv-source-identity.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/pv-source-identity.js
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
 * Original-Hash: 4557373379f195d17f771f060752dce4aa8a82696d51763744e106daf9abe626
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/pv-source-identity.ts
 * Quell-Hash: sha256:fda71866b598cb4d5a466fd87e128a88fe5128df8574c65a87491f8651c497bf
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/pv-source-identity.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vereinheitlicht die Identität von PV-Quellen, damit dieselbe Quelle nicht mehrfach berücksichtigt wird.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/pv-source-identity.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.physicalPvSourceKey = physicalPvSourceKey;
exports.dedupePvSourceRows = dedupePvSourceRows;
exports.applyPvCapacityPlausibility = applyPvCapacityPlausibility;
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(value) {
    return String(value ?? '').trim();
}
/**
 * Code-Teil: finiteNonNegative
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finiteNonNegative(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}
/**
 * Normalisiert verschiedene Alias-/Messpfade auf eine physische PV-/WR-Quelle.
 * Insbesondere werden r.power, r.pvPower und konfigurierte Alias-States desselben
 * nexowatt-devices-Geräts als eine Quelle erkannt.
 */
function physicalPvSourceKey(rawId) {
    let id = text(rawId).replace(/[?#].*$/, '');
    if (!id)
        return '';
    const deviceMatch = id.match(/^(.*?\.devices\.[^.]+)/i);
    if (deviceMatch?.[1])
        return deviceMatch[1].toLowerCase();
    const channelMatch = id.match(/^(.*?\.(?:inverters?|wechselrichter|pv)\.[^.]+)/i);
    if (channelMatch?.[1])
        return channelMatch[1].toLowerCase();
    id = id
        .replace(/\.aliases\..*$/i, '')
        .replace(/\.(?:r|read|measurement|measurements)\.(?:pvpower|power|active_power|activepower)$/i, '')
        .replace(/\.(?:pvpower|pv_power|active_power|activepower|power)$/i, '');
    return id.toLowerCase();
}
/** Dedupliziert PV-Quellen nach physischem Gerät und behält den frischeren/höheren Wert. */
function dedupePvSourceRows(input) {
    const best = new Map();
    let rawTotalW = 0;
    let duplicateCount = 0;
    for (const source of input || []) {
        if (!source || typeof source !== 'object')
            continue;
        const powerW = finiteNonNegative(source.powerW);
        rawTotalW += powerW;
        const id = text(source.id);
        const key = physicalPvSourceKey(id) || id.toLowerCase();
        if (!key)
            continue;
        const previous = best.get(key);
        if (!previous) {
            best.set(key, { ...source, id, powerW });
            continue;
        }
        duplicateCount++;
        const previousAge = Number(previous.ageMs);
        const currentAge = Number(source.ageMs);
        const previousFreshness = Number.isFinite(previousAge) ? previousAge : Number.POSITIVE_INFINITY;
        const currentFreshness = Number.isFinite(currentAge) ? currentAge : Number.POSITIVE_INFINITY;
        const previousPower = finiteNonNegative(previous.powerW);
        const useCurrent = currentFreshness < previousFreshness
            || (currentFreshness === previousFreshness && powerW > previousPower);
        if (useCurrent)
            best.set(key, { ...source, id, powerW });
    }
    const rows = Array.from(best.values());
    const uniqueTotalW = rows.reduce((sum, row) => sum + finiteNonNegative(row.powerW), 0);
    return {
        rows,
        rawTotalW,
        uniqueTotalW,
        duplicateSuppressedW: Math.max(0, rawTotalW - uniqueTotalW),
        duplicateCount,
    };
}
/** Begrenzt nur bei explizit konfigurierter Anlagenleistung, mit Peak-Toleranz. */
function applyPvCapacityPlausibility(rawValueW, installedCapacityW, toleranceRaw = 0.15) {
    const rawW = finiteNonNegative(rawValueW);
    const installedW = finiteNonNegative(installedCapacityW);
    const tolerance = Math.max(0.05, Math.min(0.5, Number.isFinite(Number(toleranceRaw)) ? Number(toleranceRaw) : 0.15));
    const capacityLimitW = installedW > 0 ? installedW * (1 + tolerance) : 0;
    const outputW = capacityLimitW > 0 ? Math.min(rawW, capacityLimitW) : rawW;
    return {
        rawW,
        outputW,
        capacityLimitW,
        capped: capacityLimitW > 0 && rawW > capacityLimitW,
        suppressedW: Math.max(0, rawW - outputW),
    };
}
module.exports = { physicalPvSourceKey, dedupePvSourceRows, applyPvCapacityPlausibility };
