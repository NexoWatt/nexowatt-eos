// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vereinheitlicht Ladeenergie- und Einheitenangaben, bevor sie bilanziert oder angezeigt werden.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/evcs-unit-conversion.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Normalisiert Ladepunkt-Messwerte in die internen NexoWatt-Einheiten.
 * - Momentanleistung bleibt intern W.
 * - Kumulierte Ladeenergie bleibt intern kWh.
 */
'use strict';

declare const module: { exports: unknown };

type EvcsEnergyNormalizationOptions = {
  inputIsWh?: boolean;
};

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Wandelt einen kumulierten Ladeenergie-Zähler in kWh um.
 * Technisch korrekt ist Wh -> kWh (Division durch 1000); Wh kann nicht direkt
 * in kW umgerechnet werden, weil kW eine Leistung und keine Energiemenge ist.
 */
function normalizeEvcsEnergyTotalKwh(value: unknown, options: EvcsEnergyNormalizationOptions = {}): unknown {
  const n = finiteNumber(value);
  if (n === null) return value;
  return options.inputIsWh === true ? (n / 1000) : n;
}

module.exports = {
  normalizeEvcsEnergyTotalKwh,
};
