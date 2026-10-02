/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet aus Temperatur-/Freigabebedingungen und Energieangebot die Heizstab-Entscheidung.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/heating-rod/heating-rod-decision.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { HeatingRodDecision, HeatingRodDecisionInput, HeatingRodStageConfig } from '../../contracts/heating-rod';
import type { Watt } from '../../contracts/units';
import { positiveWatt, toNumberOrNull } from '../../utils/number';

/**
 * Datei: src-ts/ems/heating-rod/heating-rod-decision.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für die spätere Heizstab-Entscheidungslogik.
 * Diese Datei ist noch nicht produktiv verdrahtet. Sie beschreibt aber die Regeln, die
 * `ems/modules/heating-rod-control.js` später typisiert einhalten muss.
 *
 * Zusammenhang:
 * Heizstabfreigaben hängen an Core-Limits, PV-Budget, Speicherreserve, Netzfreigabe und
 * den im App-Center gespeicherten Stufen. Fehler an dieser Stelle können direkt Leistung
 * schalten oder fälschlich blockieren.
 *
 * Kritische Regel:
 * Die Speicherreserve kommt aus der Konfiguration und darf nicht auf Defaultwerte springen.
 */

/**
 * Code-Teil: sortedStages
 *
 * Zweck:
 * Sortiert Heizstabstufen nach Leistung und filtert ungültige Einträge.
 *
 * Zusammenhang:
 * Die spätere Runtime muss aus mehreren Stufen die höchste passende Leistung wählen.
 * Durch die Sortierung bleibt die Auswahl deterministisch und testbar.
 */
function sortedStages(stages: HeatingRodStageConfig[]): HeatingRodStageConfig[] {
  return [...stages]
    .filter((stage) => Number.isFinite(stage.powerW) && stage.powerW > 0 && Number.isFinite(stage.stage))
    .sort((a, b) => a.powerW - b.powerW);
}

/**
 * Code-Teil: chooseLargestStageWithinBudget
 *
 * Zweck:
 * Wählt die größte Heizstabstufe, die in das verfügbare Budget passt.
 *
 * Zusammenhang:
 * Dieser Helfer bereitet die spätere Stufenlogik von `heating-rod-control.js` vor. Ein
 * Heizstab darf nur eine Stufe bekommen, die PV-/Gesamtbudget und Speicherreserve erlaubt.
 */
export function chooseLargestStageWithinBudget(stages: HeatingRodStageConfig[], budgetW: Watt): HeatingRodStageConfig | null {
  const valid = sortedStages(stages);
  let chosen: HeatingRodStageConfig | null = null;
  for (const stage of valid) {
    if (stage.powerW <= budgetW) chosen = stage;
  }
  return chosen;
}

/**
 * Code-Teil: isHeatingRodStorageReserveActive
 *
 * Zweck:
 * Prüft, ob ein Heizstab aus Sicht der Speicherreserve blockiert werden muss.
 *
 * Zusammenhang:
 * Wenn Speicherentladung nicht erlaubt ist oder der SoC unter der Reserve liegt, darf der
 * Heizstab nicht durch Speicherleistung gestützt werden. Diese Regel schützt genau den
 * App-Center-Wert „Speicher-Reserve“.
 */
export function isHeatingRodStorageReserveActive(input: HeatingRodDecisionInput): boolean {
  if (!input.device.allowStorageDischarge) return true;
  const soc = toNumberOrNull(input.storageSocPct);
  if (soc === null) return false;
  return soc <= input.device.storageReserveSocPct;
}

/**
 * Code-Teil: evaluateHeatingRodDecision
 *
 * Zweck:
 * Ermittelt eine typisierte Heizstabentscheidung aus verfügbarem Budget und Gerätekonfig.
 *
 * Priorität:
 * 1. Ausgeschaltete oder deaktivierte Geräte bleiben aus.
 * 2. Speicherreserve blockiert, wenn SoC/Regel das verlangt.
 * 3. Ohne Netzfreigabe zählt nur PV-Budget.
 * 4. Mit Netzfreigabe darf das Gesamtbudget genutzt werden.
 * 5. Gewählt wird die größte Stufe, die ins Budget passt.
 *
 * Wichtig:
 * Diese Funktion wird in 0.7.62 nur getestet, aber noch nicht in die Runtime eingebaut.
 */
export function evaluateHeatingRodDecision(input: HeatingRodDecisionInput): HeatingRodDecision {
  const ts = input.ts;
  const device = input.device;
  if (!device.enabled || device.mode === 'off') {
    return {
      ts,
      deviceId: device.id,
      targetStage: 0,
      targetPowerW: 0,
      allowedW: 0,
      reason: 'off',
      storageReserveActive: false,
      diagnosticText: 'Heizstab ist deaktiviert oder auf Aus gestellt.',
    };
  }

  const pvBudgetW = positiveWatt(input.availablePvW);
  const totalBudgetW = positiveWatt(input.availableTotalW);
  const storageReserveActive = isHeatingRodStorageReserveActive(input);
  if (storageReserveActive && device.storageReserveW > 0) {
    return {
      ts,
      deviceId: device.id,
      targetStage: 0,
      targetPowerW: 0,
      allowedW: 0,
      reason: 'storage-reserve',
      storageReserveActive,
      diagnosticText: `Speicherreserve aktiv; Heizstab bleibt aus, damit ${Math.round(device.storageReserveW)} W Reserve geschützt bleiben.`,
    };
  }

  const allowedW = device.allowGridImport ? Math.max(pvBudgetW, totalBudgetW) : pvBudgetW;
  if (allowedW <= 0) {
    return {
      ts,
      deviceId: device.id,
      targetStage: 0,
      targetPowerW: 0,
      allowedW: 0,
      reason: device.allowGridImport ? 'missing-budget' : 'grid-blocked',
      storageReserveActive,
      diagnosticText: device.allowGridImport ? 'Kein Budget für Heizstab verfügbar.' : 'Netzbezug ist gesperrt und PV-Budget ist 0 W.',
    };
  }

  const stage = chooseLargestStageWithinBudget(device.stages, allowedW);
  if (!stage) {
    return {
      ts,
      deviceId: device.id,
      targetStage: 0,
      targetPowerW: 0,
      allowedW,
      reason: 'no-stage',
      storageReserveActive,
      diagnosticText: `Verfügbares Budget ${Math.round(allowedW)} W reicht für keine konfigurierte Heizstabstufe.`,
    };
  }

  return {
    ts,
    deviceId: device.id,
    targetStage: stage.stage,
    targetPowerW: stage.powerW,
    allowedW,
    reason: device.mode === 'manual' ? 'manual' : 'pv-budget',
    storageReserveActive,
    diagnosticText: `Stufe ${stage.stage} mit ${Math.round(stage.powerW)} W passt in das verfügbare Budget ${Math.round(allowedW)} W.`,
  };
}


/**
 * Datenvertrag: HeatingRodLegacyRemovalPlanInput
 *
 * Zweck:
 * Beschreibt die minimalen Diagnosewerte, die nötig sind, um den alten
 * JavaScript-Heizstab-Referenzpfad als Cleanup-Kandidat zu bewerten.
 *
 * Zusammenhang:
 * Diese Bewertung wird von `ems/modules/heating-rod-control.js` genutzt, um zu
 * entscheiden, ob die alte JS-Referenz nur noch Diagnose/Notfallback ist oder ob sie
 * vorübergehend weiterhin als Sicherheitsreferenz benötigt wird.
 */
export interface HeatingRodLegacyRemovalPlanInput {
  readonly normalPathReady?: boolean;
  readonly legacyCleanupReady?: boolean;
  readonly hardSafetyBlockCount?: number;
  readonly hardFallbackCount?: number;
  readonly referenceMismatchCount?: number;
  readonly blockingReferenceMismatchCount?: number;
  readonly fallbackCount?: number;
  readonly activeCount?: number;
  readonly jsFallbackMode?: string;
  readonly legacyJsPathRole?: string;
}

/** Ergebnis: alter JS-Heizstabpfad als Entfernungskandidat oder weiter als Notreferenz. */
export interface HeatingRodLegacyRemovalPlan {
  readonly source: 'heating-rod-legacy-js-removal-plan-v1';
  readonly ready: boolean;
  readonly status: 'ready-for-legacy-js-reference-removal' | 'cleanup-waiting-for-normal-path' | 'cleanup-blocked-by-hard-fallbacks' | 'cleanup-blocked-by-reference-mismatch';
  readonly normalPathReady: boolean;
  readonly legacyCleanupReady: boolean;
  readonly decisionImpact: 'none' | 'diagnostic-only' | 'blocks-until-normal-ready';
  readonly jsFallbackMode: 'hard-blockers-only' | 'normal-safety-fallback';
  readonly legacyJsPathRole: 'emergency-fallback-and-diagnostics' | 'diagnostic-and-emergency-fallback' | 'safety-reference';
  readonly canRemoveReferenceGate: boolean;
  readonly canRemoveLegacyDecisionBranch: boolean;
  readonly keepJsFor: readonly string[];
  readonly removeCandidates: readonly string[];
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly referenceMismatchCount: number;
  readonly blockingReferenceMismatchCount: number;
  readonly hardSafetyBlockCount: number;
  readonly hardFallbackCount: number;
  readonly nextAction: string;
}

/**
 * Code-Teil: buildHeatingRodLegacyRemovalPlan
 *
 * Zweck:
 * Bewertet typisiert, ob der alte JS-Heizstab-Referenzpfad aus dem normalen
 * Entscheidungsweg herausgenommen werden darf.
 *
 * Zusammenhang:
 * 0.7.115 nutzt diese Funktion produktiv als Diagnose-/Cleanup-Helfer. Sie schaltet
 * keine Heizstabstufe selbst, sondern liefert nur die klare Entscheidungsvorlage:
 * „TS ist Normalpfad, JS bleibt nur Notfallback/Diagnose“ oder „JS muss noch warten“.
 *
 * Sicherheitsregel:
 * Der alte JS-Pfad wird nicht entfernt, solange harte Fallbacks, harte Schutzblocker
 * oder blockierende Referenzmismatches vorhanden sind.
 */
export function buildHeatingRodLegacyRemovalPlan(input: HeatingRodLegacyRemovalPlanInput): HeatingRodLegacyRemovalPlan {
  const toCount = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  };
  const normalPathReady = input.normalPathReady === true;
  const legacyCleanupReady = input.legacyCleanupReady === true;
  const hardSafetyBlockCount = toCount(input.hardSafetyBlockCount);
  const hardFallbackCount = toCount(input.hardFallbackCount);
  const referenceMismatchCount = toCount(input.referenceMismatchCount);
  const blockingReferenceMismatchCount = toCount(input.blockingReferenceMismatchCount);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!normalPathReady) blockers.push('TS-Normalpfad ist noch nicht bereit.');
  if (!legacyCleanupReady) blockers.push('Legacy-JS-Cleanup ist noch nicht bereit.');
  if (hardSafetyBlockCount > 0) blockers.push(`${hardSafetyBlockCount} harte Sicherheitsblocker vorhanden.`);
  if (hardFallbackCount > 0) blockers.push(`${hardFallbackCount} harte JS-Fallbacks vorhanden.`);
  if (blockingReferenceMismatchCount > 0) blockers.push(`${blockingReferenceMismatchCount} blockierende JS/TS-Referenzabweichung(en) vorhanden.`);
  if (referenceMismatchCount > 0 && blockingReferenceMismatchCount <= 0) {
    warnings.push(`${referenceMismatchCount} JS/TS-Referenzabweichung(en) bleiben als Diagnose sichtbar.`);
  }
  const ready = blockers.length === 0;
  const status: HeatingRodLegacyRemovalPlan['status'] = ready
    ? 'ready-for-legacy-js-reference-removal'
    : (!normalPathReady || !legacyCleanupReady
      ? 'cleanup-waiting-for-normal-path'
      : (hardFallbackCount > 0 || hardSafetyBlockCount > 0
        ? 'cleanup-blocked-by-hard-fallbacks'
        : 'cleanup-blocked-by-reference-mismatch'));
  const jsFallbackMode: HeatingRodLegacyRemovalPlan['jsFallbackMode'] = ready ? 'hard-blockers-only' : 'normal-safety-fallback';
  const legacyJsPathRole: HeatingRodLegacyRemovalPlan['legacyJsPathRole'] = ready
    ? 'emergency-fallback-and-diagnostics'
    : (legacyCleanupReady ? 'diagnostic-and-emergency-fallback' : 'safety-reference');
  return {
    source: 'heating-rod-legacy-js-removal-plan-v1',
    ready,
    status,
    normalPathReady,
    legacyCleanupReady,
    decisionImpact: ready ? 'none' : (normalPathReady ? 'diagnostic-only' : 'blocks-until-normal-ready'),
    jsFallbackMode,
    legacyJsPathRole,
    canRemoveReferenceGate: ready,
    canRemoveLegacyDecisionBranch: ready,
    keepJsFor: ready
      ? ['hard-safety-fallback', 'emergency-stop', 'diagnostic-snapshot']
      : ['reference-gate', 'hard-safety-fallback', 'emergency-stop', 'diagnostic-snapshot'],
    removeCandidates: ready
      ? ['legacy-reference-decision-gate', 'legacy-js-reference-blocking', 'normal-safety-fallback-branch']
      : [],
    blockers,
    warnings,
    referenceMismatchCount,
    blockingReferenceMismatchCount,
    hardSafetyBlockCount,
    hardFallbackCount,
    nextAction: ready
      ? 'Alten JS-Referenzpfad im nächsten Schritt aus dem normalen Entscheidungsweg entfernen; JS bleibt Notfallback/Diagnose.'
      : 'Heizstab-TS weiter beobachten, bis keine Blocker mehr vorhanden sind.',
  };
}
