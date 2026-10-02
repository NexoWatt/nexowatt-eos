// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ermittelt den bereits physikalisch belegten Speicheranteil für LP-Netzanteilgrenzen.
 * Daten und Wirkung: Nimmt frische Core-/NVP-Messungen, Netto-Speicherentladung,
 * akzeptierte EVCS-Speicherbefehle und echte Ladeleistung in W/ms entgegen; liefert
 * ausschließlich ein begrenztes Budget in W. Keine Writes, Reservierungen oder Timer.
 * Sicherheit: Haus und nicht berechtigte Verbraucher haben Vorrang. Ein Request
 * oder akzeptierter Befehl allein ist keine gelieferte Energie. Der Aufrufer darf
 * den Pool nur einmal verteilen und muss ihn direkt vor dem Writer erneut prüfen.
 * Bei Änderungen: Netto-/Bruttofluss, Quellenalter, Hausvorrang und Widerruf bis zum tatsächlichen Writer gemeinsam prüfen; Requests niemals als Messung verwenden.
 * Verknüpfungen: charging-management, zero-export-pv-coordinator, Core-Budget.
 */
'use strict';

const { readZeroExportMode } = require('./zero-export-pv-coordinator');
const MAX_AGE_MS = 5000;

interface StorageCreditSample {
  now?: unknown;
  mode?: { active?: unknown };
  gridW?: unknown;
  gridFresh?: unknown;
  storageFresh?: unknown;
  safetyReady?: unknown;
  externalBlocked?: unknown;
  tariffCurtail?: unknown;
}

interface StorageCreditInput {
  now?: unknown;
  sample?: StorageCreditSample | null;
  budgetTs?: unknown;
  measuredNetDischargeW?: unknown;
  storageNetFresh?: unknown;
  acceptedW?: unknown;
  acceptedTs?: unknown;
  commandEffective?: unknown;
  acceptedTopology?: unknown;
  requestedTopology?: unknown;
  acceptedSource?: unknown;
  eligibleActualW?: unknown;
  eligibleMetersFresh?: unknown;
  pendingOtherW?: unknown;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === 'boolean'
    || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function freshStamp(value: unknown, now: number): boolean {
  const stamp = finiteNumber(value);
  return stamp !== null && stamp > 0 && now >= stamp && now - stamp <= MAX_AGE_MS;
}

/**
 * Reine Berechnung, Eingaben W/ms, Ausgabe W. B ist gemessene NETTO-Entladung,
 * E ausschließlich frische Istaufnahme berechtigter LP, G signierter Netzbezug.
 * Nicht berechtigter Nettobedarf = max(0, G + B - E). Erst der danach verbleibende
 * Speicheranteil gehört zum EVCS-Pool: min(akzeptiert, B, max(0, E - G - pending)).
 * Andere Reservierungen zählen nur mit ihrem noch nicht gemessenen Mehrbedarf;
 * ihre reale Last steckt bereits in G. PV-Prognosen und Sollwerte ersetzen E nie.
 * Ohne laufende EV-Aufnahme und ohne Export entsteht kein Kredit: Batterie-only-
 * Kaltstart unter dem technischen Minimum braucht einen separaten Anlaufvertrag.
 */
export function resolveZeroExportStorageCreditW(input: StorageCreditInput = {}): number {
  const now = finiteNumber(input.now);
  const sample = input.sample;
  const gridW = finiteNumber(sample?.gridW);
  const batteryW = finiteNumber(input.measuredNetDischargeW);
  const acceptedW = finiteNumber(input.acceptedW);
  const eligibleActualW = finiteNumber(input.eligibleActualW);
  const pendingW = finiteNumber(input.pendingOtherW === undefined ? 0 : input.pendingOtherW);
  const requestedTopology = String(input.requestedTopology || '').trim().toLowerCase();
  const acceptedTopology = String(input.acceptedTopology || '').trim().toLowerCase();
  const acceptedSource = String(input.acceptedSource || '').trim().toLowerCase();
  if (now === null || now <= 0 || !sample || sample.mode?.active !== true
    || !freshStamp(sample.now, now) || !freshStamp(input.budgetTs, now)
    || !freshStamp(input.acceptedTs, now)
    || sample.gridFresh !== true || sample.storageFresh !== true
    || sample.safetyReady !== true || sample.externalBlocked || sample.tariffCurtail
    || input.storageNetFresh !== true || input.eligibleMetersFresh !== true
    || input.commandEffective !== true
    || !['single', 'farm'].includes(requestedTopology) || acceptedTopology !== requestedTopology
    || !(acceptedSource === 'evcs' || acceptedSource.startsWith('evcs:'))
    || gridW === null || batteryW === null || batteryW <= 0
    || acceptedW === null || acceptedW <= 0 || eligibleActualW === null || eligibleActualW < 0
    || pendingW === null || pendingW < 0) return 0;
  return Math.max(0, Math.min(acceptedW, batteryW, eligibleActualW - gridW - pendingW));
}

/**
 * Liest denselben zentralen Flow-Resolver wie Core/Speicher mit strengem 5-s-Alter.
 * Die im PV-Prüfsample absichtlich verwendete Bruttoentladung ist KEIN Budget:
 * bei gleichzeitig ladenden Farmmitgliedern zählt nur flow.dischargeW (Netto).
 * Quellenalter wird passend zur tatsächlich gewählten Quelle geprüft; kein
 * Bilanz-Fallback und kein veralteter Split-Kanal darf neue Ladeleistung erzeugen.
 */
export function resolveZeroExportStorageCredit(adapter: any, input: StorageCreditInput = {}): number {
  const now = finiteNumber(input.now) ?? Date.now();
  try {
    if (!readZeroExportMode(adapter).active) return 0;
    const authority = adapter?._nwGetStorageControlAuthority?.();
    const topology = String(authority?.selectedTopology || 'none').trim().toLowerCase();
    if (authority?.writerActive !== true || topology !== String(input.requestedTopology || '').trim().toLowerCase()) return 0;
    const flow = adapter?._nwResolveBatteryFlowFromCache?.({ now, maxAgeMs: MAX_AGE_MS, strictStale: true, deadbandW: 0 });
    if (!flow || flow.derived !== false) return 0;
    const ageOk = (value: unknown) => {
      const age = finiteNumber(value);
      return age !== null && age >= 0 && age <= MAX_AGE_MS;
    };
    const dps = adapter?.config?.datapoints || {};
    const source = String(flow.src || '');
    let storageNetFresh = false;
    if (topology === 'farm') {
      storageNetFresh = source === 'storageFarmNet'
        && ['farmPower', 'farmCharge', 'farmDischarge'].every(key => ageOk(flow.staleMs?.[key]));
    } else if (topology === 'single') {
      if (source === 'batterySigned') {
        storageNetFresh = !!dps.batteryPower && ageOk(flow.staleMs?.batteryPower);
      } else if (source === 'sameChargeDischargeSigned') {
        storageNetFresh = !!dps.storageChargePower && dps.storageChargePower === dps.storageDischargePower
          && ageOk(flow.staleMs?.storageChargePower);
      } else if (/^chargeDischarge(?:\(inv\))?(?:-net-normalized)?$/.test(source)) {
        storageNetFresh = !!dps.storageChargePower && !!dps.storageDischargePower
          && ['storageChargePower', 'storageDischargePower'].every(key => ageOk(flow.staleMs?.[key]));
      }
    }
    return resolveZeroExportStorageCreditW({
      ...input,
      now,
      sample: adapter?._zeroExportPvCoordinator?.sample,
      budgetTs: adapter?._emsBudget?.ts,
      measuredNetDischargeW: flow.dischargeW,
      storageNetFresh,
    });
  } catch (_error) {
    return 0;
  }
}
