// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ordnet zeitversetzte Speicher-Rückmeldungen den zuvor wirksamen Stellanforderungen zu.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Herstellerunabhängige Schätzung für asynchrone Speicher-Telemetrie.
 *
 * Problem:
 * Batterie-Istleistung und NVP werden bei vielen Speichern nicht im selben Takt
 * aktualisiert. Der letzte Sollwert darf deshalb kurzfristig als erwartete
 * Speicherreaktion berücksichtigt werden. Derselbe NVP-Fehler darf dabei aber
 * niemals in jedem EMS-Zyklus erneut auf den Sollwert addiert werden.
 *
 * Modell:
 * - Ein erfolgreich akzeptierter Speicherbefehl bildet einen Kommando-Anker.
 * - Solange derselbe echte Batterie-Messwert gilt, wird eine NVP-Bewegung in der
 *   erwarteten Richtung zunächst als Speicherreaktion interpretiert.
 * - Nur der NVP-Anteil außerhalb der maximal erwartbaren Speicherwirkung gilt als
 *   neue externe Last-/PV-Änderung.
 * - Dadurch bleibt ein konstanter Fall konstant, eine echte Laständerung kann aber
 *   weiterhin genau einmal nachgeführt werden.
 */

declare const module: { exports: unknown };

type AsyncCommandAnchor = {
  feedbackKey?: string;
  sampleTs?: number;
  sampleW?: number;
  controlKey?: string;
  baseActualW?: number;
  targetW?: number;
  nvpW?: number;
  nvpTargetW?: number;
  acceptedMs?: number;
};

type AsyncEstimateInput = {
  anchor?: AsyncCommandAnchor | null;
  feedbackKey?: string;
  sampleTs?: number;
  sampleW?: number;
  controlKey?: string;
  nvpW?: number;
  nvpTargetW?: number;
  lastTargetW?: number;
  lastTargetAllowed?: boolean;
  targetToleranceW?: number;
  sampleToleranceW?: number;
};

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function estimateAsyncStorageFeedback(input: AsyncEstimateInput = {}) {
  const anchor = input.anchor && typeof input.anchor === 'object' ? input.anchor : null;
  const feedbackKey = String(input.feedbackKey || '').trim();
  const controlKey = String(input.controlKey || '').trim();
  const sampleTs = finiteOrNull(input.sampleTs);
  const sampleW = finiteOrNull(input.sampleW);
  const nvpW = finiteOrNull(input.nvpW);
  const nvpTargetW = finiteOrNull(input.nvpTargetW) ?? 0;
  const lastTargetW = finiteOrNull(input.lastTargetW);
  const targetToleranceW = Math.max(0.5, finiteOrNull(input.targetToleranceW) ?? 2);
  const sampleToleranceW = Math.max(0.5, finiteOrNull(input.sampleToleranceW) ?? 2);

  const inactive = (reason: string) => ({
    active: false,
    reason,
    estimatedActualW: sampleW,
    feedbackKey,
    controlKey,
    sampleTs,
    sampleW,
    nvpW,
    nvpTargetW,
    commandTargetW: null,
    commandBaseActualW: null,
    commandNvpW: null,
    commandAcceptedMs: null,
    expectedStorageDeltaW: 0,
    observedNvpDeltaW: 0,
    attributedStorageNvpDeltaW: 0,
    attributedStoragePowerDeltaW: 0,
    residualNvpDeltaW: 0,
  });

  if (!anchor) return inactive('no-command-anchor');
  if (input.lastTargetAllowed !== true) return inactive('last-target-not-authorized');
  if (!feedbackKey || String(anchor.feedbackKey || '') !== feedbackKey) return inactive('feedback-key-changed');
  if (!controlKey || String(anchor.controlKey || '') !== controlKey) return inactive('control-key-changed');

  const anchorSampleTs = finiteOrNull(anchor.sampleTs);
  const anchorSampleW = finiteOrNull(anchor.sampleW);
  const anchorTargetW = finiteOrNull(anchor.targetW);
  const anchorBaseActualW = finiteOrNull(anchor.baseActualW);
  const anchorNvpW = finiteOrNull(anchor.nvpW);
  const anchorAcceptedMs = finiteOrNull(anchor.acceptedMs);

  if (sampleTs === null || anchorSampleTs === null || Math.abs(sampleTs - anchorSampleTs) > 2) {
    return inactive('new-feedback-sample');
  }
  if (sampleW === null || anchorSampleW === null || Math.abs(sampleW - anchorSampleW) > sampleToleranceW) {
    return inactive('feedback-value-changed');
  }
  if (anchorTargetW === null || anchorBaseActualW === null || anchorNvpW === null || nvpW === null) {
    return inactive('anchor-incomplete');
  }
  if (anchorAcceptedMs === null || anchorAcceptedMs <= anchorSampleTs) {
    return inactive('anchor-not-after-sample');
  }
  if (lastTargetW === null || Math.abs(lastTargetW - anchorTargetW) > targetToleranceW) {
    return inactive('accepted-target-changed');
  }
  if (Math.abs(anchorTargetW) <= targetToleranceW) return inactive('zero-command-anchor');

  const expectedStorageDeltaW = anchorTargetW - anchorBaseActualW;
  const observedNvpDeltaW = nvpW - anchorNvpW;
  let attributedStorageNvpDeltaW = 0;

  if (expectedStorageDeltaW > targetToleranceW) {
    // Mehr Entladung senkt den NVP. Nur eine Bewegung zwischen 0 und der maximal
    // erwartbaren Absenkung wird als Speicherreaktion gutgeschrieben.
    attributedStorageNvpDeltaW = clamp(observedNvpDeltaW, -expectedStorageDeltaW, 0);
  } else if (expectedStorageDeltaW < -targetToleranceW) {
    // Mehr Ladung erhöht den NVP. Nur eine Bewegung zwischen 0 und der maximal
    // erwartbaren Erhöhung wird als Speicherreaktion gutgeschrieben.
    attributedStorageNvpDeltaW = clamp(observedNvpDeltaW, 0, -expectedStorageDeltaW);
  }

  const attributedStoragePowerDeltaW = -attributedStorageNvpDeltaW;
  const estimatedActualW = anchorBaseActualW + attributedStoragePowerDeltaW;
  const residualNvpDeltaW = observedNvpDeltaW - attributedStorageNvpDeltaW;

  return {
    active: true,
    reason: 'command-anchor',
    estimatedActualW,
    feedbackKey,
    controlKey,
    sampleTs,
    sampleW,
    nvpW,
    nvpTargetW,
    commandTargetW: anchorTargetW,
    commandBaseActualW: anchorBaseActualW,
    commandNvpW: anchorNvpW,
    commandAcceptedMs: anchorAcceptedMs,
    expectedStorageDeltaW,
    observedNvpDeltaW,
    attributedStorageNvpDeltaW,
    attributedStoragePowerDeltaW,
    residualNvpDeltaW,
  };
}

module.exports = {
  estimateAsyncStorageFeedback,
};
