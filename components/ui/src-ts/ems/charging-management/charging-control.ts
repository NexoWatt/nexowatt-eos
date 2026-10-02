/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet den für einen Ladepunkt geltenden Modus- und Bedarfsrahmen vor der Verteilung des Ladebudgets.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */

/**
 * Datei: src-ts/ems/charging-management/charging-control.ts
 *
 * Zweck:
 * TypeScript-Helfer für den ersten EVCS-/Charging-Management-Produktivumbau.
 * In 0.7.124 wird die produktive JS-Ladelogik noch nicht ersetzt. Dieser Helfer
 * bereitet stattdessen die wichtigsten Control-/Budget-/Sicherheitswerte als
 * typisierten Shadow-Plan und als kontrollierten Produktiv-Kandidaten vor.
 *
 * Zusammenhang:
 * Charging-Management hängt an Core-Limits, Restgates, Consumer-Reservierungen,
 * Feature-Sichtbarkeit, History/PDF und SmartHome-/App-Center-Anzeige. Deshalb wird
 * diese Datei zuerst als sichere Vergleichsschicht eingeführt.
 *
 * Wichtig:
 * 0 W, false und leere Listen sind gültig. Eine Anlage ohne EVCS darf nicht plötzlich
 * eine Wallbox sichtbar machen.
 */
export type ChargingControlStatus =
  | 'ok'
  | 'off'
  | 'failsafe_stale_meter'
  | 'paused_by_peak_shaving_ramp_down'
  | 'limited_grid_import'
  | 'limited_phase_cap'
  | 'limited_grid_import_and_phase'
  | string;

export interface ChargingControlShadowInput {
  mode?: string;
  budgetMode?: string;
  status?: ChargingControlStatus;
  active?: boolean;
  budgetW?: unknown;
  usedW?: unknown;
  remainingW?: unknown;
  totalPowerW?: unknown;
  totalTargetPowerW?: unknown;
  totalTargetCurrentA?: unknown;
  wallboxCount?: unknown;
  onlineWallboxes?: unknown;
  connectedCount?: unknown;
  pausedByPeakShaving?: unknown;
  staleMeter?: unknown;
  staleBudget?: unknown;
  pvAvailable?: unknown;
  gridImportLimitW?: unknown;
  gridImportLimitEffW?: unknown;
  gridImportW?: unknown;
  gridCapEvcsW?: unknown;
  gridCapBinding?: unknown;
  phaseCapEvcsW?: unknown;
  phaseCapBinding?: unknown;
  para14aActive?: unknown;
  para14aCapEvcsW?: unknown;
  para14aBinding?: unknown;
  storageAssistActive?: unknown;
  storageAssistW?: unknown;
}

export interface ChargingControlShadowPlan {
  source: 'ts-charging-control-shadow-v1';
  available: true;
  ok: boolean;
  productive: false;
  control: {
    active: boolean;
    mode: string;
    status: ChargingControlStatus;
    budgetMode: string;
    budgetW: number;
    usedW: number;
    remainingW: number;
    totalPowerW: number;
    totalTargetPowerW: number;
    totalTargetCurrentA: number;
  };
  visibility: {
    hasEvcs: boolean;
    onlineWallboxes: number;
    wallboxCount: number;
    connectedCount: number;
  };
  gates: {
    pausedByPeakShaving: boolean;
    staleMeter: boolean;
    staleBudget: boolean;
    pvAvailable: boolean;
    gridCapBinding: boolean;
    phaseCapBinding: boolean;
    para14aActive: boolean;
    para14aBinding: boolean;
    storageAssistActive: boolean;
  };
  caps: {
    gridImportLimitW: number;
    gridImportLimitEffW: number;
    gridImportW: number;
    gridCapEvcsW: number;
    phaseCapEvcsW: number;
    para14aCapEvcsW: number;
    storageAssistW: number;
  };
  warnings: string[];
  blockers: string[];
}

/** Code-Teil: toNumber. Zweck: Wandelt unbekannte Werte robust in Zahlen um und erhält 0 als gültigen Wert. */
function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Code-Teil: nonNegative. Zweck: Klemmt Leistungs-/Zählerwerte auf >= 0. */
function nonNegative(value: unknown): number {
  const n = toNumber(value, 0);
  return n > 0 ? Math.round(n) : 0;
}

/** Code-Teil: toBool. Zweck: Normalisiert booleans, ohne false als fehlend zu behandeln. */
function toBool(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  const s = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'on', 'yes', 'ja', 'active'].includes(s);
}

/**
 * Code-Teil: buildChargingControlShadowPlan
 *
 * Zweck:
 * Baut aus den aktuellen JavaScript-Controlwerten einen typisierten TS-Shadow-Plan.
 * Der Plan ist in 0.7.122 ausdrücklich noch nicht produktiv, sondern die sichere
 * Vorstufe für die spätere EVCS-/Charging-Management-TS-Übernahme.
 */
export function buildChargingControlShadowPlan(input: ChargingControlShadowInput): ChargingControlShadowPlan {
  const wallboxCount = nonNegative(input.wallboxCount);
  const onlineWallboxes = nonNegative(input.onlineWallboxes);
  const connectedCount = nonNegative(input.connectedCount);
  const status = String(input.status || (String(input.mode || '') === 'off' ? 'off' : 'ok')) as ChargingControlStatus;
  const active = typeof input.active === 'boolean' ? input.active : String(input.mode || '') !== 'off';
  const budgetW = nonNegative(input.budgetW);
  const usedW = nonNegative(input.usedW);
  const remainingW = nonNegative(input.remainingW);
  const warnings: string[] = [];
  const blockers: string[] = [];
  if (wallboxCount === 0) warnings.push('no-wallboxes-configured');
  if (toBool(input.staleMeter)) blockers.push('stale-meter');
  if (toBool(input.staleBudget)) blockers.push('stale-budget');
  if (usedW > budgetW && budgetW > 0) warnings.push('used-over-budget');
  return {
    source: 'ts-charging-control-shadow-v1',
    available: true,
    ok: blockers.length === 0,
    productive: false,
    control: {
      active,
      mode: String(input.mode || ''),
      status,
      budgetMode: String(input.budgetMode || ''),
      budgetW,
      usedW,
      remainingW,
      totalPowerW: nonNegative(input.totalPowerW),
      totalTargetPowerW: nonNegative(input.totalTargetPowerW),
      totalTargetCurrentA: Math.max(0, toNumber(input.totalTargetCurrentA, 0)),
    },
    visibility: {
      hasEvcs: wallboxCount > 0,
      onlineWallboxes,
      wallboxCount,
      connectedCount,
    },
    gates: {
      pausedByPeakShaving: toBool(input.pausedByPeakShaving),
      staleMeter: toBool(input.staleMeter),
      staleBudget: toBool(input.staleBudget),
      pvAvailable: toBool(input.pvAvailable),
      gridCapBinding: toBool(input.gridCapBinding),
      phaseCapBinding: toBool(input.phaseCapBinding),
      para14aActive: toBool(input.para14aActive),
      para14aBinding: toBool(input.para14aBinding),
      storageAssistActive: toBool(input.storageAssistActive),
    },
    caps: {
      gridImportLimitW: nonNegative(input.gridImportLimitW),
      gridImportLimitEffW: nonNegative(input.gridImportLimitEffW),
      gridImportW: Math.round(toNumber(input.gridImportW, 0)),
      gridCapEvcsW: nonNegative(input.gridCapEvcsW),
      phaseCapEvcsW: nonNegative(input.phaseCapEvcsW),
      para14aCapEvcsW: nonNegative(input.para14aCapEvcsW),
      storageAssistW: nonNegative(input.storageAssistW),
    },
    warnings,
    blockers,
  };
}

export interface ChargingControlShadowComparison {
  source: 'ts-charging-control-shadow-comparison-v1';
  ok: boolean;
  mismatchCount: number;
  mismatches: Array<{ field: string; js: unknown; ts: unknown }>;
}

/**
 * Code-Teil: compareChargingControlShadowPlan
 * Zweck: Vergleicht die JS-Controlwerte mit dem TS-Shadow-Plan für Diagnose und spätere Umschaltung.
 */
export function compareChargingControlShadowPlan(input: ChargingControlShadowInput, plan: ChargingControlShadowPlan): ChargingControlShadowComparison {
  const pairs: Array<[string, unknown, unknown]> = [
    ['budgetW', nonNegative(input.budgetW), plan.control.budgetW],
    ['usedW', nonNegative(input.usedW), plan.control.usedW],
    ['remainingW', nonNegative(input.remainingW), plan.control.remainingW],
    ['wallboxCount', nonNegative(input.wallboxCount), plan.visibility.wallboxCount],
    ['onlineWallboxes', nonNegative(input.onlineWallboxes), plan.visibility.onlineWallboxes],
    ['status', String(input.status || ''), plan.control.status],
  ];
  const mismatches = pairs
    .filter(([, js, ts]) => js !== ts)
    .map(([field, js, ts]) => ({ field, js, ts }));
  return {
    source: 'ts-charging-control-shadow-comparison-v1',
    ok: mismatches.length === 0,
    mismatchCount: mismatches.length,
    mismatches,
  };
}

export interface ChargingControlProductiveApply {
  active: boolean;
  mode: string;
  status: ChargingControlStatus;
  budgetMode: string;
  budgetW: number;
  usedW: number;
  remainingW: number;
  totalPowerW: number;
  totalTargetPowerW: number;
  totalTargetCurrentA: number;
  wallboxCount: number;
  onlineWallboxes: number;
  connectedCount: number;
  pausedByPeakShaving: boolean;
  staleMeter: boolean;
  staleBudget: boolean;
  pvAvailable: boolean;
  gridCapBinding: boolean;
  phaseCapBinding: boolean;
  para14aActive: boolean;
  para14aBinding: boolean;
  storageAssistActive: boolean;
  gridImportLimitW: number;
  gridImportLimitEffW: number;
  gridImportW: number;
  gridCapEvcsW: number;
  phaseCapEvcsW: number;
  para14aCapEvcsW: number;
  storageAssistW: number;
}

export interface ChargingControlProductivePrepDecision {
  source: 'ts-charging-control-productive-prep-v1';
  available: true;
  ok: boolean;
  productive: false;
  prepared: boolean;
  preparedForProductiveTakeover: boolean;
  fallback: boolean;
  fallbackReason: string;
  blockers: string[];
  warnings: string[];
  comparison: ChargingControlShadowComparison;
  plan: ChargingControlShadowPlan;
  apply: ChargingControlProductiveApply | null;
  safety: {
    appliesOnlyToControlSummary: true;
    keepsAllocationInJavascript: true;
    keepsSetpointWritingInJavascript: true;
    keepsFailsafeInJavascript: true;
  };
  nextAction: string;
}

/**
 * Code-Teil: buildChargingControlProductiveApply
 * Zweck: Extrahiert nur die künftig sicher übernehmbaren Control-/Summary-Werte.
 * Wichtig: Diese Struktur enthält bewusst keine Wallbox-Verteilung und keine Setpoint-Schreibbefehle.
 */
function buildChargingControlProductiveApply(plan: ChargingControlShadowPlan): ChargingControlProductiveApply {
  return {
    active: plan.control.active,
    mode: plan.control.mode,
    status: plan.control.status,
    budgetMode: plan.control.budgetMode,
    budgetW: plan.control.budgetW,
    usedW: plan.control.usedW,
    remainingW: plan.control.remainingW,
    totalPowerW: plan.control.totalPowerW,
    totalTargetPowerW: plan.control.totalTargetPowerW,
    totalTargetCurrentA: plan.control.totalTargetCurrentA,
    wallboxCount: plan.visibility.wallboxCount,
    onlineWallboxes: plan.visibility.onlineWallboxes,
    connectedCount: plan.visibility.connectedCount,
    pausedByPeakShaving: plan.gates.pausedByPeakShaving,
    staleMeter: plan.gates.staleMeter,
    staleBudget: plan.gates.staleBudget,
    pvAvailable: plan.gates.pvAvailable,
    gridCapBinding: plan.gates.gridCapBinding,
    phaseCapBinding: plan.gates.phaseCapBinding,
    para14aActive: plan.gates.para14aActive,
    para14aBinding: plan.gates.para14aBinding,
    storageAssistActive: plan.gates.storageAssistActive,
    gridImportLimitW: plan.caps.gridImportLimitW,
    gridImportLimitEffW: plan.caps.gridImportLimitEffW,
    gridImportW: plan.caps.gridImportW,
    gridCapEvcsW: plan.caps.gridCapEvcsW,
    phaseCapEvcsW: plan.caps.phaseCapEvcsW,
    para14aCapEvcsW: plan.caps.para14aCapEvcsW,
    storageAssistW: plan.caps.storageAssistW,
  };
}

/**
 * Code-Teil: buildChargingControlProductivePrep
 *
 * Zweck:
 * Bereitet den EVCS-/Charging-Control-Shadow als produktiven TS-Kandidaten vor,
 * ohne ihn in 0.7.124 schon auf echte Control-States anzuwenden.
 *
 * Zusammenhang:
 * Die bisherige JS-Runtime bleibt führend für Ladepunktverteilung, Failsafe,
 * Boost, PV-/Min+PV-Logik und Setpoint-Schreiben. TypeScript liefert nur einen
 * geprüften Apply-Vertrag für Control-/Summary-Werte, damit der nächste Schritt
 * gezielt und rückfallfähig produktiv geschaltet werden kann.
 *
 * Sicherheitsregel:
 * Ein Apply-Vertrag wird nur vorbereitet, wenn der JS/TS-Control-Vergleich sauber
 * ist und keine harten Control-Blocker wie stale meter/budget aktiv sind.
 */
export function buildChargingControlProductivePrep(
  input: ChargingControlShadowInput,
  plan: ChargingControlShadowPlan = buildChargingControlShadowPlan(input),
  comparison: ChargingControlShadowComparison = compareChargingControlShadowPlan(input, plan),
): ChargingControlProductivePrepDecision {
  const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
  if (!comparison.ok) blockers.push('ts-js-control-mismatch');
  const prepared = plan.ok === true && comparison.ok === true && blockers.length === 0;
  const fallbackReason = prepared
    ? ''
    : (!comparison.ok ? 'ts-js-control-mismatch' : (blockers[0] || 'ts-control-not-ready'));
  return {
    source: 'ts-charging-control-productive-prep-v1',
    available: true,
    ok: prepared,
    productive: false,
    prepared,
    preparedForProductiveTakeover: prepared,
    fallback: !prepared,
    fallbackReason,
    blockers,
    warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
    comparison,
    plan,
    apply: prepared ? buildChargingControlProductiveApply(plan) : null,
    safety: {
      appliesOnlyToControlSummary: true,
      keepsAllocationInJavascript: true,
      keepsSetpointWritingInJavascript: true,
      keepsFailsafeInJavascript: true,
    },
    nextAction: prepared
      ? 'Control-Summary kann im nächsten Schritt kontrolliert produktiv aus TypeScript übernommen werden; Ladepunktverteilung und Setpoint-Schreiben bleiben JavaScript.'
      : 'JavaScript bleibt führend; erst Shadow-Abweichungen oder Control-Blocker bereinigen.',
  };
}


export interface ChargingControlProductiveDecision {
  source: 'ts-charging-control-productive-v1';
  available: true;
  ok: boolean;
  productive: boolean;
  prepared: boolean;
  preparedForProductiveTakeover: boolean;
  fallback: boolean;
  fallbackReason: string;
  blockers: string[];
  warnings: string[];
  comparison: ChargingControlShadowComparison;
  plan: ChargingControlShadowPlan;
  apply: ChargingControlProductiveApply | null;
  safety: {
    appliesOnlyToControlSummary: true;
    keepsAllocationInJavascript: true;
    keepsSetpointWritingInJavascript: true;
    keepsFailsafeInJavascript: true;
  };
  nextAction: string;
}

/**
 * Code-Teil: buildChargingControlProductive
 *
 * Zweck:
 * Übernimmt den sicheren Control-/Summary-Ausschnitt produktiv aus TypeScript,
 * sobald Shadow-Plan und JS/TS-Vergleich sauber sind.
 *
 * Scope-Grenze:
 * Diese Funktion entscheidet bewusst keine Wallbox-Verteilung und erzeugt keine
 * Setpoint-Schreibbefehle. Ladepunkt-Allocation, Boost-/PV-/Min+PV-Logik,
 * Failsafe-Stopps und ioBroker-I/O bleiben weiterhin in der bestehenden Runtime.
 */
export function buildChargingControlProductive(
  input: ChargingControlShadowInput,
  plan: ChargingControlShadowPlan = buildChargingControlShadowPlan(input),
  comparison: ChargingControlShadowComparison = compareChargingControlShadowPlan(input, plan),
): ChargingControlProductiveDecision {
  const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
  if (!comparison.ok) blockers.push('ts-js-control-mismatch');
  const canApply = plan.ok === true && comparison.ok === true && blockers.length === 0;
  const fallbackReason = canApply
    ? ''
    : (!comparison.ok ? 'ts-js-control-mismatch' : (blockers[0] || 'ts-control-not-ready'));
  return {
    source: 'ts-charging-control-productive-v1',
    available: true,
    ok: canApply,
    productive: canApply,
    prepared: canApply,
    preparedForProductiveTakeover: canApply,
    fallback: !canApply,
    fallbackReason,
    blockers,
    warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
    comparison,
    plan,
    apply: canApply ? buildChargingControlProductiveApply(plan) : null,
    safety: {
      appliesOnlyToControlSummary: true,
      keepsAllocationInJavascript: true,
      keepsSetpointWritingInJavascript: true,
      keepsFailsafeInJavascript: true,
    },
    nextAction: canApply
      ? 'Control-/Summary-Werte werden produktiv aus TypeScript übernommen; Ladepunktverteilung und Setpoint-Schreiben bleiben JavaScript.'
      : 'JavaScript bleibt führend; erst Shadow-Abweichungen oder Control-Blocker bereinigen.',
  };
}
