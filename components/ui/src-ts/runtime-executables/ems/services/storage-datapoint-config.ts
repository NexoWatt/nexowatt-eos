// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Speicher-Datenpunktzuordnungen für Messung und Steuerung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-datapoint-config.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Datei: ems/services/storage-datapoint-config.js
 * Zweck: Trennt dauerhaft gespeicherte AppCenter-Speicherzuordnungen von
 * reinen Runtime-Fallbacks aus dem allgemeinen Energiefluss-Mapping.
 *
 * Grundregel:
 * - `storage.datapoints` ist die autoritative, manuell gespeicherte Zuordnung.
 * - `datapoints.*` darf nur zur Laufzeit einspringen, wenn im Speicher-Reiter
 *   kein entsprechender Messwert zugeordnet wurde.
 * - Ein Runtime-Fallback darf niemals in die Installer-Konfiguration
 *   zurückgeschrieben oder über die Config-API als manuelle Zuordnung ausgegeben werden.
 */

declare const module: { exports: unknown };
declare function require(id: string): any;

const {
  normalizeControlMode: normalizeFeneconControlMode,
  isFeneconHybrid,
  isLikelyDirectEssSetpointObjectId,
  isLikelyFemsGridTargetObjectId,
  isLikelyFemsGridMeasurementObjectId,
} = require('./fenecon-hybrid-control');

type AnyRecord = Record<string, any>;
type AliasSpec = string | { key: string; fullOnly?: boolean };
type FieldSpec = {
  canonical: string;
  aliases?: AliasSpec[];
  recoverFragment?: boolean;
};

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function own(root: AnyRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(root, key);
}

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

/**
 * ioBroker-Objekt-IDs sind normalerweise hierarchisch. Diese Heuristik wird
 * ausschließlich zur Wiederherstellung eines erkennbar verkürzten Werts wie
 * `r` verwendet. Sie ist keine Hersteller-/Adapter-Whitelist und blockiert
 * niemals eine frei eingetragene ID, wenn keine bessere lokale Quelle existiert.
 */
function looksLikeCompleteObjectId(value: unknown): boolean {
  const id = text(value);
  return id.length >= 3 && id.includes('.') && !/\s/.test(id);
}

const FIELD_SPECS: FieldSpec[] = [
  { canonical: 'socObjectId', aliases: ['socId', 'socDp', 'storageSocId'], recoverFragment: true },
  {
    canonical: 'batteryPowerObjectId',
    aliases: ['signedPowerId', 'powerObjectId', { key: 'powerId', fullOnly: true }],
    recoverFragment: true,
  },
  { canonical: 'batteryChargePowerObjectId', aliases: ['chargePowerId', 'chargePowerDp'], recoverFragment: true },
  { canonical: 'batteryDischargePowerObjectId', aliases: ['dischargePowerId', 'dischargePowerDp'], recoverFragment: true },
  { canonical: 'dcPvPowerObjectId', aliases: ['pvPowerId', 'pvPowerObjectId', 'pvPowerDp'], recoverFragment: true },
  { canonical: 'targetPowerObjectId', aliases: ['setSignedPowerId', 'targetPowerId', 'powerSetpointId', 'setpointId', 'setPowerId'], recoverFragment: true },
  { canonical: 'targetChargePowerObjectId', aliases: ['setChargePowerId', 'targetChargePowerId', 'chargeSetpointId'], recoverFragment: true },
  { canonical: 'targetDischargePowerObjectId', aliases: ['setDischargePowerId', 'targetDischargePowerId', 'dischargeSetpointId'], recoverFragment: true },
  { canonical: 'runObjectId', aliases: ['runId', 'enableObjectId', 'controlEnableId'], recoverFragment: true },
  { canonical: 'maxChargeObjectId', aliases: ['maxChargeId', 'maxChargePowerObjectId'], recoverFragment: true },
  { canonical: 'maxDischargeObjectId', aliases: ['maxDischargeId', 'maxDischargePowerObjectId'], recoverFragment: true },
  { canonical: 'chargeEnableObjectId', aliases: ['chargeAllowedId', 'chargeEnableId'], recoverFragment: true },
  { canonical: 'dischargeEnableObjectId', aliases: ['dischargeAllowedId', 'dischargeEnableId'], recoverFragment: true },
  { canonical: 'reserveSocObjectId', aliases: ['reserveSocId'], recoverFragment: true },
  { canonical: 'feneconGridSetpointObjectId', aliases: ['feneconGridSetpointId', 'femsGridSetpointObjectId', 'femsGridSetpointId'], recoverFragment: true },
  { canonical: 'feneconEssActualPowerObjectId', aliases: ['feneconEssActualPowerId', 'femsEssActualPowerObjectId', 'femsEssActualPowerId'], recoverFragment: true },
  { canonical: 'feneconNvpPowerObjectId', aliases: ['feneconNvpPowerId', 'feneconGridPowerObjectId', 'feneconGridPowerId', 'feneconNapPowerObjectId', 'feneconNapPowerId'], recoverFragment: true },
  { canonical: 'feneconConsumptionTotalObjectId', aliases: ['feneconConsumptionTotalId', 'feneconLoadTotalObjectId', 'feneconLoadTotalId', 'feneconConsumptionPowerObjectId', 'feneconConsumptionPowerId', 'feneconLoadPowerObjectId', 'feneconLoadPowerId'], recoverFragment: true },
  { canonical: 'feneconMinPowerObjectId', aliases: ['feneconMinPowerId'], recoverFragment: true },
  { canonical: 'feneconMaxPowerObjectId', aliases: ['feneconMaxPowerId'], recoverFragment: true },
  { canonical: 'feneconActualSetpointObjectId', aliases: ['feneconActualSetpointId', 'feneconSetpointReadbackObjectId'], recoverFragment: true },
  { canonical: 'feneconPvDcObjectId', aliases: ['feneconPvDcId'], recoverFragment: true },
  { canonical: 'feneconPvAcObjectId', aliases: ['feneconPvAcId'], recoverFragment: true },
  { canonical: 'feneconPvTotalObjectId', aliases: ['feneconPvTotalId'], recoverFragment: true },
  { canonical: 'e3dcSetPowerModeObjectId', aliases: ['e3dcSetPowerModeId'], recoverFragment: true },
  { canonical: 'e3dcSetPowerValueObjectId', aliases: ['e3dcSetPowerValueId'], recoverFragment: true },
  { canonical: 'e3dcPowerLimitsUsedObjectId', aliases: ['e3dcPowerLimitsUsedId'], recoverFragment: true },
  { canonical: 'e3dcMaxChargePowerObjectId', aliases: ['e3dcMaxChargePowerId'], recoverFragment: true },
  { canonical: 'e3dcMaxDischargePowerObjectId', aliases: ['e3dcMaxDischargePowerId'], recoverFragment: true },
];

function aliasKey(spec: AliasSpec): string {
  return typeof spec === 'string' ? spec : spec.key;
}

function aliasRequiresFullId(spec: AliasSpec): boolean {
  return typeof spec === 'object' && spec.fullOnly === true;
}

function firstCandidate(roots: AnyRecord[], specs: AliasSpec[], fullOnly = false): string {
  for (const root of roots) {
    for (const spec of specs) {
      const key = aliasKey(spec);
      if (!own(root, key)) continue;
      const value = text(root[key]);
      if (!value) continue;
      if ((fullOnly || aliasRequiresFullId(spec)) && !looksLikeCompleteObjectId(value)) continue;
      return value;
    }
  }
  return '';
}

/**
 * Migriert eine in älteren RC-Ständen vertauschte FENECON-Kommandorolle.
 *
 * Feldfehler aus der Praxis:
 * `aliases.ctrl.powerSetpointW` / SetActivePowerEquals (706) wurde im Feld
 * `feneconGridSetpointObjectId` gespeichert. Dieses Feld ist ausschließlich für
 * einen echten `ctrlBalancing0/SetGridActivePower`-Aktor vorgesehen. In Auto oder
 * Direkte-ESS wird der Wert deshalb als signed Batterie-Sollwert übernommen und
 * das native FEMS-Zielfeld geleert. Ein reiner Netzleistungs-Messwert wird in
 * denselben Betriebsarten nur entfernt. Im expliziten FEMS-NVP-Modus bleibt die
 * Fehlzuordnung sichtbar, damit die Validierung sie weiterhin sicher blockiert.
 */
function migrateFeneconCommandRoles(storageIn: unknown, datapointsIn: unknown): AnyRecord {
  const storage = isRecord(storageIn) ? storageIn : {};
  const out: AnyRecord = isRecord(datapointsIn) ? { ...datapointsIn } : {};
  const mode = normalizeFeneconControlMode(storage.feneconControlMode);
  const feneconHybrid = isFeneconHybrid({
    vendorProfile: storage.vendorProfile,
    coupling: storage.coupling,
  });
  if (!feneconHybrid || mode === 'fems-grid') {
    return {
      datapoints: out,
      changed: false,
      reason: !feneconHybrid ? 'not-fenecon-hybrid' : 'explicit-fems-grid',
      movedDirectTargetId: '',
      clearedNativeTargetId: '',
    };
  }

  const nativeTargetId = text(out.feneconGridSetpointObjectId);
  if (!nativeTargetId) {
    return {
      datapoints: out,
      changed: false,
      reason: 'native-target-empty',
      movedDirectTargetId: '',
      clearedNativeTargetId: '',
    };
  }

  const nativeIsDirectEss = isLikelyDirectEssSetpointObjectId(nativeTargetId)
    && !isLikelyFemsGridTargetObjectId(nativeTargetId);
  const nativeIsMeasurement = isLikelyFemsGridMeasurementObjectId(nativeTargetId);
  if (!nativeIsDirectEss && !nativeIsMeasurement) {
    return {
      datapoints: out,
      changed: false,
      reason: 'native-target-valid-or-unknown',
      movedDirectTargetId: '',
      clearedNativeTargetId: '',
    };
  }

  let movedDirectTargetId = '';
  const hasDirectTarget = !!(
    text(out.targetPowerObjectId)
    || text(out.targetChargePowerObjectId)
    || text(out.targetDischargePowerObjectId)
  );
  if (nativeIsDirectEss && !hasDirectTarget) {
    out.targetPowerObjectId = nativeTargetId;
    movedDirectTargetId = nativeTargetId;
  }
  out.feneconGridSetpointObjectId = '';

  return {
    datapoints: out,
    changed: true,
    reason: nativeIsDirectEss
      ? (movedDirectTargetId ? 'direct-setpoint-moved-to-signed-target' : 'duplicate-direct-setpoint-removed-from-native-target')
      : 'grid-measurement-removed-from-native-target',
    movedDirectTargetId,
    clearedNativeTargetId: nativeTargetId,
  };
}

/**
 * Normalisiert ausschließlich lokale Speicherstrukturen. Der allgemeine
 * Energiefluss (`config.datapoints`) ist hier bewusst kein Fallback, weil sonst
 * Runtime-Werte wie `r` als manuelle Speicherzuordnung persistiert werden können.
 */
function normalizeStorageDatapointsConfig(storageIn: unknown): AnyRecord {
  const storage = isRecord(storageIn) ? storageIn : {};
  const current = isRecord(storage.datapoints) ? storage.datapoints : {};
  const out: AnyRecord = { ...current };

  for (const spec of FIELD_SPECS) {
    const aliases = Array.isArray(spec.aliases) ? spec.aliases : [];

    // Ein heutiges kanonisches Feld ist autoritativ – auch ein bewusst leerer
    // String. Nur ein offensichtlich verkürzter Wert darf aus einer vollständigen
    // lokalen Legacy-ID repariert werden.
    if (own(current, spec.canonical)) {
      const canonicalValue = text(current[spec.canonical]);
      if (canonicalValue && spec.recoverFragment && !looksLikeCompleteObjectId(canonicalValue)) {
        const better = firstCandidate([current, storage], aliases, true);
        out[spec.canonical] = better || canonicalValue;
      } else {
        out[spec.canonical] = canonicalValue;
      }
      continue;
    }

    const currentAlias = firstCandidate([current], aliases);
    if (currentAlias) {
      out[spec.canonical] = currentAlias;
      continue;
    }

    const directCanonical = own(storage, spec.canonical) ? text(storage[spec.canonical]) : '';
    if (directCanonical) {
      if (spec.recoverFragment && !looksLikeCompleteObjectId(directCanonical)) {
        const better = firstCandidate([storage], aliases, true);
        out[spec.canonical] = better || directCanonical;
      } else {
        out[spec.canonical] = directCanonical;
      }
      continue;
    }

    out[spec.canonical] = firstCandidate([storage], aliases) || '';
  }

  return migrateFeneconCommandRoles(storage, out).datapoints;
}

function explicitPowerScale(settings: AnyRecord, key: string): number | null {
  const perDp = isRecord(settings.flowPowerDpIsW) ? settings.flowPowerDpIsW : null;
  if (perDp && own(perDp, key)) return perDp[key] ? 1 : 1000;
  if (typeof settings.flowPowerInputIsW === 'boolean') return settings.flowPowerInputIsW ? 1 : 1000;
  return null;
}

/**
 * Baut einen synchronen Runtime-Fallback aus dem allgemeinen Energiefluss.
 * Die Bridge kann dessen Skalen später noch anhand der Objekt-Metadaten verfeinern.
 */
function buildStorageMeasurementFallbackFromGlobal(configIn: unknown): AnyRecord {
  const config = isRecord(configIn) ? configIn : {};
  const globalDp = isRecord(config.datapoints) ? config.datapoints : {};
  const settings = isRecord(config.settings) ? config.settings : {};
  const invert = settings.flowInvertBattery === true;
  const dp: AnyRecord = {};

  const socId = text(globalDp.storageSoc);
  if (socId) {
    dp.socObjectId = socId;
    dp.socFeedbackSource = 'appcenter-flow-fallback';
  }

  const signedId = text(globalDp.batteryPower);
  const chargeId = text(globalDp.storageChargePower);
  const dischargeId = text(globalDp.storageDischargePower);
  const sameSplitId = !!(chargeId && dischargeId && chargeId === dischargeId);

  if (signedId) {
    dp.batteryPowerObjectId = signedId;
    dp.batteryPowerScale = explicitPowerScale(settings, 'batteryPower') ?? 1;
    dp.batteryPowerInvert = invert;
    dp.batteryFeedbackSource = 'appcenter-signed-fallback';
  } else if (sameSplitId) {
    dp.batteryPowerObjectId = chargeId;
    dp.batteryPowerScale = explicitPowerScale(settings, 'storageChargePower') ?? 1;
    dp.batteryPowerInvert = invert;
    dp.batteryFeedbackSource = 'appcenter-same-split-fallback';
  } else if (chargeId || dischargeId) {
    dp.batteryChargePowerObjectId = chargeId;
    dp.batteryDischargePowerObjectId = dischargeId;
    dp.batteryChargePowerScale = explicitPowerScale(settings, 'storageChargePower') ?? 1;
    dp.batteryDischargePowerScale = explicitPowerScale(settings, 'storageDischargePower') ?? 1;
    dp.batterySplitInvert = invert;
    dp.batteryFeedbackSource = 'appcenter-split-fallback';
  }

  const dcPvId = text(globalDp.storagePvPower);
  if (dcPvId) {
    dp.dcPvPowerObjectId = dcPvId;
    dp.dcPvPowerScale = explicitPowerScale(settings, 'storagePvPower') ?? 1;
    dp.dcPvPowerInvert = settings.flowInvertStoragePv === true;
    dp.dcPvFeedbackSource = 'appcenter-flow-fallback';
  }

  return { datapoints: dp, source: text(dp.batteryFeedbackSource) || (socId ? 'appcenter-flow-fallback' : '') };
}

/**
 * Ergänzt ausschließlich fehlende Messwertfamilien aus einem privaten
 * Runtime-Fallback. Sollwert-, Run-, Freigabe- und Limit-DPs werden nie ergänzt.
 */
function mergeStorageMeasurementFallback(storageIn: unknown, fallbackIn: unknown): AnyRecord {
  const local = normalizeStorageDatapointsConfig(storageIn);
  const wrapper = isRecord(fallbackIn) ? fallbackIn : {};
  const fallback = isRecord(wrapper.datapoints) ? wrapper.datapoints : wrapper;
  const out: AnyRecord = { ...local };

  if (!text(local.socObjectId) && text(fallback.socObjectId)) {
    for (const key of ['socObjectId', 'socScale', 'socFeedbackSource']) {
      if (fallback[key] !== undefined) out[key] = fallback[key];
    }
  }

  const localPowerMapped = !!(
    text(local.batteryPowerObjectId)
    || text(local.batteryChargePowerObjectId)
    || text(local.batteryDischargePowerObjectId)
  );
  if (!localPowerMapped) {
    for (const key of [
      'batteryPowerObjectId', 'batteryPowerScale', 'batteryPowerInvert',
      'batteryChargePowerObjectId', 'batteryChargePowerScale',
      'batteryDischargePowerObjectId', 'batteryDischargePowerScale',
      'batterySplitInvert', 'batteryFeedbackSource',
    ]) {
      if (fallback[key] !== undefined) out[key] = fallback[key];
    }
  }

  if (!text(local.dcPvPowerObjectId) && text(fallback.dcPvPowerObjectId)) {
    for (const key of ['dcPvPowerObjectId', 'dcPvPowerScale', 'dcPvPowerInvert', 'dcPvFeedbackSource']) {
      if (fallback[key] !== undefined) out[key] = fallback[key];
    }
  }

  return out;
}

module.exports = {
  normalizeStorageDatapointsConfig,
  migrateFeneconCommandRoles,
  buildStorageMeasurementFallbackFromGlobal,
  mergeStorageMeasurementFallback,
  looksLikeCompleteObjectId,
};
