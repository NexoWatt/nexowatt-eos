// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/storage-farm-aggregation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/storage-farm-aggregation.js
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
 * Original-Hash: 6a32ab2538133dabe60813a375fc64e14b46a639131c165de01dee14df56536f
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
 * Quelle: src-ts/runtime-executables/ems/services/storage-farm-aggregation.ts
 * Quell-Hash: sha256:70253ff3ab99826218316525dde6c062c2874c7e1d8393b6805ffdde00dcf641
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-farm-aggregation.js.
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
 * Aufgabe: Aggregiert Speicherfarm-Werte unter Berücksichtigung der verwendeten Mess- und Zuordnungskonfiguration.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-farm-aggregation.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/services/storage-farm-aggregation.js
 *
 * Zweck:
 * Hält die rein mathematischen Speicherfarm-Aggregationen an einer zentralen Stelle.
 * So verwenden Farm-States, Energiefluss, Historie und Regressionstests dieselben
 * Regeln für SoC-Mittelwert, signierte Gesamtleistung und PV-Zusammenführung.
 */

'use strict';

/**
 * Wandelt einen Rohwert in eine nicht-negative Leistung um.
 * Ungültige Werte werden als 0 W behandelt, damit Summen keine NaN-Kaskaden erzeugen.
 */
function nonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Berechnet den arithmetischen Mittelwert aller gültigen Zahlen.
 * Der Farm-Gesamt-SoC ist damit der echte Mittelwert der einzelnen Speicher-SoCs.
 */
function arithmeticMean(values) {
  const valid = [];
  for (const raw of (Array.isArray(values) ? values : [])) {
    // null, undefined und leere Strings sind fehlende Messwerte und dürfen nicht
    // als künstliche 0-%-Speicher in den Farm-Mittelwert eingehen.
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) valid.push(value);
  }
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

/**
 * Berechnet zusätzlich den kapazitätsgewichteten SoC als Diagnosewert.
 * Dieser Wert bleibt verfügbar, führt aber nicht mehr die Kundenanzeige.
 */
function capacityWeightedMean(entries) {
  let weighted = 0;
  let weightSum = 0;
  for (const entry of (Array.isArray(entries) ? entries : [])) {
    const rawValue = entry && entry.value;
    if (rawValue === null || rawValue === undefined || rawValue === '' || typeof rawValue === 'boolean') continue;
    const value = Number(rawValue);
    const weightRaw = Number(entry && entry.weight);
    if (!Number.isFinite(value)) continue;
    const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : 1;
    weighted += value * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? (weighted / weightSum) : 0;
}

/**
 * Normalisiert die Farm-Gesamtleistung auf die NexoWatt-Konvention:
 * - positive signierte Leistung = Entladen
 * - negative signierte Leistung = Laden
 */
function normalizeFarmPower(chargeW, dischargeW) {
  const charge = nonNegativeNumber(chargeW);
  const discharge = nonNegativeNumber(dischargeW);
  return {
    chargeW: charge,
    dischargeW: discharge,
    signedW: discharge - charge,
  };
}

/**
 * Führt Anlagen-PV und Farm-/Wechselrichter-PV ohne Doppelzählung zusammen.
 *
 * Regeln:
 * - Fehlt eine Anlagen-PV, wird die komplette Farm-PV verwendet.
 * - Bei exakter DP-Überlappung werden nur die übrigen eindeutigen Farmquellen addiert.
 * - Ohne DP-Überlappung bleibt Farm-AC/Unknown ein Fallback, weil ein gemappter
 *   Anlagen-PV-DP in der Regel bereits die AC-Wechselrichter der Anlage enthält.
 * - Farm-DC/Hybrid darf addiert werden, außer Anlagen-PV und Farm-DC sind nahezu
 *   identisch und der Hybridanteil ist damit offensichtlich bereits enthalten.
 */
function combineStorageFarmPv(input = {}) {
  const sitePvW = nonNegativeNumber(input.sitePvW);
  const farmAcW = nonNegativeNumber(input.farmAcW);
  const farmDcW = nonNegativeNumber(input.farmDcW);
  const farmUnknownW = nonNegativeNumber(input.farmUnknownW);
  const farmTotalStateW = nonNegativeNumber(input.farmTotalW);
  const overlapAcW = Math.min(farmAcW, nonNegativeNumber(input.overlapAcW));
  const overlapDcW = Math.min(farmDcW, nonNegativeNumber(input.overlapDcW));
  const overlapUnknownW = Math.min(farmUnknownW, nonNegativeNumber(input.overlapUnknownW));
  const tolerance = Number.isFinite(Number(input.tolerance))
    ? Math.max(0.01, Math.min(0.25, Number(input.tolerance)))
    : 0.05;

  const farmAcLikeW = farmAcW + farmUnknownW;
  const farmCategorizedW = farmAcLikeW + farmDcW;
  const farmTotalW = Math.max(farmTotalStateW, farmCategorizedW);
  const overlapTotalW = overlapAcW + overlapDcW + overlapUnknownW;
  const exactOverlap = overlapTotalW > 0;

  if (sitePvW <= 0) {
    return {
      acW: farmAcLikeW,
      dcW: farmDcW,
      totalW: farmTotalW,
      farmAddedW: farmTotalW,
      duplicateSuppressedW: 0,
      farmFallbackUsed: farmTotalW > 0,
      source: farmTotalW > 0 ? 'storage-farm' : 'missing',
    };
  }

  if (farmTotalW <= 0) {
    return {
      acW: sitePvW,
      dcW: 0,
      totalW: sitePvW,
      farmAddedW: 0,
      duplicateSuppressedW: 0,
      farmFallbackUsed: false,
      source: 'base',
    };
  }

  if (exactOverlap) {
    // Bei identischer Objekt-ID ist bekannt, welcher Farmanteil bereits im zentralen
    // Anlagenwert steckt. Der Basiswert wird mindestens auf den frischen Farmwert der
    // überlappenden Quelle angehoben, damit ein kurzzeitig veralteter/0-W-Basiswert die
    // Farm-PV nicht verschwinden lässt. Anschließend werden nur eindeutige Restquellen
    // addiert.
    const effectiveSitePvW = Math.max(sitePvW, overlapTotalW);
    const addAcW = Math.max(0, farmAcW - overlapAcW);
    const addDcW = Math.max(0, farmDcW - overlapDcW);
    const addUnknownW = Math.max(0, farmUnknownW - overlapUnknownW);

    // Ist die überlappende Quelle eindeutig DC, bleibt auch ihre Darstellung DC.
    // In allen anderen Fällen wird der zentrale Anlagenwert als AC-/Anlagen-PV geführt.
    const overlapIsOnlyDc = overlapDcW > 0 && overlapAcW <= 0 && overlapUnknownW <= 0;
    const baseAcW = overlapIsOnlyDc ? 0 : effectiveSitePvW;
    const baseDcW = overlapIsOnlyDc ? effectiveSitePvW : 0;
    const farmAddedW = addAcW + addDcW + addUnknownW;
    const totalW = effectiveSitePvW + farmAddedW;

    return {
      acW: baseAcW + addAcW + addUnknownW,
      dcW: baseDcW + addDcW,
      totalW,
      farmAddedW: Math.max(0, totalW - sitePvW),
      duplicateSuppressedW: Math.max(0, farmTotalW - farmAddedW),
      farmFallbackUsed: false,
      source: farmAddedW > 0 || effectiveSitePvW > sitePvW
        ? 'base+storage-farm-exact'
        : 'base-exact',
    };
  }

  // Ohne identische Objekt-ID muss die Zusammenführung konservativ gegen
  // Doppelzählungen bleiben:
  // - Enthält die Farm AC-/WR-Quellen, behandeln wir Anlagen-PV und Farm-AC als zwei
  //   alternative Sichten auf dieselbe Erzeugung und nehmen die größere vollständige
  //   Summe. So werden mehrere Farm-Wechselrichter sichtbar, ohne einen Anlagen-Gesamt-DP
  //   erneut aufzuschlagen.
  // - Besteht die Farm ausschließlich aus DC-/Hybrid-PV, wird dieser Anteil nur dann
  //   addiert, wenn der Anlagenwert deutlich kleiner ist und daher nicht dieselbe Quelle
  //   darstellen kann.
  if (farmAcLikeW > 0) {
    const totalW = Math.max(sitePvW, farmTotalW);
    const farmAddedW = Math.max(0, totalW - sitePvW);
    const farmDominates = farmTotalW > sitePvW;
    return {
      acW: farmDominates ? Math.max(0, farmAcLikeW) : sitePvW,
      dcW: farmDominates ? farmDcW : 0,
      totalW,
      farmAddedW,
      duplicateSuppressedW: Math.max(0, farmTotalW - farmAddedW),
      farmFallbackUsed: false,
      source: farmAddedW > 0 ? 'base+storage-farm' : 'base',
    };
  }

  const dcDiff = Math.abs(sitePvW - farmDcW) / Math.max(1, farmDcW);
  const dcAlreadyIncluded = farmDcW > 0 && (sitePvW >= farmDcW || dcDiff <= tolerance);
  const addDcW = dcAlreadyIncluded ? 0 : farmDcW;
  const totalW = sitePvW + addDcW;
  return {
    acW: sitePvW,
    dcW: addDcW,
    totalW,
    farmAddedW: addDcW,
    duplicateSuppressedW: Math.max(0, farmTotalW - addDcW),
    farmFallbackUsed: false,
    source: addDcW > 0 ? 'base+storage-farm' : 'base',
  };
}

module.exports = {
  arithmeticMean,
  capacityWeightedMean,
  combineStorageFarmPv,
  normalizeFarmPower,
  nonNegativeNumber,
};
