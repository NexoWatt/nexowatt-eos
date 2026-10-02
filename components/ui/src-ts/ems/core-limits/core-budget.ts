/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet das zentrale verbleibende Leistungsbudget aus Netzgrenze, Messwerten und reservierten Anforderungen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/core-limits/core-budget.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { CoreBudgetGate, CoreBudgetInput, CoreBudgetSnapshot } from '../../contracts/ems-budget';
import type { Percent, TimestampMs, Watt } from '../../contracts/units';
import { clampNumber, positiveWatt, toNumberOrNull } from '../../utils/number';

/**
 * Datei: src-ts/ems/core-limits/core-budget.ts
 *
 * Zweck:
 * Produktionsnahe TypeScript-Vorbereitung für die zentrale EMS-Budgetberechnung.
 * Diese Datei ist in 0.7.62 noch nicht produktiv verdrahtet. Sie beschreibt und testet
 * aber die Logik, die später aus `ems/modules/core-limits.js` herausgelöst werden soll.
 *
 * Zusammenhang:
 * Core-Limits liefern die Grundlage für Heizstab, EVCS, KI-Berater, Energiefluss und
 * History. Wenn diese Budgets falsch sind, laufen Verbraucherfreigabe und Historie falsch.
 *
 * Wichtig:
 * - 0 W ist ein gültiger Budgetwert.
 * - Speicherreserve muss vom Verbraucherbudget abgezogen werden, wenn sie aktiv ist.
 * - Netzlimit/Peak-Shaving darf nie durch PV-Logik übersteuert werden.
 */

/**
 * Code-Teil: numberPercentOrNull
 *
 * Zweck:
 * Normalisiert einen unbekannten SoC-/Prozentwert auf 0–100 oder `null`.
 *
 * Zusammenhang:
 * Speicherreserve-Entscheidungen hängen vom SoC ab. Ein fehlender SoC darf nicht heimlich
 * als 0 % interpretiert werden, weil dadurch die Reserve dauerhaft aktiv wäre.
 */
function numberPercentOrNull(value: unknown): Percent | null {
  const n = toNumberOrNull(value);
  return n === null ? null : clampNumber(n, 0, 100);
}

/**
 * Code-Teil: gate
 *
 * Zweck:
 * Erstellt ein einheitliches Budget-Gate mit Rohwert, Effektivwert und Diagnosegrund.
 *
 * Zusammenhang:
 * `core-limits.js` veröffentlicht später mehrere Budgets. Durch eine gemeinsame Struktur
 * können Heizstab, EVCS und KI-Berater dieselben Felder interpretieren.
 */
function gate(rawW: Watt, effectiveW: Watt, reason: CoreBudgetGate['reason'], diagnosticText?: string): CoreBudgetGate {
  const result: CoreBudgetGate = {
    rawW: Math.max(0, Math.round(rawW)),
    effectiveW: Math.max(0, Math.round(effectiveW)),
    reason,
  };
  if (typeof diagnosticText === 'string' && diagnosticText.length > 0) {
    result.diagnosticText = diagnosticText;
  }
  return result;
}

/**
 * Code-Teil: isStorageReserveActive
 *
 * Zweck:
 * Entscheidet, ob die Speicherreserve fachlich geschützt werden muss.
 *
 * Zusammenhang:
 * Heizstab und andere flexible Verbraucher dürfen die Reserve nicht aufbrauchen, wenn
 * der Speicher-SoC unter der konfigurierten Reserve liegt oder Speicherentladung verboten ist.
 */
export function isStorageReserveActive(storageSocPct: Percent | null, reserveSocPct: unknown, allowStorageDischarge = true): boolean {
  const reserve = numberPercentOrNull(reserveSocPct);
  if (!allowStorageDischarge) return true;
  if (storageSocPct === null || reserve === null) return false;
  return storageSocPct <= reserve;
}

/**
 * Code-Teil: calculatePvBudgetGate
 *
 * Zweck:
 * Berechnet das nutzbare PV-Budget nach Speicherreserve und bereits reservierter Leistung.
 *
 * Zusammenhang:
 * Dieses Budget ist später besonders wichtig für Heizstab/EVCS: Es beschreibt, wie viel
 * PV-Überschuss ohne zusätzlichen Netzbezug genutzt werden kann.
 */
export function calculatePvBudgetGate(input: CoreBudgetInput): CoreBudgetGate {
  const rawPvW = positiveWatt(input.pvSurplusW);
  const reserveW = positiveWatt(input.storageReserveW);
  const alreadyReservedW = positiveWatt(input.alreadyReservedW);
  const soc = numberPercentOrNull(input.storageSocPct);
  const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
  const appliedReserveW = reserveActive ? reserveW : 0;
  const effectiveW = Math.max(0, rawPvW - appliedReserveW - alreadyReservedW);
  const reason = reserveActive ? 'storage-reserve' : (alreadyReservedW > 0 ? 'manual-limit' : 'pv-surplus');
  const diagnosticText = reserveActive
    ? `PV-Budget um Speicherreserve ${Math.round(appliedReserveW)} W reduziert.`
    : `PV-Budget aus Überschuss ${Math.round(rawPvW)} W berechnet.`;
  return gate(rawPvW, effectiveW, reason, diagnosticText);
}

/**
 * Code-Teil: calculateGridBudgetGate
 *
 * Zweck:
 * Berechnet, wie viel zusätzliche Leistung unter Netz-/Peak-Limit noch möglich ist.
 *
 * Zusammenhang:
 * Peak-Shaving, §14a und Netzanschlussgrenzen müssen Verbraucherfreigaben begrenzen.
 * Das verhindert, dass Heizstab oder EVCS Lastspitzen erzeugen.
 */
export function calculateGridBudgetGate(input: CoreBudgetInput): CoreBudgetGate {
  const importW = positiveWatt(input.gridImportW);
  const limit = toNumberOrNull(input.gridImportLimitW);
  if (input.allowGridImport === false) {
    return gate(0, 0, 'manual-limit', 'Netzbezug ist für flexible Verbraucher deaktiviert.');
  }
  if (input.peakShavingActive) {
    const eff = limit === null ? 0 : Math.max(0, limit - importW);
    return gate(limit === null ? 0 : Math.max(0, limit), eff, 'peak-shaving', 'Peak-Shaving begrenzt zusätzliches Netzbudget.');
  }
  if (input.externalLimitActive) {
    const eff = limit === null ? 0 : Math.max(0, limit - importW);
    return gate(limit === null ? 0 : Math.max(0, limit), eff, 'para14a', 'Externes Limit begrenzt zusätzliches Netzbudget.');
  }
  if (limit === null || limit <= 0) {
    return gate(0, 0, 'missing-input', 'Kein Netzlimit vorhanden; Netzbudget wird konservativ nicht erweitert.');
  }
  return gate(limit, Math.max(0, limit - importW), 'grid-limit', 'Netzbudget aus Anschluss-/Peak-Limit berechnet.');
}

/**
 * Code-Teil: buildCoreBudgetSnapshot
 *
 * Zweck:
 * Erstellt eine typisierte EMS-Budget-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist der spätere Kandidat für die Migration von Teilen aus
 * `ems/modules/core-limits.js`. In 0.7.62 wird sie nur über TypeScript-Regressionen
 * geprüft und noch nicht produktiv genutzt.
 */
export function buildCoreBudgetSnapshot(input: CoreBudgetInput): CoreBudgetSnapshot {
  const ts = (toNumberOrNull(input.ts) ?? Date.now()) as TimestampMs;
  const soc = numberPercentOrNull(input.storageSocPct);
  const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
  const storageReserveW = reserveActive ? positiveWatt(input.storageReserveW) : 0;
  const alreadyReservedW = positiveWatt(input.alreadyReservedW);
  const pv = calculatePvBudgetGate(input);
  const grid = calculateGridBudgetGate(input);
  const totalRaw = pv.rawW + grid.rawW;
  const uncappedTotalEffectiveW = Math.max(0, pv.effectiveW + grid.effectiveW);
  const totalCap = toNumberOrNull(input.totalBudgetCapW);
  const totalEffectiveW = totalCap !== null && totalCap >= 0
    ? Math.min(uncappedTotalEffectiveW, Math.max(0, totalCap))
    : uncappedTotalEffectiveW;
  const limitReason = totalCap !== null && totalCap >= 0 && totalEffectiveW < uncappedTotalEffectiveW
    ? 'manual-limit'
    : (pv.reason !== 'pv-surplus' ? pv.reason : grid.reason);
  const diagnosticText = [pv.diagnosticText, grid.diagnosticText]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ');

  return {
    ts,
    pv,
    grid,
    total: gate(totalRaw, totalEffectiveW, limitReason || 'none', diagnosticText),
    storageReserveActive: reserveActive,
    storageSocPct: soc,
    appliedStorageReserveW: storageReserveW,
    alreadyReservedW,
    diagnosticText,
  };
}


/**
 * Datenvertrag: CoreRestGatesShadowInput
 *
 * Zweck:
 * Übergibt die bereits vorhandenen JavaScript-Gate-Objekte aus `core-limits.js` an
 * TypeScript. Damit können Forecast-, Tarif-, Peak-/Netz- und §14a-Gates zunächst
 * sicher im Shadow-Modus verglichen werden.
 *
 * Zusammenhang:
 * Diese Rest-Gates beeinflussen später EVCS, Heizstab, Speicherreserve, Peak-Shaving
 * und KI-Hinweise. Deshalb werden sie in 0.7.120 bewusst nur vorbereitet und nicht
 * produktiv übernommen.
 */
export interface CoreRestGatesShadowInput {
  forecast?: Record<string, unknown> | null;
  tariff?: Record<string, unknown> | null;
  peak?: Record<string, unknown> | null;
  para14a?: Record<string, unknown> | null;
  evcsHighLevel?: Record<string, unknown> | null;
  controlledHighLevel?: Record<string, unknown> | null;
  grid?: Record<string, unknown> | null;
  ts?: unknown;
}

/** Ergebnis der TypeScript-Vorbereitung für Core-Limits-Restgates. */
export interface CoreRestGatesShadowResult {
  ok: boolean;
  source: 'ts-core-rest-gates-shadow';
  ts: TimestampMs;
  gates: {
    forecast: Record<string, unknown>;
    tariff: Record<string, unknown>;
    peak: Record<string, unknown>;
    para14a: Record<string, unknown>;
    evcsHighLevel: Record<string, unknown>;
    controlledHighLevel: Record<string, unknown>;
    grid: Record<string, unknown>;
  };
}


/** Ergebnis der produktiven TypeScript-Restgate-Übernahme. */
export interface CoreRestGatesProductiveResult extends Omit<CoreRestGatesShadowResult, 'source'> {
  source: 'ts-core-rest-gates-productive';
  productive: true;
  preparedOnly: false;
}

/**
 * Code-Teil: restBool
 * Zweck: Normalisiert boolesche Restgate-Felder; `false` ist ein gültiger Wert.
 */
function restBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'on', 'active'].includes(text)) return true;
    if (['false', '0', 'no', 'nein', 'off', 'inactive'].includes(text)) return false;
  }
  return fallback;
}

/** Code-Teil: restString. Zweck: Normalisiert Status-/Quellenfelder. */
function restString(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

/** Code-Teil: restNumberOrNull. Zweck: Fehlende Zahlen bleiben `null`, echte 0 bleiben erhalten. */
function restNumberOrNull(value: unknown): number | null {
  return toNumberOrNull(value);
}

/** Code-Teil: restWatt. Zweck: Normalisiert Wattwerte; 0 W ist gültig. */
function restWatt(value: unknown): Watt {
  return positiveWatt(restNumberOrNull(value));
}

/**
 * Code-Teil: buildCoreForecastGate
 *
 * Zweck:
 * Baut das PV-Forecast-Gate in TypeScript nach. In 0.7.120 wird dieser Wert nur als
 * Shadow-Vergleich genutzt und nicht produktiv übernommen.
 */
export function buildCoreForecastGate(input: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const src: Record<string, unknown> = input && typeof input === 'object' ? input : {};
  const usable = restBool(src.usable, false);
  return {
    valid: restBool(src.valid, false),
    usable,
    ageMs: restNumberOrNull(src.ageMs) === null ? null : Math.max(0, Math.round(restNumberOrNull(src.ageMs) || 0)),
    points: Math.max(0, Math.round(restNumberOrNull(src.points) || 0)),
    confidencePct: clampNumber(restNumberOrNull(src.confidencePct) || 0, 0, 100),
    nowW: restWatt(src.nowW),
    avgNext1hW: restWatt(src.avgNext1hW),
    avgNext3hW: restWatt(src.avgNext3hW),
    peakNext6hW: restWatt(src.peakNext6hW),
    peakNext24hW: restWatt(src.peakNext24hW),
    kwhNext1h: Math.max(0, restNumberOrNull(src.kwhNext1h) || 0),
    kwhNext3h: Math.max(0, restNumberOrNull(src.kwhNext3h) || 0),
    kwhNext6h: Math.max(0, restNumberOrNull(src.kwhNext6h) || 0),
    kwhNext12h: Math.max(0, restNumberOrNull(src.kwhNext12h) || 0),
    kwhNext24h: Math.max(0, restNumberOrNull(src.kwhNext24h) || 0),
    status: restString(src.status, usable ? 'ok' : 'missing'),
    source: restString(src.source, ''),
  };
}

/**
 * Code-Teil: buildCoreTariffGate
 *
 * Zweck:
 * Baut das Tarif-/Negativpreis-Gate in TypeScript nach. In 0.7.120 bleibt dieses Gate
 * Shadow-/Diagnosewert und ersetzt noch keine produktive JS-Logik.
 */
export function buildCoreTariffGate(input: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const src: Record<string, unknown> = input && typeof input === 'object' ? input : {};
  const negativeActive = restBool(src.negativeActive, false);
  const gridImportPreferred = restBool(src.gridImportPreferred, negativeActive);
  const gridChargeAllowed = restBool(src.gridChargeAllowed, true);
  return {
    budgetW: restNumberOrNull(src.budgetW) === null ? null : restWatt(src.budgetW),
    gridChargeAllowed,
    dischargeAllowed: restBool(src.dischargeAllowed, true),
    active: restBool(src.active, false),
    state: restString(src.state, ''),
    currentPriceEurKwh: restNumberOrNull(src.currentPriceEurKwh),
    negativeActive,
    gridImportPreferred,
    storageGridChargeAllowed: restBool(src.storageGridChargeAllowed, gridImportPreferred && gridChargeAllowed),
    evcsGridChargeAllowed: restBool(src.evcsGridChargeAllowed, gridImportPreferred && gridChargeAllowed),
    pvCurtailRecommended: restBool(src.pvCurtailRecommended, gridImportPreferred),
    negativeMinPriceEurKwh: restNumberOrNull(src.negativeMinPriceEurKwh),
    nextNegativeFrom: restString(src.nextNegativeFrom, ''),
    nextNegativeTo: restString(src.nextNegativeTo, ''),
    status: restString(src.status, gridImportPreferred ? 'active_grid_import_preferred' : (negativeActive ? 'negative_detected' : 'inactive')),
  };
}

/**
 * Code-Teil: buildCorePeakTariffGridGates
 *
 * Zweck:
 * Bereitet Peak-/Netz-/§14a- und EVCS-High-Level-Gates in TypeScript auf.
 */
export function buildCorePeakTariffGridGates(input: CoreRestGatesShadowInput): Record<string, Record<string, unknown>> {
  const peak: Record<string, unknown> = input && input.peak && typeof input.peak === 'object' ? input.peak : {};
  const para14a: Record<string, unknown> = input && input.para14a && typeof input.para14a === 'object' ? input.para14a : {};
  const evcsHighLevel: Record<string, unknown> = input && input.evcsHighLevel && typeof input.evcsHighLevel === 'object' ? input.evcsHighLevel : {};
  const controlledHighLevel: Record<string, unknown> = input && input.controlledHighLevel && typeof input.controlledHighLevel === 'object' ? input.controlledHighLevel : {};
  const grid: Record<string, unknown> = input && input.grid && typeof input.grid === 'object' ? input.grid : {};
  const tariff = buildCoreTariffGate(input && input.tariff ? input.tariff : null);
  return {
    peak: {
      active: restBool(peak.active, false),
      budgetW: restNumberOrNull(peak.budgetW) === null ? null : restWatt(peak.budgetW),
    },
    tariff,
    para14a: {
      active: restBool(para14a.active, false),
      mode: restString(para14a.mode, ''),
      evcsCapW: restNumberOrNull(para14a.evcsCapW) === null ? null : restWatt(para14a.evcsCapW),
      totalCapW: restNumberOrNull(para14a.totalCapW) === null ? null : restWatt(para14a.totalCapW),
      appCapsW: para14a.appCapsW && typeof para14a.appCapsW === 'object' ? { ...(para14a.appCapsW as Record<string, unknown>) } : {},
      signalFresh: restBool(para14a.signalFresh, false),
      signalStatus: restString(para14a.signalStatus, ''),
      constraintOnly: restBool(para14a.constraintOnly, false),
    },
    evcsHighLevel: {
      capW: restNumberOrNull(evcsHighLevel.capW) === null ? null : restWatt(evcsHighLevel.capW),
      binding: restString(evcsHighLevel.binding, ''),
    },
    controlledHighLevel: {
      capW: restNumberOrNull(controlledHighLevel.capW) === null ? null : restWatt(controlledHighLevel.capW),
      binding: restString(controlledHighLevel.binding, ''),
    },
    grid: {
      gridConnectionLimitW_cfg: restWatt(grid.gridConnectionLimitW_cfg),
      gridSafetyMarginW: restWatt(grid.gridSafetyMarginW),
      gridConstraintsCapW: restNumberOrNull(grid.gridConstraintsCapW),
      gridImportLimitW_physical: restWatt(grid.gridImportLimitW_physical),
      gridImportLimitW_peakShaving: restWatt(grid.gridImportLimitW_peakShaving),
      gridImportLimitW_effective: restWatt(grid.gridImportLimitW_effective),
      gridImportLimitW_source: restString(grid.gridImportLimitW_source, ''),
      gridMaxPhaseA_cfg: restWatt(grid.gridMaxPhaseA_cfg),
    },
  };
}

/**
 * Code-Teil: buildCoreRestGatesShadow
 *
 * Zweck:
 * Erstellt den kompletten TS-Shadow für Forecast-, Tarif-, Peak-/Netz- und §14a-Gates.
 *
 * Sicherheitsregel:
 * Diese Funktion schreibt keine States und verändert keine produktiven Budgets. Sie dient
 * nur dazu, die Restlogik kontrolliert gegen die bestehende JS-Runtime zu vergleichen.
 */
export function buildCoreRestGatesShadow(input: CoreRestGatesShadowInput): CoreRestGatesShadowResult {
  const ts = (toNumberOrNull(input && input.ts) ?? Date.now()) as TimestampMs;
  const peakGrid = buildCorePeakTariffGridGates(input || {});
  return {
    ok: true,
    source: 'ts-core-rest-gates-shadow',
    ts,
    gates: {
      forecast: buildCoreForecastGate(input && input.forecast ? input.forecast : null),
      tariff: (peakGrid.tariff || {}) as Record<string, unknown>,
      peak: (peakGrid.peak || {}) as Record<string, unknown>,
      para14a: (peakGrid.para14a || {}) as Record<string, unknown>,
      evcsHighLevel: (peakGrid.evcsHighLevel || {}) as Record<string, unknown>,
      controlledHighLevel: (peakGrid.controlledHighLevel || {}) as Record<string, unknown>,
      grid: (peakGrid.grid || {}) as Record<string, unknown>,
    },
  };
}


/**
 * Code-Teil: buildCoreRestGatesProductive
 *
 * Zweck:
 * Baut denselben Forecast-/Tarif-/Peak-/§14a-Snapshot wie der Shadow-Helfer,
 * markiert ihn aber ausdrücklich als produktiv übernehmbaren TypeScript-Restgate-
 * Snapshot.
 *
 * Zusammenhang:
 * Ab 0.7.121 darf `core-limits.js` diese Werte übernehmen, wenn der zuvor berechnete
 * JS/TS-Vergleich ohne Mismatches war. JS bleibt Fallback bei Fehlern oder Abweichungen.
 */
export function buildCoreRestGatesProductive(input: CoreRestGatesShadowInput): CoreRestGatesProductiveResult {
  const base = buildCoreRestGatesShadow(input);
  return {
    ...base,
    source: 'ts-core-rest-gates-productive',
    productive: true,
    preparedOnly: false,
  };
}


/**
 * Datenvertrag: CoreBudgetReservationRequest
 *
 * Zweck:
 * Beschreibt eine Verbraucher-Reservierung gegen das zentrale Core-Limits-Budget.
 *
 * Zusammenhang:
 * `ems/modules/core-limits.js` nutzt `makeBudgetRuntime.reserve(...)`, damit Heizstab,
 * EVCS, Thermik und weitere Verbraucher Leistung anmelden können. Dieser Vertrag ist die
 * TypeScript-Vorbereitung dieser Logik.
 *
 * Wichtig:
 * `0 W` ist gültig. Ein Request mit 0 W darf nicht durch Defaultwerte ersetzt werden.
 */
export interface CoreBudgetReservationRequest {
  key?: unknown;
  consumer?: unknown;
  app?: unknown;
  label?: unknown;
  priority?: unknown;
  requestedW?: unknown;
  reserveW?: unknown;
  pvReserveW?: unknown;
  actualW?: unknown;
  pvOnly?: unknown;
  mode?: unknown;
}

/**
 * Datenvertrag: CoreBudgetReservationEntry
 *
 * Zweck:
 * Einheitliche veröffentlichbare Verbraucher-Reservierung.
 *
 * Zusammenhang:
 * Diese Struktur wird später in `ems.budget.consumersJson` und in den einzelnen
 * `ems.budget.consumers.<key>.*` States sichtbar. Deshalb müssen Namen wie `usedW`,
 * `pvUsedW`, `reserveW` und `pvReserveW` stabil bleiben.
 */
export interface CoreBudgetReservationEntry {
  key: string;
  app: string;
  label: string;
  priority: number;
  requestedW: Watt;
  grantW: Watt;
  usedW: Watt;
  pvUsedW: Watt;
  reserveW: Watt;
  pvReserveW: Watt;
  actualW: Watt;
  pvOnly: boolean;
  mode: string;
  ts: TimestampMs;
  remainingTotalW: Watt | null;
  remainingPvW: Watt;
}

/**
 * Datenvertrag: CoreBudgetReservationRuntimeState
 *
 * Zweck:
 * Minimaler Laufzeitstand des Budgetkoordinators vor einer Reservierung.
 *
 * Zusammenhang:
 * Dieser Zustand entspricht dem alten JS-Objekt aus `makeBudgetRuntime`: verbleibendes
 * Gesamtbudget, verbleibendes PV-Budget, bereits bekannte Verbraucher und deren Reihenfolge.
 */
export interface CoreBudgetReservationRuntimeState {
  remainingTotalW?: unknown;
  remainingPvW?: unknown;
  consumers?: Record<string, CoreBudgetReservationEntry | Record<string, unknown> | null | undefined>;
  order?: readonly string[];
}

/** Ergebnis einer TS-Reservierungsberechnung. */
export interface CoreBudgetReservationResult {
  ok: boolean;
  source: 'ts-core-reservation';
  entry: CoreBudgetReservationEntry;
  nextRemainingTotalW: Watt | null;
  nextRemainingPvW: Watt;
  order: readonly string[];
  consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown>>;
  flexUsedW: Watt;
}

/**
 * Code-Teil: reservationString
 *
 * Zweck:
 * Normalisiert dynamische Request-Felder wie key/app/label/mode auf Strings.
 *
 * Zusammenhang:
 * Die alte JS-Logik erlaubt unterschiedliche Aliase (`key`, `consumer`, `app`). Diese
 * Kompatibilität muss bei der TS-Migration erhalten bleiben.
 */
function reservationString(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  return s || fallback;
}

/**
 * Code-Teil: reservationPositiveWatt
 *
 * Zweck:
 * Normalisiert Verbraucherleistungen auf positive Wattwerte und erhält 0 W als gültig.
 */
function reservationPositiveWatt(value: unknown, fallback = 0): Watt {
  const n = toNumberOrNull(value);
  return positiveWatt(n === null ? fallback : n);
}

/**
 * Code-Teil: reservationPriority
 *
 * Zweck:
 * Normalisiert Verbraucherprioritäten. Fehlende Priorität bleibt wie in JS bei 999.
 */
function reservationPriority(value: unknown): number {
  const n = toNumberOrNull(value);
  return n === null ? 999 : n;
}

/**
 * Code-Teil: calculateCoreBudgetFlexUsedW
 *
 * Zweck:
 * Berechnet die Summe der veröffentlichten flexiblen Verbraucherleistung.
 *
 * Zusammenhang:
 * Entspricht fachlich der alten JS-Summe aus `makeBudgetRuntime.reserve`. Diese Summe
 * wird als `ems.budget.flexUsedW` veröffentlicht.
 */
export function calculateCoreBudgetFlexUsedW(consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown> | null | undefined>, order?: readonly string[]): Watt {
  const keys = Array.isArray(order) && order.length ? order : Object.keys(consumers || {});
  const sum = keys.reduce((acc, key) => {
    const entry = consumers && consumers[key] ? consumers[key] as Record<string, unknown> : null;
    if (!entry) return acc;
    const used = toNumberOrNull(entry.usedW ?? entry.reserveW);
    return acc + positiveWatt(used);
  }, 0);
  return Math.round(sum);
}

/**
 * Code-Teil: buildCoreBudgetConsumersList
 *
 * Zweck:
 * Baut die geordnete Liste für `ems.budget.consumersJson`.
 *
 * Zusammenhang:
 * Das App-Center und Diagnosen erwarten ein Array. Die Runtime hält intern ein Objekt
 * plus Reihenfolge. Diese Funktion macht die Umwandlung typisiert und stabil.
 */
export function buildCoreBudgetConsumersList(consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown> | null | undefined>, order?: readonly string[]): Array<Record<string, unknown>> {
  const keys = Array.isArray(order) && order.length > 0 ? Array.from(order) : Object.keys(consumers || {});
  const result: Array<Record<string, unknown>> = [];
  for (const key of keys) {
    const entry = consumers && consumers[key] ? consumers[key] as Record<string, unknown> : null;
    if (entry) result.push({ key, ...entry });
  }
  return result;
}

/**
 * Code-Teil: computeCoreBudgetReservation
 *
 * Zweck:
 * Berechnet eine Verbraucher-Reservierung gegen das zentrale Budget in TypeScript.
 *
 * Zusammenhang:
 * Dies ist die Vorbereitung für die Migration von `makeBudgetRuntime.reserve` aus
 * `ems/modules/core-limits.js`. Ab 0.7.107 wird das Ergebnis produktiv für Consumer-Reservierungen genutzt,
 * während die alte JS-Rechnung als Fallback-/Vergleichspfad erhalten bleibt.
 *
 * Sicherheitsregel:
 * Die Funktion schreibt keine States und kennt keinen Adapter. Sie berechnet nur Entry,
 * Restbudgets und Verbraucherlisten. Dadurch kann sie gefahrlos gegen die JS-Runtime
 * verglichen werden.
 */
export function computeCoreBudgetReservation(
  runtime: CoreBudgetReservationRuntimeState,
  request: CoreBudgetReservationRequest,
  tsInput?: unknown,
): CoreBudgetReservationResult {
  const r = request && typeof request === 'object' ? request : {};
  const ts = (toNumberOrNull(tsInput) ?? Date.now()) as TimestampMs;
  const key = reservationString(r.key ?? r.consumer ?? r.app, 'unknown');
  const app = reservationString(r.app, key);
  const priority = reservationPriority(r.priority);
  const requestedW = reservationPositiveWatt(r.requestedW, 0);
  const reserveW = reservationPositiveWatt(r.reserveW, requestedW);
  const pvOnly = r.pvOnly === true;
  const pvReserveW = reservationPositiveWatt(r.pvReserveW, pvOnly ? reserveW : 0);
  const actualW = reservationPositiveWatt(r.actualW, reserveW);

  const remainingTotalNumber = toNumberOrNull(runtime && runtime.remainingTotalW);
  const remainingTotalW = remainingTotalNumber === null ? null : Math.max(0, remainingTotalNumber);
  const remainingPvW = positiveWatt(runtime && runtime.remainingPvW);
  const totalCap = remainingTotalW === null ? Number.POSITIVE_INFINITY : remainingTotalW;
  const pvCap = remainingPvW;
  const cap = pvOnly ? Math.min(totalCap, pvCap) : totalCap;
  const grantW = Math.max(0, Math.min(requestedW, cap));
  const nextRemainingTotalW = remainingTotalW === null ? null : Math.max(0, Math.round(remainingTotalW - reserveW));
  const nextRemainingPvW = Math.max(0, Math.round(remainingPvW - pvReserveW));

  const entry: CoreBudgetReservationEntry = {
    key,
    app,
    label: reservationString(r.label, key),
    priority,
    requestedW: Math.round(requestedW),
    grantW: Math.round(grantW),
    usedW: Math.round(reserveW),
    pvUsedW: Math.round(pvReserveW),
    reserveW: Math.round(reserveW),
    pvReserveW: Math.round(pvReserveW),
    actualW: Math.round(actualW),
    pvOnly,
    mode: reservationString(r.mode, ''),
    ts,
    remainingTotalW: nextRemainingTotalW,
    remainingPvW: nextRemainingPvW,
  };

  const consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown>> = {};
  const sourceConsumers = runtime && runtime.consumers ? runtime.consumers : {};
  for (const existingKey of Object.keys(sourceConsumers)) {
    const existing = sourceConsumers[existingKey];
    if (existing) consumers[existingKey] = existing as CoreBudgetReservationEntry | Record<string, unknown>;
  }
  consumers[key] = entry;
  const runtimeOrder = runtime && Array.isArray(runtime.order) ? runtime.order : [];
  const order = Array.from(runtimeOrder);
  if (!order.includes(key)) order.push(key);
  const flexUsedW = calculateCoreBudgetFlexUsedW(consumers, order);

  return {
    ok: true,
    source: 'ts-core-reservation',
    entry,
    nextRemainingTotalW,
    nextRemainingPvW,
    order,
    consumers,
    flexUsedW,
  };
}


/**
 * Datenvertrag: CoreBudgetForecastGateSnapshot
 *
 * Zweck:
 * Beschreibt Gate D – PV-Forecast als typisierte Teilstruktur.
 *
 * Zusammenhang:
 * Das Forecast-Gate beeinflusst später Heizstab-Startfreigaben, EVCS-Planung und
 * KI-Berater. In 0.7.120 bleibt die JavaScript-Runtime produktiv; TypeScript baut
 * nur denselben Snapshot für den Shadow-/Vorbereitungsvergleich.
 */
export interface CoreBudgetForecastGateSnapshot {
  valid: boolean;
  usable: boolean;
  ageMs: number | null;
  points: number;
  confidencePct: number;
  nowW: Watt;
  avgNext1hW: Watt;
  avgNext3hW: Watt;
  peakNext6hW: Watt;
  peakNext24hW: Watt;
  kwhNext1h: number;
  kwhNext3h: number;
  kwhNext6h: number;
  kwhNext12h: number;
  kwhNext24h: number;
  status: string;
  source: string;
}

/**
 * Datenvertrag: CoreBudgetTariffGateSnapshot
 *
 * Zweck:
 * Beschreibt Gate E – Tarif/Negativpreis/Netzentgelt als typisierte Teilstruktur.
 *
 * Zusammenhang:
 * Tarifwerte beeinflussen Speicher-Netzladen, EVCS-Planung und KI-Hinweise. Diese
 * Struktur darf `false` nicht als fehlend behandeln, weil `dischargeAllowed=false`
 * eine echte Sperre ist.
 */
export interface CoreBudgetTariffGateSnapshot {
  active: boolean;
  state: string;
  currentPriceEurKwh: number | null;
  negativeActive: boolean;
  gridImportPreferred: boolean;
  storageGridChargeAllowed: boolean;
  evcsGridChargeAllowed: boolean;
  dischargeAllowed: boolean;
  pvCurtailRecommended: boolean;
  negativeMinPriceEurKwh: number | null;
  nextNegativeFrom: string;
  nextNegativeTo: string;
  status: string;
}

/**
 * Datenvertrag: CoreBudgetPeakGridGateSnapshot
 *
 * Zweck:
 * Fasst Peak-Shaving, Netzgrenzen, §14a und EVCS-High-Level-Cap zusammen.
 *
 * Zusammenhang:
 * Diese Werte begrenzen Verbraucherbudgets. Eine spätere produktive TS-Übernahme darf
 * Netzanschluss, Peak-Shaving oder §14a niemals durch PV-/Tariflogik überstimmen.
 */
export interface CoreBudgetPeakGridGateSnapshot {
  peakActive: boolean;
  peakBudgetW: Watt | null;
  gridImportLimitW_effective: Watt;
  gridImportLimitW_source: string;
  para14aActive: boolean;
  para14aMode: string;
  para14aEvcsCapW: Watt | null;
  evcsHighLevelCapW: Watt | null;
  evcsHighLevelBinding: string;
}

/** Eingabe für den Restgate-Shadow-Vergleich. */
export interface CoreBudgetRestGatesSnapshotInput {
  ts?: unknown;
  forecast?: Record<string, unknown> | null;
  tariff?: Record<string, unknown> | null;
  peak?: Record<string, unknown> | null;
  grid?: Record<string, unknown> | null;
  para14a?: Record<string, unknown> | null;
  evcsHighLevel?: Record<string, unknown> | null;
}

/** Gesamter TS-Shadow-Snapshot für Forecast-/Tarif-/Peak-Restgates. */
export interface CoreBudgetRestGatesSnapshot {
  source: 'ts-core-rest-gates';
  ts: TimestampMs;
  forecast: CoreBudgetForecastGateSnapshot;
  tariff: CoreBudgetTariffGateSnapshot;
  peakGrid: CoreBudgetPeakGridGateSnapshot;
  productive: false;
  preparedOnly: true;
}

/** Einzelne Abweichung im Restgate-Vergleich. */
export interface CoreBudgetRestGateMismatch {
  field: string;
  js: unknown;
  ts: unknown;
  diff?: number | null;
  tolerance?: number;
}

/**
 * Code-Teil: restGateNumber
 *
 * Zweck:
 * Normalisiert unbekannte Gate-Werte auf Zahlen oder `null`.
 *
 * Wichtig:
 * `0` bleibt gültig. Nur fehlende/nicht-numerische Werte werden zu `null`.
 */
function restGateNumber(value: unknown): number | null {
  const n = toNumberOrNull(value);
  return n === null ? null : n;
}

/** Code-Teil: restGateWatt. Zweck: Normalisiert positive Wattwerte, erhält 0 W als gültig. */
function restGateWatt(value: unknown): Watt {
  const n = restGateNumber(value);
  return positiveWatt(n === null ? 0 : n);
}

/** Code-Teil: restGateNullableWatt. Zweck: Gibt positive Watt oder `null` für fehlende Caps zurück. */
function restGateNullableWatt(value: unknown): Watt | null {
  const n = restGateNumber(value);
  return n === null ? null : positiveWatt(n);
}

/** Code-Teil: restGateBool. Zweck: Normalisiert boolesche Gate-Werte, ohne false zu verlieren. */
function restGateBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on', 'ja', 'active'].includes(v)) return true;
    if (['false', '0', 'no', 'off', 'nein', 'inactive'].includes(v)) return false;
  }
  return fallback;
}

/** Code-Teil: restGateText. Zweck: Normalisiert Gate-Status-/Quellentexte. */
function restGateText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Code-Teil: buildCoreBudgetRestGatesSnapshot
 *
 * Zweck:
 * Baut aus den bestehenden JS-Gate-Strukturen einen typisierten TS-Restgate-Snapshot.
 *
 * Zusammenhang:
 * 0.7.120 bereitet Forecast-, Tarif- und Peak-/Grid-Constraints-Gates vor. Produktiv
 * bleibt vorerst die JS-Runtime; dieser Snapshot wird nur gegen JS verglichen und in
 * `ems.budget.tsRestGatesJson` sichtbar gemacht.
 */
export function buildCoreBudgetRestGatesSnapshot(input: CoreBudgetRestGatesSnapshotInput = {}): CoreBudgetRestGatesSnapshot {
  const forecast = (input.forecast && typeof input.forecast === 'object') ? input.forecast : {};
  const tariff = (input.tariff && typeof input.tariff === 'object') ? input.tariff : {};
  const peak = (input.peak && typeof input.peak === 'object') ? input.peak : {};
  const grid = (input.grid && typeof input.grid === 'object') ? input.grid : {};
  const para14a = (input.para14a && typeof input.para14a === 'object') ? input.para14a : {};
  const evcsHighLevel = (input.evcsHighLevel && typeof input.evcsHighLevel === 'object') ? input.evcsHighLevel : {};
  const ts = (toNumberOrNull(input.ts) ?? Date.now()) as TimestampMs;

  return {
    source: 'ts-core-rest-gates',
    ts,
    forecast: {
      valid: restGateBool(forecast.valid, false),
      usable: restGateBool(forecast.usable, false),
      ageMs: restGateNumber(forecast.ageMs),
      points: Math.max(0, Math.round(restGateNumber(forecast.points) ?? 0)),
      confidencePct: Math.max(0, Math.min(100, Math.round(restGateNumber(forecast.confidencePct) ?? 0))),
      nowW: restGateWatt(forecast.nowW),
      avgNext1hW: restGateWatt(forecast.avgNext1hW),
      avgNext3hW: restGateWatt(forecast.avgNext3hW),
      peakNext6hW: restGateWatt(forecast.peakNext6hW),
      peakNext24hW: restGateWatt(forecast.peakNext24hW),
      kwhNext1h: restGateNumber(forecast.kwhNext1h) ?? 0,
      kwhNext3h: restGateNumber(forecast.kwhNext3h) ?? 0,
      kwhNext6h: restGateNumber(forecast.kwhNext6h) ?? 0,
      kwhNext12h: restGateNumber(forecast.kwhNext12h) ?? 0,
      kwhNext24h: restGateNumber(forecast.kwhNext24h) ?? 0,
      status: restGateText(forecast.status),
      source: restGateText(forecast.source),
    },
    tariff: {
      active: restGateBool(tariff.active, false),
      state: restGateText(tariff.state),
      currentPriceEurKwh: restGateNumber(tariff.currentPriceEurKwh),
      negativeActive: restGateBool(tariff.negativeActive, false),
      gridImportPreferred: restGateBool(tariff.gridImportPreferred, false),
      storageGridChargeAllowed: restGateBool(tariff.storageGridChargeAllowed, false),
      evcsGridChargeAllowed: restGateBool(tariff.evcsGridChargeAllowed, false),
      dischargeAllowed: restGateBool(tariff.dischargeAllowed, true),
      pvCurtailRecommended: restGateBool(tariff.pvCurtailRecommended, false),
      negativeMinPriceEurKwh: restGateNumber(tariff.negativeMinPriceEurKwh),
      nextNegativeFrom: restGateText(tariff.nextNegativeFrom),
      nextNegativeTo: restGateText(tariff.nextNegativeTo),
      status: restGateText(tariff.status, restGateBool(tariff.gridImportPreferred, false) ? 'grid_import_preferred' : (restGateBool(tariff.active, false) ? 'active' : 'inactive')),
    },
    peakGrid: {
      peakActive: restGateBool(peak.active, false),
      peakBudgetW: restGateNullableWatt(peak.budgetW),
      gridImportLimitW_effective: restGateWatt(grid.gridImportLimitW_effective),
      gridImportLimitW_source: restGateText(grid.gridImportLimitW_source),
      para14aActive: restGateBool(para14a.active, false),
      para14aMode: restGateText(para14a.mode),
      para14aEvcsCapW: restGateNullableWatt(para14a.evcsCapW),
      evcsHighLevelCapW: restGateNullableWatt(evcsHighLevel.capW),
      evcsHighLevelBinding: restGateText(evcsHighLevel.binding),
    },
    productive: false,
    preparedOnly: true,
  };
}

/**
 * Code-Teil: compareCoreBudgetRestGates
 *
 * Zweck:
 * Vergleicht JS-Restgates mit dem TS-Restgate-Snapshot. In 0.7.120 ist das reine
 * Diagnose und keine produktive Umschaltung.
 */
export function compareCoreBudgetRestGates(js: CoreBudgetRestGatesSnapshotInput, ts: CoreBudgetRestGatesSnapshot): CoreBudgetRestGateMismatch[] {
  const mismatches: CoreBudgetRestGateMismatch[] = [];
  const f = js.forecast || {};
  const t = js.tariff || {};
  const p = js.peak || {};
  const g = js.grid || {};
  const a = js.para14a || {};
  const e = js.evcsHighLevel || {};

  const cmpNum = (field: string, jsValue: unknown, tsValue: unknown, tolerance = 0): void => {
    const j = restGateNumber(jsValue);
    const tv = restGateNumber(tsValue);
    if (j === null && tv === null) return;
    if (j === null || tv === null || Math.abs(j - tv) > tolerance) {
      mismatches.push({ field, js: j, ts: tv, diff: j !== null && tv !== null ? Math.round((tv - j) * 1000) / 1000 : null, tolerance });
    }
  };
  const cmpBool = (field: string, jsValue: unknown, tsValue: unknown): void => {
    const j = restGateBool(jsValue, false);
    const tv = restGateBool(tsValue, false);
    if (j !== tv) mismatches.push({ field, js: j, ts: tv });
  };
  const cmpText = (field: string, jsValue: unknown, tsValue: unknown): void => {
    const j = restGateText(jsValue);
    const tv = restGateText(tsValue);
    if (j !== tv) mismatches.push({ field, js: j, ts: tv });
  };

  cmpBool('forecast.valid', f.valid, ts.forecast.valid);
  cmpBool('forecast.usable', f.usable, ts.forecast.usable);
  cmpNum('forecast.confidencePct', f.confidencePct, ts.forecast.confidencePct, 1);
  cmpNum('forecast.nowW', f.nowW, ts.forecast.nowW, 5);
  cmpNum('forecast.avgNext1hW', f.avgNext1hW, ts.forecast.avgNext1hW, 5);
  cmpNum('forecast.avgNext3hW', f.avgNext3hW, ts.forecast.avgNext3hW, 5);
  cmpText('forecast.status', f.status, ts.forecast.status);

  cmpBool('tariff.active', t.active, ts.tariff.active);
  cmpBool('tariff.negativeActive', t.negativeActive, ts.tariff.negativeActive);
  cmpBool('tariff.gridImportPreferred', t.gridImportPreferred, ts.tariff.gridImportPreferred);
  cmpBool('tariff.storageGridChargeAllowed', t.storageGridChargeAllowed, ts.tariff.storageGridChargeAllowed);
  cmpBool('tariff.evcsGridChargeAllowed', t.evcsGridChargeAllowed, ts.tariff.evcsGridChargeAllowed);
  cmpBool('tariff.dischargeAllowed', t.dischargeAllowed !== false, ts.tariff.dischargeAllowed);
  cmpNum('tariff.currentPriceEurKwh', t.currentPriceEurKwh, ts.tariff.currentPriceEurKwh, 0.0001);
  cmpText('tariff.status', t.status, ts.tariff.status);

  cmpBool('peak.active', p.active, ts.peakGrid.peakActive);
  cmpNum('peak.budgetW', p.budgetW, ts.peakGrid.peakBudgetW, 5);
  cmpNum('grid.gridImportLimitW_effective', g.gridImportLimitW_effective, ts.peakGrid.gridImportLimitW_effective, 5);
  cmpText('grid.gridImportLimitW_source', g.gridImportLimitW_source, ts.peakGrid.gridImportLimitW_source);
  cmpBool('para14a.active', a.active, ts.peakGrid.para14aActive);
  cmpText('para14a.mode', a.mode, ts.peakGrid.para14aMode);
  cmpNum('para14a.evcsCapW', a.evcsCapW, ts.peakGrid.para14aEvcsCapW, 5);
  cmpNum('evcsHighLevel.capW', e.capW, ts.peakGrid.evcsHighLevelCapW, 5);
  cmpText('evcsHighLevel.binding', e.binding, ts.peakGrid.evcsHighLevelBinding);

  return mismatches;
}
