// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet die App-Center-Einrichtung von Betriebsstrategien mit den Backend-Daten.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/operating-strategies-appcenter.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * NexoWatt EOS Betriebsstrategien – AppCenter, Ressourcen und Regelbaukasten.
 *
 * Diese Browserkomponente verwaltet ausschließlich die Konfiguration für das
 * modulare Ressourcen-/Strategiemodell. RC56 ergänzt eine explizit freizugebende
 * Live-Kopplung an die vorhandenen Single-Writer-Regler. Ohne globale und
 * ressourcenbezogene Freigabe bleibt die App weiterhin im Beobachtungsmodus.
 */
(function () {
  'use strict';

  type AnyRecord = Record<string, any>;

  const FOUNDATION_VERSION = '0.8.177';
  const RULE_BUILDER_VERSION = '0.8.178';
  const LIVE_CONTROL_VERSION = '0.8.201';
  const APP_ID = 'operatingStrategies';
  const ROOT_ID = 'nwOperatingStrategiesRoot';

  let setStatus: (message: string, kind?: string) => void = () => {};
  let getEdition: () => string = () => 'none';
  let mountNode: HTMLElement | null = null;
  let fullConfig: AnyRecord = {};
  let workingConfig: AnyRecord = {};
  let appEnabled = false;

  const byId = (id: string): HTMLElement | null => document.getElementById(id);
  const esc = (value: any): string => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const clone = <T>(value: T): T => {
    try { return JSON.parse(JSON.stringify(value)); } catch (_error) { return value; }
  };
  const record = (value: any): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
  const list = (value: any): AnyRecord[] => Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
  const text = (value: any, fallback = ''): string => {
    const normalized = String(value == null ? '' : value).trim();
    return normalized || fallback;
  };
  const bool = (value: any, fallback = false): boolean => typeof value === 'boolean' ? value : fallback;
  const number = (value: any, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.max(min, Math.min(max, safe));
  };
  const integer = (value: any, fallback: number, min: number, max: number): number => Math.round(number(value, fallback, min, max));
  const safeId = (value: any, fallback: string): string => {
    const raw = text(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return raw || fallback;
  };

  function withUniqueIds(items: AnyRecord[], prefix: string): AnyRecord[] {
    const used = new Set<string>();
    return items.map((entry, index) => {
      const base = safeId(entry && entry.id, `${prefix}-${index + 1}`);
      let id = base;
      let suffix = 2;
      while (used.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      used.add(id);
      return { ...entry, id };
    });
  }
  const edition = (): string => {
    const raw = String(getEdition() || '').trim().toLowerCase();
    if (raw === 'eos' || raw === 'pro') return 'eos';
    if (raw === 'hems' || raw === 'home') return 'hems';
    return 'none';
  };

  const ruleBuilder = (): AnyRecord => record((window as any).NexoWattOperatingStrategiesRuleBuilder);

  function defaultNightReserve(targetSocPct: number): AnyRecord {
    return {
      enabled: true,
      storageResourceId: '',
      targetSocPct,
      absoluteMinSocPct: 10,
      startMode: 'sunset',
      startTime: '18:00',
      endMode: 'sunrise',
      endTime: '07:00',
    };
  }

  function defaultProfiles(): AnyRecord[] {
    return [
      {
        id: 'winter',
        name: 'Winterbetrieb',
        enabled: true,
        season: 'winter',
        nightReserve: defaultNightReserve(40),
      },
      {
        id: 'summer',
        name: 'Sommerbetrieb',
        enabled: true,
        season: 'summer',
        nightReserve: defaultNightReserve(60),
      },
    ];
  }

  function defaultControlContract(): AnyRecord {
    return {
      chargingScope: 'auto-only',
      explicitAutoSourceOptInRequired: true,
      existingChargingModesUntouched: true,
      singleWriterRequired: true,
      fallbackAutoSource: 'standard-auto',
    };
  }

  function defaultConfig(): AnyRecord {
    const builder = ruleBuilder();
    return {
      schemaVersion: 3,
      enabled: false,
      mode: 'observe',
      controlTakeoverEnabled: false,
      writeExecutionEnabled: false,
      commissioningConfirmed: false,
      autoControl: {
        enabled: true,
        stage: 'shadow',
        requestTtlSeconds: 15,
        fallback: 'standardAuto',
      },
      autoImportExisting: true,
      activeProfileId: 'winter',
      systemMappings: {
        outsideTemperatureReadId: '',
        pvForecastReadId: '',
        pvSurplusReadId: '',
        gridPowerReadId: '',
        electricityPriceReadId: '',
        cheapTariffReadId: '',
      },
      controlContract: defaultControlContract(),
      resourceLinks: [],
      customResources: [],
      profiles: defaultProfiles(),
      rules: [],
      simulation: typeof builder.defaultSimulation === 'function' ? builder.defaultSimulation('winter') : { activeProfileId: 'winter', resourceStates: {} },
      metadata: {
        foundationVersion: FOUNDATION_VERSION,
        ruleBuilderVersion: RULE_BUILDER_VERSION,
        liveControlVersion: LIVE_CONTROL_VERSION,
        lastEditedAt: '',
      },
    };
  }

  function normalizeMappings(input: any): AnyRecord {
    const source = record(input);
    const keys = [
      'powerReadId',
      'energyReadId',
      'stateReadId',
      'socReadId',
      'temperatureReadId',
      'alarmReadId',
      'onlineReadId',
      'switchWriteId',
      'switchReadId',
      'setpointWriteId',
      'setpointReadId',
      'capacityReadId',
      'forecastEnergyReadId',
      'surplusPowerReadId',
    ];
    const out: AnyRecord = {};
    keys.forEach((key) => { out[key] = text(source[key]); });
    return out;
  }

  function normalizeSystemMappings(input: any): AnyRecord {
    const source = record(input);
    return {
      outsideTemperatureReadId: text(source.outsideTemperatureReadId),
      pvForecastReadId: text(source.pvForecastReadId),
      pvSurplusReadId: text(source.pvSurplusReadId),
      gridPowerReadId: text(source.gridPowerReadId),
      electricityPriceReadId: text(source.electricityPriceReadId),
      cheapTariffReadId: text(source.cheapTariffReadId),
    };
  }

  function normalizeCustomResource(input: any, index: number): AnyRecord {
    const source = record(input);
    const resourceTypes = ['consumer', 'thermal', 'chargingPoint', 'storage', 'producer', 'sensor', 'virtualGroup'];
    const controlTypes = ['monitor', 'switch', 'setpoint', 'stepped', 'thermal', 'energyTarget'];
    const failSafePolicies = ['observe-only', 'release', 'safe-on', 'safe-off', 'block-optimization'];
    const powerUnits = ['W', 'kW'];
    const resourceType = resourceTypes.includes(text(source.resourceType)) ? text(source.resourceType) : 'consumer';
    const controlType = controlTypes.includes(text(source.controlType)) ? text(source.controlType) : 'monitor';
    const failSafePolicy = failSafePolicies.includes(text(source.failSafePolicy)) ? text(source.failSafePolicy) : 'observe-only';
    const powerUnit = powerUnits.includes(text(source.powerUnit)) ? text(source.powerUnit) : 'W';
    return {
      id: safeId(source.id, `custom-${index + 1}`),
      name: text(source.name, `Benutzerdefinierte Ressource ${index + 1}`),
      enabled: source.enabled !== false,
      resourceType,
      controlType,
      powerUnit,
      staleTimeoutSec: integer(source.staleTimeoutSec, 60, 1, 86400),
      failSafePolicy,
      usableCapacityKWh: number(source.usableCapacityKWh, 0, 0, 1000000),
      minPowerW: number(source.minPowerW, 0, 0, 1000000000),
      maxPowerW: number(source.maxPowerW, 0, 0, 1000000000),
      efficiencyPct: number(source.efficiencyPct, 92, 1, 100),
      resourceSubtype: text(source.resourceSubtype),
      autoOnly: resourceType === 'chargingPoint' ? true : bool(source.autoOnly, false),
      controlMode: text(source.controlMode) === 'active' ? 'active' : 'observe',
      commissioningConfirmed: source.commissioningConfirmed === true,
      autoSource: text(source.autoSource) === 'strategy' ? 'strategy' : 'standard',
      fallback: text(source.fallback) === 'pause' ? 'pause' : 'standardAuto',
      observeOnly: text(source.controlMode) !== 'active',
      writeEnabled: source.writeEnabled === true && source.commissioningConfirmed === true,
      mappings: normalizeMappings(source.mappings),
    };
  }

  function normalizeProfile(input: any, index: number): AnyRecord {
    const source = record(input);
    const reserve = record(source.nightReserve);
    const seasons = ['winter', 'summer', 'custom'];
    const modes = ['sunset', 'sunrise', 'fixed'];
    const targetSocPct = number(reserve.targetSocPct, index === 0 ? 40 : 60, 0, 100);
    const absoluteMinSocPct = Math.min(targetSocPct, number(reserve.absoluteMinSocPct, 10, 0, 100));
    const startMode = modes.includes(text(reserve.startMode)) ? text(reserve.startMode) : 'sunset';
    const endMode = modes.includes(text(reserve.endMode)) ? text(reserve.endMode) : 'sunrise';
    return {
      id: safeId(source.id, `profile-${index + 1}`),
      name: text(source.name, `Betriebsprofil ${index + 1}`),
      enabled: source.enabled !== false,
      season: seasons.includes(text(source.season)) ? text(source.season) : 'custom',
      nightReserve: {
        enabled: reserve.enabled !== false,
        storageResourceId: text(reserve.storageResourceId),
        targetSocPct,
        absoluteMinSocPct,
        startMode,
        startTime: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(reserve.startTime)) ? text(reserve.startTime) : '18:00',
        endMode,
        endTime: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(reserve.endTime)) ? text(reserve.endTime) : '07:00',
      },
    };
  }

  function normalizeLink(input: any): AnyRecord | null {
    const source = record(input);
    const sourceId = text(source.sourceId);
    if (!sourceId) return null;
    const roles = ['auto', 'cooling', 'heatPump', 'heatingRod', 'flexConsumer', 'storage', 'chargingPoint'];
    const roleOverride = roles.includes(text(source.roleOverride)) ? text(source.roleOverride) : 'auto';
    return {
      sourceId,
      enabled: source.enabled === true,
      priority: integer(source.priority, 50, 1, 100),
      roleOverride,
      autoOnly: sourceId.startsWith('evcs:') || roleOverride === 'chargingPoint' ? true : bool(source.autoOnly, false),
      controlMode: text(source.controlMode) === 'active' ? 'active' : 'observe',
      commissioningConfirmed: source.commissioningConfirmed === true,
      autoSource: text(source.autoSource) === 'strategy' ? 'strategy' : 'standard',
      fallback: text(source.fallback) === 'pause' ? 'pause' : 'standardAuto',
      staleTimeoutSec: integer(source.staleTimeoutSec, 60, 1, 86400),
      observeOnly: text(source.controlMode) !== 'active',
      writeEnabled: source.writeEnabled === true && source.commissioningConfirmed === true,
      mappings: normalizeMappings(source.mappings),
    };
  }

  function normalizeConfig(input: any): AnyRecord {
    const base = defaultConfig();
    const source = record(input);
    const profiles = withUniqueIds(list(source.profiles).map(normalizeProfile), 'profile');
    const normalizedProfiles = profiles.length ? profiles : defaultProfiles();
    const profileIds = new Set(normalizedProfiles.map((profile) => profile.id));
    const requestedActive = text(source.activeProfileId, 'winter');
    const resourceLinks = list(source.resourceLinks).map(normalizeLink).filter(Boolean) as AnyRecord[];
    const dedupedLinks: AnyRecord[] = [];
    const linkIds = new Set<string>();
    resourceLinks.forEach((entry) => {
      if (linkIds.has(entry.sourceId)) return;
      linkIds.add(entry.sourceId);
      dedupedLinks.push(entry);
    });
    const activeProfileId = profileIds.has(requestedActive) ? requestedActive : (normalizedProfiles[0]?.id || 'winter');
    const builder = ruleBuilder();
    const normalizedRules = typeof builder.normalizeRules === 'function'
      ? builder.normalizeRules(source.rules, Array.from(profileIds))
      : [];
    const simulation = typeof builder.normalizeSimulation === 'function'
      ? builder.normalizeSimulation(source.simulation, activeProfileId)
      : { activeProfileId, resourceStates: {} };
    const normalizedMode = text(source.mode) === 'active' ? 'active' : 'observe';
    const normalizedCommissioning = source.commissioningConfirmed === true;
    const normalizedTakeover = normalizedMode === 'active' && normalizedCommissioning && source.controlTakeoverEnabled === true;
    const normalizedExecution = normalizedMode === 'active' && normalizedCommissioning && source.writeExecutionEnabled === true;
    const normalizedAuto = {
      enabled: record(source.autoControl).enabled !== false,
      stage: ['shadow', 'commissioning', 'active'].includes(text(record(source.autoControl).stage)) ? text(record(source.autoControl).stage) : 'shadow',
      requestTtlSeconds: integer(record(source.autoControl).requestTtlSeconds, 15, 3, 60),
      fallback: text(record(source.autoControl).fallback) === 'pause' ? 'pause' : 'standardAuto',
    };
    const normalizedLive = source.enabled === true
      && normalizedMode === 'active'
      && normalizedCommissioning
      && normalizedTakeover
      && normalizedExecution
      && normalizedAuto.enabled !== false
      && normalizedAuto.stage === 'active';
    return {
      ...base,
      ...clone(source),
      schemaVersion: 3,
      enabled: source.enabled === true,
      mode: normalizedMode,
      commissioningConfirmed: normalizedCommissioning,
      controlTakeoverEnabled: normalizedTakeover,
      writeExecutionEnabled: normalizedExecution,
      autoControl: normalizedAuto,
      autoImportExisting: source.autoImportExisting !== false,
      activeProfileId,
      systemMappings: normalizeSystemMappings(source.systemMappings),
      controlContract: defaultControlContract(),
      resourceLinks: dedupedLinks,
      customResources: withUniqueIds(list(source.customResources).map(normalizeCustomResource), 'custom'),
      profiles: normalizedProfiles,
      // Regeln werden im Beobachtungsmodus nur simuliert. Im ausdrücklich bestätigten
      // Live-Betrieb erzeugen aktivierte Regeln zeitlich begrenzte Anforderungen.
      rules: normalizedRules.map((entry: AnyRecord) => ({
        ...entry,
        simulationOnly: !normalizedLive,
        executionEnabled: entry.enabled !== false && normalizedLive,
      })),
      simulation,
      metadata: {
        ...record(source.metadata),
        foundationVersion: FOUNDATION_VERSION,
        ruleBuilderVersion: RULE_BUILDER_VERSION,
        liveControlVersion: LIVE_CONTROL_VERSION,
        lastEditedAt: text(record(source.metadata).lastEditedAt),
      },
    };
  }

  function truthyDp(value: any): boolean {
    return !!text(value);
  }

  function mappedCount(values: any[]): number {
    const ids = new Set<string>();
    values.forEach((value) => {
      const id = text(value);
      if (id) ids.add(id);
    });
    return ids.size;
  }

  function eosAppActive(config: AnyRecord, appId: string, enableFlag = ''): boolean {
    const app = record(record(record(config.emsApps).apps)[appId]);
    if (app.installed !== true || app.enabled !== true) return false;
    if (enableFlag && config[enableFlag] !== true) return false;
    return true;
  }

  function flowSlotFor(config: AnyRecord, slot: number): AnyRecord {
    return record(list(record(record(config.vis).flowSlots).consumers)[Math.max(0, slot - 1)]);
  }

  function flowControlMappings(ctrlInput: AnyRecord, includeStages = false): { reads: any[]; writes: any[] } {
    const ctrl = record(ctrlInput);
    const reads: any[] = [
      ctrl.switchReadId,
      ctrl.setpointReadId,
      ctrl.sgReadyAReadId,
      ctrl.sgReadyBReadId,
      ctrl.sgReady1ReadId,
      ctrl.sgReady2ReadId,
    ];
    const writes: any[] = [
      ctrl.switchWriteId,
      ctrl.setpointWriteId,
      ctrl.sgReadyAWriteId,
      ctrl.sgReadyBWriteId,
      ctrl.sgReady1WriteId,
      ctrl.sgReady2WriteId,
    ];
    if (includeStages) {
      for (let stage = 1; stage <= 12; stage += 1) {
        reads.push(ctrl[`stage${stage}ReadId`], ctrl[`heatingStage${stage}ReadId`]);
        writes.push(ctrl[`stage${stage}WriteId`], ctrl[`heatingStage${stage}WriteId`]);
      }
    }
    return { reads, writes };
  }

  function deriveStorageFarmResources(config: AnyRecord): AnyRecord[] {
    if (!eosAppActive(config, 'storagefarm', 'enableStorageFarm')) return [];
    const farm = record(config.storageFarm);
    return list(farm.storages).map((storage, index) => {
      const readCandidates = [storage.socId, storage.signedPowerId, storage.chargePowerId, storage.dischargePowerId, storage.gridPowerId, storage.pvPowerId];
      const writeCandidates = [storage.feneconGridSetpointId, storage.setSignedPowerId, storage.setChargePowerId, storage.setDischargePowerId, storage.maxChargePowerId, storage.maxDischargePowerId, storage.chargeEnableId, storage.dischargeEnableId, storage.runWriteId];
      const reads = readCandidates.filter(truthyDp).length;
      const writes = writeCandidates.filter(truthyDp).length;
      // Keine leeren Farm-Slots anzeigen: Nur ausdrücklich aktive und tatsächlich
      // zugeordnete Speicher sind eine nutzbare EOS-Ressource.
      if (storage.enabled !== true || (reads + writes) === 0) return null;
      return {
        sourceId: `storagefarm:${index + 1}`,
        name: text(storage.name, `Speicher ${index + 1}`),
        resourceType: 'storage', resourceSubtype: 'battery', controlType: writes ? 'setpoint' : 'monitor',
        usableCapacityKWh: number(storage.usableCapacityKWh ?? storage.capacityKWh, 0, 0, 1000000),
        efficiencyPct: number(storage.efficiencyPct, 92, 1, 100),
        sourceLabel: `EOS Speicherfarm · Speicher ${index + 1}`, sourceTab: 'storagefarm', reads, writes,
        nativeMappings: normalizeMappings({
          socReadId: storage.socId,
          powerReadId: storage.signedPowerId || storage.chargePowerId || storage.dischargePowerId,
          onlineReadId: storage.availableId,
          alarmReadId: storage.faultId,
          capacityReadId: storage.capacityReadId,
        }),
        capabilities: [reads ? `${reads} Lesebindung${reads === 1 ? '' : 'en'}` : 'Messwerte unvollständig', writes ? 'Stellpfad über Speicherfarm' : 'Kein Stellpfad erkannt', 'Nachtenergie-Reserve verfügbar'],
      };
    }).filter(Boolean) as AnyRecord[];
  }

  function deriveStorageResource(config: AnyRecord): AnyRecord[] {
    if (!eosAppActive(config, 'storage', 'enableStorageControl')) return [];
    const storage = record(config.storage);
    if (storage.enabled === false) return [];
    const storageDps = record(storage.datapoints);
    const dps = record(config.datapoints);
    const readCandidates = [
      storageDps.socObjectId,
      storageDps.powerObjectId,
      storageDps.chargePowerObjectId,
      storageDps.dischargePowerObjectId,
      dps.storageSoc,
      dps.storagePower,
      dps.storageChargePower,
      dps.storageDischargePower,
    ];
    const writeCandidates = [
      storageDps.targetPowerObjectId,
      storageDps.maxChargeObjectId,
      storageDps.maxDischargeObjectId,
      storageDps.chargeEnableObjectId,
      storageDps.dischargeEnableObjectId,
      storageDps.runObjectId,
    ];
    const reads = mappedCount(readCandidates);
    const writes = mappedCount(writeCandidates);
    if ((reads + writes) === 0) return [];
    return [{
      sourceId: 'storage:primary',
      name: text(storage.name, 'Speicher'),
      resourceType: 'storage',
      resourceSubtype: 'battery',
      controlType: writes ? 'setpoint' : 'monitor',
      usableCapacityKWh: number(storage.usableCapacityKWh ?? storage.capacityKWh, 0, 0, 1000000),
      efficiencyPct: number(storage.efficiencyPct, 92, 1, 100),
      sourceLabel: 'EOS Speicherregelung',
      sourceTab: 'storageconfig',
      reads,
      writes,
      nativeLiveSupported: writes > 0,
      nativeMappings: normalizeMappings({
        socReadId: storageDps.socObjectId || dps.storageSoc,
        powerReadId: storageDps.powerObjectId || storageDps.chargePowerObjectId || storageDps.dischargePowerObjectId || dps.storagePower || dps.storageChargePower || dps.storageDischargePower,
        onlineReadId: storageDps.onlineObjectId || storageDps.availableObjectId,
        alarmReadId: storageDps.alarmObjectId || storageDps.faultObjectId,
        capacityReadId: storageDps.capacityObjectId,
      }),
      capabilities: [
        `${reads} Lesebindung${reads === 1 ? '' : 'en'}`,
        writes ? 'Stellpfad bleibt in der Speicherregelung' : 'Kein Stellpfad erkannt',
        'Nachtenergie-Reserve verfügbar',
      ],
    }];
  }

  function deriveEvcsResources(config: AnyRecord): AnyRecord[] {
    if (!eosAppActive(config, 'charging') || config.enableChargingManagement !== true) return [];
    const settingsConfig = record(config.settingsConfig);
    return list(settingsConfig.evcsList).map((row, index) => {
      const readKeys = ['powerId', 'actualPowerWId', 'energyTotalId', 'statusId', 'vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'vehicleSocId', 'onlineId', 'activeId'];
      const writeKeys = ['setCurrentAId', 'setPowerWId', 'enableWriteId', 'enableId', 'phaseSwitchWriteId'];
      const reads = readKeys.filter((key) => truthyDp(row[key])).length;
      const writes = writeKeys.filter((key) => truthyDp(row[key])).length;
      if (row.enabled !== true || (reads + writes) === 0) return null;
      const stationKey = text(row.stationKey);
      const connectorNo = integer(row.connectorNo, index + 1, 0, 999);
      const summary = [stationKey ? `Station ${stationKey}` : '', connectorNo ? `Connector ${connectorNo}` : '', text(row.chargerType)].filter(Boolean).join(' · ');
      return {
        sourceId: `evcs:lp${index + 1}`, name: text(row.name, `Ladepunkt ${index + 1}`), resourceType: 'chargingPoint', resourceSubtype: 'ev',
        controlType: writes ? 'energyTarget' : 'monitor', usableCapacityKWh: number(row.vehicleCapacityKWh ?? row.batteryCapacityKWh, 0, 0, 1000000),
        minPowerW: number(row.minPowerW, 0, 0, 1000000000), maxPowerW: number(row.maxPowerW, 0, 0, 1000000000), efficiencyPct: number(row.chargingEfficiencyPct, 92, 1, 100),
        sourceLabel: summary || 'EOS Ladepunkt', sourceTab: 'evcs', currentMode: text(row.userMode || row.mode, 'Auto/Benutzerauswahl'), reads, writes,
        nativeMappings: normalizeMappings({
          powerReadId: row.powerId || row.actualPowerWId,
          energyReadId: row.energySessionId || row.energyTotalId,
          stateReadId: row.statusId,
          socReadId: row.vehicleSocId,
          onlineReadId: row.onlineId || row.heartbeatId || row.activeId,
          capacityReadId: row.vehicleCapacityReadId,
        }),
        capabilities: [reads ? `${reads} Lesebindung${reads === 1 ? '' : 'en'}` : 'Messwerte unvollständig', truthyDp(row.vehicleSocId) ? 'Fahrzeug-SoC verfügbar' : 'Fahrzeug-SoC optional ergänzen', writes ? 'Stellpfad über Lademanagement' : 'Kein Stellpfad erkannt', 'Strategie greift ausschließlich im Modus Auto'],
      };
    }).filter(Boolean) as AnyRecord[];
  }

  function deriveFlowConsumerResources(config: AnyRecord): AnyRecord[] {
    const flowSlots = record(record(config.vis).flowSlots);
    const dps = record(config.datapoints);
    const thermalActive = eosAppActive(config, 'thermal', 'enableThermalControl');
    const heatingActive = eosAppActive(config, 'heatingrod', 'enableHeatingRodControl');
    return list(flowSlots.consumers).map((slot, index) => {
      const ctrl = record(slot.ctrl);
      const powerDp = text(dps[`consumer${index + 1}Power`]);
      const readCandidates: any[] = [powerDp, ctrl.switchReadId, ctrl.setpointReadId, ctrl.sgReadyAReadId, ctrl.sgReadyBReadId, ctrl.sgReady1ReadId, ctrl.sgReady2ReadId];
      const writeCandidates: any[] = [ctrl.switchWriteId, ctrl.setpointWriteId, ctrl.sgReadyAWriteId, ctrl.sgReadyBWriteId, ctrl.sgReady1WriteId, ctrl.sgReady2WriteId];
      for (let stage = 1; stage <= 12; stage += 1) { readCandidates.push(ctrl[`stage${stage}ReadId`]); writeCandidates.push(ctrl[`stage${stage}WriteId`]); }
      const reads = readCandidates.filter(truthyDp).length;
      const writes = writeCandidates.filter(truthyDp).length;
      if (slot.enabled !== true || (reads + writes) === 0) return null;
      const name = text(slot.name, `Energiefluss-Verbraucher ${index + 1}`);
      const consumerType = text(slot.consumerType, 'generic');
      const inferredCooling = consumerType === 'cooling' || /(?:kühl|kuehl|cool|cold|refriger)/i.test(`${name} ${consumerType}`);
      if ((consumerType === 'heatingRod' || /heizstab|heating.?rod/i.test(consumerType)) && !heatingActive) return null;
      if ((consumerType === 'heatPump' || consumerType === 'cooling' || inferredCooling) && !thermalActive) return null;
      // Dedicated Thermik-/Heizstabmodule expose their own device rows. Avoid duplicates.
      if ((thermalActive && (consumerType === 'heatPump' || consumerType === 'cooling' || inferredCooling)) || (heatingActive && consumerType === 'heatingRod')) return null;
      return {
        sourceId: `flow-consumer:${index + 1}`, name, resourceType: 'consumer', resourceSubtype: consumerType, controlType: writes ? 'switch' : 'monitor',
        sourceLabel: `Energiefluss · Slot ${index + 1}`, sourceTab: 'flow', reads, writes,
        nativeMappings: normalizeMappings({ powerReadId: powerDp, stateReadId: ctrl.switchReadId || ctrl.setpointReadId }),
        capabilities: [powerDp ? 'Leistungsmessung vorhanden' : 'Leistungsmessung fehlt', writes ? 'Steuerzuordnung vorhanden' : 'Nur messbar'],
      };
    }).filter(Boolean) as AnyRecord[];
  }

  function deriveModuleDevices(config: AnyRecord, key: string, label: string, tab: string, resourceType: string): AnyRecord[] {
    const appId = key === 'heatingRod' ? 'heatingrod' : key;
    const enableFlag = key === 'heatingRod' ? 'enableHeatingRodControl' : 'enableThermalControl';
    if (!eosAppActive(config, appId, enableFlag)) return [];
    const moduleConfig = record(config[key]);
    const flowConsumers = list(record(record(config.vis).flowSlots).consumers);
    const dps = record(config.datapoints);
    return list(moduleConfig.devices).map((device, index) => {
      if (device.enabled !== true) return null;
      const slot = integer(device.slot ?? device.consumerSlot, index + 1, 1, 999);
      const flowSlot = record(flowConsumers[slot - 1]);
      const ctrl = record(flowSlot.ctrl);
      const reads: any[] = [
        dps[`consumer${slot}Power`], device.powerReadId, device.temperatureReadId,
        device.alarmReadId, device.onlineReadId, device.stateReadId,
        ctrl.switchReadId, ctrl.setpointReadId,
      ];
      const writes: any[] = [device.switchWriteId, device.setpointWriteId, ctrl.switchWriteId, ctrl.setpointWriteId];
      if (key === 'thermal') {
        reads.push(ctrl.sgReadyAReadId, ctrl.sgReadyBReadId, ctrl.sgReady1ReadId, ctrl.sgReady2ReadId);
        writes.push(ctrl.sgReadyAWriteId, ctrl.sgReadyBWriteId, ctrl.sgReady1WriteId, ctrl.sgReady2WriteId);
      } else {
        const stages = list(device.stages);
        for (let stage = 1; stage <= 12; stage += 1) {
          const stageCfg = record(stages[stage - 1]);
          reads.push(stageCfg.readId, stageCfg.dpReadId, stageCfg.readDp, ctrl[`stage${stage}ReadId`], ctrl[`heatingStage${stage}ReadId`]);
          writes.push(stageCfg.writeId, stageCfg.dpWriteId, stageCfg.writeDp, ctrl[`stage${stage}WriteId`], ctrl[`heatingStage${stage}WriteId`]);
        }
      }
      const readCount = reads.filter(truthyDp).length;
      const writeCount = writes.filter(truthyDp).length;
      if ((readCount + writeCount) <= 0) return null;
      return {
        sourceId: `${key}:${index + 1}`, runtimeId: `c${slot}`, name: text(device.name || flowSlot.name, `${label} ${slot}`), resourceType,
        resourceSubtype: key === 'heatingRod' ? 'heatingRod' : text(device.type || device.deviceType, 'thermal'),
        controlType: key === 'heatingRod' ? 'stepped' : 'thermal', maxPowerW: number(device.maxPowerW || device.estimatedPowerW, 0, 0, 1000000000),
        sourceLabel: `${label} · Slot ${slot}`, sourceTab: tab, reads: readCount, writes: writeCount,
        nativeMappings: normalizeMappings({
          powerReadId: device.powerReadId || dps[`consumer${slot}Power`],
          temperatureReadId: device.temperatureReadId,
          alarmReadId: device.alarmReadId,
          onlineReadId: device.onlineReadId,
          stateReadId: device.stateReadId || ctrl.switchReadId || ctrl.setpointReadId,
        }),
        capabilities: [`${readCount} Lesepfad${readCount === 1 ? '' : 'e'} · ${writeCount} Stellpfad${writeCount === 1 ? '' : 'e'}`, 'Bestehendes EOS-Modul bleibt Single Writer'],
      };
    }).filter(Boolean) as AnyRecord[];
  }

  function deriveExistingResources(config: AnyRecord): AnyRecord[] {
    const storageFarmResources = deriveStorageFarmResources(config);
    const combined = [
      ...(storageFarmResources.length ? storageFarmResources : deriveStorageResource(config)),
      ...deriveEvcsResources(config),
      ...deriveModuleDevices(config, 'thermal', 'Thermisches Gerät', 'thermal', 'thermal'),
      ...deriveModuleDevices(config, 'heatingRod', 'Heizstab', 'heatingrod', 'thermal'),
      ...deriveFlowConsumerResources(config),
    ];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      const id = text(entry.sourceId);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function applyRoleOverride(resourceInput: AnyRecord, roleOverride: string): AnyRecord {
    const resource: AnyRecord = { ...clone(resourceInput), roleOverride };
    if (roleOverride === 'cooling') return { ...resource, resourceType: 'thermal', resourceSubtype: 'cooling', controlType: resource.controlType === 'monitor' ? 'thermal' : resource.controlType };
    if (roleOverride === 'heatPump') return { ...resource, resourceType: 'thermal', resourceSubtype: 'heatPump', controlType: resource.controlType === 'monitor' ? 'thermal' : resource.controlType };
    if (roleOverride === 'heatingRod') return { ...resource, resourceType: 'thermal', resourceSubtype: 'heatingRod', controlType: resource.controlType === 'monitor' ? 'stepped' : resource.controlType };
    if (roleOverride === 'flexConsumer') return { ...resource, resourceType: 'consumer', resourceSubtype: 'flexible' };
    if (roleOverride === 'storage') return { ...resource, resourceType: 'storage', resourceSubtype: 'battery' };
    if (roleOverride === 'chargingPoint') return { ...resource, resourceType: 'chargingPoint', resourceSubtype: 'ev', controlType: resource.controlType === 'monitor' ? 'energyTarget' : resource.controlType };
    return resource;
  }

  function strategyResourceCatalog(): AnyRecord[] {
    const linkMap = new Map(list(workingConfig.resourceLinks).map((entry) => [text(entry.sourceId), entry]));
    const existing = deriveExistingResources(fullConfig).map((entry) => {
      const link = record(linkMap.get(text(entry.sourceId)));
      return {
        ...applyRoleOverride(entry, text(link.roleOverride, 'auto')),
        strategyEnabled: link.enabled === true,
      };
    });
    const custom = list(workingConfig.customResources)
      .filter((entry) => entry.enabled !== false && Object.values(record(entry.mappings)).some((value) => text(value)))
      .map((entry, index) => ({
      sourceId: `custom:${text(entry.id, String(index + 1))}`,
      name: text(entry.name, `Benutzerdefinierte Ressource ${index + 1}`),
      resourceType: text(entry.resourceType, 'consumer'),
      resourceSubtype: text(entry.resourceSubtype),
      controlType: text(entry.controlType, 'monitor'),
      usableCapacityKWh: number(entry.usableCapacityKWh, 0, 0, 1000000),
      minPowerW: number(entry.minPowerW, 0, 0, 1000000000),
      maxPowerW: number(entry.maxPowerW, 0, 0, 1000000000),
      efficiencyPct: number(entry.efficiencyPct, 92, 1, 100),
      reads: Object.values(record(entry.mappings)).filter((value) => text(value)).length,
      writes: ['switchWriteId', 'setpointWriteId'].filter((key) => text(record(entry.mappings)[key])).length,
      sourceLabel: 'Benutzerdefinierte Zuordnung',
      sourceTab: '',
      strategyEnabled: entry.enabled !== false,
    }));
    const builder = ruleBuilder();
    const combined = [...existing, ...custom];
    return typeof builder.normalizeCatalog === 'function' ? builder.normalizeCatalog(combined) : combined;
  }

  function linkBySourceId(sourceId: string): AnyRecord {
    const existing = list(workingConfig.resourceLinks).find((entry) => text(entry.sourceId) === sourceId);
    return normalizeLink(existing || {
      sourceId,
      enabled: false,
      priority: 50,
      roleOverride: 'auto',
      autoOnly: sourceId.startsWith('evcs:'),
      controlMode: 'observe',
      commissioningConfirmed: false,
      autoSource: 'standard',
      fallback: 'standardAuto',
      staleTimeoutSec: sourceId.startsWith('evcs:') ? 30 : 60,
      observeOnly: true,
      writeEnabled: false,
      mappings: {},
    }) || {};
  }

  function resourceTypeLabel(type: string): string {
    const labels: AnyRecord = {
      consumer: 'Verbraucher',
      thermal: 'Thermisch flexibel',
      chargingPoint: 'Ladepunkt',
      storage: 'Speicher',
      producer: 'Erzeuger',
      sensor: 'Sensor / externe Messgröße',
      virtualGroup: 'Virtuelle Gruppe',
    };
    return labels[type] || 'Ressource';
  }

  function controlTypeLabel(type: string): string {
    const labels: AnyRecord = {
      monitor: 'Nur messen',
      switch: 'Ein/Aus',
      setpoint: 'Stufenloser Sollwert',
      stepped: 'Stufig',
      thermal: 'Temperaturgeführt',
      energyTarget: 'Energie-/SoC-Ziel',
    };
    return labels[type] || type;
  }

  function badge(label: string, tone = ''): string {
    return `<span class="nw-os-badge${tone ? ` nw-os-badge--${tone}` : ''}">${esc(label)}</span>`;
  }

  function gotoTabButton(tab: string): string {
    return tab ? `<button type="button" class="nw-btn nw-btn--small" data-os-goto-tab="${esc(tab)}">Zuordnung öffnen</button>` : '';
  }

  function existingReadMappingInput(resource: AnyRecord, link: AnyRecord, key: string, label: string): string {
    const sourceId = text(resource.sourceId);
    const id = `osLink_${safeId(sourceId, 'resource')}_${key}`;
    const current = text(record(link.mappings)[key], text(record(resource.nativeMappings)[key]));
    return `
      <label class="nw-field nw-os-dp-field">
        <span>${esc(label)}</span>
        <div class="nw-os-dp-row">
          <input id="${esc(id)}" type="text" value="${esc(current)}" placeholder="Datenpunkt-ID …" data-os-link-map-source="${esc(sourceId)}" data-os-link-map-key="${esc(key)}">
          <button type="button" class="nw-btn nw-btn--small" data-browse="${esc(id)}">Auswählen</button>
        </div>
      </label>`;
  }

  function existingReadMappingsHtml(resource: AnyRecord, link: AnyRecord): string {
    const fields: Array<[string, string]> = [
      ['powerReadId', 'Aktuelle Leistung'],
      ['energyReadId', 'Energiezähler'],
      ['stateReadId', 'Betriebszustand'],
      ['onlineReadId', 'Online / Verfügbarkeit'],
      ['alarmReadId', 'Störung / Alarm'],
    ];
    if (resource.resourceType === 'storage' || resource.resourceType === 'chargingPoint') {
      fields.push(['socReadId', resource.resourceType === 'storage' ? 'Speicher-SoC' : 'Fahrzeug-SoC']);
      fields.push(['capacityReadId', 'Nutzbare Kapazität (optional)']);
    }
    if (resource.resourceType === 'thermal') fields.push(['temperatureReadId', 'Temperatur']);
    return `<details class="nw-os-subdetails"><summary>Optionale Strategiemesswerte / DP-Zuordnung</summary><div class="nw-config-grid">${fields.map(([key, label]) => existingReadMappingInput(resource, link, key, label)).join('')}</div><p class="nw-hint">Nur Lesedaten werden ergänzt. Stellpfade bleiben ausschließlich beim vorhandenen EOS-Fachmodul.</p></details>`;
  }

  function existingResourcesHtml(resources: AnyRecord[]): string {
    if (!resources.length) {
      return '<div class="nw-os-empty">Keine aktiven und zugeordneten EOS-Geräte erkannt. Es werden bewusst keine leeren Geräteplätze angezeigt. Noch nicht im EOS angelegte Geräte können darunter als benutzerdefinierte Ressource ergänzt werden.</div>';
    }
    const cfg = workingConfig;
    const globalLive = appEnabled === true
      && edition() === 'eos'
      && cfg.enabled === true
      && cfg.mode === 'active'
      && cfg.commissioningConfirmed === true
      && cfg.controlTakeoverEnabled === true
      && cfg.writeExecutionEnabled === true
      && record(cfg.autoControl).enabled !== false
      && text(record(cfg.autoControl).stage) === 'active';
    return resources.map((resource) => {
      const link = linkBySourceId(resource.sourceId);
      const nativeSupported = /^(evcs:|thermal:|heatingRod:|storage:|storagefarm:)/.test(resource.sourceId);
      const linkLive = globalLive && nativeSupported && link.enabled === true && link.controlMode === 'active' && link.commissioningConfirmed === true;
      const mappingLabel = `${Math.max(0, Number(resource.reads) || 0)} L / ${Math.max(0, Number(resource.writes) || 0)} S`;
      const statusLabel = linkLive ? 'Live freigegeben' : (link.enabled ? 'Beobachtung' : 'Nicht beteiligt');
      const statusTone = linkLive ? 'live' : (link.enabled ? 'safe' : 'muted');
      const chargingOptions = resource.resourceType === 'chargingPoint' ? `
        <label class="nw-field"><span>Auto-Quelle in dieser App</span><select data-os-link-auto-source="${esc(resource.sourceId)}"><option value="standard"${link.autoSource !== 'strategy' ? ' selected' : ''}>Standard-Automatik</option><option value="strategy"${link.autoSource === 'strategy' ? ' selected' : ''}>EOS Betriebsstrategie</option></select><small>Zusätzlich muss am Ladepunkt selbst „Auto → Betriebsstrategie“ gewählt sein.</small></label>` : '';
      return `
        <details class="nw-os-resource nw-os-compact" data-os-existing-resource="${esc(resource.sourceId)}">
          <summary class="nw-os-compact__summary">
            <label class="nw-os-compact__check" title="Teilnahme an Betriebsstrategien"><input type="checkbox" data-os-link-enabled="${esc(resource.sourceId)}" ${link.enabled ? 'checked' : ''}></label>
            <span class="nw-os-compact__identity"><strong>${esc(resource.name)}</strong><small>${esc(resource.sourceLabel)} · ${esc(resourceTypeLabel(resource.resourceType))}</small></span>
            <span class="nw-os-badges">${badge(mappingLabel, resource.reads > 0 ? 'safe' : 'warn')}${badge(statusLabel, statusTone)}${resource.resourceType === 'chargingPoint' ? badge('nur Auto', 'lock') : ''}</span>
            <span class="nw-os-compact__chevron">▾</span>
          </summary>
          <div class="nw-os-compact__body">
            <div class="nw-config-grid">
              <label class="nw-field"><span>Priorität</span><input type="number" min="1" max="100" value="${esc(link.priority)}" data-os-link-priority="${esc(resource.sourceId)}"></label>
              <label class="nw-field"><span>Strategierolle</span><select data-os-link-role="${esc(resource.sourceId)}"><option value="auto"${link.roleOverride === 'auto' ? ' selected' : ''}>Automatisch aus EOS</option><option value="cooling"${link.roleOverride === 'cooling' ? ' selected' : ''}>Kühl-/Gefrieranlage</option><option value="heatPump"${link.roleOverride === 'heatPump' ? ' selected' : ''}>Wärmepumpe / thermisch</option><option value="heatingRod"${link.roleOverride === 'heatingRod' ? ' selected' : ''}>Heizstab / stufig</option><option value="flexConsumer"${link.roleOverride === 'flexConsumer' ? ' selected' : ''}>Flexibler Verbraucher</option><option value="storage"${link.roleOverride === 'storage' ? ' selected' : ''}>Speicher</option><option value="chargingPoint"${link.roleOverride === 'chargingPoint' ? ' selected' : ''}>Ladepunkt</option></select></label>
              <label class="nw-field"><span>Ressourcenmodus</span><select data-os-link-control-mode="${esc(resource.sourceId)}"><option value="observe"${link.controlMode !== 'active' ? ' selected' : ''}>Nur beobachten</option><option value="active"${link.controlMode === 'active' ? ' selected' : ''}>Regelanforderungen zulassen</option></select></label>
              <label class="nw-field nw-field--switch"><span>Gerät in Betrieb genommen</span><input type="checkbox" data-os-link-commissioning="${esc(resource.sourceId)}" ${link.commissioningConfirmed ? 'checked' : ''}></label>
              ${chargingOptions}
              <label class="nw-field"><span>Rückfall bei fehlender Strategie</span><select data-os-link-fallback="${esc(resource.sourceId)}"><option value="standardAuto"${link.fallback !== 'pause' ? ' selected' : ''}>Bisherige Standard-Automatik</option><option value="pause"${link.fallback === 'pause' ? ' selected' : ''}>Sicher pausieren</option></select></label>
              <label class="nw-field"><span>Maximales Messwertalter</span><input type="number" min="1" max="86400" value="${esc(link.staleTimeoutSec)}" data-os-link-stale="${esc(resource.sourceId)}"><small>s</small></label>
            </div>
            ${existingReadMappingsHtml(resource, link)}
            <div class="nw-os-resource-foot">
              <div class="nw-os-badges">${nativeSupported ? badge('Single Writer: bestehendes EOS-Modul', 'safe') : badge('Nur Beobachtung', 'muted')}${resource.writes ? badge(`${resource.writes} Stellpfad${resource.writes === 1 ? '' : 'e'} vorhanden`, 'safe') : badge('Kein Stellpfad', 'warn')}</div>
              ${gotoTabButton(resource.sourceTab)}
            </div>
          </div>
        </details>`;
    }).join('');
  }

  function dpInput(resource: AnyRecord, index: number, key: string, label: string, write = false): string {
    const id = `osCustom_${index}_${key}`;
    const current = text(record(resource.mappings)[key]);
    return `
      <label class="nw-field nw-os-dp-field${write ? ' nw-os-dp-field--write' : ''}">
        <span>${esc(label)}${write ? ' · Schreibpfad gesperrt' : ''}</span>
        <div class="nw-os-dp-row">
          <input id="${esc(id)}" type="text" value="${esc(current)}" placeholder="Datenpunkt-ID …" data-os-custom-map-index="${index}" data-os-custom-map-key="${esc(key)}">
          <button type="button" class="nw-btn nw-btn--small" data-browse="${esc(id)}">Auswählen</button>
        </div>
      </label>`;
  }

  function customResourcesHtml(resources: AnyRecord[]): string {
    if (!resources.length) {
      return '<div class="nw-os-empty">Noch keine benutzerdefinierte Ressource. Lege hier Geräte an, die noch nicht in Speicher, Ladepunkten oder Energiefluss zugeordnet sind.</div>';
    }
    return resources.map((resource, index) => `
      <details class="nw-os-custom nw-os-compact" data-os-custom-index="${index}">
        <summary class="nw-os-compact__summary">
          <label class="nw-os-compact__check"><input type="checkbox" data-os-custom-index="${index}" data-os-custom-field="enabled" ${resource.enabled !== false ? 'checked' : ''}></label>
          <span class="nw-os-compact__identity"><strong>${esc(resource.name)}</strong><small>${esc(resourceTypeLabel(resource.resourceType))} · ${esc(controlTypeLabel(resource.controlType))}</small></span>
          <span class="nw-os-badges">${badge('RC56 nur Beobachtung', 'lock')}${badge(`${Object.values(record(resource.mappings)).filter((value) => text(value)).length} Zuordnungen`, 'muted')}</span>
          <span class="nw-os-compact__chevron">▾</span>
        </summary>
        <div class="nw-os-compact__body">
          <div class="nw-os-custom__header"><div class="nw-os-custom__subtitle">Freie Datenpunkt-Schreibpfade bleiben bis zur generischen Aktor- und Rückmeldeprüfung gesperrt.</div><button type="button" class="nw-btn nw-btn--small" data-os-delete-custom="${index}">Löschen</button></div>
          <div class="nw-config-grid">
            <label class="nw-field"><span>Name</span><input type="text" value="${esc(resource.name)}" data-os-custom-index="${index}" data-os-custom-field="name"></label>
            <label class="nw-field"><span>Ressourcentyp</span><select data-os-custom-index="${index}" data-os-custom-field="resourceType"><option value="consumer"${resource.resourceType === 'consumer' ? ' selected' : ''}>Allgemeiner Verbraucher</option><option value="thermal"${resource.resourceType === 'thermal' ? ' selected' : ''}>Thermisch flexibler Verbraucher</option><option value="chargingPoint"${resource.resourceType === 'chargingPoint' ? ' selected' : ''}>Ladepunkt</option><option value="storage"${resource.resourceType === 'storage' ? ' selected' : ''}>Speicher</option><option value="producer"${resource.resourceType === 'producer' ? ' selected' : ''}>Erzeuger</option><option value="sensor"${resource.resourceType === 'sensor' ? ' selected' : ''}>Sensor / externe Messgröße</option><option value="virtualGroup"${resource.resourceType === 'virtualGroup' ? ' selected' : ''}>Virtuelle Gruppe</option></select></label>
            <label class="nw-field"><span>Fähigkeitsprofil</span><select data-os-custom-index="${index}" data-os-custom-field="controlType"><option value="monitor"${resource.controlType === 'monitor' ? ' selected' : ''}>Nur messen</option><option value="switch"${resource.controlType === 'switch' ? ' selected' : ''}>Ein/Aus</option><option value="setpoint"${resource.controlType === 'setpoint' ? ' selected' : ''}>Stufenloser Sollwert</option><option value="stepped"${resource.controlType === 'stepped' ? ' selected' : ''}>Stufig</option><option value="thermal"${resource.controlType === 'thermal' ? ' selected' : ''}>Temperaturgeführt</option><option value="energyTarget"${resource.controlType === 'energyTarget' ? ' selected' : ''}>Energie-/SoC-Ziel</option></select></label>
            <label class="nw-field"><span>Leistungseinheit</span><select data-os-custom-index="${index}" data-os-custom-field="powerUnit"><option value="W"${resource.powerUnit === 'W' ? ' selected' : ''}>W</option><option value="kW"${resource.powerUnit === 'kW' ? ' selected' : ''}>kW</option></select></label>
            <label class="nw-field"><span>Maximales Messwertalter</span><input type="number" min="1" max="86400" value="${esc(resource.staleTimeoutSec)}" data-os-custom-index="${index}" data-os-custom-field="staleTimeoutSec"><small>s</small></label>
            <label class="nw-field"><span>Fail-Safe-Vorbereitung</span><select data-os-custom-index="${index}" data-os-custom-field="failSafePolicy"><option value="observe-only"${resource.failSafePolicy === 'observe-only' ? ' selected' : ''}>Nur beobachten</option><option value="release"${resource.failSafePolicy === 'release' ? ' selected' : ''}>Später Regelung freigeben</option><option value="safe-on"${resource.failSafePolicy === 'safe-on' ? ' selected' : ''}>Später sicher einschalten</option><option value="safe-off"${resource.failSafePolicy === 'safe-off' ? ' selected' : ''}>Später sicher ausschalten</option><option value="block-optimization"${resource.failSafePolicy === 'block-optimization' ? ' selected' : ''}>Später Optimierung sperren</option></select></label>
            <label class="nw-field"><span>Nutzbare Kapazität</span><input type="number" step="0.1" min="0" value="${esc(resource.usableCapacityKWh)}" data-os-custom-index="${index}" data-os-custom-field="usableCapacityKWh"><small>kWh</small></label>
            <label class="nw-field"><span>Minimale Leistung</span><input type="number" step="1" min="0" value="${esc(resource.minPowerW)}" data-os-custom-index="${index}" data-os-custom-field="minPowerW"><small>W</small></label>
            <label class="nw-field"><span>Maximale Leistung</span><input type="number" step="1" min="0" value="${esc(resource.maxPowerW)}" data-os-custom-index="${index}" data-os-custom-field="maxPowerW"><small>W</small></label>
            <label class="nw-field"><span>Wirkungsgrad</span><input type="number" step="0.1" min="1" max="100" value="${esc(resource.efficiencyPct)}" data-os-custom-index="${index}" data-os-custom-field="efficiencyPct"><small>%</small></label>
          </div>
          <div class="nw-os-section-label">Lesedatenpunkte</div><div class="nw-config-grid">${dpInput(resource, index, 'powerReadId', 'Aktuelle Leistung')}${dpInput(resource, index, 'energyReadId', 'Energiezähler')}${dpInput(resource, index, 'stateReadId', 'Betriebszustand')}${dpInput(resource, index, 'socReadId', 'SoC')}${dpInput(resource, index, 'temperatureReadId', 'Temperatur')}${dpInput(resource, index, 'alarmReadId', 'Alarm / Störung')}${dpInput(resource, index, 'onlineReadId', 'Online / Kommunikation')}${dpInput(resource, index, 'capacityReadId', 'Nutzbare Kapazität')}${dpInput(resource, index, 'forecastEnergyReadId', 'Energie-/PV-Prognose')}${dpInput(resource, index, 'surplusPowerReadId', 'Verfügbarer Überschuss')}</div>
          <div class="nw-os-section-label">Vorbereitete Stell- und Rückmeldepunkte</div><div class="nw-os-lock-note">Die Zuordnungen werden gespeichert, aber benutzerdefinierte Schreibdatenpunkte werden in RC56 noch nicht beschrieben.</div><div class="nw-config-grid">${dpInput(resource, index, 'switchWriteId', 'Ein/Aus oder Freigabe', true)}${dpInput(resource, index, 'switchReadId', 'Rückmeldung Ein/Aus')}${dpInput(resource, index, 'setpointWriteId', 'Leistungs-/Sollwertvorgabe', true)}${dpInput(resource, index, 'setpointReadId', 'Rückmeldung Sollwert')}</div>
        </div>
      </details>`).join('');
  }

  function profilesHtml(profiles: AnyRecord[], resources: AnyRecord[]): string {
    const storages = resources.filter((entry) => entry.resourceType === 'storage');
    return profiles.map((profile, index) => {
      const reserve = record(profile.nightReserve);
      const storageOptions = storages.map((storage) => `<option value="${esc(storage.sourceId)}"${reserve.storageResourceId === storage.sourceId ? ' selected' : ''}>${esc(storage.name)}</option>`).join('');
      return `
        <details class="nw-os-profile nw-os-compact" data-os-profile-index="${index}">
          <summary class="nw-os-compact__summary">
            <label class="nw-os-compact__check"><input type="checkbox" data-os-profile-index="${index}" data-os-profile-field="enabled" ${profile.enabled !== false ? 'checked' : ''}></label>
            <span class="nw-os-compact__identity"><strong>${esc(profile.name)}</strong><small>${esc(profile.season)} · Nachtziel ${esc(reserve.targetSocPct)} % · Untergrenze ${esc(reserve.absoluteMinSocPct)} %</small></span>
            <span class="nw-os-badges">${badge(reserve.enabled !== false ? 'Nachtreserve aktiv' : 'Nachtreserve aus', reserve.enabled !== false ? 'safe' : 'muted')}</span><span class="nw-os-compact__chevron">▾</span>
          </summary>
          <div class="nw-os-compact__body">
            <div class="nw-os-custom__header"><div class="nw-os-custom__subtitle">Der Ziel-SoC wird bis Nachtbeginn geschützt; nachts darf er bis zur absoluten Untergrenze für den Grundverbrauch genutzt werden.</div>${profiles.length > 1 ? `<button type="button" class="nw-btn nw-btn--small" data-os-delete-profile="${index}">Löschen</button>` : ''}</div>
            <div class="nw-config-grid">
              <label class="nw-field"><span>Name</span><input type="text" value="${esc(profile.name)}" data-os-profile-index="${index}" data-os-profile-field="name"></label>
              <label class="nw-field"><span>Profilart</span><select data-os-profile-index="${index}" data-os-profile-field="season"><option value="winter"${profile.season === 'winter' ? ' selected' : ''}>Winter</option><option value="summer"${profile.season === 'summer' ? ' selected' : ''}>Sommer</option><option value="custom"${profile.season === 'custom' ? ' selected' : ''}>Benutzerdefiniert</option></select></label>
              <label class="nw-field nw-field--switch"><span>Nachtenergie-Reserve verwenden</span><input type="checkbox" data-os-profile-index="${index}" data-os-profile-reserve-field="enabled" ${reserve.enabled !== false ? 'checked' : ''}></label>
              <label class="nw-field"><span>Zugeordneter Speicher</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="storageResourceId"><option value="">Automatisch / noch zuordnen</option>${storageOptions}</select></label>
              <label class="nw-field"><span>SoC-Ziel zum Nachtbeginn</span><input type="number" min="0" max="100" step="1" value="${esc(reserve.targetSocPct)}" data-os-profile-index="${index}" data-os-profile-reserve-field="targetSocPct"><small>%</small></label>
              <label class="nw-field"><span>Absolute Speicheruntergrenze</span><input type="number" min="0" max="100" step="1" value="${esc(reserve.absoluteMinSocPct)}" data-os-profile-index="${index}" data-os-profile-reserve-field="absoluteMinSocPct"><small>%</small></label>
              <label class="nw-field"><span>Nachtbeginn</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="startMode"><option value="sunset"${reserve.startMode === 'sunset' ? ' selected' : ''}>Sonnenuntergang</option><option value="fixed"${reserve.startMode === 'fixed' ? ' selected' : ''}>Feste Uhrzeit</option><option value="sunrise"${reserve.startMode === 'sunrise' ? ' selected' : ''}>Sonnenaufgang</option></select></label>
              <label class="nw-field"><span>Feste Zeit / Rückfall</span><input type="time" value="${esc(reserve.startTime)}" data-os-profile-index="${index}" data-os-profile-reserve-field="startTime"></label>
              <label class="nw-field"><span>Nachtende</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="endMode"><option value="sunrise"${reserve.endMode === 'sunrise' ? ' selected' : ''}>Sonnenaufgang</option><option value="fixed"${reserve.endMode === 'fixed' ? ' selected' : ''}>Feste Uhrzeit</option><option value="sunset"${reserve.endMode === 'sunset' ? ' selected' : ''}>Sonnenuntergang</option></select></label>
              <label class="nw-field"><span>Feste Zeit / Rückfall</span><input type="time" value="${esc(reserve.endTime)}" data-os-profile-index="${index}" data-os-profile-reserve-field="endTime"></label>
            </div>
          </div>
        </details>`;
    }).join('');
  }

  function styleHtml(): string {
    return `<style>
      #${ROOT_ID}{display:grid;gap:14px}
      #${ROOT_ID} .nw-os-hero{padding:16px;border:1px solid rgba(92,223,160,.28);border-radius:14px;background:linear-gradient(135deg,rgba(36,126,84,.16),rgba(24,46,65,.2))}
      #${ROOT_ID} .nw-os-hero__title{font-size:1.12rem;font-weight:800}
      #${ROOT_ID} .nw-os-hero__text{margin-top:6px;line-height:1.5;opacity:.82}
      #${ROOT_ID} .nw-os-badges{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}
      #${ROOT_ID} .nw-os-badge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.14);font-size:.72rem;line-height:1.25;white-space:nowrap}
      #${ROOT_ID} .nw-os-badge--safe{border-color:rgba(76,214,143,.38);background:rgba(76,214,143,.09)}
      #${ROOT_ID} .nw-os-badge--live{border-color:rgba(110,240,142,.62);background:rgba(55,190,90,.18);box-shadow:0 0 12px rgba(55,190,90,.12)}
      #${ROOT_ID} .nw-os-badge--warn{border-color:rgba(255,190,70,.42);background:rgba(255,190,70,.08)}
      #${ROOT_ID} .nw-os-badge--lock{border-color:rgba(100,181,246,.35);background:rgba(100,181,246,.08)}
      #${ROOT_ID} .nw-os-badge--muted{opacity:.66}
      #${ROOT_ID} .nw-os-section{border:1px solid rgba(255,255,255,.11);border-radius:14px;padding:14px;background:rgba(255,255,255,.025)}
      #${ROOT_ID} .nw-os-section__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}
      #${ROOT_ID} .nw-os-section__title{font-size:1.02rem;font-weight:700}
      #${ROOT_ID} .nw-os-section__subtitle{opacity:.72;margin-top:3px;line-height:1.4}
      #${ROOT_ID} .nw-os-compact{display:block;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.018);margin-top:7px;overflow:hidden}
      #${ROOT_ID} .nw-os-compact:first-child{margin-top:0}
      #${ROOT_ID} .nw-os-compact__summary{list-style:none;display:grid;grid-template-columns:auto minmax(180px,1fr) auto auto;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;min-height:38px}
      #${ROOT_ID} .nw-os-compact__summary::-webkit-details-marker{display:none}
      #${ROOT_ID} .nw-os-compact__check{display:flex;align-items:center;justify-content:center;margin:0}
      #${ROOT_ID} .nw-os-compact__check input{width:17px;height:17px}
      #${ROOT_ID} .nw-os-compact__identity{display:flex;flex-direction:column;min-width:0}
      #${ROOT_ID} .nw-os-compact__identity strong{font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${ROOT_ID} .nw-os-compact__identity small{opacity:.66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${ROOT_ID} .nw-os-compact__chevron{opacity:.65;transition:transform .15s ease}
      #${ROOT_ID} details[open]>.nw-os-compact__summary .nw-os-compact__chevron{transform:rotate(180deg)}
      #${ROOT_ID} .nw-os-compact__body{padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.08)}
      #${ROOT_ID} .nw-os-subdetails{margin-top:10px;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:0;background:rgba(0,0,0,.08)}
      #${ROOT_ID} .nw-os-subdetails>summary{cursor:pointer;padding:8px 10px;font-weight:650;opacity:.86}
      #${ROOT_ID} .nw-os-subdetails>.nw-config-grid{padding:8px 10px 2px}
      #${ROOT_ID} .nw-os-subdetails>.nw-hint{padding:0 10px 10px;margin:4px 0 0;opacity:.7}
      #${ROOT_ID} .nw-os-resource-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:8px}
      #${ROOT_ID} .nw-os-custom__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      #${ROOT_ID} .nw-os-custom__subtitle{opacity:.7;line-height:1.4}
      #${ROOT_ID} .nw-os-section-label{font-weight:700;margin:14px 0 8px}
      #${ROOT_ID} .nw-os-dp-row{display:flex;gap:7px;align-items:center}
      #${ROOT_ID} .nw-os-dp-row input{min-width:0;flex:1}
      #${ROOT_ID} .nw-os-dp-field--write{border-left:3px solid rgba(100,181,246,.42);padding-left:9px}
      #${ROOT_ID} .nw-os-lock-note{padding:9px 11px;border-radius:9px;background:rgba(100,181,246,.09);border:1px solid rgba(100,181,246,.28);margin-bottom:10px;line-height:1.42}
      #${ROOT_ID} .nw-os-empty{padding:12px;border:1px dashed rgba(255,255,255,.18);border-radius:10px;opacity:.72;line-height:1.5}
      #${ROOT_ID} .nw-os-contract{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
      #${ROOT_ID} .nw-os-contract__item{padding:9px;border-radius:9px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);font-size:.9rem}
      #${ROOT_ID} .nw-os-contract__item strong{display:block;margin-bottom:3px}
      #${ROOT_ID} .nw-os-live-warning{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,174,66,.42);background:rgba(255,174,66,.09);line-height:1.45;margin-top:10px}
      #${ROOT_ID} .nw-os-system-map{margin-top:10px;border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:8px 10px}
      #${ROOT_ID} .nw-os-system-map summary{cursor:pointer;font-weight:700}
      @media(max-width:760px){#${ROOT_ID} .nw-os-compact__summary{grid-template-columns:auto minmax(120px,1fr) auto}#${ROOT_ID} .nw-os-compact__summary>.nw-os-badges{grid-column:2/4;margin-top:0}#${ROOT_ID} .nw-os-compact__chevron{grid-column:4;grid-row:1}}
    </style>`;
  }

  function renderHtml(): string {
    const resources = deriveExistingResources(fullConfig);
    const cfg = workingConfig;
    const eos = edition() === 'eos';
    const activeProfileOptions = list(cfg.profiles).map((profile) => `<option value="${esc(profile.id)}"${profile.id === cfg.activeProfileId ? ' selected' : ''}>${esc(profile.name)}</option>`).join('');
    const linkedCount = list(cfg.resourceLinks).filter((entry) => entry.enabled === true && resources.some((resource) => resource.sourceId === entry.sourceId)).length;
    const catalog = strategyResourceCatalog();
    const globalLive = appEnabled && eos && cfg.enabled === true && cfg.mode === 'active' && cfg.commissioningConfirmed === true && cfg.controlTakeoverEnabled === true && cfg.writeExecutionEnabled === true && record(cfg.autoControl).enabled !== false && text(record(cfg.autoControl).stage) === 'active';
    const statusBadges = globalLive
      ? `${badge('Live-Regelanforderungen aktiv', 'live')}${badge('Single Writer bleibt erhalten', 'safe')}`
      : `${badge(cfg.mode === 'active' ? 'Freigabe noch unvollständig' : 'Beobachtung / Simulation', cfg.mode === 'active' ? 'warn' : 'safe')}${badge('Keine direkten App-Hardwarewrites', 'lock')}`;
    const map = record(cfg.systemMappings);
    const systemMapField = (key: string, label: string) => `<label class="nw-field"><span>${esc(label)}</span><div class="nw-os-dp-row"><input id="osSystem_${esc(key)}" type="text" value="${esc(map[key])}" data-os-system-map="${esc(key)}" placeholder="optional – EOS-Fallback wird verwendet"><button type="button" class="nw-btn nw-btn--small" data-browse="osSystem_${esc(key)}">Auswählen</button></div></label>`;
    return `${styleHtml()}
      <div id="${ROOT_ID}">
        <div class="nw-os-hero"><div class="nw-os-hero__title">Betriebsstrategien · koordinierte EOS-Regelanforderungen</div><div class="nw-os-hero__text">RC56 verbindet freigegebene Regeln mit den vorhandenen Lade-, Speicher-, Thermik- und Heizstabreglern. Die App plant Ziele; die bestehenden Fachmodule bleiben alleinige Hardware-Writer und wenden weiterhin §14a, Parkregler, Netz-, Stations- und Geräteschutz an.</div><div class="nw-os-badges">${statusBadges}${badge(`${resources.length} aktive EOS-Ressourcen`, resources.length ? 'safe' : 'muted')}</div></div>

        <div class="nw-os-section">
          <div class="nw-os-section__header"><div><div class="nw-os-section__title">App- und Sicherheitsfreigabe</div><div class="nw-os-section__subtitle">Live-Betrieb erfordert alle globalen und ressourcenbezogenen Bestätigungen. Fehlt eine Freigabe oder läuft eine Anforderung ab, greift der definierte Rückfall.</div></div></div>
          <div class="nw-config-grid">
            <label class="nw-field"><span>Edition</span><input type="text" value="${eos ? 'EOS Pro' : 'Nicht freigeschaltet'}" disabled></label>
            <label class="nw-field"><span>AppCenter-Status</span><input type="text" value="${appEnabled ? 'Installiert und aktiviert' : 'Nicht aktiv'}" disabled></label>
            <label class="nw-field"><span>Betriebsmodus</span><select id="osMode"><option value="observe"${cfg.mode !== 'active' ? ' selected' : ''}>Beobachtung / Simulation</option><option value="active"${cfg.mode === 'active' ? ' selected' : ''}>Aktive Regelanforderungen</option></select></label>
            <label class="nw-field"><span>Inbetriebnahmestufe</span><select id="osAutoStage"><option value="shadow"${text(record(cfg.autoControl).stage) === 'shadow' ? ' selected' : ''}>Shadow – nur vergleichen</option><option value="commissioning"${text(record(cfg.autoControl).stage) === 'commissioning' ? ' selected' : ''}>Inbetriebnahme – noch keine Übernahme</option><option value="active"${text(record(cfg.autoControl).stage) === 'active' ? ' selected' : ''}>Aktiv – freigegebene Anforderungen anwenden</option></select></label>
            <label class="nw-field nw-field--switch"><span>Globale Inbetriebnahme bestätigt</span><input id="osCommissioningConfirmed" type="checkbox" ${cfg.commissioningConfirmed ? 'checked' : ''}></label>
            <label class="nw-field nw-field--switch"><span>Steuerübernahme freigeben</span><input id="osControlTakeoverEnabled" type="checkbox" ${cfg.controlTakeoverEnabled ? 'checked' : ''}></label>
            <label class="nw-field nw-field--switch"><span>Ausführung über Fachmodule freigeben</span><input id="osWriteExecutionEnabled" type="checkbox" ${cfg.writeExecutionEnabled ? 'checked' : ''}></label>
            <label class="nw-field"><span>Anforderungs-Gültigkeit</span><input id="osRequestTtlSeconds" type="number" min="3" max="60" value="${esc(record(cfg.autoControl).requestTtlSeconds)}"><small>s</small></label>
            <label class="nw-field"><span>Globaler Rückfall</span><select id="osGlobalFallback"><option value="standardAuto"${text(record(cfg.autoControl).fallback) !== 'pause' ? ' selected' : ''}>Standard-Automatik / Fachmodul</option><option value="pause"${text(record(cfg.autoControl).fallback) === 'pause' ? ' selected' : ''}>Sicher pausieren</option></select></label>
            <label class="nw-field nw-field--switch"><span>Nur aktive EOS-Geräte automatisch anzeigen</span><input id="osAutoImportExisting" type="checkbox" ${cfg.autoImportExisting !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>Aktives Profil</span><select id="osActiveProfileId">${activeProfileOptions}</select></label>
          </div>
          ${globalLive ? '<div class="nw-os-live-warning"><strong>Live-Betrieb ist vollständig freigegeben.</strong> Nur zusätzlich pro Ressource freigegebene Geräte können Anforderungen erhalten. Ladepunkte benötigen außerdem im Ladepunkt-Reiter „Auto → Betriebsstrategie“.</div>' : '<div class="nw-os-live-warning"><strong>Fail-closed:</strong> Die Freigabekette ist nicht vollständig. Regeln werden nur simuliert oder beobachtet; bestehende Regelungen laufen unverändert weiter.</div>'}
          <details class="nw-os-system-map"><summary>Optionale System-Datenpunkte für Wetter, Prognose und Tarif</summary><div class="nw-config-grid" style="margin-top:10px">${systemMapField('outsideTemperatureReadId','Außentemperatur')}${systemMapField('pvForecastReadId','PV-Prognose')}${systemMapField('pvSurplusReadId','PV-Überschuss')}${systemMapField('gridPowerReadId','Netzleistung')}${systemMapField('electricityPriceReadId','Strompreis')}${systemMapField('cheapTariffReadId','Günstiger Tarif')}</div></details>
          ${eos ? '' : '<div class="nw-notice nw-notice--warn" style="margin-top:12px">Die Betriebsstrategien-App ist ausschließlich in EOS Pro verfügbar.</div>'}
        </div>

        <div class="nw-os-section"><div class="nw-os-section__header"><div><div class="nw-os-section__title">Verbindlicher Steuervertrag</div><div class="nw-os-section__subtitle">Die Betriebsstrategie ersetzt keinen Fachregler, sondern liefert nur zeitlich begrenzte Anforderungen.</div></div></div><div class="nw-os-contract"><div class="nw-os-contract__item"><strong>Ladepunkte</strong>Doppeltes Opt-in: Ressource freigeben und am Ladepunkt „Auto → Betriebsstrategie“ wählen.</div><div class="nw-os-contract__item"><strong>Andere Lademodi</strong>Manuell, Boost, PV, Min+PV und Zeit-Ziel bleiben eigenständig.</div><div class="nw-os-contract__item"><strong>Thermik / Heizstab</strong>Eingriff nur im jeweiligen PV-Auto-Modus; Sicherheitsfreigaben bleiben überlegen.</div><div class="nw-os-contract__item"><strong>Speicher</strong>Strategie darf Reservegrenzen nur verschärfen, niemals bestehende Schutzgrenzen absenken.</div></div></div>

        <div class="nw-os-section"><div class="nw-os-section__header"><div><div class="nw-os-section__title">Aktive EOS-Ressourcen</div><div class="nw-os-section__subtitle">Es werden nur installierte, aktivierte und tatsächlich zugeordnete Geräte angezeigt. Leere Thermik-, Heizstab-, Speicher- und Ladepunktplätze bleiben ausgeblendet. Beteiligt: ${linkedCount}.</div></div></div><div id="osExistingResources">${cfg.autoImportExisting !== false ? existingResourcesHtml(resources) : '<div class="nw-os-empty">Automatische Anzeige ist deaktiviert. Gespeicherte, derzeit nicht sichtbare Verknüpfungen werden sicher auf Beobachtung zurückgesetzt.</div>'}</div></div>

        <div class="nw-os-section"><div class="nw-os-section__header"><div><div class="nw-os-section__title">Benutzerdefinierte Ressourcen</div><div class="nw-os-section__subtitle">Für noch nicht nativ im EOS angelegte Geräte. In RC56 können sie planen und simulieren, bleiben aber bei freien Schreibdatenpunkten bewusst read-only.</div></div><button id="osAddCustomResource" type="button" class="nw-btn nw-btn--primary">Ressource hinzufügen</button></div><div id="osCustomResources">${customResourcesHtml(list(cfg.customResources))}</div></div>

        <div class="nw-os-section"><div class="nw-os-section__header"><div><div class="nw-os-section__title">Saison- und Nachtreserveprofile</div><div class="nw-os-section__subtitle">Der Ziel-SoC wird bis Nachtbeginn geschützt; nachts steht die Energie bis zur absoluten Untergrenze für den Grundverbrauch bereit.</div></div><button id="osAddProfile" type="button" class="nw-btn nw-btn--primary">Profil hinzufügen</button></div><div id="osProfiles">${profilesHtml(list(cfg.profiles), catalog)}</div></div>

        ${typeof ruleBuilder().render === 'function' ? ruleBuilder().render(cfg, catalog) : '<div class="nw-os-section"><div class="nw-os-section__title">Regelbaukasten nicht geladen</div><div class="nw-os-section__subtitle">Die Ressourcen- und Profilgrundlage bleibt verfügbar; Live-Steuerung bleibt fail-closed.</div></div>'}
      </div>`;
  }

  function syncLinksFromDom(): void {
    const existingMap = new Map(list(workingConfig.resourceLinks).map((entry) => [text(entry.sourceId), normalizeLink(entry)]));
    const rendered = deriveExistingResources(fullConfig);
    const renderedIds = new Set(rendered.map((entry) => text(entry.sourceId)));
    const out: AnyRecord[] = [];
    document.querySelectorAll<HTMLInputElement>('[data-os-link-enabled]').forEach((checkbox) => {
      const sourceId = text(checkbox.getAttribute('data-os-link-enabled'));
      if (!sourceId) return;
      const find = <T extends HTMLElement>(selector: string, attr: string): T | undefined => Array.from(document.querySelectorAll<T>(selector)).find((entry) => text(entry.getAttribute(attr)) === sourceId);
      const priorityInput = find<HTMLInputElement>('[data-os-link-priority]', 'data-os-link-priority');
      const roleInput = find<HTMLSelectElement>('[data-os-link-role]', 'data-os-link-role');
      const modeInput = find<HTMLSelectElement>('[data-os-link-control-mode]', 'data-os-link-control-mode');
      const commissioningInput = find<HTMLInputElement>('[data-os-link-commissioning]', 'data-os-link-commissioning');
      const autoSourceInput = find<HTMLSelectElement>('[data-os-link-auto-source]', 'data-os-link-auto-source');
      const fallbackInput = find<HTMLSelectElement>('[data-os-link-fallback]', 'data-os-link-fallback');
      const staleInput = find<HTMLInputElement>('[data-os-link-stale]', 'data-os-link-stale');
      const previous = record(existingMap.get(sourceId));
      const mappings = normalizeMappings(previous.mappings);
      document.querySelectorAll<HTMLInputElement>('[data-os-link-map-source]').forEach((node) => {
        if (text(node.getAttribute('data-os-link-map-source')) !== sourceId) return;
        const key = text(node.getAttribute('data-os-link-map-key'));
        if (key) mappings[key] = text(node.value);
      });
      const roleOverride = text(roleInput?.value, 'auto');
      out.push(normalizeLink({
        ...previous,
        mappings,
        sourceId,
        enabled: checkbox.checked,
        priority: integer(priorityInput?.value, 50, 1, 100),
        roleOverride,
        autoOnly: sourceId.startsWith('evcs:') || roleOverride === 'chargingPoint',
        controlMode: text(modeInput?.value) === 'active' ? 'active' : 'observe',
        commissioningConfirmed: commissioningInput?.checked === true,
        autoSource: text(autoSourceInput?.value) === 'strategy' ? 'strategy' : 'standard',
        fallback: text(fallbackInput?.value) === 'pause' ? 'pause' : 'standardAuto',
        staleTimeoutSec: integer(staleInput?.value, sourceId.startsWith('evcs:') ? 30 : 60, 1, 86400),
      }) || {});
    });
    // Nicht mehr aktive/zugeordnete Geräte bleiben nicht heimlich steuerbar.
    list(workingConfig.resourceLinks).forEach((entry) => {
      const sourceId = text(entry.sourceId);
      if (!sourceId || renderedIds.has(sourceId)) return;
      const normalized = normalizeLink({ ...entry, enabled: false, controlMode: 'observe', commissioningConfirmed: false, observeOnly: true, writeEnabled: false });
      if (normalized) out.push(normalized);
    });
    workingConfig.resourceLinks = out.filter((entry) => text(entry.sourceId));
  }

  function syncCustomFromDom(): void {
    const resources = list(workingConfig.customResources).map((entry) => clone(entry));
    document.querySelectorAll<HTMLElement>('[data-os-custom-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-custom-index'), -1, -1, 10000);
      const field = text(node.getAttribute('data-os-custom-field'));
      if (index < 0 || !resources[index] || !field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') resources[index][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) resources[index][field] = node.value;
    });
    document.querySelectorAll<HTMLInputElement>('[data-os-custom-map-key]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-custom-map-index'), -1, -1, 10000);
      const key = text(node.getAttribute('data-os-custom-map-key'));
      if (index < 0 || !resources[index] || !key) return;
      resources[index].mappings = record(resources[index].mappings);
      resources[index].mappings[key] = text(node.value);
    });
    workingConfig.customResources = resources.map(normalizeCustomResource);
  }

  function syncProfilesFromDom(): void {
    const profiles = list(workingConfig.profiles).map((entry) => clone(entry));
    document.querySelectorAll<HTMLElement>('[data-os-profile-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-profile-index'), -1, -1, 10000);
      const field = text(node.getAttribute('data-os-profile-field'));
      if (index < 0 || !profiles[index] || !field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') profiles[index][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) profiles[index][field] = node.value;
    });
    document.querySelectorAll<HTMLElement>('[data-os-profile-reserve-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-profile-index'), -1, -1, 10000);
      const field = text(node.getAttribute('data-os-profile-reserve-field'));
      if (index < 0 || !profiles[index] || !field) return;
      profiles[index].nightReserve = record(profiles[index].nightReserve);
      if (node instanceof HTMLInputElement && node.type === 'checkbox') profiles[index].nightReserve[field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) profiles[index].nightReserve[field] = node.value;
    });
    workingConfig.profiles = profiles.map(normalizeProfile);
    const active = (byId('osActiveProfileId') as HTMLSelectElement | null)?.value;
    if (text(active)) workingConfig.activeProfileId = text(active);
  }

  function syncGlobalFromDom(): void {
    const mode = byId('osMode') as HTMLSelectElement | null;
    const stage = byId('osAutoStage') as HTMLSelectElement | null;
    const commissioning = byId('osCommissioningConfirmed') as HTMLInputElement | null;
    const takeover = byId('osControlTakeoverEnabled') as HTMLInputElement | null;
    const execution = byId('osWriteExecutionEnabled') as HTMLInputElement | null;
    const ttl = byId('osRequestTtlSeconds') as HTMLInputElement | null;
    const fallback = byId('osGlobalFallback') as HTMLSelectElement | null;
    if (mode) workingConfig.mode = mode.value === 'active' ? 'active' : 'observe';
    if (commissioning) workingConfig.commissioningConfirmed = commissioning.checked;
    if (takeover) workingConfig.controlTakeoverEnabled = takeover.checked;
    if (execution) workingConfig.writeExecutionEnabled = execution.checked;
    workingConfig.autoControl = record(workingConfig.autoControl);
    if (stage) workingConfig.autoControl.stage = ['shadow', 'commissioning', 'active'].includes(stage.value) ? stage.value : 'shadow';
    if (ttl) workingConfig.autoControl.requestTtlSeconds = integer(ttl.value, 15, 3, 60);
    if (fallback) workingConfig.autoControl.fallback = fallback.value === 'pause' ? 'pause' : 'standardAuto';
  }

  function syncFromDom(): void {
    if (!byId(ROOT_ID)) return;
    const getCheck = (id: string, fallback = false): boolean => (byId(id) as HTMLInputElement | null)?.checked ?? fallback;
    const getValue = (id: string, fallback = ''): string => text((byId(id) as HTMLInputElement | HTMLSelectElement | null)?.value, fallback);
    workingConfig.mode = getValue('osMode', 'observe') === 'active' ? 'active' : 'observe';
    workingConfig.commissioningConfirmed = getCheck('osCommissioningConfirmed', false);
    workingConfig.controlTakeoverEnabled = getCheck('osControlTakeoverEnabled', false);
    workingConfig.writeExecutionEnabled = getCheck('osWriteExecutionEnabled', false);
    workingConfig.autoControl = {
      ...record(workingConfig.autoControl),
      enabled: true,
      stage: ['shadow', 'commissioning', 'active'].includes(getValue('osAutoStage', 'shadow')) ? getValue('osAutoStage', 'shadow') : 'shadow',
      requestTtlSeconds: integer(getValue('osRequestTtlSeconds', '15'), 15, 3, 60),
      fallback: getValue('osGlobalFallback', 'standardAuto') === 'pause' ? 'pause' : 'standardAuto',
    };
    const autoImport = byId('osAutoImportExisting') as HTMLInputElement | null;
    if (autoImport) workingConfig.autoImportExisting = autoImport.checked;
    const systemMappings = normalizeSystemMappings(workingConfig.systemMappings);
    document.querySelectorAll<HTMLInputElement>('[data-os-system-map]').forEach((node) => {
      const key = text(node.getAttribute('data-os-system-map'));
      if (key) systemMappings[key] = text(node.value);
    });
    workingConfig.systemMappings = systemMappings;
    syncLinksFromDom();
    syncCustomFromDom();
    syncProfilesFromDom();
    const builder = ruleBuilder();
    if (typeof builder.syncFromDom === 'function') workingConfig = builder.syncFromDom(workingConfig, strategyResourceCatalog());
    workingConfig = normalizeConfig(workingConfig);
  }

  function rerender(): void {
    if (!mountNode) return;
    mountNode.innerHTML = renderHtml();
    bindEvents();
  }

  function bindEvents(): void {
    const autoImport = byId('osAutoImportExisting') as HTMLInputElement | null;
    if (autoImport) autoImport.addEventListener('change', () => {
      syncFromDom();
      rerender();
    });

    const activeProfile = byId('osActiveProfileId') as HTMLSelectElement | null;
    if (activeProfile) activeProfile.addEventListener('change', () => {
      workingConfig.activeProfileId = text(activeProfile.value);
    });

    const addResource = byId('osAddCustomResource');
    if (addResource) addResource.addEventListener('click', () => {
      syncFromDom();
      const index = list(workingConfig.customResources).length;
      workingConfig.customResources.push(normalizeCustomResource({
        id: `custom-${Date.now()}`,
        name: `Neue Ressource ${index + 1}`,
        resourceType: 'consumer',
        controlType: 'monitor',
        mappings: {},
      }, index));
      rerender();
      setStatus('Benutzerdefinierte Ressource angelegt. Datenpunkte können jetzt zugeordnet werden.', 'ok');
    });

    const addProfile = byId('osAddProfile');
    if (addProfile) addProfile.addEventListener('click', () => {
      syncFromDom();
      const index = list(workingConfig.profiles).length;
      const profile = normalizeProfile({
        id: `profile-${Date.now()}`,
        name: `Betriebsprofil ${index + 1}`,
        enabled: true,
        season: 'custom',
        nightReserve: defaultNightReserve(50),
      }, index);
      workingConfig.profiles.push(profile);
      workingConfig.activeProfileId = profile.id;
      rerender();
      setStatus('Neues Betriebsprofil angelegt.', 'ok');
    });

    document.querySelectorAll<HTMLElement>('[data-os-delete-custom]').forEach((button) => button.addEventListener('click', () => {
      syncFromDom();
      const index = integer(button.getAttribute('data-os-delete-custom'), -1, -1, 10000);
      if (index < 0 || index >= workingConfig.customResources.length) return;
      workingConfig.customResources.splice(index, 1);
      rerender();
      setStatus('Benutzerdefinierte Ressource aus der Betriebsstrategien-Konfiguration entfernt.', 'ok');
    }));

    document.querySelectorAll<HTMLElement>('[data-os-delete-profile]').forEach((button) => button.addEventListener('click', () => {
      syncFromDom();
      const index = integer(button.getAttribute('data-os-delete-profile'), -1, -1, 10000);
      if (index < 0 || index >= workingConfig.profiles.length || workingConfig.profiles.length <= 1) return;
      const removed = workingConfig.profiles.splice(index, 1)[0];
      if (removed && removed.id === workingConfig.activeProfileId) workingConfig.activeProfileId = workingConfig.profiles[0].id;
      rerender();
      setStatus('Betriebsprofil entfernt.', 'ok');
    }));

    document.querySelectorAll<HTMLElement>('[data-os-goto-tab]').forEach((button) => button.addEventListener('click', () => {
      const tab = text(button.getAttribute('data-os-goto-tab'));
      const target = tab ? document.querySelector<HTMLElement>(`.nw-tab[data-tab="${tab}"]`) : null;
      if (target) target.click();
    }));

    // Die Teilnahme-Checkbox sitzt absichtlich in der kompakten Summary-Zeile.
    // Ein Klick auf die Checkbox darf die Detailkarte nicht gleichzeitig auf-/zuklappen.
    document.querySelectorAll<HTMLElement>('.nw-os-compact__check').forEach((label) => label.addEventListener('click', (event) => {
      event.stopPropagation();
    }));

    document.querySelectorAll<HTMLElement>('#osMode,#osAutoStage,#osCommissioningConfirmed,#osControlTakeoverEnabled,#osWriteExecutionEnabled,#osRequestTtlSeconds,#osGlobalFallback,[data-os-link-enabled],[data-os-link-priority],[data-os-link-role],[data-os-link-control-mode],[data-os-link-commissioning],[data-os-link-auto-source],[data-os-link-fallback],[data-os-link-stale],[data-os-link-map-source],[data-os-system-map],[data-os-custom-field],[data-os-custom-map-key],[data-os-profile-field],[data-os-profile-reserve-field]')
      .forEach((node) => node.addEventListener('change', () => {
        syncFromDom();
      }));

    const builder = ruleBuilder();
    if (typeof builder.bindEvents === 'function') builder.bindEvents({
      getConfig: () => workingConfig,
      updateConfig: (next: AnyRecord) => { workingConfig = normalizeConfig(next); },
      getResources: () => strategyResourceCatalog(),
      syncAll: () => syncFromDom(),
      rerender,
      setStatus,
    });
  }

  async function render(mount: HTMLElement | null, config: AnyRecord = {}, enabled = false): Promise<void> {
    if (!mount) return;
    mountNode = mount;
    fullConfig = record(config);
    appEnabled = enabled === true;
    workingConfig = normalizeConfig(fullConfig.operatingStrategies);
    const builder = ruleBuilder();
    if (typeof builder.resetSimulationResult === 'function') builder.resetSimulationResult();
    rerender();
  }

  function apply(config: AnyRecord = {}, selectedEdition?: string): void {
    if (selectedEdition) getEdition = () => selectedEdition;
    const app = record(record(record(config.emsApps).apps)[APP_ID]);
    render(
      document.getElementById('operatingStrategiesConfigSlot'),
      config,
      app.installed === true && app.enabled === true,
    ).catch(() => undefined);
  }

  function collect(existing: AnyRecord = {}, enabled = false, selectedEdition?: string): AnyRecord {
    if (selectedEdition) getEdition = () => selectedEdition;
    if (byId(ROOT_ID)) syncFromDom();
    else workingConfig = normalizeConfig(existing);
    const eos = edition() === 'eos';
    const out = normalizeConfig(workingConfig);
    out.enabled = eos && enabled === true;
    if (!out.enabled) out.mode = 'observe';
    out.controlContract = defaultControlContract();
    const globalLive = out.enabled === true
      && out.mode === 'active'
      && out.commissioningConfirmed === true
      && out.controlTakeoverEnabled === true
      && out.writeExecutionEnabled === true
      && record(out.autoControl).enabled !== false
      && text(record(out.autoControl).stage) === 'active';
    const builder = ruleBuilder();
    out.rules = typeof builder.normalizeRules === 'function'
      ? builder.normalizeRules(out.rules, list(out.profiles).map((profile) => text(profile.id)))
      : [];
    out.rules = list(out.rules).map((entry) => ({ ...entry, simulationOnly: !globalLive, executionEnabled: globalLive && entry.enabled !== false }));
    out.simulation = typeof builder.normalizeSimulation === 'function'
      ? builder.normalizeSimulation(out.simulation, out.activeProfileId)
      : { activeProfileId: out.activeProfileId, resourceStates: {} };
    const activeIds = new Set(deriveExistingResources(fullConfig).map((resource) => text(resource.sourceId)));
    out.resourceLinks = list(out.resourceLinks).map((entry) => {
      const normalized = normalizeLink(entry);
      if (!normalized) return null;
      const nativeLiveSupported = /^(evcs:|thermal:|heatingRod:|storage:|storagefarm:)/.test(normalized.sourceId);
      const sourceStillActive = activeIds.has(normalized.sourceId);
      const linkLive = globalLive && sourceStillActive && nativeLiveSupported && normalized.enabled === true && normalized.controlMode === 'active' && normalized.commissioningConfirmed === true;
      return {
        ...normalized,
        enabled: sourceStillActive ? normalized.enabled : false,
        controlMode: sourceStillActive ? normalized.controlMode : 'observe',
        commissioningConfirmed: sourceStillActive ? normalized.commissioningConfirmed : false,
        observeOnly: !linkLive,
        writeEnabled: linkLive,
        autoOnly: normalized.autoOnly === true,
      };
    }).filter(Boolean);
    out.customResources = list(out.customResources).map((entry, index) => ({
      ...normalizeCustomResource(entry, index),
      controlMode: 'observe', commissioningConfirmed: false, observeOnly: true, writeEnabled: false,
    }));
    out.metadata = {
      ...record(out.metadata), foundationVersion: FOUNDATION_VERSION, ruleBuilderVersion: RULE_BUILDER_VERSION,
      liveControlVersion: LIVE_CONTROL_VERSION, lastEditedAt: new Date().toISOString(),
    };
    workingConfig = out;
    return clone(out);
  }

  function setup(options: AnyRecord = {}): void {
    if (typeof options.setStatus === 'function') setStatus = options.setStatus;
    if (typeof options.getEdition === 'function') getEdition = options.getEdition;
  }

  (window as any).NexoWattOperatingStrategiesAppCenter = {
    setup,
    render,
    apply,
    collect,
    deriveExistingResources,
    strategyResourceCatalog,
    normalizeConfig,
    simulate: (config: AnyRecord, resources?: AnyRecord[]) => {
      const builder = ruleBuilder();
      return typeof builder.simulate === 'function' ? builder.simulate(config, resources || strategyResourceCatalog(), config.simulation) : null;
    },
  };
})();
