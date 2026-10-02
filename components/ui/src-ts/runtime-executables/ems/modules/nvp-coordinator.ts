// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Koordiniert Speicher und PV am gemeinsamen Netzverknüpfungspunkt, damit verbleibende Netzabweichungen nicht doppelt ausgeregelt werden.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/nvp-coordinator.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Datei: ems/modules/nvp-coordinator.js
 * Rolle: Gemeinsame NVP-Steuerhoheit für Speicher/Farm und PV-/WR-Abregelung.
 *
 * Der Speicherregler berechnet und schreibt zuerst genau einen finalen Sollwert.
 * Anschließend prognostiziert dieser Koordinator, wie sich eine noch ausstehende
 * Speicherreaktion am Netzverknüpfungspunkt (NVP) auswirkt. Nur die danach noch
 * verbleibende Einspeisung wird an die PV-/WR-Regelung weitergegeben.
 *
 * Wichtig:
 * - Der Koordinator erzeugt keinen zweiten Speicher-Schreibpfad.
 * - Manuell zugeordnete AppCenter-DPs und alle Safety-/Authority-Gates bleiben
 *   ausschließlich im zuständigen Speicher- bzw. PV-Modul.
 * - Richtungswechsel werden nie durch eine künstliche 0-W-Runde ergänzt.
 */

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { BaseModule }: { BaseModule: any } = require('./base');
const { resolveCurrentNvpSnapshot }: { resolveCurrentNvpSnapshot: (snapshot: unknown, now: number, maxAgeMs: number) => AnyRecord } = require('../services/measurement-freshness');
const { withActuatorShadowContext, priorityForOwner }: {
  withActuatorShadowContext: (adapter: AnyRecord, context: AnyRecord, fn: () => Promise<unknown>) => Promise<unknown>;
  priorityForOwner: (owner: string) => number;
} = require('../services/actuator-shadow-arbiter');
const { getAcceptedPowerEffectSnapshot }: { getAcceptedPowerEffectSnapshot: (adapter: AnyRecord) => AnyRecord } = require('../services/accepted-power-effects');
const {
  resolveStorageOperatingPolicy,
  resolveNvpBandTarget,
}: {
  resolveStorageOperatingPolicy: (input: AnyRecord) => AnyRecord;
  resolveNvpBandTarget: (nvpW: unknown, targetW?: unknown, hysteresisW?: unknown) => AnyRecord;
} = require('../services/storage-self-consumption-policy');

type AnyRecord = Record<string, any>;

type CoordinatorInput = {
  now?: number;
  nvpUsable?: boolean;
  rawNvpW?: number | null;
  nvpSource?: string;
  nvpMeasurementAgeMs?: number | null;
  nvpTargetW?: number;
  deadbandW?: number;
  topology?: string;
  storageActualW?: number | null;
  storageActualAgeMs?: number | null;
  storageActualTrusted?: boolean;
  storageTargetW?: number | null;
  storageRequestW?: number | null;
  storageRequestSource?: string;
  storageRequestReason?: string;
  storageWriteOk?: boolean;
  storageCommandEffective?: boolean;
  storageWriteStatus?: string;
  storagePolicyBlocked?: boolean;
  storagePolicyBlockReason?: string;
  storagePolicySource?: string;
  storagePartiallyAccepted?: boolean;
  storageRequestSatisfied?: boolean;
  storageFailedW?: number | null;
  storageUnservedW?: number | null;
  responseAgeMs?: number;
  responseGraceMs?: number;
  responseDeadbandW?: number;
  actualMaxAgeMs?: number;
  acceptedFlexibleNetLoadDeltaW?: number;
  acceptedFlexibleLoadDeltaW?: number;
  acceptedFlexibleGenerationDeltaW?: number;
  acceptedFlexibleCreditedCount?: number;
  acceptedFlexibleUncertainCount?: number;
  acceptedFlexibleEffects?: AnyRecord[];
};

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const roundedOrNull = (value: unknown): number | null => {
  const n = finiteOrNull(value);
  return n === null ? null : Math.round(n);
};

const boolValue = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nein', 'off', ''].includes(normalized)) return false;
  }
  return fallback;
};

const cleanText = (value: unknown, maxLen = 240): string => {
  const text = String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= maxLen ? text : `${text.slice(0, Math.max(0, maxLen - 1))}…`;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const containsAny = (value: unknown, terms: readonly string[]): boolean => {
  const text = String(value || '').toLowerCase();
  return terms.some((term) => text.includes(term));
};

/**
 * Reine, deterministische NVP-Prognose. Vorzeichen:
 * - NVP positiv = Netzbezug, negativ = Einspeisung
 * - Speicher positiv = Entladen, negativ = Laden
 *
 * Erwarteter NVP nach der noch ausstehenden Speicherreaktion:
 *   NVP_prognose = NVP_ist - (Speicher_soll - Speicher_ist)
 */
function buildNvpCoordinatorSnapshot(input: CoordinatorInput = {}) {
  const now = Math.max(0, Math.round(finiteOrNull(input.now) ?? Date.now()));
  const rawNvpW = roundedOrNull(input.rawNvpW);
  const nvpUsable = boolValue(input.nvpUsable, false) && rawNvpW !== null;
  const nvpTargetW = Math.max(0, Math.round(finiteOrNull(input.nvpTargetW) ?? 50));
  const deadbandW = clamp(Math.round(finiteOrNull(input.deadbandW) ?? 30), 0, 1000000);
  const topology = cleanText(input.topology || 'none', 40).toLowerCase() || 'none';
  const storageActualW = roundedOrNull(input.storageActualW);
  const storageTargetW = roundedOrNull(input.storageTargetW);
  const storageRequestW = roundedOrNull(input.storageRequestW);
  const storageRequestSource = cleanText(input.storageRequestSource || '', 120);
  const storageRequestReason = cleanText(input.storageRequestReason || '', 320);
  const storageActualAgeMs = roundedOrNull(input.storageActualAgeMs);
  const storageActualTrusted = boolValue(input.storageActualTrusted, false);
  const actualMaxAgeMs = clamp(Math.round(finiteOrNull(input.actualMaxAgeMs) ?? 30000), 1000, 600000);
  const responseGraceMs = clamp(Math.round(finiteOrNull(input.responseGraceMs) ?? 5000), 0, 300000);
  const responseDeadbandW = clamp(Math.round(finiteOrNull(input.responseDeadbandW) ?? 150), 0, 10000);
  const responseAgeMs = Math.max(0, Math.round(finiteOrNull(input.responseAgeMs) ?? 0));
  const storageWriteStatus = cleanText(input.storageWriteStatus || '', 260);
  const writeStatusLower = storageWriteStatus.toLowerCase();
  const storagePolicyBlocked = boolValue(input.storagePolicyBlocked, false);
  const storagePolicyBlockReason = cleanText(input.storagePolicyBlockReason || '', 320);
  const storagePolicySource = cleanText(input.storagePolicySource || '', 120);

  const noWriter = topology === 'none'
    || containsAny(writeStatusLower, ['deaktiviert', 'kein-aktiver-speicher-ausgang', 'kein aktiver speicher-ausgang']);
  const blocked = !noWriter && containsAny(writeStatusLower, [
    'blockiert', 'blocked', 'authority', 'konflikt', 'gesperrt', 'nicht-moeglich', 'nicht möglich', 'nicht moeglich',
  ]);
  const hold = !noWriter && !blocked && containsAny(writeStatusLower, ['no-write', 'hold']);
  const retained = !noWriter && !blocked && writeStatusLower === 'unverändert';
  const partial = !noWriter && !blocked && (
    boolValue(input.storagePartiallyAccepted, false)
    || containsAny(writeStatusLower, ['farm-partial', 'partial'])
  );
  const commandEffective = boolValue(input.storageCommandEffective, false);
  const writeOk = boolValue(input.storageWriteOk, false);
  const storageWriteAccepted = !noWriter && !blocked && !hold && (
    commandEffective
    || writeOk
    || retained
  );
  const storageWriteFullyAccepted = storageWriteAccepted && !partial && (
    writeOk
    || retained
    || boolValue(input.storageRequestSatisfied, false)
  );
  const writeFailed = !noWriter && !blocked && !hold && !storageWriteAccepted;

  const storageActualFresh = storageActualW !== null
    && storageActualTrusted
    && (storageActualAgeMs === null || storageActualAgeMs <= actualMaxAgeMs);
  const storagePendingDeltaW = storageActualW !== null && storageTargetW !== null
    ? Math.round(storageTargetW - storageActualW)
    : null;
  const storageResponsePending = storagePendingDeltaW !== null
    && Math.abs(storagePendingDeltaW) > responseDeadbandW;
  const responseWithinGrace = !storageResponsePending || responseAgeMs <= responseGraceMs;
  const storageCommandCredited = nvpUsable
    && topology !== 'none'
    && !storagePolicyBlocked
    && storageActualFresh
    && storageTargetW !== null
    && storageWriteAccepted
    && responseWithinGrace;
  const acceptedFlexibleNetLoadDeltaW = Math.round(finiteOrNull(input.acceptedFlexibleNetLoadDeltaW) ?? 0);
  const acceptedFlexibleLoadDeltaW = Math.round(finiteOrNull(input.acceptedFlexibleLoadDeltaW) ?? 0);
  const acceptedFlexibleGenerationDeltaW = Math.round(finiteOrNull(input.acceptedFlexibleGenerationDeltaW) ?? 0);
  const acceptedFlexibleCreditedCount = Math.max(0, Math.round(finiteOrNull(input.acceptedFlexibleCreditedCount) ?? 0));
  const acceptedFlexibleUncertainCount = Math.max(0, Math.round(finiteOrNull(input.acceptedFlexibleUncertainCount) ?? 0));
  const acceptedFlexibleEffects = Array.isArray(input.acceptedFlexibleEffects) ? input.acceptedFlexibleEffects.slice(0, 100) : [];

  const projectedAfterStorageW = rawNvpW === null
    ? null
    : Math.round(rawNvpW - (storageCommandCredited ? (storagePendingDeltaW || 0) : 0));
  const projectedNvpW = projectedAfterStorageW === null
    ? null
    : Math.round(projectedAfterStorageW + acceptedFlexibleNetLoadDeltaW);
  const pvControlNvpW = projectedNvpW;
  const nvpBand = resolveNvpBandTarget(rawNvpW, nvpTargetW, deadbandW);
  const projectedBand = resolveNvpBandTarget(projectedNvpW, nvpTargetW, deadbandW);
  const nvpCenterErrorW = rawNvpW === null ? null : Math.round(nvpBand.centerErrorW);
  // `nvpErrorW` ist der tatsaechlich handlungsrelevante Fehler zur Zielmitte,
  // sobald der NVP ausserhalb der kleinen Messtoleranz liegt. Innerhalb der
  // Toleranz bleibt er 0 W. Die Bandgrenzen sind damit reine Aktivierungs- und
  // Diagnosegrenzen, keine alternativen Regelziele.
  const nvpErrorW = rawNvpW === null ? null : Math.round(nvpBand.bandErrorW);
  const projectedCenterErrorW = projectedNvpW === null ? null : Math.round(projectedBand.centerErrorW);
  const projectedErrorW = projectedNvpW === null ? null : Math.round(projectedBand.bandErrorW);
  const withinBand = rawNvpW !== null && !nvpBand.outsideBand;
  const projectedWithinBand = projectedNvpW !== null && !projectedBand.outsideBand;

  let status = 'observing';
  let reason = 'NVP wird beobachtet';
  if (!nvpUsable) {
    status = 'stale';
    reason = 'NVP-Messwert fehlt, ist veraltet oder nicht verbunden';
  } else if (acceptedFlexibleUncertainCount > 0) {
    status = 'waiting-flexible-actuator';
    reason = 'Akzeptierter Aktorwechsel ohne sichere Leistungsprognose – PV wartet auf frischen NVP';
  } else if (noWriter) {
    status = withinBand ? 'stable' : 'observing';
    reason = withinBand ? 'NVP liegt ohne aktiven Speicherwriter im Zielband' : 'Kein aktiver Speicherwriter; PV-Regelung sieht den echten NVP';
  } else if (storagePolicyBlocked) {
    status = 'storage-policy-blocked';
    reason = storagePolicyBlockReason || 'Speicheraktion ist durch die wirksame Policy gesperrt';
  } else if (blocked) {
    status = 'storage-blocked';
    reason = storageWriteStatus || 'Speicherbefehl wurde durch ein Gate blockiert';
  } else if (writeFailed) {
    status = 'storage-write-failed';
    reason = storageWriteStatus || 'Speicherbefehl wurde nicht erfolgreich geschrieben';
  } else if (partial) {
    status = storageCommandCredited && storageResponsePending ? 'waiting-storage-response-partial' : 'storage-partial';
    reason = storageWriteStatus || 'Speicherfarm hat nur einen Teil der Anforderung akzeptiert';
  } else if (hold) {
    status = 'storage-hold';
    reason = storageWriteStatus || 'Speichervorgabe wird bewusst gehalten';
  } else if (storageCommandCredited && storageResponsePending) {
    status = 'waiting-storage-response';
    reason = `Speicherreaktion wird für maximal ${responseGraceMs} ms vorweggenommen`;
  } else if (storageWriteAccepted && storageResponsePending && !responseWithinGrace) {
    status = 'storage-response-timeout';
    reason = 'Speicher-Istleistung folgt dem Sollwert nicht innerhalb der Reaktionszeit';
  } else if (withinBand) {
    status = 'stable';
    reason = 'NVP liegt im Zielband';
  } else if (storageWriteAccepted && storageTargetW === 0) {
    const policyLimited = containsAny(`${storageRequestSource} ${storageRequestReason}`, [
      'soc', 'reserve', 'min-so', 'max-so', 'gesperrt', 'blockiert', 'warten',
      'stop', 'freigabe', 'limit', 'schutz', 'deaktiviert',
    ]);
    status = policyLimited ? 'storage-policy-limited' : 'storage-idle';
    reason = storageRequestReason
      || storageWriteStatus
      || (policyLimited ? 'Speicherregelung ist durch eine aktive Policy begrenzt' : 'Speicher-Sollwert ist 0 W');
  } else if (storageWriteAccepted) {
    status = 'correcting-storage';
    reason = storageRequestReason || 'Speicher/Farm regelt den NVP';
  }

  return {
    schema: 'nexowatt.nvp-coordinator.v1',
    ts: now,
    active: true,
    status,
    reason,
    nvpUsable,
    nvpSource: cleanText(input.nvpSource || '', 180),
    nvpMeasurementAgeMs: roundedOrNull(input.nvpMeasurementAgeMs),
    rawNvpW,
    nvpTargetW,
    deadbandW,
    nvpBandLowerW: Math.round(nvpBand.lowerBandW),
    nvpBandUpperW: Math.round(nvpBand.upperBandW),
    nvpActiveTargetW: Math.round(nvpBand.activeTargetNvpW),
    nvpCenterErrorW,
    nvpErrorW,
    projectedCenterErrorW,
    projectedErrorW,
    topology,
    storageActualW,
    storageActualAgeMs,
    storageActualTrusted,
    storageActualFresh,
    storageTargetW,
    storageRequestW,
    storageRequestSource,
    storageRequestReason,
    storageWriteOk: writeOk,
    storageCommandEffective: commandEffective,
    storageWriteAccepted,
    storageWriteFullyAccepted,
    storagePartial: partial,
    storagePartiallyAccepted: partial && storageWriteAccepted,
    storageRequestSatisfied: boolValue(input.storageRequestSatisfied, false),
    storageFailedW: roundedOrNull(input.storageFailedW),
    storageUnservedW: roundedOrNull(input.storageUnservedW),
    storageWriteStatus,
    storagePolicyBlocked,
    storagePolicyBlockReason,
    storagePolicySource,
    storageNoWriter: noWriter,
    storageBlocked: blocked,
    storageHold: hold,
    storageWriteFailed: writeFailed,
    storagePendingDeltaW,
    storageResponsePending,
    storageResponseAgeMs: responseAgeMs,
    storageResponseGraceMs: responseGraceMs,
    storageResponseDeadbandW: responseDeadbandW,
    storageCommandCredited,
    acceptedFlexibleNetLoadDeltaW,
    acceptedFlexibleLoadDeltaW,
    acceptedFlexibleGenerationDeltaW,
    acceptedFlexibleCreditedCount,
    acceptedFlexibleUncertainCount,
    acceptedFlexibleEffects,
    projectedAfterStorageW,
    projectedNvpW,
    pvControlNvpW,
    withinBand,
    projectedWithinBand,
    stable: withinBand,
  };
}

class NvpCoordinatorModule extends BaseModule {
  public adapter: AnyRecord;
  public dp: AnyRecord | null;
  public gridConstraints: AnyRecord | null;
  public gridEnabledFn: (() => boolean) | null;
  public _targetDirection: number;
  public _responseSinceMs: number;
  public _responseTargetW: number | null;
  public _responseTopology: string;
  public _lastActualW: number | null;
  public _lastActualSampleTs: number;
  public _storageTelemetryIntervalMs: number | null;
  public _lastProgressMs: number;
  public _lastLogMs: number;
  public _lastLogSignature: string;
  public _log: AnyRecord[];
  public _cycle: number;

  constructor(
    adapter: AnyRecord,
    dpRegistry: AnyRecord | null,
    gridConstraintsModule: AnyRecord | null,
    gridEnabledFn: (() => boolean) | null = null,
  ) {
    super(adapter, dpRegistry);
    this.adapter = adapter;
    this.dp = dpRegistry;
    this.gridConstraints = gridConstraintsModule || null;
    this.gridEnabledFn = typeof gridEnabledFn === 'function' ? gridEnabledFn : null;
    this._targetDirection = 0;
    this._responseSinceMs = 0;
    this._responseTargetW = null;
    this._responseTopology = '';
    this._lastActualW = null;
    this._lastActualSampleTs = 0;
    this._storageTelemetryIntervalMs = null;
    this._lastProgressMs = 0;
    this._lastLogMs = 0;
    this._lastLogSignature = '';
    this._log = [];
    this._cycle = 0;
  }

  async init(): Promise<void> {
    await this.adapter.setObjectNotExistsAsync('ems', {
      type: 'channel', common: { name: 'EMS' }, native: {},
    });
    await this.adapter.setObjectNotExistsAsync('ems.nvpCoordinator', {
      type: 'channel', common: { name: 'NVP-Koordinator' }, native: {},
    });

    const mk = async (id: string, name: string, type: 'string' | 'number' | 'boolean', role: string): Promise<void> => {
      await this.adapter.setObjectNotExistsAsync(id, {
        type: 'state',
        common: { name, type, role, read: true, write: false },
        native: {},
      });
    };

    await mk('ems.nvpCoordinator.active', 'NVP-Koordinator aktiv', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.status', 'NVP-Koordinator Status', 'string', 'text');
    await mk('ems.nvpCoordinator.reason', 'NVP-Koordinator Grund', 'string', 'text');
    await mk('ems.nvpCoordinator.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time');
    await mk('ems.nvpCoordinator.nvpSource', 'NVP-Quelle', 'string', 'text');
    await mk('ems.nvpCoordinator.nvpMeasurementAgeMs', 'NVP-Messwertalter (ms)', 'number', 'value.interval');
    await mk('ems.nvpCoordinator.nvpRawW', 'NVP RAW (+ Bezug / - Einspeisung)', 'number', 'value.power');
    await mk('ems.nvpCoordinator.nvpTargetW', 'NVP-Zielbezug', 'number', 'value.power');
    await mk('ems.nvpCoordinator.deadbandW', 'NVP-Messtoleranz', 'number', 'value.power');
    await mk('ems.nvpCoordinator.nvpTuningSource', 'NVP-Abstimmung Quelle', 'string', 'text');
    await mk('ems.nvpCoordinator.nvpTuningTopology', 'NVP-Abstimmung Speichertopologie', 'string', 'text');
    await mk('ems.nvpCoordinator.nvpBandLowerW', 'NVP untere Toleranzgrenze', 'number', 'value.power');
    await mk('ems.nvpCoordinator.nvpBandUpperW', 'NVP obere Toleranzgrenze', 'number', 'value.power');
    await mk('ems.nvpCoordinator.nvpActiveTargetW', 'NVP aktives Regelziel', 'number', 'value.power');
    await mk('ems.nvpCoordinator.nvpCenterErrorW', 'NVP-Abweichung zur Zielmitte', 'number', 'value.power');
    await mk('ems.nvpCoordinator.nvpErrorW', 'NVP-Regelfehler zur Zielmitte außerhalb Toleranz', 'number', 'value.power');
    await mk('ems.nvpCoordinator.projectedCenterErrorW', 'Prognose-Abweichung zur Zielmitte', 'number', 'value.power');
    await mk('ems.nvpCoordinator.projectedErrorW', 'Prognose-Regelfehler zur Zielmitte außerhalb Toleranz', 'number', 'value.power');
    await mk('ems.nvpCoordinator.storageTopology', 'Ausgewählte Speichertopologie', 'string', 'text');
    await mk('ems.nvpCoordinator.storageActualW', 'Speicher/Farm Istleistung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.storageRequestedTargetW', 'Speicher/Farm angeforderte Sollleistung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.storageTargetW', 'Speicher/Farm von Writes akzeptierte Sollleistung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.storageWriteOk', 'Speicher-Write vollständig erfolgreich', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.storageWriteAccepted', 'Mindestens ein wirksamer Speicherbefehl akzeptiert', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.storageWriteFullyAccepted', 'Speicheranforderung vollständig akzeptiert', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.storagePartiallyAccepted', 'Speicherfarm teilweise akzeptiert', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.storageFailedW', 'Speicherleistung wegen Write-Fehlern ausgefallen', 'number', 'value.power');
    await mk('ems.nvpCoordinator.storageUnservedW', 'Speicherleistung wegen Grenzen nicht verteilbar', 'number', 'value.power');
    await mk('ems.nvpCoordinator.storageWriteStatus', 'Speicher-Write Status', 'string', 'text');
    await mk('ems.nvpCoordinator.storagePolicyBlocked', 'Speicheraktion durch Policy blockiert', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.storagePolicyBlockReason', 'Grund der Speicher-Policy-Sperre', 'string', 'text');
    await mk('ems.nvpCoordinator.storagePolicySource', 'Quelle der wirksamen Speicher-Policy', 'string', 'text');
    await mk('ems.nvpCoordinator.storageTargetAgeMs', 'Alter der ausstehenden Speicherreaktion', 'number', 'value.interval');
    await mk('ems.nvpCoordinator.storageCommandCredited', 'Speicherreaktion im NVP vorweggenommen', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.storagePendingDeltaW', 'Noch ausstehende Speicherleistungsänderung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.flexibleNetLoadDeltaW', 'Im selben Zyklus akzeptierte Netto-Laständerung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.flexibleLoadDeltaW', 'Im selben Zyklus akzeptierte Laständerung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.flexibleGenerationDeltaW', 'Im selben Zyklus akzeptierte Erzeugungsänderung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.flexibleCreditedCount', 'Sicher prognostizierte Aktoränderungen', 'number', 'value');
    await mk('ems.nvpCoordinator.flexibleUncertainCount', 'Akzeptierte Aktorwechsel ohne sichere Leistungsprognose', 'number', 'value');
    await mk('ems.nvpCoordinator.flexibleEffectsJson', 'Akzeptierte Aktorwirkungen im aktuellen EMS-Zyklus', 'string', 'json');
    await mk('ems.nvpCoordinator.projectedAfterStorageW', 'Prognostizierter NVP nach Speicherreaktion', 'number', 'value.power');
    await mk('ems.nvpCoordinator.projectedNvpW', 'Prognostizierter NVP nach allen akzeptierten Aktoränderungen', 'number', 'value.power');
    await mk('ems.nvpCoordinator.pvControlNvpW', 'NVP für nachgelagerte PV-Regelung', 'number', 'value.power');
    await mk('ems.nvpCoordinator.pvAction', 'PV-/WR-Aktion', 'string', 'text');
    await mk('ems.nvpCoordinator.pvMode', 'PV-/WR-Regelmodus', 'string', 'text');
    await mk('ems.nvpCoordinator.pvApplied', 'PV-/WR-Sollwert geschrieben', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.pvSetpointW', 'PV-/WR-Sollwert W', 'number', 'value.power');
    await mk('ems.nvpCoordinator.pvSetpointPct', 'PV-/WR-Sollwert Prozent', 'number', 'value.percent');
    await mk('ems.nvpCoordinator.withinBand', 'NVP im Zielband', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.stable', 'NVP-Regelung stabil', 'boolean', 'indicator');
    await mk('ems.nvpCoordinator.statusJson', 'NVP-/Speicher-/PV-Regelkette (JSON)', 'string', 'json');
    await mk('ems.nvpCoordinator.logJson', 'NVP-Stabilitätslog (Ringpuffer JSON)', 'string', 'json');
  }

  _config(): AnyRecord {
    const root = this.adapter && this.adapter.config ? this.adapter.config : {};
    const cfg = root.nvpCoordinator && typeof root.nvpCoordinator === 'object' ? root.nvpCoordinator : {};
    const storage = root.storageControl && typeof root.storageControl === 'object'
      ? root.storageControl
      : (root.storage && typeof root.storage === 'object' ? root.storage : {});
    const authority = this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function'
      ? this.adapter._nwGetStorageControlAuthority()
      : { selectedTopology: root.enableStorageFarm === true ? 'farm' : 'single' };
    const installer = root.installerConfig && typeof root.installerConfig === 'object' ? root.installerConfig : {};
    const multiUse = installer.storageMultiUse && typeof installer.storageMultiUse === 'object'
      ? installer.storageMultiUse
      : null;
    const operatingPolicy = resolveStorageOperatingPolicy({
      storageConfig: storage,
      storageFarmConfig: root.storageFarm && typeof root.storageFarm === 'object' ? root.storageFarm : {},
      selectedTopology: authority && authority.selectedTopology ? authority.selectedTopology : 'single',
      multiUseConfig: multiUse,
      multiUseActive: root.enableMultiUse === true && !!multiUse && multiUse.enabled === true,
      standaloneDefaultTargetGridImportW: 50,
      standaloneDefaultImportThresholdW: 20,
    });
    const staleSec = finiteOrNull(storage.staleTimeoutSec) ?? 30;
    const responseGraceMs = clamp(Math.round((finiteOrNull(cfg.storageResponseGraceSec) ?? 10) * 1000), 0, 300000);
    const responseDeadbandW = clamp(Math.round(finiteOrNull(cfg.storageResponseDeadbandW) ?? 150), 0, 10000);
    return {
      responseGraceMs,
      responseGraceMaxMs: clamp(
        Math.round((finiteOrNull(cfg.storageResponseGraceMaxSec) ?? 30) * 1000),
        responseGraceMs,
        300000,
      ),
      responseTelemetryFactor: clamp(finiteOrNull(cfg.storageResponseTelemetryFactor) ?? 2.5, 1, 10),
      responseTargetChangeW: clamp(
        Math.round(finiteOrNull(cfg.storageResponseTargetChangeW) ?? Math.max(50, responseDeadbandW)),
        1,
        10000,
      ),
      responseDeadbandW,
      responseProgressW: clamp(Math.round(finiteOrNull(cfg.storageResponseProgressW) ?? 50), 10, 5000),
      actualMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.storageActualMaxAgeSec) ?? staleSec) * 1000), 1000, 600000),
      nvpMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.nvpMaxAgeSec) ?? Math.max(staleSec, 10)) * 1000), 1000, 600000),
      targetW: Math.max(0, Math.round(finiteOrNull(operatingPolicy?.self?.targetGridImportW) ?? 50)),
      deadbandW: clamp(Math.round(finiteOrNull(operatingPolicy?.self?.importThresholdW) ?? 20), 0, 1000000),
      nvpTuningSource: cleanText(operatingPolicy?.nvpTuning?.source || operatingPolicy?.self?.nvpTuningSource || '', 120),
      nvpTuningTopology: cleanText(operatingPolicy?.nvpTuning?.topology || authority?.selectedTopology || '', 40),
      hardRawGuardW: Math.max(0, Math.round(finiteOrNull(cfg.hardRawExportW) ?? 0)),
      logIntervalMs: clamp(Math.round((finiteOrNull(cfg.logIntervalSec) ?? 5) * 1000), 1000, 60000),
      logMaxEntries: clamp(Math.round(finiteOrNull(cfg.logMaxEntries) ?? 180), 20, 1000),
    };
  }

  async _readStates(ids: readonly string[]): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    await Promise.all(ids.map(async (id) => {
      try {
        const state = await this.adapter.getStateAsync(id);
        out[id] = state ? state.val : null;
      } catch {
        out[id] = null;
      }
    }));
    return out;
  }

  _responseState(
    now: number,
    topology: string,
    targetW: number | null,
    actualW: number | null,
    actualSampleTs: number | null,
    writeAccepted: boolean,
    cfg: AnyRecord,
  ): AnyRecord {
    const direction = targetW === null ? 0 : (targetW > 0 ? 1 : (targetW < 0 ? -1 : 0));
    const pendingDelta = targetW !== null && actualW !== null ? targetW - actualW : 0;
    const pending = targetW !== null && actualW !== null && Math.abs(pendingDelta) > cfg.responseDeadbandW;
    const sampleTs = actualSampleTs !== null && Number.isFinite(Number(actualSampleTs))
      ? Math.max(0, Number(actualSampleTs))
      : 0;

    let actualSampleUpdated = false;
    if (sampleTs > 0 && sampleTs > this._lastActualSampleTs + 25) {
      if (this._lastActualSampleTs > 0) {
        const intervalMs = sampleTs - this._lastActualSampleTs;
        if (intervalMs >= 250 && intervalMs <= 300000) {
          this._storageTelemetryIntervalMs = this._storageTelemetryIntervalMs === null
            ? intervalMs
            : Math.round((this._storageTelemetryIntervalMs * 0.7) + (intervalMs * 0.3));
        }
      }
      this._lastActualSampleTs = sampleTs;
      actualSampleUpdated = true;
    }

    const telemetryGraceMs = this._storageTelemetryIntervalMs === null
      ? cfg.responseGraceMs
      : Math.round((this._storageTelemetryIntervalMs * cfg.responseTelemetryFactor) + 1000);
    const effectiveGraceMs = clamp(
      Math.max(cfg.responseGraceMs, telemetryGraceMs),
      cfg.responseGraceMs,
      cfg.responseGraceMaxMs,
    );

    const responseTargetChanged = targetW !== null && (
      this._responseTargetW === null
      || topology !== this._responseTopology
      || direction !== this._targetDirection
      || Math.abs(targetW - this._responseTargetW) >= cfg.responseTargetChangeW
    );

    const clearResponse = (): AnyRecord => {
      this._responseSinceMs = 0;
      this._responseTargetW = targetW;
      this._responseTopology = topology;
      this._targetDirection = direction;
      this._lastActualW = actualW;
      this._lastProgressMs = now;
      return {
        ageMs: 0,
        effectiveGraceMs,
        telemetryIntervalMs: this._storageTelemetryIntervalMs,
        actualSampleTs: sampleTs || null,
        actualSampleUpdated,
        responseTargetW: targetW,
        responseTargetChanged,
        progressDetected: false,
      };
    };

    if (!writeAccepted || topology === 'none' || !pending) return clearResponse();

    if (!this._responseSinceMs || responseTargetChanged) {
      this._responseSinceMs = now;
      this._responseTargetW = targetW;
      this._responseTopology = topology;
      this._lastProgressMs = now;
      this._targetDirection = direction;
      this._lastActualW = actualW;
      return {
        ageMs: 0,
        effectiveGraceMs,
        telemetryIntervalMs: this._storageTelemetryIntervalMs,
        actualSampleTs: sampleTs || null,
        actualSampleUpdated,
        responseTargetW: targetW,
        responseTargetChanged: true,
        progressDetected: false,
      };
    }

    let progressDetected = false;
    if (actualSampleUpdated && actualW !== null && this._lastActualW !== null && targetW !== null) {
      const previousDistanceW = Math.abs(targetW - this._lastActualW);
      const currentDistanceW = Math.abs(targetW - actualW);
      progressDetected = previousDistanceW - currentDistanceW >= cfg.responseProgressW;
      if (progressDetected) {
        this._responseSinceMs = now;
        this._lastProgressMs = now;
      }
    }
    this._lastActualW = actualW;

    return {
      ageMs: Math.max(0, now - this._responseSinceMs),
      effectiveGraceMs,
      telemetryIntervalMs: this._storageTelemetryIntervalMs,
      actualSampleTs: sampleTs || null,
      actualSampleUpdated,
      responseTargetW: this._responseTargetW,
      responseTargetChanged: false,
      progressDetected,
    };
  }

  _finalizeStatus(snapshot: AnyRecord, pv: AnyRecord | null): AnyRecord {
    const next = { ...snapshot };
    const pvAction = cleanText(pv && pv.action || '', 120);
    const pvApplied = boolValue(pv && pv.applied, false);
    const pvActiveAction = !!pvAction && ![
      'off', 'disabled', 'within_deadband', 'diagnostic_only', 'awaiting_installer_approval',
      'pvLimitW_release', 'pvLimitPct_release', 'group_release',
    ].includes(pvAction);

    // Fehler-, Warte- und Teilzustände werden niemals durch eine zufällig
    // momentan im Band liegende NVP-Messung als "stable" überschrieben.
    if (snapshot.status === 'observing' && (pvActiveAction || pvApplied)) {
      next.status = 'correcting-pv';
      next.reason = 'PV-/WR-Regelung bearbeitet die verbleibende Einspeisung';
      next.stable = false;
    } else {
      next.stable = snapshot.status === 'stable';
    }
    return next;
  }

  async tick(): Promise<void> {
    const now = Date.now();
    const cfg = this._config();
    const nvp = resolveCurrentNvpSnapshot(
      this.adapter && this.adapter._nvpFreshnessSnapshot,
      now,
      cfg.nvpMaxAgeMs,
    );

    const ids = [
      'speicher.regelung.topologie',
      'speicher.regelung.requestW',
      'speicher.regelung.requestQuelle',
      'speicher.regelung.requestGrund',
      'speicher.regelung.sollW',
      'speicher.regelung.acceptedSollW',
      'speicher.regelung.commandEffective',
      'speicher.regelung.schreibOk',
      'speicher.regelung.schreibStatus',
      'speicher.regelung.policyBlocked',
      'speicher.regelung.policyBlockReason',
      'speicher.regelung.policySource',
      'speicher.regelung.requestSatisfied',
      'speicher.regelung.partiallyAccepted',
      'speicher.regelung.farmStatus',
      'speicher.regelung.farmFailedW',
      'speicher.regelung.farmUnservedW',
      'speicher.regelung.batteryPowerFeedbackMeasuredW',
      'speicher.regelung.batteryPowerFeedbackAgeMs',
      'speicher.regelung.batteryPowerFeedbackSampleTs',
      'speicher.regelung.batteryPowerFeedbackSampleUpdated',
      'speicher.regelung.batteryPowerFeedbackMode',
      'speicher.regelung.batteryPowerIgnoredReason',
      'speicher.regelung.batteryPowerBalanceTrusted',
      'speicher.regelung.batteryPowerTrusted',
      'speicher.regelung.commandAcceptedTs',
      'speicher.regelung.commandAcceptedTargetW',
      'speicher.regelung.commandAcceptedSource',
      'speicher.regelung.targetObjId',
      'speicher.regelung.lastWriteRaw',
      'speicher.regelung.lastWriteSplitJson',
      'speicher.regelung.selfTargetGridImportW',
      'speicher.regelung.selfImportThresholdW',
      'speicher.regelung.selfDeadbandW',
      'speicher.regelung.selfNvpTuningSource',
      'speicher.regelung.selfNvpTuningTopology',
      'storageFarm.totalPowerW',
    ] as const;
    const states = await this._readStates(ids);

    const topology = cleanText(states['speicher.regelung.topologie'] || 'none', 40).toLowerCase();
    const requestedTargetW = roundedOrNull(states['speicher.regelung.sollW']);
    const acceptedTargetW = roundedOrNull(states['speicher.regelung.acceptedSollW']);
    let actualW = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackMeasuredW']);
    if (actualW === null && topology === 'farm') actualW = roundedOrNull(states['storageFarm.totalPowerW']);
    const writeStatus = cleanText(states['speicher.regelung.schreibStatus'] || '', 260);
    const writeOk = boolValue(states['speicher.regelung.schreibOk'], false);
    const commandEffective = boolValue(states['speicher.regelung.commandEffective'], false);
    const writeStatusLower = writeStatus.toLowerCase();
    const retained = writeStatusLower === 'unverändert';
    const blocked = containsAny(writeStatusLower, ['blockiert', 'blocked', 'authority', 'konflikt', 'gesperrt', 'nicht-moeglich', 'nicht möglich', 'nicht moeglich']);
    const hold = containsAny(writeStatusLower, ['no-write', 'hold']);
    const acceptedForResponse = topology !== 'none' && !blocked && !hold && (commandEffective || writeOk || retained);
    // Fuer die NVP-Vorwegnahme zaehlt ausschliesslich die von den Hardware-Writes
    // akzeptierte Leistung. Nur fuer einen alten, aber nachweislich akzeptierten
    // Runtime-Zustand ohne acceptedSollW darf der Request als Migrationsfallback dienen.
    const targetW = acceptedTargetW !== null
      ? acceptedTargetW
      : (acceptedForResponse ? requestedTargetW : 0);
    const actualSampleTs = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackSampleTs']);
    const response = this._responseState(now, topology, targetW, actualW, actualSampleTs, acceptedForResponse, cfg);
    const nvpTargetFromState = finiteOrNull(states['speicher.regelung.selfTargetGridImportW']);
    const deadbandFromState = finiteOrNull(states['speicher.regelung.selfImportThresholdW'])
      ?? finiteOrNull(states['speicher.regelung.selfDeadbandW']);
    const acceptedEffects = getAcceptedPowerEffectSnapshot(this.adapter);

    let snapshot: AnyRecord = buildNvpCoordinatorSnapshot({
      now,
      nvpUsable: nvp.usable === true,
      rawNvpW: nvp.netW,
      nvpSource: nvp.source,
      nvpMeasurementAgeMs: nvp.measurementAgeMs,
      nvpTargetW: nvpTargetFromState ?? cfg.targetW,
      deadbandW: deadbandFromState ?? cfg.deadbandW,
      topology,
      storageActualW: actualW,
      storageActualAgeMs: roundedOrNull(states['speicher.regelung.batteryPowerFeedbackAgeMs']),
      storageActualTrusted: boolValue(states['speicher.regelung.batteryPowerBalanceTrusted'], false)
        || boolValue(states['speicher.regelung.batteryPowerTrusted'], false),
      storageTargetW: targetW,
      storageRequestW: roundedOrNull(states['speicher.regelung.requestW']),
      storageRequestSource: cleanText(states['speicher.regelung.requestQuelle'] || '', 120),
      storageRequestReason: cleanText(states['speicher.regelung.requestGrund'] || '', 320),
      storageWriteOk: writeOk,
      storageCommandEffective: commandEffective,
      storageWriteStatus: writeStatus,
      storagePolicyBlocked: boolValue(states['speicher.regelung.policyBlocked'], false),
      storagePolicyBlockReason: cleanText(states['speicher.regelung.policyBlockReason'] || '', 320),
      storagePolicySource: cleanText(states['speicher.regelung.policySource'] || '', 120),
      storagePartiallyAccepted: boolValue(states['speicher.regelung.partiallyAccepted'], false),
      storageRequestSatisfied: boolValue(states['speicher.regelung.requestSatisfied'], false),
      storageFailedW: roundedOrNull(states['speicher.regelung.farmFailedW']),
      storageUnservedW: roundedOrNull(states['speicher.regelung.farmUnservedW']),
      responseAgeMs: response.ageMs,
      responseGraceMs: response.effectiveGraceMs,
      responseDeadbandW: cfg.responseDeadbandW,
      actualMaxAgeMs: cfg.actualMaxAgeMs,
      acceptedFlexibleNetLoadDeltaW: acceptedEffects.netLoadDeltaW,
      acceptedFlexibleLoadDeltaW: acceptedEffects.loadDeltaW,
      acceptedFlexibleGenerationDeltaW: acceptedEffects.generationDeltaW,
      acceptedFlexibleCreditedCount: acceptedEffects.creditedEffectCount,
      acceptedFlexibleUncertainCount: acceptedEffects.uncertainEffectCount,
      acceptedFlexibleEffects: acceptedEffects.entries,
    });

    snapshot.storageRequestedTargetW = requestedTargetW;
    snapshot.storageAcceptedTargetW = targetW;
    snapshot.storageActualSampleTs = response.actualSampleTs;
    snapshot.storageActualSampleUpdated = response.actualSampleUpdated;
    snapshot.storageTelemetryIntervalMs = roundedOrNull(response.telemetryIntervalMs);
    snapshot.storageResponseGraceBaseMs = cfg.responseGraceMs;
    snapshot.storageResponseGraceEffectiveMs = response.effectiveGraceMs;
    snapshot.storageResponseTargetW = roundedOrNull(response.responseTargetW);
    snapshot.storageResponseTargetChanged = response.responseTargetChanged === true;
    snapshot.storageResponseProgressDetected = response.progressDetected === true;
    snapshot.storageFeedbackMode = cleanText(states['speicher.regelung.batteryPowerFeedbackMode'] || '', 120);
    snapshot.storageFeedbackIgnoredReason = cleanText(states['speicher.regelung.batteryPowerIgnoredReason'] || '', 220);
    snapshot.storageCommandAcceptedTs = roundedOrNull(states['speicher.regelung.commandAcceptedTs']);
    snapshot.storageCommandAcceptedTargetW = roundedOrNull(states['speicher.regelung.commandAcceptedTargetW']);
    snapshot.storageCommandAcceptedSource = cleanText(states['speicher.regelung.commandAcceptedSource'] || '', 120);
    snapshot.storageTargetObjectId = cleanText(states['speicher.regelung.targetObjId'] || '', 260);
    snapshot.storageLastWriteRaw = roundedOrNull(states['speicher.regelung.lastWriteRaw']);
    snapshot.storageLastWriteSplitJson = cleanText(states['speicher.regelung.lastWriteSplitJson'] || '', 2000);
    snapshot.nvpTuningSource = cleanText(states['speicher.regelung.selfNvpTuningSource'] || cfg.nvpTuningSource || '', 120);
    snapshot.nvpTuningTopology = cleanText(states['speicher.regelung.selfNvpTuningTopology'] || cfg.nvpTuningTopology || topology, 40);

    let pvResult: AnyRecord | null = null;
    const gridConstraints = this.gridConstraints;
    let gridRuntimeEnabled = true;
    if (this.gridEnabledFn) {
      try {
        gridRuntimeEnabled = this.gridEnabledFn() === true;
      } catch {
        gridRuntimeEnabled = false;
      }
    }
    const hardRawGuardTriggered = snapshot.nvpUsable
      && cfg.hardRawGuardW > 0
      && snapshot.rawNvpW !== null
      && snapshot.rawNvpW <= -cfg.hardRawGuardW;
    if (snapshot.acceptedFlexibleUncertainCount > 0 && !hardRawGuardTriggered) {
      pvResult = {
        action: 'deferred-flexible-actuator',
        applied: false,
        mode: 'wait-next-nvp',
        reason: 'accepted-unknown-power-transition',
      };
    } else if (gridRuntimeEnabled && gridConstraints && typeof gridConstraints.tickPostStorage === 'function') {
      this._cycle += 1;
      try {
        pvResult = await withActuatorShadowContext(this.adapter, {
          owner: 'gridConstraints',
          module: 'nvpCoordinator',
          priority: priorityForOwner('gridConstraints'),
          reason: 'nvp-coordinated-pv-residual',
          cycleId: `nvp-${this._cycle}`,
          leaseMs: 15000,
        }, () => gridConstraints.tickPostStorage({
          rawNvpW: snapshot.rawNvpW,
          pvControlNvpW: hardRawGuardTriggered ? snapshot.rawNvpW : snapshot.pvControlNvpW,
          nvpUsable: snapshot.nvpUsable,
          hardRawGuardW: cfg.hardRawGuardW,
          storageActualW: snapshot.storageActualW,
          storageTargetW: snapshot.storageTargetW,
          storageCommandCredited: snapshot.storageCommandCredited,
          flexibleNetLoadDeltaW: snapshot.acceptedFlexibleNetLoadDeltaW,
        })) as AnyRecord | null;
      } catch (error: unknown) {
        pvResult = {
          action: 'error',
          applied: false,
          error: error instanceof Error ? error.message : String(error),
        };
        if (this.adapter && this.adapter.log && typeof this.adapter.log.warn === 'function') {
          this.adapter.log.warn(`[NvpCoordinator] PV-Nachregelung fehlgeschlagen: ${pvResult.error}`);
        }
      }
    }

    snapshot = this._finalizeStatus(snapshot, pvResult);
    snapshot.pv = {
      action: cleanText(pvResult && pvResult.action || '', 120),
      mode: cleanText(pvResult && pvResult.mode || '', 80),
      applied: boolValue(pvResult && pvResult.applied, false),
      setpointW: roundedOrNull(pvResult && pvResult.setpointW),
      setpointPct: finiteOrNull(pvResult && pvResult.setpointPct),
      rawGridW: roundedOrNull(pvResult && pvResult.rawGridW),
      controlGridW: roundedOrNull(pvResult && pvResult.controlGridW),
      controlExportW: roundedOrNull(pvResult && pvResult.controlExportW),
      error: cleanText(pvResult && pvResult.error || '', 220),
    };

    const logSignature = [
      snapshot.status,
      snapshot.topology,
      snapshot.storageWriteStatus,
      snapshot.storageCommandCredited,
      snapshot.pv.action,
      snapshot.pv.applied,
    ].join('|');
    const shouldLog = !this._lastLogMs
      || now - this._lastLogMs >= cfg.logIntervalMs
      || logSignature !== this._lastLogSignature;
    if (shouldLog) {
      this._lastLogMs = now;
      this._lastLogSignature = logSignature;
      this._log.push({
        ts: now,
        status: snapshot.status,
        reason: snapshot.reason,
        nvpW: snapshot.rawNvpW,
        targetW: snapshot.nvpTargetW,
        deadbandW: snapshot.deadbandW,
        bandLowerW: snapshot.nvpBandLowerW,
        bandUpperW: snapshot.nvpBandUpperW,
        activeTargetW: snapshot.nvpActiveTargetW,
        centerErrorW: snapshot.nvpCenterErrorW,
        errorW: snapshot.nvpErrorW,
        nvpTuningSource: snapshot.nvpTuningSource,
        nvpTuningTopology: snapshot.nvpTuningTopology,
        topology: snapshot.topology,
        storageActualW: snapshot.storageActualW,
        storageActualAgeMs: snapshot.storageActualAgeMs,
        storageActualSampleTs: snapshot.storageActualSampleTs,
        storageActualSampleUpdated: snapshot.storageActualSampleUpdated,
        storageTelemetryIntervalMs: snapshot.storageTelemetryIntervalMs,
        storageFeedbackMode: snapshot.storageFeedbackMode,
        storageFeedbackIgnoredReason: snapshot.storageFeedbackIgnoredReason,
        storageRequestedTargetW: snapshot.storageRequestedTargetW,
        storageRequestW: snapshot.storageRequestW,
        storageRequestSource: snapshot.storageRequestSource,
        storageRequestReason: snapshot.storageRequestReason,
        storageTargetW: snapshot.storageTargetW,
        storageResponseTargetW: snapshot.storageResponseTargetW,
        storageResponseTargetChanged: snapshot.storageResponseTargetChanged,
        storageResponseProgressDetected: snapshot.storageResponseProgressDetected,
        storageResponseAgeMs: snapshot.storageResponseAgeMs,
        storageResponseGraceBaseMs: snapshot.storageResponseGraceBaseMs,
        storageResponseGraceEffectiveMs: snapshot.storageResponseGraceEffectiveMs,
        storageCommandAcceptedTs: snapshot.storageCommandAcceptedTs,
        storageCommandAcceptedTargetW: snapshot.storageCommandAcceptedTargetW,
        storageCommandAcceptedSource: snapshot.storageCommandAcceptedSource,
        storageTargetObjectId: snapshot.storageTargetObjectId,
        storageLastWriteRaw: snapshot.storageLastWriteRaw,
        storageLastWriteSplitJson: snapshot.storageLastWriteSplitJson,
        storageWriteOk: snapshot.storageWriteOk,
        storageWriteAccepted: snapshot.storageWriteAccepted,
        storageWriteFullyAccepted: snapshot.storageWriteFullyAccepted,
        storagePartiallyAccepted: snapshot.storagePartiallyAccepted,
        storageFailedW: snapshot.storageFailedW,
        storageUnservedW: snapshot.storageUnservedW,
        storageWriteStatus: snapshot.storageWriteStatus,
        storagePolicyBlocked: snapshot.storagePolicyBlocked,
        storagePolicyBlockReason: snapshot.storagePolicyBlockReason,
        storagePolicySource: snapshot.storagePolicySource,
        storageCredited: snapshot.storageCommandCredited,
        flexibleNetLoadDeltaW: snapshot.acceptedFlexibleNetLoadDeltaW,
        flexibleLoadDeltaW: snapshot.acceptedFlexibleLoadDeltaW,
        flexibleGenerationDeltaW: snapshot.acceptedFlexibleGenerationDeltaW,
        flexibleCreditedCount: snapshot.acceptedFlexibleCreditedCount,
        flexibleUncertainCount: snapshot.acceptedFlexibleUncertainCount,
        projectedAfterStorageW: snapshot.projectedAfterStorageW,
        projectedNvpW: snapshot.projectedNvpW,
        pvControlNvpW: snapshot.pvControlNvpW,
        pvAction: snapshot.pv.action,
        pvApplied: snapshot.pv.applied,
        pvSetpointW: snapshot.pv.setpointW,
        pvSetpointPct: snapshot.pv.setpointPct,
        stable: snapshot.stable,
      });
      if (this._log.length > cfg.logMaxEntries) this._log.splice(0, this._log.length - cfg.logMaxEntries);
    }

    snapshot.log = this._log.slice();
    this.adapter._nvpCoordinatorSnapshot = snapshot;

    await this._setIfChanged('ems.nvpCoordinator.active', true);
    await this._setIfChanged('ems.nvpCoordinator.status', snapshot.status);
    await this._setIfChanged('ems.nvpCoordinator.reason', snapshot.reason);
    await this._setIfChanged('ems.nvpCoordinator.lastUpdate', now);
    await this._setIfChanged('ems.nvpCoordinator.nvpSource', snapshot.nvpSource);
    await this._setIfChanged('ems.nvpCoordinator.nvpMeasurementAgeMs', snapshot.nvpMeasurementAgeMs);
    await this._setIfChanged('ems.nvpCoordinator.nvpRawW', snapshot.rawNvpW);
    await this._setIfChanged('ems.nvpCoordinator.nvpTargetW', snapshot.nvpTargetW);
    await this._setIfChanged('ems.nvpCoordinator.deadbandW', snapshot.deadbandW);
    await this._setIfChanged('ems.nvpCoordinator.nvpTuningSource', snapshot.nvpTuningSource);
    await this._setIfChanged('ems.nvpCoordinator.nvpTuningTopology', snapshot.nvpTuningTopology);
    await this._setIfChanged('ems.nvpCoordinator.nvpBandLowerW', snapshot.nvpBandLowerW);
    await this._setIfChanged('ems.nvpCoordinator.nvpBandUpperW', snapshot.nvpBandUpperW);
    await this._setIfChanged('ems.nvpCoordinator.nvpActiveTargetW', snapshot.nvpActiveTargetW);
    await this._setIfChanged('ems.nvpCoordinator.nvpCenterErrorW', snapshot.nvpCenterErrorW);
    await this._setIfChanged('ems.nvpCoordinator.nvpErrorW', snapshot.nvpErrorW);
    await this._setIfChanged('ems.nvpCoordinator.projectedCenterErrorW', snapshot.projectedCenterErrorW);
    await this._setIfChanged('ems.nvpCoordinator.projectedErrorW', snapshot.projectedErrorW);
    await this._setIfChanged('ems.nvpCoordinator.storageTopology', snapshot.topology);
    await this._setIfChanged('ems.nvpCoordinator.storageActualW', snapshot.storageActualW);
    await this._setIfChanged('ems.nvpCoordinator.storageRequestedTargetW', snapshot.storageRequestedTargetW);
    await this._setIfChanged('ems.nvpCoordinator.storageTargetW', snapshot.storageTargetW);
    await this._setIfChanged('ems.nvpCoordinator.storageWriteOk', snapshot.storageWriteOk);
    await this._setIfChanged('ems.nvpCoordinator.storageWriteAccepted', snapshot.storageWriteAccepted);
    await this._setIfChanged('ems.nvpCoordinator.storageWriteFullyAccepted', snapshot.storageWriteFullyAccepted);
    await this._setIfChanged('ems.nvpCoordinator.storagePartiallyAccepted', snapshot.storagePartiallyAccepted);
    await this._setIfChanged('ems.nvpCoordinator.storageFailedW', snapshot.storageFailedW);
    await this._setIfChanged('ems.nvpCoordinator.storageUnservedW', snapshot.storageUnservedW);
    await this._setIfChanged('ems.nvpCoordinator.storageWriteStatus', snapshot.storageWriteStatus);
    await this._setIfChanged('ems.nvpCoordinator.storagePolicyBlocked', snapshot.storagePolicyBlocked);
    await this._setIfChanged('ems.nvpCoordinator.storagePolicyBlockReason', snapshot.storagePolicyBlockReason);
    await this._setIfChanged('ems.nvpCoordinator.storagePolicySource', snapshot.storagePolicySource);
    await this._setIfChanged('ems.nvpCoordinator.storageTargetAgeMs', snapshot.storageResponseAgeMs);
    await this._setIfChanged('ems.nvpCoordinator.storageCommandCredited', snapshot.storageCommandCredited);
    await this._setIfChanged('ems.nvpCoordinator.storagePendingDeltaW', snapshot.storagePendingDeltaW);
    await this._setIfChanged('ems.nvpCoordinator.flexibleNetLoadDeltaW', snapshot.acceptedFlexibleNetLoadDeltaW);
    await this._setIfChanged('ems.nvpCoordinator.flexibleLoadDeltaW', snapshot.acceptedFlexibleLoadDeltaW);
    await this._setIfChanged('ems.nvpCoordinator.flexibleGenerationDeltaW', snapshot.acceptedFlexibleGenerationDeltaW);
    await this._setIfChanged('ems.nvpCoordinator.flexibleCreditedCount', snapshot.acceptedFlexibleCreditedCount);
    await this._setIfChanged('ems.nvpCoordinator.flexibleUncertainCount', snapshot.acceptedFlexibleUncertainCount);
    await this._setIfChanged('ems.nvpCoordinator.flexibleEffectsJson', JSON.stringify(snapshot.acceptedFlexibleEffects || []));
    await this._setIfChanged('ems.nvpCoordinator.projectedAfterStorageW', snapshot.projectedAfterStorageW);
    await this._setIfChanged('ems.nvpCoordinator.projectedNvpW', snapshot.projectedNvpW);
    await this._setIfChanged('ems.nvpCoordinator.pvControlNvpW', snapshot.pvControlNvpW);
    await this._setIfChanged('ems.nvpCoordinator.pvAction', snapshot.pv.action);
    await this._setIfChanged('ems.nvpCoordinator.pvMode', snapshot.pv.mode);
    await this._setIfChanged('ems.nvpCoordinator.pvApplied', snapshot.pv.applied);
    await this._setIfChanged('ems.nvpCoordinator.pvSetpointW', snapshot.pv.setpointW);
    await this._setIfChanged('ems.nvpCoordinator.pvSetpointPct', snapshot.pv.setpointPct);
    await this._setIfChanged('ems.nvpCoordinator.withinBand', snapshot.withinBand);
    await this._setIfChanged('ems.nvpCoordinator.stable', snapshot.stable);
    await this._setIfChanged('ems.nvpCoordinator.statusJson', JSON.stringify({ ...snapshot, log: undefined }));
    await this._setIfChanged('ems.nvpCoordinator.logJson', JSON.stringify(this._log));
  }

  async _setIfChanged(id: string, value: unknown): Promise<void> {
    const nextValue = value === undefined ? null : value;
    try {
      const current = await this.adapter.getStateAsync(id);
      if (current && current.val === nextValue) return;
      await this.adapter.setStateAsync(id, nextValue, true);
    } catch {
      // Diagnose darf den zentralen EMS-Tick nicht blockieren.
    }
  }
}

module.exports = {
  NvpCoordinatorModule,
  buildNvpCoordinatorSnapshot,
};
