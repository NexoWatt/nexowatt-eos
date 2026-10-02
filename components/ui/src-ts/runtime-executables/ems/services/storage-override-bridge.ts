// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Übernimmt freigegebene Speicher-Messwertüberlagerungen in den von der Engine verwendeten Kontext.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-override-bridge.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Datei: ems/services/storage-override-bridge.js
 * Zweck: Vereinheitlicht globale AppCenter-Speicher-Overrides mit der internen
 * Speicherregelung. Die Helfer verändern ausschließlich Messwert-Mappings und
 * lesen Istwerte; sie schreiben keine Hardware-Sollwerte.
 */

declare const require: any;
declare const module: { exports: unknown };

const {
  normalizeStorageDatapointsConfig,
  buildStorageMeasurementFallbackFromGlobal,
  mergeStorageMeasurementFallback,
} = require('./storage-datapoint-config');

type AnyRecord = Record<string, any>;
type AdapterLike = {
  config?: AnyRecord;
  getForeignObjectAsync?: (id: string) => Promise<AnyRecord | null>;
  _nwStorageMeasurementFallback?: AnyRecord;
};
type RegistryEntry = { objectId?: string } | null | undefined;
type RegistryLike = {
  getEntry: (key: string) => RegistryEntry;
  getNumber: (key: string, fallback: number | null) => number | null;
  getAgeMs: (key: string) => number | null;
  getMeasurementTimestampMs?: (key: string) => number | null;
};

type StorageOverrideBridgeResult = {
  source: string;
  socId: string;
  signedPowerId: string;
  chargePowerId: string;
  dischargePowerId: string;
};

type SplitBatteryFeedback = {
  trusted: boolean;
  observedW: number;
  ageMs: number | null;
  sampleTs: number | null;
  sampleKey: string;
  objectIds: string[];
  source: string;
  reason: string;
};

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function finite(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Ermittelt den Faktor, mit dem ein AppCenter-Leistungswert nach Watt skaliert wird. */
async function resolvePowerScale(adapter: AdapterLike, key: string, objectId: string): Promise<number> {
  const settings = adapter.config?.settings && typeof adapter.config.settings === 'object'
    ? adapter.config.settings
    : {};
  const perDp = settings.flowPowerDpIsW && typeof settings.flowPowerDpIsW === 'object'
    ? settings.flowPowerDpIsW as AnyRecord
    : null;
  if (perDp && Object.prototype.hasOwnProperty.call(perDp, key)) return perDp[key] ? 1 : 1000;
  if (typeof settings.flowPowerInputIsW === 'boolean') return settings.flowPowerInputIsW ? 1 : 1000;
  if (settings.flowAutoScalePower === false || !objectId || typeof adapter.getForeignObjectAsync !== 'function') return 1;
  try {
    const object = await adapter.getForeignObjectAsync(objectId);
    const unit = text(object?.common?.unit).toLowerCase();
    if (unit === 'kw' || unit === 'kilowatt') return 1000;
    if (unit === 'mw' || unit === 'megawatt') return 1000000;
  } catch (_error) {
    // Fehlende optionale Metadaten dürfen den EMS-Start nicht blockieren.
  }
  return 1;
}

/**
 * Bereitet globale AppCenter-Messwerte ausschließlich als privaten Runtime-
 * Fallback vor. Die dauerhaft gespeicherte `storage.datapoints`-Zuordnung wird
 * niemals verändert. Dadurch kann ein kurzer Energieflusswert wie `r` nach einem
 * EMS-Neustart nicht mehr in das Speicherformular zurücklaufen.
 */
async function applyStorageMeasurementOverrides(adapter: AdapterLike, datapoints: AnyRecord): Promise<StorageOverrideBridgeResult> {
  const config = adapter.config && typeof adapter.config === 'object' ? adapter.config : {};
  const storage = config.storage && typeof config.storage === 'object' ? config.storage : {};
  const local = normalizeStorageDatapointsConfig(storage);
  const fallbackWrapper = buildStorageMeasurementFallbackFromGlobal({
    ...config,
    datapoints: datapoints && typeof datapoints === 'object' ? datapoints : {},
  });
  const fallback = fallbackWrapper.datapoints && typeof fallbackWrapper.datapoints === 'object'
    ? fallbackWrapper.datapoints as AnyRecord
    : {};

  // Explizite W/kW-Schalter bleiben führend. Wenn keine feste Einheit gesetzt
  // wurde, kann die Bridge die Objekt-Metadaten asynchron auswerten.
  const signedId = text(fallback.batteryPowerObjectId);
  const chargeId = text(fallback.batteryChargePowerObjectId);
  const dischargeId = text(fallback.batteryDischargePowerObjectId);
  const dcPvId = text(fallback.dcPvPowerObjectId);
  if (signedId) {
    fallback.batteryPowerScale = await resolvePowerScale(
      adapter,
      text(fallback.batteryFeedbackSource) === 'appcenter-same-split-fallback' ? 'storageChargePower' : 'batteryPower',
      signedId,
    );
  }
  if (chargeId) fallback.batteryChargePowerScale = await resolvePowerScale(adapter, 'storageChargePower', chargeId);
  if (dischargeId) fallback.batteryDischargePowerScale = await resolvePowerScale(adapter, 'storageDischargePower', dischargeId);
  if (dcPvId) fallback.dcPvPowerScale = await resolvePowerScale(adapter, 'storagePvPower', dcPvId);

  // Nur dieser private Runtime-Snapshot darf von Mapping/Regelung als Fallback
  // gelesen werden. Er ist absichtlich nicht Teil von adapter.config und damit
  // weder persistierbar noch über /api/installer/config sichtbar.
  adapter._nwStorageMeasurementFallback = {
    schema: 'nexowatt.storage-measurement-fallback.v1',
    ts: Date.now(),
    datapoints: { ...fallback },
    source: text(fallback.batteryFeedbackSource) || text(fallback.socFeedbackSource) || '',
  };

  const effective = mergeStorageMeasurementFallback({ ...storage, datapoints: local }, adapter._nwStorageMeasurementFallback);
  const effectiveSignedId = text(effective.batteryPowerObjectId);
  const effectiveChargeId = text(effective.batteryChargePowerObjectId);
  const effectiveDischargeId = text(effective.batteryDischargePowerObjectId);
  let source = text(effective.batteryFeedbackSource);
  if (!source) {
    if (effectiveSignedId) source = 'storage-tab-signed';
    else if (effectiveChargeId || effectiveDischargeId) source = 'storage-tab-split';
    else source = 'storage-tab';
  }

  return {
    source,
    socId: text(effective.socObjectId),
    signedPowerId: effectiveSignedId,
    chargePowerId: effectiveChargeId,
    dischargePowerId: effectiveDischargeId,
  };
}

function objectIdOf(entry: RegistryEntry): string {
  return text(entry?.objectId);
}

/**
 * Bildet aus positiven Split-Istwerten die interne signed Speicherleistung:
 * +W = Entladen, -W = Laden. Nur ein exakt identisch als Sollwert gemapptes
 * Objekt wird als Feedback verworfen; freie Objektpfade/Namen bleiben zulässig.
 */
function resolveSplitBatteryFeedback(registry: RegistryLike | null | undefined, storageConfig: AnyRecord, staleMs: number): SplitBatteryFeedback | null {
  if (!registry) return null;
  const targetIds = [
    registry.getEntry('st.targetPowerW'),
    registry.getEntry('st.targetChargePowerW'),
    registry.getEntry('st.targetDischargePowerW'),
  ].map(objectIdOf).filter(Boolean);
  const rows = [
    {
      key: 'st.batteryChargePowerW',
      role: 'charge',
      entry: registry.getEntry('st.batteryChargePowerW'),
      value: registry.getNumber('st.batteryChargePowerW', null),
      ageMs: registry.getAgeMs('st.batteryChargePowerW'),
      sampleTs: typeof registry.getMeasurementTimestampMs === 'function'
        ? registry.getMeasurementTimestampMs('st.batteryChargePowerW')
        : null,
    },
    {
      key: 'st.batteryDischargePowerW',
      role: 'discharge',
      entry: registry.getEntry('st.batteryDischargePowerW'),
      value: registry.getNumber('st.batteryDischargePowerW', null),
      ageMs: registry.getAgeMs('st.batteryDischargePowerW'),
      sampleTs: typeof registry.getMeasurementTimestampMs === 'function'
        ? registry.getMeasurementTimestampMs('st.batteryDischargePowerW')
        : null,
    },
  ];

  let chargeW = 0;
  let dischargeW = 0;
  let oldestAgeMs: number | null = null;
  let newestSampleTs: number | null = null;
  const objectIds: string[] = [];
  const sampleParts: string[] = [];
  for (const row of rows) {
    const objectId = objectIdOf(row.entry);
    if (!objectId || row.value === null || !Number.isFinite(Number(row.value))) continue;
    if (targetIds.includes(objectId)) continue;
    objectIds.push(objectId);
    const magnitude = Math.max(0, Math.abs(finite(row.value, 0)));
    if (row.role === 'charge') chargeW = magnitude;
    else dischargeW = magnitude;
    if (typeof row.ageMs === 'number' && Number.isFinite(row.ageMs)) {
      oldestAgeMs = oldestAgeMs === null ? row.ageMs : Math.max(oldestAgeMs, row.ageMs);
    }
    const rowSampleTs = Number(row.sampleTs);
    if (Number.isFinite(rowSampleTs) && rowSampleTs > 0) {
      newestSampleTs = newestSampleTs === null ? rowSampleTs : Math.max(newestSampleTs, rowSampleTs);
      sampleParts.push(`${row.role}:${objectId}@${Math.round(rowSampleTs)}`);
    } else {
      sampleParts.push(`${row.role}:${objectId}@age:${Number.isFinite(Number(row.ageMs)) ? Math.round(Number(row.ageMs)) : 'unknown'}`);
    }
  }
  if (!objectIds.length) return null;

  const datapointConfig = storageConfig.datapoints && typeof storageConfig.datapoints === 'object'
    ? storageConfig.datapoints as AnyRecord
    : {};
  if (datapointConfig.batterySplitInvert === true) {
    const swap = chargeW;
    chargeW = dischargeW;
    dischargeW = swap;
  }
  const trusted = oldestAgeMs === null || oldestAgeMs <= Math.max(1000, finite(staleMs, 60000));
  return {
    trusted,
    observedW: dischargeW - chargeW,
    ageMs: oldestAgeMs,
    sampleTs: newestSampleTs,
    sampleKey: sampleParts.join('|'),
    objectIds,
    source: text(datapointConfig.batteryFeedbackSource) || 'single-storage-split',
    reason: trusted ? 'Split-Istleistung aus AppCenter/Einzel-Speicher' : 'Split-Istleistung vorhanden, aber veraltet',
  };
}

module.exports = { applyStorageMeasurementOverrides, resolvePowerScale, resolveSplitBatteryFeedback };
