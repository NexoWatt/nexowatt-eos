/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/ems-apps.ts
 * Quell-Hash: sha256:1f7158e304f96ece7a8eebf6285456b8263df2621dcc8964c52b372bca892441
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/ems-apps.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet App-Center-Eingaben, Modulkonfiguration und Datenpunktzuordnung mit den geschützten Backend-Endpunkten.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/ems-apps.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/ems-apps.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/ems-apps.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/ems-apps.js
 * Rolle im Projekt: Installer/App-Center Frontend.
 * Zweck: Verwaltet Admin-Konfigurationen für EMS-Apps, Datenpunkte, Speicherfarm, Heizstab, KI und Mapping.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Installer/App-Center-Logik: liest und schreibt die EMS-App-Konfiguration, DP-Zuordnungen, Verbrauchergruppen und KI-/Regelungsparameter.
 * Zusammenhänge:
 * - Kommuniziert mit /api/installer/config und weiteren Installer-APIs aus main.js.
 * - Viele Config-Werte werden später in ems/modules/* verarbeitet.
 * Wartungshinweise:
 * - UI-Felder müssen exakt zu den Config-Schlüsseln passen; ein falscher Key kann Regelungslogik oder DP-Mapping brechen.
 */

/* NexoWatt EMS Apps (Installer) – Web UI */
(function () {
  'use strict';


/**
 * Datenvertrag: AppCenterConfigPatch
 * Zweck: Beschreibt die Config-Objekte, die der Installer über das App-Center speichert.
 * Zusammenhang: main.js übernimmt diese Config; EMS-Module lesen daraus Schwellwerte, Mappings und Freigaben.
 * TypeScript-Ziel: Pro App/Modul eigene Config-Interfaces statt untypisierter Objekt-Patches.
 */

/**
 * Vertragsstelle: HTML-ID zu Config-Key
 * Zweck: Jedes Eingabefeld in ems-apps.html muss in ems-apps.js gelesen, validiert und gespeichert werden.
 * Wichtig: Neue Felder immer in HTML, Element-Mapping, UI-Build und Collect-Funktion ergänzen.
 */


  const els = {
    status: document.getElementById('nw-emsapps-status'),
    save: document.getElementById('nw-emsapps-save'),
    reload: document.getElementById('nw-emsapps-reload'),
    validate: document.getElementById('nw-emsapps-validate'),
    backInstaller: document.getElementById('nw-emsapps-back-installer'),

    appsList: document.getElementById('appsList'),
    systemProfileMount: document.getElementById('systemProfileMappingSlot'),
    nlP1Mount: document.getElementById('nlP1MappingSlot'),
    chargeKioskMount: document.getElementById('chargeKioskEvcsSlot'),
    meshMicrogridMount: document.getElementById('meshMicrogridConfigSlot'),
    netOperatorMount: document.getElementById('netOperatorConfigSlot'),
    operatingStrategiesMount: document.getElementById('operatingStrategiesConfigSlot'),
    appsEmpty: document.getElementById('appsEmpty'),
    nwDevicesQuickSetup: document.getElementById('nwDevicesQuickSetup'),


    gridConnectionPower: document.getElementById('gridConnectionPower'),
    gridPointPowerId: document.getElementById('gridPointPowerId'),
    gridPointPowerIdDisplay: document.getElementById('gridPointPowerIdDisplay'),
    gridPointConnectedId: document.getElementById('gridPointConnectedId'),
    gridPointConnectedIdDisplay: document.getElementById('gridPointConnectedIdDisplay'),

    gridPointWatchdogId: document.getElementById('gridPointWatchdogId'),
    gridPointWatchdogIdDisplay: document.getElementById('gridPointWatchdogIdDisplay'),

    gridInvertGrid: document.getElementById('gridInvertGrid'),

    // Energiefluss-Monitor (Tab)
    flowSubtractEvFromBuilding: document.getElementById('flowSubtractEvFromBuilding'),
    flowInvertGrid: document.getElementById('flowInvertGrid'),
    flowInvertBattery: document.getElementById('flowInvertBattery'),
    flowInvertPv: document.getElementById('flowInvertPv'),
    flowInvertEv: document.getElementById('flowInvertEv'),
    flowGridShowNet: document.getElementById('flowGridShowNet'),
      schedulerIntervalMs: document.getElementById('schedulerIntervalMs'),

    dpFlow: document.getElementById('dpFlow'),
    flowConsumers: document.getElementById('flowConsumers'),
    flowProducers: document.getElementById('flowProducers'),
    dpTariffs: document.getElementById('dpTariffs'),
    dpPvForecast: document.getElementById('dpPvForecast'),
    dpLive: document.getElementById('dpLive'),
    dpWeather: document.getElementById('dpWeather'),
    storageTable: document.getElementById('storageTable'),

    storageControlMode: document.getElementById('storageControlMode'),
    storageAllowGridCharge: document.getElementById('storageAllowGridCharge'),
    storageCapacityKWh: document.getElementById('storageCapacityKWh'),
    storageLicensePowerProfile: document.getElementById('storageLicensePowerProfile'),
    storageRatedPowerKW: document.getElementById('storageRatedPowerKW'),
    storageSelfTargetGridImportW: document.getElementById('storageSelfTargetGridImportW'),
    storageSelfImportThresholdW: document.getElementById('storageSelfImportThresholdW'),
    storageSelfNvpSmoothingSec: document.getElementById('storageSelfNvpSmoothingSec'),
    storageSelfNvpRawGuardW: document.getElementById('storageSelfNvpRawGuardW'),
    storageBalanceFeedbackHoldSec: document.getElementById('storageBalanceFeedbackHoldSec'),
    storageCouplingMode: document.getElementById('storageCouplingMode'),
    storageDcPvHintRow: document.getElementById('storageDcPvHintRow'),
    storageVendorProfile: document.getElementById('storageVendorProfile'),
    storageFeneconOptionsRow: document.getElementById('storageFeneconOptionsRow'),
    storageFeneconControlMode: document.getElementById('storageFeneconControlMode'),
    storageFeneconAcMode: document.getElementById('storageFeneconAcMode'),
    storageFeneconDayNoWrite: document.getElementById('storageFeneconDayNoWrite'),
    storageFeneconPvOnThresholdW: document.getElementById('storageFeneconPvOnThresholdW'),
    storageFeneconPvOffThresholdW: document.getElementById('storageFeneconPvOffThresholdW'),
    storageFeneconPvOnDelaySec: document.getElementById('storageFeneconPvOnDelaySec'),
    storageFeneconPvOffDelaySec: document.getElementById('storageFeneconPvOffDelaySec'),
    storageFeneconApiTimeoutSec: document.getElementById('storageFeneconApiTimeoutSec'),
    storageFeneconHybridAutoSettings: document.getElementById('storageFeneconHybridAutoSettings'),
    storageFeneconAssist: document.getElementById('storageFeneconAssist'),
    storageSungrowOptionsRow: document.getElementById('storageSungrowOptionsRow'),
    storageE3dcOptionsRow: document.getElementById('storageE3dcOptionsRow'),
    storageE3dcRscpEnabled: document.getElementById('storageE3dcRscpEnabled'),
    storageE3dcZeroMode: document.getElementById('storageE3dcZeroMode'),
    storageE3dcAllowGridCharge: document.getElementById('storageE3dcAllowGridCharge'),
    storageE3dcUsePowerLimits: document.getElementById('storageE3dcUsePowerLimits'),

    // Speicherfarm
    storageFarmMode: document.getElementById('storageFarmMode'),
    storageFarmAllowGridCharge: document.getElementById('storageFarmAllowGridCharge'),
    storageFarmSchedulerIntervalMs: document.getElementById('storageFarmSchedulerIntervalMs'),
    storageFarmSelfTargetGridImportW: document.getElementById('storageFarmSelfTargetGridImportW'),
    storageFarmSelfImportThresholdW: document.getElementById('storageFarmSelfImportThresholdW'),
    storageFarmStorages: document.getElementById('storageFarmStorages'),
    storageFarmAddStorage: document.getElementById('storageFarmAddStorage'),
    storageFarmGroupsCard: document.getElementById('storageFarmGroupsCard'),
    storageFarmGroups: document.getElementById('storageFarmGroups'),
    storageFarmAddGroup: document.getElementById('storageFarmAddGroup'),
    rawPatch: document.getElementById('rawPatch'),

    // MultiUse (Speicher SoC‑Zonen)
    muStorageEnabled: document.getElementById('muStorageEnabled'),
    muReserveEnabled: document.getElementById('muReserveEnabled'),
    muReserveMinSoc: document.getElementById('muReserveMinSoc'),
    muReserveTargetSoc: document.getElementById('muReserveTargetSoc'),
    muPeakEnabled: document.getElementById('muPeakEnabled'),
    muLskMinSoc: document.getElementById('muLskMinSoc'),
    muLskMaxSoc: document.getElementById('muLskMaxSoc'),
    muSelfEnabled: document.getElementById('muSelfEnabled'),
    muSelfMinSoc: document.getElementById('muSelfMinSoc'),
    muSelfMaxSoc: document.getElementById('muSelfMaxSoc'),
    muStorageSummary: document.getElementById('muStorageSummary'),

    // §14a
    para14aMode: document.getElementById('para14aMode'),
    para14aMinPerDeviceW: document.getElementById('para14aMinPerDeviceW'),
    para14aSignalMaxAgeSec: document.getElementById('para14aSignalMaxAgeSec'),
    para14aStalePolicy: document.getElementById('para14aStalePolicy'),
    para14aLegacyDirectWritesEnabled: document.getElementById('para14aLegacyDirectWritesEnabled'),
    para14aActiveId: document.getElementById('para14aActiveId'),
    para14aEmsSetpointWId: document.getElementById('para14aEmsSetpointWId'),
    para14aConsumers: document.getElementById('para14aConsumers'),
    addPara14aConsumer: document.getElementById('addPara14aConsumer'),

    // Peak-Shaving / Lastspitzenkappung
    psStrategyMode: document.getElementById('psStrategyMode'),
    psStandardMode: document.getElementById('psStandardMode'),
    psReserveW: document.getElementById('psReserveW'),
    psSafetyMarginW: document.getElementById('psSafetyMarginW'),
    psHysteresisW: document.getElementById('psHysteresisW'),
    psSmoothingSeconds: document.getElementById('psSmoothingSeconds'),
    psActivateDelaySeconds: document.getElementById('psActivateDelaySeconds'),
    psReleaseDelaySeconds: document.getElementById('psReleaseDelaySeconds'),
    psStaleTimeoutSec: document.getElementById('psStaleTimeoutSec'),
    psFastTripEnabled: document.getElementById('psFastTripEnabled'),
    psAtypicalVoltageLevel: document.getElementById('psAtypicalVoltageLevel'),
    psAtypicalThresholdPercent: document.getElementById('psAtypicalThresholdPercent'),
    psAtypicalApplyVoltageThreshold: document.getElementById('psAtypicalApplyVoltageThreshold'),
    psAtypicalPAbsRefW: document.getElementById('psAtypicalPAbsRefW'),
    psAtypicalMinShiftW: document.getElementById('psAtypicalMinShiftW'),
    psAtypicalTargetLimitW: document.getElementById('psAtypicalTargetLimitW'),
    psAtypicalSafetyMarginW: document.getElementById('psAtypicalSafetyMarginW'),
    psAtypicalIncludeWeekends: document.getElementById('psAtypicalIncludeWeekends'),
    psAtypicalExcludeChristmasNewYear: document.getElementById('psAtypicalExcludeChristmasNewYear'),
    psAtypicalHolidays: document.getElementById('psAtypicalHolidays'),
    psAtypicalBridgeDays: document.getElementById('psAtypicalBridgeDays'),
    psAtypicalCalendarExceptions: document.getElementById('psAtypicalCalendarExceptions'),
    psAtypicalWindows: document.getElementById('psAtypicalWindows'),
    psAtypicalAddWindow: document.getElementById('psAtypicalAddWindow'),
    psAtypicalGridOperator: document.getElementById('psAtypicalGridOperator'),
    psAtypicalYear: document.getElementById('psAtypicalYear'),
    psAtypicalSourceDocument: document.getElementById('psAtypicalSourceDocument'),
    psAtypicalSourcePublishedAt: document.getElementById('psAtypicalSourcePublishedAt'),
    psAtypicalSourceUrl: document.getElementById('psAtypicalSourceUrl'),
    psAtypicalSourceNote: document.getElementById('psAtypicalSourceNote'),
    psAtypicalReviewEnabled: document.getElementById('psAtypicalReviewEnabled'),
    psAtypicalReviewInfluxLogEnabled: document.getElementById('psAtypicalReviewInfluxLogEnabled'),
    psAtypicalReviewAuditIntervalMinutes: document.getElementById('psAtypicalReviewAuditIntervalMinutes'),
    psAtypicalReviewResetToken: document.getElementById('psAtypicalReviewResetToken'),
    psAtypicalReviewPAbsActualW: document.getElementById('psAtypicalReviewPAbsActualW'),
    psAtypicalReviewPHlzfMaxW: document.getElementById('psAtypicalReviewPHlzfMaxW'),
    psAtypicalReviewPowerPriceEurPerKwYear: document.getElementById('psAtypicalReviewPowerPriceEurPerKwYear'),
    psAtypicalReviewEnergyPriceEurPerKwh: document.getElementById('psAtypicalReviewEnergyPriceEurPerKwh'),
    psAtypicalReviewAnnualEnergyKwh: document.getElementById('psAtypicalReviewAnnualEnergyKwh'),
    psAtypicalReviewSavingsBagatelleEur: document.getElementById('psAtypicalReviewSavingsBagatelleEur'),
    psAtypicalReviewGeneralGridFeeEur: document.getElementById('psAtypicalReviewGeneralGridFeeEur'),
    psAtypicalReviewMaxReductionPercent: document.getElementById('psAtypicalReviewMaxReductionPercent'),
    psAtypicalReviewNote: document.getElementById('psAtypicalReviewNote'),
    psAtypicalReviewPreview: document.getElementById('psAtypicalReviewPreview'),
    psAtypicalReviewRefresh: document.getElementById('psAtypicalReviewRefresh'),
    psAtypicalReviewExportFrom: document.getElementById('psAtypicalReviewExportFrom'),
    psAtypicalReviewExportTo: document.getElementById('psAtypicalReviewExportTo'),
    psAtypicalReviewExportCsv: document.getElementById('psAtypicalReviewExportCsv'),
    psAtypicalReviewExportPdf: document.getElementById('psAtypicalReviewExportPdf'),
    psAtypicalReviewExportStatus: document.getElementById('psAtypicalReviewExportStatus'),

    // KI‑Energieberater / KI‑Optimierung
    aiAdvisorShowOnLive: document.getElementById('aiAdvisorShowOnLive'),
    aiAdvisorIntervalSec: document.getElementById('aiAdvisorIntervalSec'),
    aiAdvisorMaxSuggestions: document.getElementById('aiAdvisorMaxSuggestions'),
    aiAdvisorMinPriority: document.getElementById('aiAdvisorMinPriority'),
    aiAdvisorOptimizationMode: document.getElementById('aiAdvisorOptimizationMode'),
    aiAdvisorDailyPlanEnabled: document.getElementById('aiAdvisorDailyPlanEnabled'),
    aiAdvisorLearningEnabled: document.getElementById('aiAdvisorLearningEnabled'),
    aiAdvisorAnomalyDetectionEnabled: document.getElementById('aiAdvisorAnomalyDetectionEnabled'),
    aiAdvisorForecastQualityEnabled: document.getElementById('aiAdvisorForecastQualityEnabled'),
    aiAdvisorSeasonLogicEnabled: document.getElementById('aiAdvisorSeasonLogicEnabled'),
    aiAdvisorStaleTimeoutSec: document.getElementById('aiAdvisorStaleTimeoutSec'),
    aiAdvisorExportHighW: document.getElementById('aiAdvisorExportHighW'),
    aiAdvisorImportHighW: document.getElementById('aiAdvisorImportHighW'),
    aiAdvisorPeakNearLimitPct: document.getElementById('aiAdvisorPeakNearLimitPct'),
    aiAdvisorWeatherRainRiskPct: document.getElementById('aiAdvisorWeatherRainRiskPct'),
    aiAdvisorLowSocPct: document.getElementById('aiAdvisorLowSocPct'),
    aiAdvisorHighSocPct: document.getElementById('aiAdvisorHighSocPct'),
    aiAdvisorPvForecastHighW: document.getElementById('aiAdvisorPvForecastHighW'),
    aiAdvisorEvReadyBy: document.getElementById('aiAdvisorEvReadyBy'),
    aiAdvisorEvTargetSocPct: document.getElementById('aiAdvisorEvTargetSocPct'),
    aiAdvisorEvBatteryCapacityKwh: document.getElementById('aiAdvisorEvBatteryCapacityKwh'),
    aiAdvisorThermalReadyBy: document.getElementById('aiAdvisorThermalReadyBy'),
    aiAdvisorQuietHoursStart: document.getElementById('aiAdvisorQuietHoursStart'),
    aiAdvisorQuietHoursEnd: document.getElementById('aiAdvisorQuietHoursEnd'),
    aiAdvisorAnomalyHighLoadW: document.getElementById('aiAdvisorAnomalyHighLoadW'),
    aiAdvisorNightBaseLoadW: document.getElementById('aiAdvisorNightBaseLoadW'),
    aiAdvisorForecastQualityWarnPct: document.getElementById('aiAdvisorForecastQualityWarnPct'),
    aiAdvisorCo2LowGPerKwh: document.getElementById('aiAdvisorCo2LowGPerKwh'),
    aiAdvisorCo2HighGPerKwh: document.getElementById('aiAdvisorCo2HighGPerKwh'),
    aiAdvisorPriorityStorage: document.getElementById('aiAdvisorPriorityStorage'),
    aiAdvisorPriorityEvcs: document.getElementById('aiAdvisorPriorityEvcs'),
    aiAdvisorPriorityThermal: document.getElementById('aiAdvisorPriorityThermal'),
    aiAdvisorPriorityHeatingRod: document.getElementById('aiAdvisorPriorityHeatingRod'),
    aiAdvisorPriorityGeneric: document.getElementById('aiAdvisorPriorityGeneric'),
    aiAdvisorCatTariff: document.getElementById('aiAdvisorCatTariff'),
    aiAdvisorCatPv: document.getElementById('aiAdvisorCatPv'),
    aiAdvisorCatStorage: document.getElementById('aiAdvisorCatStorage'),
    aiAdvisorCatEvcs: document.getElementById('aiAdvisorCatEvcs'),
    aiAdvisorCatPeak: document.getElementById('aiAdvisorCatPeak'),
    aiAdvisorCatWeather: document.getElementById('aiAdvisorCatWeather'),
    aiAdvisorCatHeating: document.getElementById('aiAdvisorCatHeating'),
    aiAdvisorCatDailyPlan: document.getElementById('aiAdvisorCatDailyPlan'),
    aiAdvisorCatAnomaly: document.getElementById('aiAdvisorCatAnomaly'),
    aiAdvisorCatComfort: document.getElementById('aiAdvisorCatComfort'),
    aiAdvisorCatLearning: document.getElementById('aiAdvisorCatLearning'),
    aiAdvisorCatCo2: document.getElementById('aiAdvisorCatCo2'),
    aiAdvisorCatSystem: document.getElementById('aiAdvisorCatSystem'),

    // Tabs
    tabs: document.getElementById('nw-ems-tabs'),

    // EVCS / Stations
    evcsCount: document.getElementById('evcsCount'),
    evcsMaxPowerKw: document.getElementById('evcsMaxPowerKw'),
    evcsGlobalStorageAssistCustomerAllowed: document.getElementById('evcsGlobalStorageAssistCustomerAllowed'),
    cmGoalStrategy: document.getElementById('cmGoalStrategy'),
    evcsList: document.getElementById('evcsList'),
    stationGroups: document.getElementById('stationGroups'),
    addStationGroup: document.getElementById('addStationGroup'),
    ocppAutoDetect: document.getElementById('ocppAutoDetect'),
    ocppMapExisting: document.getElementById('ocppMapExisting'),

    // Status
    emsStatus: document.getElementById('emsStatus'),
    refreshNvpCoordinator: document.getElementById('refreshNvpCoordinator'),
    chargingDiag: document.getElementById('chargingDiag'),
    refreshChargingDiag: document.getElementById('refreshChargingDiag'),
    stationsDiag: document.getElementById('stationsDiag'),
    refreshStationsDiag: document.getElementById('refreshStationsDiag'),

    // Backup (Export/Import)
    backupExport: document.getElementById('nw-backup-export'),
    backupImport: document.getElementById('nw-backup-import'),
    backupRestore: document.getElementById('nw-backup-restore'),
    backupFile: document.getElementById('nw-backup-file'),
    backupInfo: document.getElementById('nw-backup-info'),
    backupStatus: document.getElementById('nw-backup-status'),

    // Budget/Gates (Charging)
    chargingBudget: document.getElementById('chargingBudget'),
    refreshChargingBudget: document.getElementById('refreshChargingBudget'),

    // TypeScript Shadow-Diagnose und kontrollierter Energiefluss-TS-Schaltmodus.
    // Wichtig: Die produktive Freigabe wird zusätzlich im Backend gegated. Das UI setzt nur Config.
    shadowDiagnostics: document.getElementById('shadowDiagnostics'),
    refreshShadowDiagnostics: document.getElementById('refreshShadowDiagnostics'),
    energyFlowTsMode: document.getElementById('energyFlowTsMode'),
    energyFlowTsProductionAllowed: document.getElementById('energyFlowTsProductionAllowed'),
    energyFlowTsWarmupTicks: document.getElementById('energyFlowTsWarmupTicks'),
    energyFlowTsAutoFallback: document.getElementById('energyFlowTsAutoFallback'),
    energyFlowTsRequireStablePlant: document.getElementById('energyFlowTsRequireStablePlant'),
    energyFlowTsPlantMinSamples: document.getElementById('energyFlowTsPlantMinSamples'),
    energyFlowTsPlantMinOk: document.getElementById('energyFlowTsPlantMinOk'),
    energyFlowTsModeStatus: document.getElementById('energyFlowTsModeStatus'),

    // Modal
    dpModal: document.getElementById('dpModal'),
    dpClose: document.getElementById('dpClose'),
    dpSearch: document.getElementById('dpSearch'),
    dpSearchBtn: document.getElementById('dpSearchBtn'),
    dpRootBtn: document.getElementById('dpRootBtn'),
    dpUpBtn: document.getElementById('dpUpBtn'),
    dpBreadcrumb: document.getElementById('dpBreadcrumb'),
    dpTree: document.getElementById('dpTree'),
    dpResults: document.getElementById('dpResults')
    ,
    // Thermal control
    thermalHoldMinutes: document.getElementById('thermalHoldMinutes'),
    thermalDevices: document.getElementById('thermalDevices'),
    heatingRodDevices: document.getElementById('heatingRodDevices'),
    bhkwDevices: document.getElementById('bhkwDevices'),
    generatorDevices: document.getElementById('generatorDevices'),

    // Threshold control
    thresholdRules: document.getElementById('thresholdRules'),
    thresholdAddRule: document.getElementById('thresholdAddRule'),
    thresholdResetRules: document.getElementById('thresholdResetRules'),

    // Relay control
    relayControls: document.getElementById('relayControls'),
    relayAdd: document.getElementById('relayAdd'),
    relayReset: document.getElementById('relayReset'),

    // Grid-Constraints / Netzlimits
    gridConstraintsMeter: document.getElementById('gridConstraintsMeter'),
    gridConstraintsImportLimits: document.getElementById('gridConstraintsImportLimits'),
    gridConstraintsRlm: document.getElementById('gridConstraintsRlm'),
    gridConstraintsZero: document.getElementById('gridConstraintsZero'),
    gridConstraintsEvu: document.getElementById('gridConstraintsEvu'),
    gridConstraintsPvCurtail: document.getElementById('gridConstraintsPvCurtail')
  };

  // Keep grid sign checkboxes in sync (Allgemein vs Energiefluss)
  if (els.gridInvertGrid && els.flowInvertGrid) {

    const syncGridInvert = (val) => {
      els.gridInvertGrid.checked = !!val;
      els.flowInvertGrid.checked = !!val;
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.gridInvertGrid. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.gridInvertGrid.addEventListener('change', () => syncGridInvert(els.gridInvertGrid.checked));
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.flowInvertGrid. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.flowInvertGrid.addEventListener('change', () => syncGridInvert(els.flowInvertGrid.checked));
  }

  // Phase 2: App-Center (install + enable per capability)
  // 0.8.37 App-Center-Schema: Diese Liste enthält nur Funktions-Apps.
  // Marktprofile/P1-Mapping liegen im Tab „Zuordnung“, Stationsseiten im Tab „Ladepunkte“.
  // Große Funktionsmodule wie Mesh/Microgrid dürfen im Apps-Reiter nur installiert/aktiviert
  // werden; ihre Detailkonfiguration liegt in einem eigenen Reiter, der erst nach Installation
  // eingeblendet wird. So bleibt die Startseite übersichtlich.
  const APP_CATALOG = [
    { id: 'charging', label: 'Lademanagement', desc: 'PV-Überschussladen, Budget-Verteilung, Ladepunkte/Ports (AC/DC) + Stationsgruppen', mandatory: false, hems: true },
    { id: 'peak', label: 'Peak-Shaving', desc: 'Lastspitzenkappung / Import-Limit / Atypische HLZF', mandatory: false, hems: false },
    { id: 'storage', label: 'Speicherregelung', desc: 'Eigenverbrauch / Speicher-Setpoints (herstellerunabhängig)', mandatory: false, hems: true },
    { id: 'storagefarm', label: 'Speicherfarm', desc: 'Speichersysteme als Pool/Gruppen: Home bis 2, Pro bis 10', mandatory: false, hems: true },
    { id: 'thermal', label: 'Wärmepumpe & Klima', desc: 'PV-Überschuss-Steuerung für Wärmepumpe/Klima (Setpoint, On/Off oder SG-Ready) inkl. Schnellsteuerung', mandatory: false, hems: true },
    { id: 'heatingrod', label: 'Heizstab', desc: 'Native 1..12 Stufen Heizstab-Regelung über Relais / KNX-Aktoren', mandatory: false, hems: true },
    { id: 'bhkw', label: 'BHKW', desc: 'BHKW-Steuerung (Start/Stop, SoC-geführt) mit Schnellsteuerung', mandatory: false, hems: false },
    { id: 'generator', label: 'Generator', desc: 'Generator-Steuerung (Notstrom/Netzparallelbetrieb, SoC-geführt) mit Schnellsteuerung', mandatory: false, hems: false },
    { id: 'threshold', label: 'Schwellwertsteuerung', desc: 'Regeln (Wenn X > Y dann Schalten/Setzen) – optional mit Endkunden-Anpassung', mandatory: false, hems: true },
    { id: 'relay', label: 'Relaissteuerung', desc: 'Manuelle Relais / generische Ausgänge (optional endkundentauglich)', mandatory: false, hems: true },
    { id: 'grid', label: 'Netzlimits', desc: 'Dauerhafter Netzanschlussschutz mit Import-Soft-/Hard-Limit; 0‑Einspeisung bleibt optional', mandatory: true, hems: true },
    { id: 'aiAdvisor', label: 'KI‑Energieberater', desc: 'Beratende KI‑Optimierung: PV, Wetter, Tarif, Speicher, Wallboxen und Lastspitzen als Vorschläge auf der LIVE‑Seite', mandatory: false, hems: true },
    { id: 'energyWallet', label: 'Energie-Wertkonto', desc: 'PV-Wert, Eigenverbrauchswert, Solar-Laden und Einspeisewert im Nutzerfrontend (Home + EOS)', mandatory: true, hems: true },
    { id: 'energyLedger', label: 'Energieherkunft & Ladebilanz', desc: 'Home/Pro: read-only 15-Minuten-Bilanz für Netz, PV, Speicherherkunft und Ladezähler; erzeugt prüfbare Journale, schreibt aber niemals auf Hardware', mandatory: false, hems: true },
    { id: 'meshMicrogrid', label: 'EOS Mesh/Microgrid', desc: 'Trafo-Master und bis zu 99 Haus-Slaves: gemeinsame NVP-Grenzen, schnelle Regelung, Betreiberübersicht und optionales Zählerarchiv', mandatory: false, hems: false },
    { id: 'netOperator', label: 'Netzbetreiber-Schnittstelle', desc: 'EOS: kanonische read-only Schnittstelle hinter einem zertifizierten EZA-/Parkregler; Herstellerregister werden ausschließlich im Treiberprofil gepflegt', mandatory: false, hems: false },
    { id: 'operatingStrategies', label: 'Betriebsstrategien', desc: 'EOS: modulare Ressourcen, MUSS-/SOLL-/KANN-Regeln, Nachtreserve und kontrollierte Live-Kopplung an bestehende Single-Writer-Regler', mandatory: false, hems: false },
    { id: 'tariff', label: 'Tarife', desc: 'Preis-Signal / Ladepark-Budget / Netzladung-Freigabe', mandatory: true, hems: true },
    { id: 'para14a', label: '§14a Steuerung', desc: 'Abregelung/Leistungsdeckel für steuerbare Verbraucher (falls genutzt)', mandatory: false, hems: true },
    { id: 'multiuse', label: 'MultiUse', desc: 'Speicher-Policy mit SoC-Zonen für Reserve, Lastspitzenkappung und Eigenverbrauch; Storage-Control bleibt einziger Batterieschreiber', mandatory: false, hems: false }
  ];


  const PS_VOLTAGE_THRESHOLDS = Object.freeze({
    HOS: 5,
    'HOS/HS': 10,
    HS: 10,
    'HS/MS': 20,
    MS: 20,
    'MS/NS': 30,
    NS: 30,
  });

  function _psVoltageKey(v) {
    const s = String(v || 'MS').trim().toUpperCase().replace(/Ö/g, 'O').replace(/Ü/g, 'U').replace(/Ä/g, 'A');
    if (s === 'HÖS' || s === 'HOS') return 'HOS';
    if (s === 'HÖS/HS' || s === 'HOS/HS' || s === 'HOES/HS') return 'HOS/HS';
    if (s === 'HS/MS') return 'HS/MS';
    if (s === 'MS/NS') return 'MS/NS';
    if (s === 'HS' || s === 'MS' || s === 'NS') return s;
    return 'MS';
  }

  function _psThresholdForVoltage(v) {
    const k = _psVoltageKey(v);
    return Object.prototype.hasOwnProperty.call(PS_VOLTAGE_THRESHOLDS, k) ? PS_VOLTAGE_THRESHOLDS[k] : 20;
  }

  function _psNumOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function _psParseNumberList(value, min, max) {
    const out = [];
    const seen = new Set();
    String(value || '')
      .split(/[\s,;]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .forEach((x) => {
        const n = Number(x);
        if (!Number.isFinite(n)) return;
        const i = Math.round(n);
        if (Number.isFinite(min) && i < min) return;
        if (Number.isFinite(max) && i > max) return;
        if (seen.has(i)) return;
        seen.add(i);
        out.push(i);
      });
    out.sort((a, b) => a - b);
    return out;
  }

  function _psFormatNumberList(arr) {
    return Array.isArray(arr) ? arr.map(v => String(v)).join(',') : '';
  }

  function _psNormalizeDateToken(token) {
    const s = String(token || '').trim();
    if (!s) return '';
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1].padStart(4, '0')}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    return s;
  }

  function _psParseDateList(value) {
    const out = [];
    const seen = new Set();
    String(value || '')
      .split(/[\n,;]+/)
      .map(_psNormalizeDateToken)
      .filter(Boolean)
      .forEach((x) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return;
        if (seen.has(x)) return;
        seen.add(x);
        out.push(x);
      });
    out.sort();
    return out;
  }

  function _psFormatDateList(arr) {
    return Array.isArray(arr) ? arr.map(v => String(v)).filter(Boolean).join('\n') : '';
  }

  function _psSetNumberInput(el, value) {
    if (!el) return;
    const n = Number(value);
    el.value = Number.isFinite(n) ? String(n) : '';
  }

  function _psSetTextInput(el, value) {
    if (!el) return;
    el.value = (value === null || value === undefined) ? '' : String(value);
  }

  function _psRound2(n) {
    const x = Number(n);
    return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0;
  }

  function _psBuildAtypicalReviewFromUi() {
    const voltageLevel = els.psAtypicalVoltageLevel ? els.psAtypicalVoltageLevel.value : 'MS';
    const thresholdInput = _psNumOrNull(els.psAtypicalThresholdPercent && els.psAtypicalThresholdPercent.value);
    const thresholdPercent = thresholdInput === null ? _psThresholdForVoltage(voltageLevel) : Math.min(100, Math.max(0, thresholdInput));
    const minShiftInput = _psNumOrNull(els.psAtypicalMinShiftW && els.psAtypicalMinShiftW.value);
    const minShiftW = minShiftInput === null ? 100000 : Math.max(0, minShiftInput);
    const pAbsActualW = _psNumOrNull(els.psAtypicalReviewPAbsActualW && els.psAtypicalReviewPAbsActualW.value);
    const pHlzfMaxW = _psNumOrNull(els.psAtypicalReviewPHlzfMaxW && els.psAtypicalReviewPHlzfMaxW.value);
    const powerPrice = _psNumOrNull(els.psAtypicalReviewPowerPriceEurPerKwYear && els.psAtypicalReviewPowerPriceEurPerKwYear.value);
    const bagatelleInput = _psNumOrNull(els.psAtypicalReviewSavingsBagatelleEur && els.psAtypicalReviewSavingsBagatelleEur.value);
    const bagatelleEur = bagatelleInput === null ? 500 : Math.max(0, bagatelleInput);
    const generalGridFee = _psNumOrNull(els.psAtypicalReviewGeneralGridFeeEur && els.psAtypicalReviewGeneralGridFeeEur.value);
    const maxReductionInput = _psNumOrNull(els.psAtypicalReviewMaxReductionPercent && els.psAtypicalReviewMaxReductionPercent.value);
    const maxReductionPercent = maxReductionInput === null ? 80 : Math.min(100, Math.max(0, maxReductionInput));

    const complete = (pAbsActualW !== null && pAbsActualW > 0 && pHlzfMaxW !== null && pHlzfMaxW >= 0);
    const deltaW = complete ? Math.max(0, pAbsActualW - pHlzfMaxW) : 0;
    const deltaPercent = complete ? (deltaW / pAbsActualW * 100) : 0;
    const thresholdOk = complete && deltaPercent + 1e-9 >= thresholdPercent;
    const minShiftOk = complete && deltaW + 1e-9 >= minShiftW;
    const grossSavingsEur = (complete && powerPrice !== null && powerPrice > 0) ? ((deltaW / 1000) * powerPrice) : null;
    const reductionCapEur = (grossSavingsEur !== null && generalGridFee !== null && generalGridFee > 0) ? (generalGridFee * maxReductionPercent / 100) : null;
    const savingsEur = grossSavingsEur === null ? null : (reductionCapEur === null ? grossSavingsEur : Math.min(grossSavingsEur, reductionCapEur));
    const savingsOk = savingsEur === null ? null : savingsEur + 1e-9 >= bagatelleEur;
    const technicalEligible = complete && thresholdOk && minShiftOk;
    const eligible = technicalEligible && savingsOk === true;

    return {
      complete,
      thresholdPercent,
      minShiftW,
      pAbsActualW: pAbsActualW === null ? 0 : pAbsActualW,
      pHlzfMaxW: pHlzfMaxW === null ? 0 : pHlzfMaxW,
      deltaW,
      deltaPercent,
      powerPriceEurPerKwYear: powerPrice === null ? 0 : powerPrice,
      generalGridFeeEur: generalGridFee === null ? 0 : generalGridFee,
      maxReductionPercent,
      bagatelleEur,
      grossSavingsEur,
      reductionCapEur,
      savingsEur,
      thresholdOk,
      minShiftOk,
      savingsOk,
      technicalEligible,
      eligible,
    };
  }

  function _psUpdateAtypicalReviewPreview() {
    if (!els.psAtypicalReviewPreview) return;
    const r = _psBuildAtypicalReviewFromUi();
    if (!r.complete) {
      els.psAtypicalReviewPreview.textContent = 'Noch keine vollständigen Nachkontrollwerte eingetragen. Benötigt werden P_abs_ist und P_HLZF_max aus Live-Messung oder Jahres-/RLM-Export.';
      return;
    }
    const parts = [
      `Verlagerung: ${Math.round(r.deltaW)} W / ${_psRound2(r.deltaPercent)} %`,
      `Schwelle: ${_psRound2(r.thresholdPercent)} % ${r.thresholdOk ? '✅' : '❌'}`,
      `Mindestverlagerung: ${Math.round(r.minShiftW)} W ${r.minShiftOk ? '✅' : '❌'}`,
    ];
    if (r.savingsEur === null) {
      parts.push('Ersparnis: noch nicht berechnet (Leistungspreis fehlt) ⚠️');
    } else {
      parts.push(`Ersparnis grob: ${_psRound2(r.savingsEur)} € ${r.savingsOk ? '✅' : '❌'} (Bagatelle ${_psRound2(r.bagatelleEur)} €)`);
    }
    const status = r.eligible ? 'Status: §19-Nachkontrolle erfüllt ✅'
      : (r.technicalEligible ? 'Status: technisch erfüllt, wirtschaftliche Prüfung noch offen/negativ ⚠️' : 'Status: Kriterien noch nicht erfüllt ❌');
    els.psAtypicalReviewPreview.textContent = `${parts.join(' · ')} · ${status}`;
  }

  function _psAtypicalReviewExportUrl(format) {
    const rawFmt = String(format || 'csv').trim().toLowerCase();
    const fmt = rawFmt === 'pdf' ? 'pdf' : (rawFmt === 'json' ? 'json' : 'csv');
    const params = new URLSearchParams();
    try {
      const year = _psNumOrNull(els.psAtypicalYear && els.psAtypicalYear.value);
      if (year !== null && year > 0) params.set('year', String(Math.round(year)));
      const from = String((els.psAtypicalReviewExportFrom && els.psAtypicalReviewExportFrom.value) || '').trim();
      const to = String((els.psAtypicalReviewExportTo && els.psAtypicalReviewExportTo.value) || '').trim();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const reset = String((els.psAtypicalReviewResetToken && els.psAtypicalReviewResetToken.value) || '').trim();
      if (reset) params.set('reset', reset);
    } catch (_e) {}
    const qs = params.toString();
    const base = fmt === 'json' ? '/api/peakshaving/atypical/review' : `/api/peakshaving/atypical/review.${fmt}`;
    return `${base}${qs ? `?${qs}` : ''}`;
  }

  function _psAtypicalReviewDefaultStatus() {
    return 'Nachweis-Historie wird automatisch in Influx über historie.peakShaving.atypical.* und gedrosselte Audit-Samples unter peakShaving.atypical.audit.* mitgeführt. CSV/PDF exportieren die aktuelle Prüfung plus die Influx-Zeitreihe.';
  }

  function _psOpenAtypicalReviewExport(format) {
    try {
      if (els.psAtypicalReviewExportStatus) {
        els.psAtypicalReviewExportStatus.textContent = `Nachweis-${String(format || '').toUpperCase()} wird erzeugt …`;
      }
      const url = _psAtypicalReviewExportUrl(format);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => {
        if (els.psAtypicalReviewExportStatus) els.psAtypicalReviewExportStatus.textContent = _psAtypicalReviewDefaultStatus();
      }, 2500);
    } catch (e) {
      if (els.psAtypicalReviewExportStatus) els.psAtypicalReviewExportStatus.textContent = 'Export konnte nicht gestartet werden: ' + (e && e.message ? e.message : e);
    }
  }

  async function _psRefreshAtypicalReviewExportStatus() {
    if (!els.psAtypicalReviewExportStatus) return;
    try {
      els.psAtypicalReviewExportStatus.textContent = 'Nachweis wird aus Runtime/Influx gelesen …';
      const params = new URLSearchParams();
      const year = _psNumOrNull(els.psAtypicalYear && els.psAtypicalYear.value);
      if (year !== null && year > 0) params.set('year', String(Math.round(year)));
      const from = String((els.psAtypicalReviewExportFrom && els.psAtypicalReviewExportFrom.value) || '').trim();
      const to = String((els.psAtypicalReviewExportTo && els.psAtypicalReviewExportTo.value) || '').trim();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const url = '/api/peakshaving/atypical/review' + (params.toString() ? `?${params.toString()}` : '');
      const data = await fetchJson(url, { method: 'GET' });
      const meta = data && data.meta ? data.meta : {};
      const sum = data && data.summary ? data.summary : {};
      const rows = Number(meta.rows || (Array.isArray(data && data.rows) ? data.rows.length : 0) || 0);
      const pAbs = Number(sum.pAbsMaxW || sum.pAbsEvalW || 0);
      const pHlzf = Number(sum.pHlzfMaxW || sum.pHlzfEvalW || 0);
      const deltaPct = Number(sum.deltaPercent || 0);
      const ok = !!sum.eligible;
      const hist = meta.historyInstance ? `Influx: ${meta.historyInstance}` : 'Influx: nicht erkannt';
      els.psAtypicalReviewExportStatus.textContent = `${hist} · Samples: ${rows} · P_abs ${Math.round(pAbs)} W · P_HLZF ${Math.round(pHlzf)} W · Δ ${Math.round(deltaPct * 100) / 100} % · ${ok ? '§19 erfüllt ✅' : '§19 offen/nicht erfüllt ⚠️'}`;
    } catch (e) {
      els.psAtypicalReviewExportStatus.textContent = 'Nachweis konnte nicht gelesen werden: ' + (e && e.message ? e.message : e);
    }
  }

  function _psSetSelect(el, value, fallback) {
    if (!el) return;
    const v = String(value || fallback || '').trim();
    const options = Array.from(el.options || []).map(o => o.value);
    el.value = options.includes(v) ? v : (fallback || (options[0] || ''));
  }

  // Energiefluss-Monitor: Basis-Datapoints (VIS & Algorithmen)
  const FLOW_BASE_DP_FIELDS = [
    { key: 'gridBuyPower', label: 'Netz Bezug (W/kW)', placeholder: '… (Import)', required: true, requiredGroup: 'gridPairOrSigned', power: true,
      hint: 'Pflicht: Import-Leistung am Netzverknüpfungspunkt (NVP). Alternativ unten den Fallback „Netz Leistung (Vorzeichen)“ nutzen.' },
    { key: 'gridSellPower', label: 'Netz Einspeisung (W/kW)', placeholder: '… (Export)', required: true, requiredGroup: 'gridPairOrSigned', power: true,
      hint: 'Pflicht: Export-Leistung am Netzverknüpfungspunkt (NVP). Alternativ unten den Fallback „Netz Leistung (Vorzeichen)“ nutzen.' },
    { key: 'gridPointPower', label: 'Netz Leistung (W/kW) (Fallback, Vorzeichen)', placeholder: 'optional – Signed (+Bezug/-Einspeisung)', power: true,
      hint: 'Fallback: Einen einzelnen NVP-Datenpunkt mit + Bezug / - Einspeisung verwenden, wenn kein separater Import-/Export-Datenpunkt vorhanden ist.' },

    // PV: Optional – wenn leer wird automatisch summiert (Devices + optional DC-PV aus Speicherfarm)
    { key: 'pvPower', label: 'PV Leistung (W/kW)', placeholder: 'leer lassen für Auto‑Summe', auto: true, power: true,
      hintAuto: 'Auto: PV‑Summe aus allen PV‑Wechselrichtern (nexowatt-devices) + DC‑PV aus Speicherfarm (wenn aktiv). Zusätzliche Erzeuger separat im Tab „Erzeuger“.',
      hintOverride: 'Override aktiv: PV wird aus diesem Datenpunkt genommen (Auto‑Summe inkl. DC‑PV wird deaktiviert).' },

    // Gebäude: Optional – wenn leer wird Verbrauch bilanziert (PV + Netz + Batterie + Erzeuger)
    { key: 'consumptionTotal', label: 'Verbrauch Gesamt (W/kW)', placeholder: 'leer lassen für Auto‑Bilanz', auto: true, power: true,
      hintAuto: 'Auto: Gebäudeverbrauch wird bilanziert (PV + Netz + Batterie + Erzeuger‑Slots).',
      hintOverride: 'Override aktiv: Gebäudeverbrauch wird direkt aus diesem Datenpunkt verwendet (Bilanz deaktiviert).' },

    // EV: Optional – wenn leer wird EVCS‑Summe genutzt (wenn EVCS aktiv)
    { key: 'consumptionEvcs', label: 'E‑Mobilität (W/kW) (optional)', placeholder: 'optional – leer = EVCS‑Summe', auto: true, power: true,
      hintAuto: 'Auto: E‑Mobilität wird aus EVCS‑Summenleistung genutzt (wenn EVCS aktiv).',
      hintOverride: 'Override aktiv: EV‑Leistung wird aus diesem Datenpunkt genutzt.' },

    // Batterie: Optional – wenn leer werden Werte aus Speicher/Speicherfarm genutzt
    { key: 'storageChargePower', label: 'Batterie Laden (W/kW)', placeholder: 'optional – leer = Auto', auto: true, power: true,
      hintAuto: 'Auto: Ladeleistung kommt aus Speicher / Speicherfarm. Override optional.',
      hintOverride: 'Override aktiv: Ladeleistung wird aus diesem Datenpunkt genutzt.' },
    { key: 'storageDischargePower', label: 'Batterie Entladen (W/kW)', placeholder: 'optional – leer = Auto', auto: true, power: true,
      hintAuto: 'Auto: Entladeleistung kommt aus Speicher / Speicherfarm. Override optional.',
      hintOverride: 'Override aktiv: Entladeleistung wird aus diesem Datenpunkt genutzt.' },

    // Fallback, falls ein System nur einen Signed‑Leistungs‑DP liefert
    { key: 'batteryPower', label: 'Batterie Leistung (W/kW) (Fallback, Vorzeichen)', placeholder: 'optional – Signed (-Laden/+Entladen)', power: true,
      hint: 'Optional: Nur verwenden, wenn kein Laden/Entladen getrennt verfügbar ist (Signed: - Laden / + Entladen).' },

    { key: 'storageSoc', label: 'Speicher SoC (%)', placeholder: 'leer lassen für Auto', auto: true,
      hintAuto: 'Auto: SoC kommt aus Speicher / Speicherfarm (Median/Ø). Override möglich.',
      hintOverride: 'Override aktiv: SoC wird aus diesem Datenpunkt genutzt.' }
  ];

  // Energiefluss‑Monitor: optionale Verbraucher/Erzeuger
  // - erscheinen in der VIS nur, wenn ein Datenpunkt gesetzt ist
  // - pro Slot kann ein Name vergeben werden
  // Wunsch: Verbraucher max. 10, Erzeuger max. 5
  const FLOW_CONSUMER_SLOT_COUNT = 10;
  const FLOW_PRODUCER_SLOT_COUNT = 5;

  // Icon-Auswahl für optionale Verbraucher/Erzeuger (Emoji – leichtgewichtig, schnell erweiterbar)
  // Speichert den Icon-String direkt in der Config.
    const FLOW_ICON_CHOICES = [
    // Der Default ist bewusst als „Icon…“ betitelt, damit klar ist, dass dies ein Icon‑Selector ist.
    { value:'', label:'Icon… (Auto)' },
    { value:'🔌', label:'Steckdose' },
    { value:'⚙️', label:'Motor' },
    { value:'🏭', label:'Industrie' },
    { value:'🖥️', label:'Server/IT' },
    { value:'🧰', label:'Werkstatt' },
    { value:'🔧', label:'Service' },
    { value:'🏗️', label:'Baustelle' },
    { value:'🌡️', label:'Temperatur' },
    { value:'♨️', label:'Wärme' },
    { value:'🔥', label:'Heizung' },
    { value:'💨', label:'Klima/Ventilation' },
    { value:'💧', label:'Pumpe/Wasser' },
    { value:'🧊', label:'Kälte' },
    { value:'💡', label:'Licht' },
    { value:'🧺', label:'Waschen' },
    { value:'🍳', label:'Küche' },
    { value:'🧯', label:'Sicherheit' },
    { value:'🔋', label:'Speicher' },
    { value:'🪫', label:'Batterie leer' },
    { value:'🚗', label:'Auto' },
    { value:'🚚', label:'LKW/Depot' },
    { value:'🚜', label:'Land/Traktor' },
    { value:'⚡', label:'Elektrisch' },
    { value:'☀️', label:'PV' },
    { value:'🌬️', label:'Wind' },
    { value:'🌀', label:'Inverter' },
    { value:'🏢', label:'Gebäude' },
    { value:'🏠', label:'Haus' },
  ];

  const TARIFF_DP_FIELDS = [
    { key: 'priceCurrent', label: 'Tarif Preis aktuell (€/kWh)', placeholder: 'Provider-State (optional)' },
    { key: 'priceAverage', label: 'Tarif Preis Durchschnitt (€/kWh)', placeholder: 'Provider-State (optional)' },
    { key: 'priceTodayJson', label: 'Stundenpreise heute (JSON)', placeholder: 'Provider-State (optional)' },
    { key: 'priceTomorrowJson', label: 'Stundenpreise morgen (JSON)', placeholder: 'Provider-State (optional)' }
  ];
  const PV_FORECAST_DP_FIELDS = [
    { key: 'pvForecastTodayJson', label: 'PV-Prognose heute (JSON)', placeholder: 'Forecast-Provider-State (optional)' },
    { key: 'pvForecastTomorrowJson', label: 'PV-Prognose morgen (JSON)', placeholder: 'Forecast-Provider-State (optional)' }
  ];

  // ------------------------------
  // Direkte dynamische Tarifprovider
  // ------------------------------
  let tariffProviderRegistryCache = null;
  const _tpEl = (id) => document.getElementById(id);
  const _tpStr = (id, fallback = '') => {
    const el = _tpEl(id);
    return el ? String(el.value || '').trim() : fallback;
  };
  const _tpBool = (id, fallback = false) => {
    const el = _tpEl(id);
    return el ? !!el.checked : fallback;
  };
  const _tpNum = (id, fallback = 0) => {
    const n = Number(_tpStr(id, ''));
    return Number.isFinite(n) ? n : fallback;
  };
  const _tpSet = (id, value) => {
    const el = _tpEl(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = (value === null || value === undefined) ? '' : String(value);
  };
  function _setTariffProviderStatus(text, kind = '') {
    const el = _tpEl('tariffProviderStatus');
    if (!el) return;
    el.textContent = String(text || '');
    el.style.color = kind === 'error' ? '#ff7a7a' : (kind === 'ok' ? '#69f0ae' : '');
  }
  async function loadTariffProviderRegistry(force = false) {
    if (tariffProviderRegistryCache && !force) return tariffProviderRegistryCache;
    const data = await fetchJson('/api/installer/tariff-provider/providers?t=' + Date.now(), { cache: 'no-store' });
    tariffProviderRegistryCache = data;
    return data;
  }
  function _tariffProviderInternalDpIds() {
    return tariffProviderRegistryCache && tariffProviderRegistryCache.internalDatapoints
      ? tariffProviderRegistryCache.internalDatapoints
      : null;
  }
  function _coupleTariffProviderDatapointsSync() {
    const ids = _tariffProviderInternalDpIds();
    if (!ids) return false;
    currentConfig = currentConfig && typeof currentConfig === 'object' ? currentConfig : {};
    currentConfig.datapoints = currentConfig.datapoints && typeof currentConfig.datapoints === 'object' ? currentConfig.datapoints : {};
    let changed = false;
    for (const key of ['priceCurrent','priceAverage','priceTodayJson','priceTomorrowJson']) {
      const val = String(ids[key] || '').trim();
      if (!val) continue;
      if (String(currentConfig.datapoints[key] || '').trim() !== val) {
        currentConfig.datapoints[key] = val;
        changed = true;
      }
      const input = document.getElementById('tar_' + key);
      if (input && input.value !== val) input.value = val;
    }
    return changed;
  }
  async function coupleTariffProviderDatapoints(showStatus = true) {
    try {
      await loadTariffProviderRegistry();
      const changed = _coupleTariffProviderDatapointsSync();
      if (showStatus) _setTariffProviderStatus(changed ? 'Interne Preis-DPs gekoppelt. Bitte speichern.' : 'Interne Preis-DPs sind bereits gekoppelt.', 'ok');
      return changed;
    } catch (e) {
      if (showStatus) _setTariffProviderStatus('DP-Kopplung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
      return false;
    }
  }
  function collectTariffProviderConfig() {
    const existing = currentConfig && currentConfig.tariffProvider && typeof currentConfig.tariffProvider === 'object' ? currentConfig.tariffProvider : {};
    const country = _tpStr('tariffProviderCountry', String(existing.country || 'DE')).toUpperCase() === 'NL' ? 'NL' : 'DE';
    return {
      ...existing,
      enabled: _tpStr('tariffProviderEnabled', existing.enabled ? 'true' : 'false') === 'true',
      providerId: _tpStr('tariffProviderId', existing.providerId || 'manual-dp'),
      sourceId: _tpStr('tariffProviderSourceId', existing.sourceId || 'entsoe'),
      providerProfileId: _tpStr('tariffProviderProfileId', existing.providerProfileId || 'local-provider'),
      activateTariffLogic: _tpBool('tariffProviderActivateLogic', true),
      automaticMode: _tpBool('tariffProviderAutomaticMode', true),
      autoCoupleDatapoints: _tpBool('tariffProviderAutoCouple', true),
      country,
      timeZone: _tpStr('tariffProviderTimeZone', country === 'NL' ? 'Europe/Amsterdam' : 'Europe/Berlin'),
      resolutionMinutes: [15,30,60].includes(_tpNum('tariffProviderResolution', 15)) ? _tpNum('tariffProviderResolution', 15) : 15,
      refreshMinutes: Math.max(5, Math.min(360, Math.round(_tpNum('tariffProviderRefresh', 15)))),
      priceComponent: _tpStr('tariffProviderPriceComponent', 'total'),
      homeId: _tpStr('tariffProviderHomeId', ''),
      postalCode: _tpStr('tariffProviderPostalCode', ''),
      tokenUrl: _tpStr('tariffProviderTokenUrl', ''),
      pricesUrl: _tpStr('tariffProviderPricesUrl', ''),
      credentials: {
        ...(existing.credentials && typeof existing.credentials === 'object' ? existing.credentials : {}),
        accessToken: _tpStr('tariffProviderAccessToken', ''),
        securityToken: _tpStr('tariffProviderSecurityToken', ''),
        clientId: _tpStr('tariffProviderClientId', ''),
        clientSecret: _tpStr('tariffProviderClientSecret', ''),
        tokenUrl: _tpStr('tariffProviderTokenUrl', ''),
        bearerToken: _tpStr('tariffProviderBearerToken', ''),
        apiKey: _tpStr('tariffProviderApiKey', ''),
        username: _tpStr('tariffProviderUsername', ''),
        password: _tpStr('tariffProviderPassword', ''),
      },
      formula: {
        marketMultiplier: _tpNum('tariffProviderMarketMultiplier', 1),
        supplierMarkupEurPerKwh: _tpNum('tariffProviderSupplierMarkup', 0),
        gridVariableEurPerKwh: _tpNum('tariffProviderGridVariable', 0),
        taxEurPerKwh: _tpNum('tariffProviderTax', 0),
        otherVariableEurPerKwh: _tpNum('tariffProviderOtherVariable', 0),
        vatPct: _tpNum('tariffProviderVatPct', 0),
        priceIncludesVat: _tpStr('tariffProviderId', '') === 'tibber' || _tpStr('tariffProviderId', '') === 'energyzero',
      },
      feedInEurPerKwh: _tpNum('tariffProviderFeedIn', 0),
      customRest: {
        ...(existing.customRest && typeof existing.customRest === 'object' ? existing.customRest : {}),
        url: _tpStr('tariffProviderRestUrl', ''),
        method: _tpStr('tariffProviderRestMethod', 'GET'),
        authMode: _tpStr('tariffProviderRestAuthMode', 'none'),
        apiKeyHeader: _tpStr('tariffProviderApiKeyHeader', 'x-api-key'),
        arrayPath: _tpStr('tariffProviderArrayPath', ''),
        startPath: _tpStr('tariffProviderStartPath', 'startsAt'),
        endPath: _tpStr('tariffProviderEndPath', 'endsAt'),
        pricePath: _tpStr('tariffProviderPricePath', 'total'),
        unit: _tpStr('tariffProviderUnit', 'EUR/kWh'),
        headersJson: _tpStr('tariffProviderHeadersJson', ''),
      },
    };
  }
  function applyTariffProviderUI(config) {
    const cfg = config && typeof config === 'object' ? config : {};
    const credentials = cfg.credentials && typeof cfg.credentials === 'object' ? cfg.credentials : {};
    const formula = cfg.formula && typeof cfg.formula === 'object' ? cfg.formula : {};
    const custom = cfg.customRest && typeof cfg.customRest === 'object' ? cfg.customRest : {};
    _tpSet('tariffProviderEnabled', cfg.enabled ? 'true' : 'false');
    _tpSet('tariffProviderId', cfg.providerId || 'manual-dp');
    _tpSet('tariffProviderSourceId', cfg.sourceId || (String(cfg.country || '').toUpperCase() === 'NL' ? 'energyzero' : 'entsoe'));
    _tpSet('tariffProviderProfileId', cfg.providerProfileId || 'local-provider');
    _tpSet('tariffProviderActivateLogic', cfg.activateTariffLogic !== false);
    _tpSet('tariffProviderAutomaticMode', cfg.automaticMode !== false);
    _tpSet('tariffProviderAutoCouple', cfg.autoCoupleDatapoints !== false);
    _tpSet('tariffProviderCountry', String(cfg.country || 'DE').toUpperCase() === 'NL' ? 'NL' : 'DE');
    _tpSet('tariffProviderTimeZone', cfg.timeZone || (String(cfg.country || '').toUpperCase() === 'NL' ? 'Europe/Amsterdam' : 'Europe/Berlin'));
    _tpSet('tariffProviderResolution', cfg.resolutionMinutes || 15);
    _tpSet('tariffProviderRefresh', cfg.refreshMinutes || 15);
    _tpSet('tariffProviderPriceComponent', cfg.priceComponent || 'total');
    _tpSet('tariffProviderAccessToken', credentials.accessToken || '');
    _tpSet('tariffProviderSecurityToken', credentials.securityToken || '');
    _tpSet('tariffProviderHomeId', cfg.homeId || '');
    _tpSet('tariffProviderClientId', credentials.clientId || '');
    _tpSet('tariffProviderClientSecret', credentials.clientSecret || '');
    _tpSet('tariffProviderTokenUrl', credentials.tokenUrl || cfg.tokenUrl || '');
    _tpSet('tariffProviderPricesUrl', cfg.pricesUrl || '');
    _tpSet('tariffProviderPostalCode', cfg.postalCode || '');
    _tpSet('tariffProviderMarketMultiplier', formula.marketMultiplier ?? 1);
    _tpSet('tariffProviderSupplierMarkup', formula.supplierMarkupEurPerKwh ?? 0);
    _tpSet('tariffProviderGridVariable', formula.gridVariableEurPerKwh ?? 0);
    _tpSet('tariffProviderTax', formula.taxEurPerKwh ?? 0);
    _tpSet('tariffProviderOtherVariable', formula.otherVariableEurPerKwh ?? 0);
    _tpSet('tariffProviderVatPct', formula.vatPct ?? 0);
    _tpSet('tariffProviderFeedIn', cfg.feedInEurPerKwh ?? 0);
    _tpSet('tariffProviderRestUrl', custom.url || '');
    _tpSet('tariffProviderRestMethod', custom.method || 'GET');
    _tpSet('tariffProviderRestAuthMode', custom.authMode || 'none');
    _tpSet('tariffProviderBearerToken', credentials.bearerToken || '');
    _tpSet('tariffProviderApiKey', credentials.apiKey || '');
    _tpSet('tariffProviderApiKeyHeader', custom.apiKeyHeader || 'x-api-key');
    _tpSet('tariffProviderUsername', credentials.username || '');
    _tpSet('tariffProviderPassword', credentials.password || '');
    _tpSet('tariffProviderArrayPath', custom.arrayPath || '');
    _tpSet('tariffProviderStartPath', custom.startPath || 'startsAt');
    _tpSet('tariffProviderEndPath', custom.endPath || 'endsAt');
    _tpSet('tariffProviderPricePath', custom.pricePath || 'total');
    _tpSet('tariffProviderUnit', custom.unit || 'EUR/kWh');
    _tpSet('tariffProviderHeadersJson', custom.headersJson || '');
    loadTariffProviderRegistry().then(() => {
      if (cfg.enabled && cfg.providerId !== 'manual-dp' && cfg.autoCoupleDatapoints !== false) _coupleTariffProviderDatapointsSync();
    }).catch(() => {});
  }
  async function testTariffProviderConnection() {
    try {
      _setTariffProviderStatus('Verbindung wird geprüft…');
      const cfg = collectTariffProviderConfig();
      const data = await fetchJson('/api/installer/tariff-provider/test', { method: 'POST', body: JSON.stringify({ config: cfg }) });
      const current = Number.isFinite(Number(data.currentPriceEurPerKwh)) ? ` · aktuell ${Number(data.currentPriceEurPerKwh).toFixed(4)} €/kWh` : '';
      _setTariffProviderStatus(`OK · ${data.intervalCount || 0} Intervalle · heute ${data.todayCount || 0} · morgen ${data.tomorrowCount || 0}${current}`, 'ok');
      if (cfg.enabled && cfg.providerId !== 'manual-dp' && cfg.autoCoupleDatapoints) await coupleTariffProviderDatapoints(false);
    } catch (e) {
      _setTariffProviderStatus('Fehler: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  // Live / Kennzahlen (für die unteren Kacheln in der VIS)
  // Hinweis: Wenn diese DPs leer bleiben, kann der Adapter (falls History/Influx verfügbar) kWh-Werte automatisch aus Leistung integrieren.
  const LIVE_DP_FIELDS = [
    { key: 'productionEnergyKwh', label: 'PV Energie gesamt (kWh)', placeholder: 'kWh Counter (optional)' },
    { key: 'consumptionEnergyKwh', label: 'Verbrauch Energie gesamt (kWh)', placeholder: 'kWh Counter (optional)' },
    { key: 'gridEnergyKwh', label: 'Netz Energie gesamt (kWh)', placeholder: 'kWh Counter (optional)' },
    { key: 'evcsLastChargeKwh', label: 'EVCS letzte Ladung (kWh)', placeholder: 'optional (sonst Historie)' },
    { key: 'co2Savings', label: 'CO₂ Ersparnis (t/kg) (optional)', placeholder: 'optional' },
    { key: 'evcsStatus', label: 'Ladestation Status (optional)', placeholder: 'z.B. Available/Charging' },
    { key: 'gridFrequency', label: 'Netzfrequenz (Hz) (optional)', placeholder: 'optional' },
    { key: 'gridVoltage', label: 'Netzspannung (V) (optional)', placeholder: 'optional' }
  ];

  // Wetter (optional)
  // Plug&Play: Standardmäßig befüllt der nexowatt-ui Adapter die Wetter-States selbst (Open-Meteo,
  // basierend auf system.config.latitude/longitude). Kein zusätzlicher Wetter-Adapter erforderlich.
  // Optional: Mapping hier überschreibt die integrierten Werte (z.B. eigener Wetterdienst).
  // Mindestanforderung fuer sinnvolle Anzeige: Temperatur ODER Wettertext/Wettercode.
  const WEATHER_DP_FIELDS = [
    { key: 'weatherTempC', label: 'Temperatur (°C)', placeholder: 'z.B. weather.0.current.temperature (optional)' },
    { key: 'weatherText', label: 'Wettertext (optional)', placeholder: 'z.B. "stark bewölkt" / "cloudy"' },
    { key: 'weatherCode', label: 'Wetter-Code (optional)', placeholder: 'z.B. WMO/Open-Meteo Code' },
    { key: 'weatherWindKmh', label: 'Wind (km/h) (optional)', placeholder: 'optional' },
    { key: 'weatherCloudPct', label: 'Wolken (%) (optional)', placeholder: 'optional' },
    { key: 'weatherLocation', label: 'Ort/Standort (optional)', placeholder: 'z.B. Bocholt / Anlage 1' }
  ];

  const STORAGE_DP_FIELDS = [
    { key: 'socObjectId', label: 'SoC (%)', requiredModes: ['targetPower','limits','enableFlags'] },
    { key: 'batteryPowerObjectId', label: 'Ist-Leistung (W) (optional)', requiredModes: [] },
    { key: 'dcPvPowerObjectId', label: 'DC-/Hybrid-PV Erzeugung (W)', requiredModes: [], showForCoupling: ['dc'], hint: 'Nur bei DC-/Hybrid-Speichern: Erzeugungsleistung des Hybrid-/PV-Wechselrichters. Dieser Wert ist eine Messung, kein Batterie-Sollwert, und hilft bei Forecast-/0-Einspeise-/FENECON-Erkennung.' },
    { key: 'feneconGridSetpointObjectId', label: 'FENECON FEMS-NVP-Ziel (W) (optional)', requiredModes: ['targetPower'], showForVendor: ['fenecon-openems'], hint: 'Darf leer bleiben. Nur erforderlich, wenn ausdrücklich „FEMS-NVP-Ziel dauerhaft schreiben“ gewählt wird und ein echter beschreibbarer ctrlBalancing0/SetGridActivePower-DP vorhanden ist. Ohne diesen DP nutzt Automatisch den direkten ESS-Sollwert SetActivePowerEquals/706. Messwerte wie aliases.r.gridPower und aliases.ctrl.powerSetpointW gehören nicht in dieses Feld.' },
    { key: 'feneconEssActualPowerObjectId', label: 'FENECON ESS-Aktor-Istleistung (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Für Hybridregelung empfohlen: ess0/ActivePower (typisch Register 604). Dieser Wert dient dem Regelkreis; die allgemeine Ist-Leistung kann separat für Anzeige/History genutzt werden.' },
    { key: 'feneconNvpPowerObjectId', label: 'FENECON NVP-Istleistung (W) – RC42 Shadow', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Optionaler read-only Vergleichswert vom FENECON-Gateway, bevorzugt aliases.r.nvpPower; Fallback aliases.r.gridPower / aliases.r.napPower. Wird ausschließlich für die neue NVP-Shadowdiagnose verwendet und niemals als Sollwert, Writer oder Ersatz für die zentrale Safety-NVP-Messung.' },
    { key: 'feneconConsumptionTotalObjectId', label: 'FENECON Gesamtverbrauch (W) – RC42 Shadow', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Optionaler direkter Gesamt-/Hausverbrauch, bevorzugt aliases.r.consumptionTotal; Fallback aliases.r.loadTotal / aliases.r.consumptionPower / aliases.r.loadPower. Nur Bilanz-Plausibilisierung im read-only Shadowmodus; beeinflusst keine Regelung.' },
    { key: 'feneconMinPowerObjectId', label: 'FENECON momentane Mindestleistung (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Optional: momentane Untergrenze des ESS-Sollwerts (typisch 702).' },
    { key: 'feneconMaxPowerObjectId', label: 'FENECON momentane Maximalleistung (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Optional: momentane Obergrenze des ESS-Sollwerts (typisch 704).' },
    { key: 'feneconActualSetpointObjectId', label: 'FENECON Vorgabe-Readback (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Optionales Readback der tatsächlich aktiven externen Vorgabe.' },
    { key: 'feneconPvDcObjectId', label: 'FENECON interne DC-PV (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Interne DC-PV des Hybridwechselrichters (typisch ProductionDcActualPower / 339). Nur Anzeige, Bilanzierung und Plausibilisierung; kein zusätzlicher Feed-forward im nativen FEMS-Regler.' },
    { key: 'feneconPvAcObjectId', label: 'FENECON externe AC-PV (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Externe AC-PV-Erzeugung (typisch ProductionAcActivePower / 331).' },
    { key: 'feneconPvTotalObjectId', label: 'FENECON gesamte PV-Erzeugung (W)', requiredModes: [], showForVendor: ['fenecon-openems'], hint: 'Gesamte Produktion (typisch ProductionActivePower / 327). Nicht zusätzlich zu Einzelquellen doppelt zählen.' },
    { key: 'targetPowerObjectId', label: 'Sollleistung signed (W)', requiredModes: ['targetPower'], hint: 'Allgemeiner bidirektionaler Sollwert. NexoWatt-Konvention: +W = Entladen, -W = Laden. Wird genutzt, wenn keine getrennten Ziel-DPs gesetzt sind oder als Fallback fuer eine fehlende Split-Richtung.' },
    { key: 'targetChargePowerObjectId', label: 'Sollwert Laden (W) getrennt', requiredModes: ['targetPower'], hint: 'Optional: positiver Lade-Sollwert. Kann zusammen mit Entladen oder einzeln gemappt werden; bei Split wird die Gegenrichtung auf 0 gesetzt.' },
    { key: 'targetDischargePowerObjectId', label: 'Sollwert Entladen (W) getrennt', requiredModes: ['targetPower'], hint: 'Optional: positiver Entlade-Sollwert. Kann zusammen mit Laden oder einzeln gemappt werden; bei Split wird die Gegenrichtung auf 0 gesetzt.' },
    { key: 'runObjectId', label: 'Run / externe Speicherregelung (bool)', requiredModes: ['targetPower'], hint: 'Optional: wird auf true gesetzt, wenn NexoWatt einen Lade-/Entlade-Sollwert vorgibt, und auf false bei 0 W. Hilfreich für externe Speicher-Controller oder Alias-Bridge-Datenpunkte.' },
    { key: 'maxChargeObjectId', label: 'Max Ladeleistung (W)', requiredModes: ['limits'] },
    { key: 'maxDischargeObjectId', label: 'Max Entladeleistung (W)', requiredModes: ['limits'] },
    { key: 'chargeEnableObjectId', label: 'Laden erlaubt (bool)', requiredModes: ['enableFlags'] },
    { key: 'dischargeEnableObjectId', label: 'Entladen erlaubt (bool)', requiredModes: ['enableFlags'] },
    { key: 'e3dcSetPowerModeObjectId', label: 'E3/DC EMS.SET_POWER_MODE', requiredModes: ['targetPower'], showForVendor: ['e3dc-rscp'], hint: 'E3/DC-RSCP-Adapter: Zahlenmodus 0=NORMAL, 1=IDLE, 2=DISCHARGE, 3=CHARGE, 4=GRID_CHARGE. Dieser DP ist zusammen mit SET_POWER_VALUE der bevorzugte E3/DC-Schreibpfad.' },
    { key: 'e3dcSetPowerValueObjectId', label: 'E3/DC EMS.SET_POWER_VALUE (W)', requiredModes: ['targetPower'], showForVendor: ['e3dc-rscp'], hint: 'E3/DC-RSCP-Adapter: positive Absolutleistung in Watt passend zum SET_POWER_MODE.' },
    { key: 'e3dcPowerLimitsUsedObjectId', label: 'E3/DC EMS.POWER_LIMITS_USED (optional)', requiredModes: [], showForVendor: ['e3dc-rscp'], hint: 'Optional: wird nur geschrieben, wenn „PowerLimits automatisch setzen“ aktiv ist.' },
    { key: 'e3dcMaxChargePowerObjectId', label: 'E3/DC EMS.MAX_CHARGE_POWER (optional)', requiredModes: [], showForVendor: ['e3dc-rscp'], hint: 'Optional: Ladeleistungsgrenze fuer E3/DC RSCP PowerLimits.' },
    { key: 'e3dcMaxDischargePowerObjectId', label: 'E3/DC EMS.MAX_DISCHARGE_POWER (optional)', requiredModes: [], showForVendor: ['e3dc-rscp'], hint: 'Optional: Entladeleistungsgrenze fuer E3/DC RSCP PowerLimits.' },
    { key: 'reserveSocObjectId', label: 'Reserve-SoC (%) (optional)', requiredModes: [] }
  ];

  let currentConfig = null;
  let currentLicenseInfo = { valid: false, edition: 'none', editionLabel: 'Keine Lizenz', maxWallboxes: 0, storagePowerProfile: { id: 'none', label: 'Keine Lizenz', maxCommandW: 0 }, maxStoragePowerW: 0, features: {} };
  let dpTargetInputId = null;
  let treePrefix = '';

  const shadowJsonDetailsOpen = new Set();


  const HEMS_APP_IDS = new Set(['charging', 'storage', 'storagefarm', 'thermal', 'heatingrod', 'threshold', 'relay', 'grid', 'aiAdvisor', 'tariff', 'para14a', 'energyWallet', 'energyLedger']);
  const HOME_LICENSE_FEATURES = new Set(['dashboard','history','aiAdvisor','smartHome','dynamicTariffs','tariff','chargingManagement','storageControl','storageFarm','thermalControl','heatingRodControl','relayControl','gridConstraints','gridLimits','para14a','thresholdControl','energyFlow','pvForecast','countryProfile','systemLanguage','energyWallet','energyWalletBasic','energyWalletPro','energyWalletDetails','energyWalletRecommendations','energyLedger','energyLedgerBasic','energyOriginAccounting','energyOriginEvidenceExport','nlP1','nlP1Basic','p1Dsmr']);
  const APP_LICENSE_FEATURES = Object.freeze({
    charging: 'chargingManagement',
    peak: 'peakShaving',
    storage: 'storageControl',
    storagefarm: 'storageFarm',
    thermal: 'thermalControl',
    heatingrod: 'heatingRodControl',
    bhkw: 'bhkwControl',
    generator: 'generatorControl',
    threshold: 'thresholdControl',
    relay: 'relayControl',
    grid: 'gridConstraints',
    aiAdvisor: 'aiAdvisor',
    tariff: 'dynamicTariffs',
    para14a: 'para14a',
    multiuse: 'multiUse',
    energyWallet: 'energyWallet',
    chargeKiosk: 'chargeKiosk',
    energyLedger: 'energyLedger',
    nlP1: 'nlP1',
    mesh: 'mesh',
    microgrid: 'microgrid',
    meshMicrogrid: 'meshMicrogrid',
    netOperator: 'netOperatorInterface',
    operatingStrategies: 'operatingStrategies',
    nlSaldering: 'nlSaldering',
    nlEnergyHub: 'nlEnergyHub',
    aiAutopilot: 'aiAutopilot'
  });

  /** Nur eine positive, noch laufende zentrale Lease gibt Anzeige-/Formrechte.
   * Beschriftungen, alte NW1-Schlüssel und erfolgreiche HTTP-Aufrufe sind keine Lizenz. */
  function _licenseEdition() {
    const info = currentLicenseInfo;
    if (!info || info.valid !== true || !Number.isSafeInteger(info.validUntil) || info.validUntil <= Date.now() || info.validUntil > Date.now() + 15000) return 'none';
    return info.edition === 'eos' ? 'eos' : info.edition === 'hems' ? 'hems' : 'none';
  }

  function _maxStorageCount() {
    const edition = _licenseEdition(), count = currentLicenseInfo && currentLicenseInfo.maxStorages;
    return edition !== 'none' && Number.isSafeInteger(count) && count >= 0 ? Math.min(count, edition === 'hems' ? 2 : 10) : 0;
  }

  function _appLicenseFeature(appId) {
    return APP_LICENSE_FEATURES[String(appId || '')] || String(appId || '');
  }

  function _isFeatureLicensed(feature) {
    if (_licenseEdition() === 'none') return false;
    const features = currentLicenseInfo && currentLicenseInfo.features;
    return !!features && Object.prototype.hasOwnProperty.call(features, String(feature || '')) && features[String(feature || '')] === true;
  }

  function _isAppLicensed(appId) {
    return _isFeatureLicensed(_appLicenseFeature(appId));
  }

  function _maxEvcsCount() {
    const edition = _licenseEdition(), count = currentLicenseInfo && currentLicenseInfo.maxWallboxes;
    return edition !== 'none' && Number.isSafeInteger(count) && count >= 0 ? Math.min(count, edition === 'hems' ? 3 : 50) : 0;
  }

  function _licenseLabel() {
    const ed = _licenseEdition();
    if (ed === 'eos') return 'Pro';
    if (ed === 'hems') return 'Home';
    return 'Keine Lizenz';
  }

  function _storagePowerProfileInfo() {
    const ed = _licenseEdition();
    return { edition: ed, id: ed === 'eos' ? 'pro' : ed === 'hems' ? 'home' : 'none', label: _licenseLabel(),
      unrestricted: ed === 'eos', industrial: ed === 'eos', maxCommandW: ed === 'hems' ? 50000 : 0 };
  }

  function updateStorageLicensePowerUi() {
    const profile = _storagePowerProfileInfo();
    if (els.storageLicensePowerProfile) {
      if (profile.id === 'home') {
        els.storageLicensePowerProfile.value = 'Home · max. 50 kW';
      } else if (profile.id === 'pro') {
        els.storageLicensePowerProfile.value = 'Pro · frei skalierbar';
      } else {
        els.storageLicensePowerProfile.value = 'Keine gültige Lizenz';
      }
      els.storageLicensePowerProfile.title = profile.id === 'home'
        ? 'Home: finaler Lade- und Entladebefehl maximal 50 kW.'
        : (profile.id === 'pro'
          ? 'Pro: keine Lizenz-Leistungsgrenze; Anlagen- und Sicherheitsgrenzen bleiben aktiv.'
          : 'Ohne gültige Lizenz ist die Speichersteuerung nicht freigegeben.');
    }
    if (els.storageRatedPowerKW) {
      if (profile.id === 'home') {
        els.storageRatedPowerKW.max = '50';
        const current = Number(els.storageRatedPowerKW.value);
        if (Number.isFinite(current) && current > 50) els.storageRatedPowerKW.value = '50';
      } else {
        els.storageRatedPowerKW.removeAttribute('max');
      }
      els.storageRatedPowerKW.disabled = profile.id === 'none';
    }
  }

  /** Normalisiert ausschließlich aktuelle Metadaten des geschützten Features-Endpunkts.
   * Die höchstens 15 Sekunden gültige Lease begrenzt auch eine Anzeige ohne Netzwerk.
   * Engere signierte Kontingente und explizite Feature-false-Werte bleiben erhalten. */
  function normalizeLicenseInfo(raw) {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    let edition = ['eos', 'pro'].includes(src.edition) ? 'eos' : ['hems', 'home'].includes(src.edition) ? 'hems' : 'none';
    const now = Date.now();
    const valid = src.valid === true && edition !== 'none' && Number.isSafeInteger(src.validUntil) &&
      src.validUntil > now && src.validUntil <= now + 15000;
    if (!valid) edition = 'none';
    const label = edition === 'eos' ? 'Pro' : edition === 'hems' ? 'Home' : 'Keine Lizenz';
    const count = (value, max) => valid && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
    const features = {};
    if (valid && src.features && typeof src.features === 'object' && !Array.isArray(src.features)) {
      for (const key of Object.keys(src.features)) if (/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(key) && key !== 'constructor' && key !== 'prototype') features[key] = src.features[key] === true;
    }
    const storagePowerProfile = { edition, id: edition === 'eos' ? 'pro' : edition === 'hems' ? 'home' : 'none', label,
      industrial: edition === 'eos', unrestricted: edition === 'eos', maxCommandW: edition === 'hems' ? 50000 : 0 };
    return { valid, edition, editionLabel: label, type: valid ? 'central' : 'none', message: typeof src.message === 'string' ? src.message : '',
      validUntil: valid ? src.validUntil : 0, expiresAt: 0, daysRemaining: 0,
      maxWallboxes: count(src.maxWallboxes, edition === 'hems' ? 3 : 50), maxStorages: count(src.maxStorages, edition === 'hems' ? 2 : 10),
      maxStoragePowerW: storagePowerProfile.maxCommandW, storagePowerProfile, features,
      eosFullAccess: edition === 'eos', proFullAccess: edition === 'eos' };
  }

  function _licenseIsUsable(info) {
    return !!(info && typeof info === 'object' && info.valid && (info.edition === 'eos' || info.edition === 'hems'));
  }

  async function fetchLicenseInfoFallback() {
    try {
      const data = await fetchJson('/api/license/features?t=' + Date.now(), { cache: 'no-store' });
      return normalizeLicenseInfo(data);
    } catch (_e) {
      return normalizeLicenseInfo(null);
    }
  }

  let _licenseLiveRefreshInFlight = false;
  /**
   * Code-Teil: hydrateStorageFarmConfigFromRuntimeState
   * Zweck: Repariert/übernimmt Speicherfarm-Konfiguration aus Runtime-States, wenn
   * die Admin-jsonConfig leer ist, die Runtime aber noch eine funktionierende Farm
   * unter storageFarm.configJson hat.
   *
   * Warum nötig:
   * Die Kunden-/Betreiberansicht liest die laufende Speicherfarm aus
   * storageFarm.configJson. Wenn bei Migrationen oder App-Center-Änderungen
   * currentConfig.storageFarm.storages leer ist, würde der Installer fälschlich
   * „Noch keine Speicher“ anzeigen und beim Speichern die Admin-Konfiguration
   * ohne Speicher zurückschreiben. Diese Funktion verhindert Datenverlust und
   * macht bestehende Speicher wieder im Speicherfarm-Reiter sichtbar.
   */
  function _readApiStateValue(statePayload, key, fallback = undefined) {
    try {
      let rec = statePayload && statePayload[key];
      // 0.8.57 Hotfix: Manche /api/state-Varianten liefern lokale States mit
      // Namespace-Präfix. Für die Speicherfarm-Migration darf `storageFarm.configJson`
      // deshalb auch als `nexowatt-ui.0.storageFarm.configJson` gefunden werden.
      if (!rec && statePayload && typeof statePayload === 'object') {
        const suffix = '.' + String(key || '');
        const foundKey = Object.keys(statePayload).find((k) => k === key || String(k).endsWith(suffix));
        if (foundKey) rec = statePayload[foundKey];
      }
      if (rec && Object.prototype.hasOwnProperty.call(rec, 'value')) return rec.value;
      if (rec && Object.prototype.hasOwnProperty.call(rec, 'val')) return rec.val;
    } catch (_e) {}
    return fallback;
  }

  function _parseStorageFarmRuntimeList(raw) {
    try {
      if (Array.isArray(raw)) return raw;
      const parsed = (raw && typeof raw === 'object') ? raw : JSON.parse(String(raw || '[]'));
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.storages)) return parsed.storages;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) return parsed.rows;
      return [];
    } catch (_e) {
      return [];
    }
  }

  function _recoverStorageFarmRowsFromStatusRows(statusRows) {
    const rows = Array.isArray(statusRows) ? statusRows : [];
    return rows
      .filter((row) => row && typeof row === 'object')
      .map((row, index) => ({
        enabled: true,
        name: String(row.name || row.label || '').trim() || `Speicher ${index + 1}`,
        group: String(row.group || '').trim(),
        // Diese Runtime-Statusquelle kennt in der Regel keine DP-Zuordnungen.
        // Darum werden leere editierbare Felder angelegt, damit der Installateur
        // die Speicher direkt wieder anbinden kann, statt bei "Noch keine Speicher"
        // festzuhängen.
        socId: '', signedPowerId: '', chargePowerId: '', dischargePowerId: '', pvPowerId: '',
        vendorProfile: 'generic', feneconControlMode: 'auto',
        feneconGridSetpointId: '', feneconEssActualPowerId: '', feneconNvpPowerId: '', feneconConsumptionTotalId: '', feneconMinPowerId: '', feneconMaxPowerId: '',
        feneconActualSetpointId: '', feneconPvDcId: '', feneconPvAcId: '', feneconPvTotalId: '',
        feneconPvPassthroughThresholdW: 500, feneconPvReleaseThresholdW: 500,
        feneconPvPassthroughDelaySec: 10, feneconPvReleaseDelaySec: 120, feneconApiTimeoutSec: 60,
        setChargePowerId: '', setDischargePowerId: '', setSignedPowerId: '',
        capacityKWh: (row.capacityKWh !== undefined && row.capacityKWh !== null && row.capacityKWh !== '') ? Number(row.capacityKWh) : '',
        maxChargeW: (row.maxChargeW !== undefined && row.maxChargeW !== null && row.maxChargeW !== '') ? Number(row.maxChargeW) : '',
        maxDischargeW: (row.maxDischargeW !== undefined && row.maxDischargeW !== null && row.maxDischargeW !== '') ? Number(row.maxDischargeW) : '',
        _runtimeStatusRecovered: true,
      }));
  }

  function _normalizeRecoveredStorageFarmRow(row, index) {
    const r = row && typeof row === 'object' ? row : {};
    const roots = [r, r.datapoints, r.dp, r.mapping].filter((root) => root && typeof root === 'object');
    const textFrom = (...keys) => {
      for (const key of keys) {
        for (const root of roots) {
          const value = root[key];
          if (value === undefined || value === null) continue;
          const txt = String(value).trim();
          if (txt) return txt;
        }
      }
      return '';
    };
    const numberFrom = (...keys) => {
      for (const key of keys) {
        for (const root of roots) {
          const value = root[key];
          if (value === undefined || value === null) continue;
          let raw = String(value).trim();
          if (!raw) continue;
          if (raw.includes(',') && raw.includes('.')) {
            raw = raw.lastIndexOf(',') > raw.lastIndexOf('.')
              ? raw.replace(/\./g, '').replace(/,/g, '.')
              : raw.replace(/,/g, '');
          } else if (raw.includes(',')) {
            raw = raw.replace(/,/g, '.');
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
      return '';
    };
    const numberOrDefault = (fallback, ...keys) => {
      const value = numberFrom(...keys);
      return value === '' ? fallback : value;
    };
    const boolFrom = (fallback, ...keys) => {
      for (const key of keys) {
        for (const root of roots) {
          if (!Object.prototype.hasOwnProperty.call(root, key)) continue;
          const value = root[key];
          if (typeof value === 'boolean') return value;
          const normalized = String(value).trim().toLowerCase();
          if (value === 1 || normalized === '1' || normalized === 'true') return true;
          if (value === 0 || normalized === '0' || normalized === 'false') return false;
        }
      }
      return fallback;
    };
    const couplingRaw = textFrom('coupling', 'storageCoupling').toLowerCase();
    const vendorRaw = textFrom('vendorProfile', 'storageVendorProfile', 'profile', 'manufacturerProfile').toLowerCase();
    const vendorProfile = normalizeStorageVendorProfile(vendorRaw || 'generic');
    const feneconModeRaw = textFrom('feneconControlMode', 'feneconHybridControlMode', 'controlModeMode').toLowerCase();
    const feneconControlMode = ['fems-grid', 'fems', 'fems-nvp', 'native', 'grid-target'].includes(feneconModeRaw)
      ? 'fems-grid'
      : (['direct-ess', 'direct', 'ess', 'direct-power'].includes(feneconModeRaw) ? 'direct-ess' : 'auto');
    return {
      enabled: boolFrom(true, 'enabled', 'active'),
      name: textFrom('name', 'label', 'title') || `Speicher ${index + 1}`,
      coupling: couplingRaw === 'dc' ? 'dc' : (couplingRaw === 'ac' ? 'ac' : ''),
      vendorProfile,
      feneconControlMode,
      socId: textFrom('socId', 'socObjectId', 'socDp', 'storageSocId', 'storageSoc'),
      signedPowerId: textFrom('signedPowerId', 'batteryPowerObjectId', 'signedPowerDp', 'powerObjectId', 'powerId', 'batteryPower'),
      chargePowerId: textFrom('chargePowerId', 'batteryChargePowerObjectId', 'chargePowerDp', 'chargeDp', 'storageChargePower'),
      dischargePowerId: textFrom('dischargePowerId', 'batteryDischargePowerObjectId', 'dischargePowerDp', 'dischargeDp', 'storageDischargePower'),
      pvPowerId: textFrom('pvPowerId', 'pvPowerObjectId', 'pvPowerDp', 'storagePvPowerId'),
      feneconGridSetpointId: textFrom('feneconGridSetpointId', 'feneconGridSetpointObjectId', 'femsGridSetpointId', 'femsGridSetpointObjectId'),
      feneconEssActualPowerId: textFrom('feneconEssActualPowerId', 'feneconEssActualPowerObjectId', 'feneconActivePowerId'),
      feneconNvpPowerId: textFrom('feneconNvpPowerId', 'feneconNvpPowerObjectId', 'feneconGridPowerId', 'feneconNapPowerId'),
      feneconConsumptionTotalId: textFrom('feneconConsumptionTotalId', 'feneconConsumptionTotalObjectId', 'feneconLoadTotalId', 'feneconConsumptionPowerId', 'feneconLoadPowerId'),
      feneconMinPowerId: textFrom('feneconMinPowerId', 'feneconMinPowerObjectId', 'feneconMinimumPowerId'),
      feneconMaxPowerId: textFrom('feneconMaxPowerId', 'feneconMaxPowerObjectId', 'feneconMaximumPowerId'),
      feneconActualSetpointId: textFrom('feneconActualSetpointId', 'feneconActualSetpointObjectId', 'feneconSetpointReadbackId'),
      feneconPvDcId: textFrom('feneconPvDcId', 'feneconPvDcObjectId', 'feneconProductionDcId'),
      feneconPvAcId: textFrom('feneconPvAcId', 'feneconPvAcObjectId', 'feneconProductionAcId'),
      feneconPvTotalId: textFrom('feneconPvTotalId', 'feneconPvTotalObjectId', 'feneconProductionTotalId'),
      feneconPvPassthroughThresholdW: numberOrDefault(500, 'feneconPvPassthroughThresholdW', 'feneconPvOnThresholdW'),
      feneconPvReleaseThresholdW: numberOrDefault(500, 'feneconPvReleaseThresholdW', 'feneconPvOffThresholdW'),
      feneconPvPassthroughDelaySec: numberOrDefault(10, 'feneconPvPassthroughDelaySec', 'feneconPvOnDelaySec'),
      feneconPvReleaseDelaySec: numberOrDefault(120, 'feneconPvReleaseDelaySec', 'feneconPvOffDelaySec'),
      feneconApiTimeoutSec: numberOrDefault(60, 'feneconApiTimeoutSec'),
      invertSignedPowerSign: boolFrom(false, 'invertSignedPowerSign', 'batteryPowerInvert', 'invertPowerSign'),
      invertChargeSign: boolFrom(false, 'invertChargeSign', 'batteryChargePowerInvert'),
      invertDischargeSign: boolFrom(false, 'invertDischargeSign', 'batteryDischargePowerInvert'),
      setChargePowerId: textFrom('setChargePowerId', 'targetChargePowerObjectId', 'targetChargePowerId', 'setChargePowerDp', 'chargeSetpointId'),
      setDischargePowerId: textFrom('setDischargePowerId', 'targetDischargePowerObjectId', 'targetDischargePowerId', 'setDischargePowerDp', 'dischargeSetpointId'),
      setSignedPowerId: textFrom('setSignedPowerId', 'targetPowerObjectId', 'targetPowerId', 'setSignedPowerDp', 'powerSetpointId', 'setpointId', 'setPowerId'),
      invertSetSignedPowerSign: boolFrom(false, 'invertSetSignedPowerSign', 'targetPowerInvert', 'invertSetpointSign'),
      maxChargeW: numberFrom('maxChargeW', 'maxChargePowerW'),
      maxDischargeW: numberFrom('maxDischargeW', 'maxDischargePowerW'),
      availableId: textFrom('availableId', 'availableObjectId', 'availableDp', 'availabilityId'),
      faultId: textFrom('faultId', 'faultObjectId', 'faultDp', 'errorId'),
      chargeAllowedId: textFrom('chargeAllowedId', 'chargeAllowedObjectId', 'chargeAllowedDp', 'chargeEnableId'),
      dischargeAllowedId: textFrom('dischargeAllowedId', 'dischargeAllowedObjectId', 'dischargeAllowedDp', 'dischargeEnableId'),
      capacityKWh: numberFrom('capacityKWh', 'capacityKwh', 'batteryCapacityKWh'),
      group: textFrom('group', 'groupName'),
    };
  }

  async function hydrateStorageFarmConfigFromRuntimeState(cfg) {
    const root = cfg && typeof cfg === 'object' ? cfg : {};
    const sf = root.storageFarm && typeof root.storageFarm === 'object' ? root.storageFarm : {};
    if (Array.isArray(sf.storages) && sf.storages.length > 0) return root;
    let statePayload = null;
    try {
      statePayload = await fetchJson('/api/state?t=' + Date.now(), { cache: 'no-store' });
    } catch (_e) {
      return root;
    }
    let runtimeRows = _parseStorageFarmRuntimeList(_readApiStateValue(statePayload, 'storageFarm.configJson', '[]'));
    let fallbackSource = 'storageFarm.configJson';
    if (!runtimeRows.length) {
      // 0.8.58: Wenn configJson schon leer/kaputt ist, die laufende Farm aber in
      // der Betreiberansicht noch Speicher zeigt, kommen die Namen aus
      // storagesStatusJson. Daraus erzeugen wir editierbare Platzhalterzeilen,
      // damit der Installateur die Speicher wieder anbinden kann.
      const statusRows = _parseStorageFarmRuntimeList(_readApiStateValue(statePayload, 'storageFarm.storagesStatusJson', '[]'));
      runtimeRows = _recoverStorageFarmRowsFromStatusRows(statusRows);
      fallbackSource = 'storageFarm.storagesStatusJson';
    }
    if (!runtimeRows.length) {
      const total = Number(_readApiStateValue(statePayload, 'storageFarm.storagesTotal', 0));
      if (Number.isFinite(total) && total > 0) {
        runtimeRows = Array.from({ length: Math.min(10, Math.max(1, Math.round(total))) }, (_x, i) => ({ enabled: true, name: `Speicher ${i + 1}`, _runtimeCountRecovered: true }));
        fallbackSource = 'storageFarm.storagesTotal';
      }
    }
    if (!runtimeRows.length) return root;

    root.storageFarm = root.storageFarm && typeof root.storageFarm === 'object' ? root.storageFarm : {};
    root.storageFarm.storages = runtimeRows.map(_normalizeRecoveredStorageFarmRow);
    root.storageFarm._runtimeRecovered = true;
    root.storageFarm.__runtimeStateFallbackSource = fallbackSource;
    // Die Runtime-Hydration rettet nur vorhandene Speicherfarm-Zeilen für die Bearbeitung.
    // Sie darf die App-Center-Schalter nicht selbst installieren oder aktivieren, sonst erscheint
    // die Speicherfarm bei Einzel-Speicher-Anlagen wieder fälschlich im Kundenmenü.
    const mode = String(_readApiStateValue(statePayload, 'storageFarm.mode', root.storageFarm.mode || 'pool') || 'pool').trim().toLowerCase();
    root.storageFarm.mode = mode === 'groups' ? 'groups' : 'pool';

    const runtimeGroups = _parseStorageFarmRuntimeList(_readApiStateValue(statePayload, 'storageFarm.groupsJson', '[]'));
    if ((!Array.isArray(root.storageFarm.groups) || !root.storageFarm.groups.length) && runtimeGroups.length) {
      root.storageFarm.groups = runtimeGroups.slice(0, 5).map((g, i) => ({
        enabled: g && g.enabled === false ? false : true,
        name: String(g && g.name || '').trim() || `Gruppe ${String.fromCharCode(65 + i)}`,
        socMin: g && g.socMin !== undefined && g.socMin !== null && g.socMin !== '' ? Number(g.socMin) : '',
        socMax: g && g.socMax !== undefined && g.socMax !== null && g.socMax !== '' ? Number(g.socMax) : '',
        priority: g && g.priority !== undefined && g.priority !== null && g.priority !== '' ? Number(g.priority) : (100 + i),
      }));
    }
    return root;
  }

  async function refreshLicenseForAppCenter(reason) {
    if (_licenseLiveRefreshInFlight) return;
    _licenseLiveRefreshInFlight = true;
    try {
      // Eine verlängerte Lease erneuert die Berechtigung, aber baut keine
      // Eingabefelder neu auf. Nur geänderte Rechte/Grenzen lösen das aus.
      const rights = (info) => JSON.stringify({ ...(info || {}), validUntil: 0 });
      const before = rights(currentLicenseInfo);
      const nextLicense = await fetchLicenseInfoFallback();
      currentConfig = currentConfig && typeof currentConfig === 'object' ? currentConfig : {};
      currentConfig.license = nextLicense;
      currentLicenseInfo = normalizeLicenseInfo(nextLicense);
      const after = rights(currentLicenseInfo);
      if (before !== after) {
        try { buildAppsUI(); } catch (_eBuildApps) {}
        try { buildEvcsUI(); } catch (_eBuildEvcs) {}
        try { updateStorageLicensePowerUi(); } catch (_eStorageLicenseUi) {}
        try { scheduleValidation(200); } catch (_eValidation) {}
        if (_licenseEdition() !== 'none') {
          try { setStatus('Lizenz aktualisiert: ' + _licenseLabel() + '.', 'ok'); } catch (_eStatus) {}
        }
      }
    } finally {
      _licenseLiveRefreshInFlight = false;
    }
  }

  function _decodeShadowDisplayText(value) {
    const text = String(value === null || value === undefined ? '' : value);
    if (!/%[0-9A-Fa-f]{2}/.test(text)) return text;
    try { return decodeURIComponent(text); } catch (_e) { return text; }
  }

  function _rememberOpenShadowDetails() {
    try {
      document.querySelectorAll('.nw-shadow-json-details[data-shadow-key]').forEach((node) => {
        const key = node.getAttribute('data-shadow-key');
        if (!key) return;
        if (node.open) shadowJsonDetailsOpen.add(key);
        else shadowJsonDetailsOpen.delete(key);
      });
    } catch (_e) {}
  }

// ─────────────────────────────────────────────────────────────
// Energiefluss: Einheit pro Datenpunkt (W/kW)
// Intern arbeitet der Energiefluss mit Watt; die Live-UI zeigt kW.
// Hersteller liefern jedoch teils bereits kW. Daher pro DP umschaltbar.

function _ensureSettingsObj() {
  if (!currentConfig || typeof currentConfig !== 'object') currentConfig = {};
  if (!currentConfig.settings || typeof currentConfig.settings !== 'object') currentConfig.settings = {};
  return currentConfig.settings;
}

function _ensureFlowPowerDpIsW() {
  const st = _ensureSettingsObj();
  if (!st.flowPowerDpIsW || typeof st.flowPowerDpIsW !== 'object') st.flowPowerDpIsW = {};
  return st.flowPowerDpIsW;
}

function _getFlowPowerDpIsW(key) {
  const st = _ensureSettingsObj();
  const map = (st.flowPowerDpIsW && typeof st.flowPowerDpIsW === 'object') ? st.flowPowerDpIsW : null;
  if (map && Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
  // Legacy-Fallback (ältere Versionen): globaler Schalter
  if (typeof st.flowPowerInputIsW === 'boolean') return !!st.flowPowerInputIsW;
  // Default: DP liefert Watt
  return true;
}

function _setFlowPowerDpIsW(key, isW) {
  const map = _ensureFlowPowerDpIsW();
  map[key] = !!isW;
  document.querySelectorAll('input[data-flow-power-unit-key]').forEach((el) => {
    if (el.getAttribute('data-flow-power-unit-key') === String(key)) {
      el.checked = !!isW;
    }
  });
}

function _collectFlowPowerDpIsWFromUI() {
  const map = {};
  document.querySelectorAll('input[data-flow-power-unit-key]').forEach((el) => {
    const k = el.getAttribute('data-flow-power-unit-key');
    if (k) map[k] = !!el.checked;
  });
  return map;
}
// ─────────────────────────────────────────────────────────────

  function setStatus(msg, kind) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.style.opacity = msg ? '1' : '0.65';
    els.status.style.color = (kind === 'error') ? '#ffb4b4' : (kind === 'ok' ? '#b8f7c3' : (kind === 'warn' ? '#fde68a' : ''));
  }

  let appCenterConfigDirty = false;
  function setDirty() {
    appCenterConfigDirty = true;
    if (els.save) {
      els.save.dataset.dirty = 'true';
      els.save.title = 'Ungespeicherte Änderungen – Konfiguration speichern';
      els.save.setAttribute('aria-label', 'Konfiguration speichern – ungespeicherte Änderungen');
    }
  }
  function clearDirty() {
    appCenterConfigDirty = false;
    if (els.save) {
      delete els.save.dataset.dirty;
      els.save.title = '';
      els.save.setAttribute('aria-label', 'Konfiguration speichern');
    }
  }

  function setBackupStatus(msg, kind) {
    if (!els.backupStatus) return;
    els.backupStatus.textContent = msg || '';
    els.backupStatus.style.opacity = msg ? '1' : '0.65';
    els.backupStatus.style.color = (kind === 'error') ? '#ffb4b4' : (kind === 'ok' ? '#b8f7c3' : '');
  }

  function downloadJsonFile(filename, obj) {
    try {
      const json = JSON.stringify(obj, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'nexowatt-ui-backup.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (_e) {}
        try { URL.revokeObjectURL(url); } catch (_e2) {}
      }, 50);
    } catch (_e) {}
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => reject(fr.error || new Error('file read error'));
        fr.readAsText(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function fetchJson(url, opts) {
    const res = await fetch(url, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts || {}));
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok === false) {
      const err = (data && data.error) ? data.error : ('HTTP ' + res.status);
      throw new Error(err);
    }

    return data;
  }

  // --- Datapoint validation (Phase 3.3) ---
  let _validateTimer = null;

  function _fmtAge(ageMs) {
    const n = Number(ageMs);
    if (!Number.isFinite(n) || n < 0) return '';
    if (n < 1000) return `${Math.round(n)}ms`;
    const s = n / 1000;
    if (s < 60) return `${Math.round(s)}s`;
    const m = s / 60;
    if (m < 60) return `${Math.round(m)}min`;
    const h = m / 60;
    return `${Math.round(h)}h`;
  }

  function _setBadge(inputId, kind, text) {
    const el = document.getElementById('val_' + inputId);
    if (!el) return;
    el.classList.remove('nw-config-badge--ok', 'nw-config-badge--warn', 'nw-config-badge--error', 'nw-config-badge--idle');
    el.classList.add('nw-config-badge', 'nw-config-badge--' + (kind || 'idle'));
    el.textContent = text || '—';
  }

  function scheduleValidation(delayMs) {
    const d = (typeof delayMs === 'number' && Number.isFinite(delayMs)) ? delayMs : 600;
    if (_validateTimer) clearTimeout(_validateTimer);
    _validateTimer = setTimeout(() => { runValidation(false).catch(() => {}); }, d);
  }

  async function runValidation(showStatusMessage) {
    const inputs = Array.from(document.querySelectorAll('input[data-dp-input="1"]'));
    const ids = [];
    const seen = new Set();

    for (const inp of inputs) {
      const v = String(inp.value || '').trim();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      ids.push(v);
    }

    // Quick UI reset for empty inputs
    for (const inp of inputs) {
      const v = String(inp.value || '').trim();
      if (!v) _setBadge(inp.id, 'idle', 'nicht gesetzt');
    }

    if (!ids.length) {
      if (showStatusMessage) setStatus('Validierung: keine Datenpunkte gesetzt.', 'ok');
      return;
    }

    if (showStatusMessage) setStatus('Validierung läuft…', '');
    const maxAgeMs = 15000;

    const data = await fetchJson('/api/object/validate', {
      method: 'POST',
      body: JSON.stringify({ ids, maxAgeMs }),
    });

    if (!data || data.ok !== true || !data.results) {
      if (showStatusMessage) setStatus('Validierung: keine Antwort.', 'error');
      return;
    }

    // Apply per-input badge
    for (const inp of inputs) {
      const idVal = String(inp.value || '').trim();
      if (!idVal) continue;

      const info = data.results[idVal];
      if (!info || info.exists !== true) {
        _setBadge(inp.id, 'error', 'nicht gefunden');
        continue;
      }

      // Basic capability hints (heuristic by input-id)
      const expectWrite = /setCurrentAId|setPowerWId|enableWriteId|lockWriteId|WriteId/i.test(inp.id);
      const expectRead = /powerId|energyTotalId|statusId|activeId|vehicleConnectedId|chargeDemandId|heartbeatId|onlineId|dataFreshId|rfidReadId|budgetPowerId|gridPowerId|pvSurplusPowerId|ReadId/i.test(inp.id);

      if (expectWrite && info.common && info.common.write === false) {
        _setBadge(inp.id, 'warn', 'read-only');
        continue;
      }
      if (expectRead && info.common && info.common.read === false) {
        _setBadge(inp.id, 'warn', 'write-only');
        continue;
      }

      if (info.statePresent !== true) {
        _setBadge(inp.id, 'warn', 'keine Daten');
        continue;
      }

      if (info.stale === true) {
        _setBadge(inp.id, 'warn', 'alt (' + _fmtAge(info.ageMs) + ')');
        continue;
      }

      _setBadge(inp.id, 'ok', 'OK');
    }

    if (showStatusMessage) setStatus('Validierung: abgeschlossen.', 'ok');
  }

  function deepMerge(target, ...patches) {
    const out = (target && typeof target === 'object') ? JSON.parse(JSON.stringify(target)) : {};
    for (const patch of patches) {
      if (!patch || typeof patch !== 'object') continue;
      for (const k of Object.keys(patch)) {
        const v = patch[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          out[k] = deepMerge(out[k], v);
        } else {
          out[k] = v;
        }
      }
    }
    return out;
  }

  function valueOrEmpty(v) {
    return (v === null || v === undefined) ? '' : String(v);
  }

  function numOrEmpty(v) {
    return (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '';
  }

  function _aiSetNumberInput(el, value, def) {
    if (!el) return;
    const n = Number(value);
    const d = Number(def);
    el.value = Number.isFinite(n) ? String(n) : (Number.isFinite(d) ? String(d) : '');
  }

  function _aiSetCheckbox(el, value, def = true) {
    if (!el) return;
    el.checked = (typeof value === 'boolean') ? value : !!def;
  }

  function _aiSetInputValue(el, value, def = '') {
    if (!el) return;
    const v = (value === null || value === undefined || value === '') ? def : value;
    el.value = String(v === null || v === undefined ? '' : v);
  }

    // Abschnitt: KI-Berater-Konfiguration im App-Center. Felder müssen zu main.js-Defaults und ems/modules/ai-advisor.js passen.

function buildAiAdvisorUI() {
    const cfg = (currentConfig && currentConfig.aiAdvisor && typeof currentConfig.aiAdvisor === 'object') ? currentConfig.aiAdvisor : {};
    const cats = (cfg.categories && typeof cfg.categories === 'object') ? cfg.categories : {};
    const prio = (cfg.priorities && typeof cfg.priorities === 'object') ? cfg.priorities : {};

    _aiSetCheckbox(els.aiAdvisorShowOnLive, (cfg.showInLive !== undefined ? cfg.showInLive : cfg.showOnLive), true);
    _aiSetNumberInput(els.aiAdvisorIntervalSec, cfg.intervalSec, 60);
    _aiSetNumberInput(els.aiAdvisorMaxSuggestions, cfg.maxSuggestions, 6);
    if (els.aiAdvisorMinPriority) {
      const p = String(cfg.minPriority || 'info').toLowerCase();
      els.aiAdvisorMinPriority.value = ['info', 'warning', 'action', 'critical'].includes(p) ? p : 'info';
    }
    if (els.aiAdvisorOptimizationMode) {
      const m = String(cfg.optimizationMode || cfg.mode || 'balanced').toLowerCase();
      els.aiAdvisorOptimizationMode.value = ['balanced', 'cost', 'autarky', 'co2', 'peak'].includes(m) ? m : 'balanced';
    }
    _aiSetCheckbox(els.aiAdvisorDailyPlanEnabled, cfg.dailyPlanEnabled !== false && cfg.dayPlanEnabled !== false, true);
    _aiSetCheckbox(els.aiAdvisorLearningEnabled, cfg.learningEnabled !== false, true);
    _aiSetCheckbox(els.aiAdvisorAnomalyDetectionEnabled, cfg.anomalyDetectionEnabled !== false, true);
    _aiSetCheckbox(els.aiAdvisorForecastQualityEnabled, cfg.forecastQualityEnabled !== false, true);
    _aiSetCheckbox(els.aiAdvisorSeasonLogicEnabled, cfg.seasonLogicEnabled !== false, true);

    _aiSetNumberInput(els.aiAdvisorStaleTimeoutSec, cfg.staleTimeoutSec, 300);
    _aiSetNumberInput(els.aiAdvisorExportHighW, cfg.exportHighW, 1500);
    _aiSetNumberInput(els.aiAdvisorImportHighW, cfg.importHighW, 4000);
    _aiSetNumberInput(els.aiAdvisorPeakNearLimitPct, cfg.peakNearLimitPct !== undefined ? cfg.peakNearLimitPct : (cfg.peakConnectionUsageWarnPct !== undefined ? cfg.peakConnectionUsageWarnPct : cfg.gridConnectionWarnPct), 90);
    _aiSetNumberInput(els.aiAdvisorWeatherRainRiskPct, cfg.weatherRainRiskPct !== undefined ? cfg.weatherRainRiskPct : cfg.weatherRainProbabilityPct, 60);
    _aiSetNumberInput(els.aiAdvisorLowSocPct, cfg.lowSocPct, 25);
    _aiSetNumberInput(els.aiAdvisorHighSocPct, cfg.highSocPct, 85);
    _aiSetNumberInput(els.aiAdvisorPvForecastHighW, cfg.pvForecastHighW, 3000);

    _aiSetInputValue(els.aiAdvisorEvReadyBy, cfg.evReadyBy, '07:00');
    _aiSetNumberInput(els.aiAdvisorEvTargetSocPct, cfg.evTargetSocPct, 80);
    _aiSetNumberInput(els.aiAdvisorEvBatteryCapacityKwh, cfg.evBatteryCapacityKwh, 60);
    _aiSetInputValue(els.aiAdvisorThermalReadyBy, cfg.thermalReadyBy, '18:00');
    _aiSetInputValue(els.aiAdvisorQuietHoursStart, cfg.quietHoursStart, '22:00');
    _aiSetInputValue(els.aiAdvisorQuietHoursEnd, cfg.quietHoursEnd, '06:00');
    _aiSetNumberInput(els.aiAdvisorAnomalyHighLoadW, cfg.anomalyHighLoadW, 5500);
    _aiSetNumberInput(els.aiAdvisorNightBaseLoadW, cfg.nightBaseLoadW, 900);
    _aiSetNumberInput(els.aiAdvisorForecastQualityWarnPct, cfg.forecastQualityWarnPct, 65);
    _aiSetNumberInput(els.aiAdvisorCo2LowGPerKwh, cfg.co2LowGPerKwh, 250);
    _aiSetNumberInput(els.aiAdvisorCo2HighGPerKwh, cfg.co2HighGPerKwh, 500);
    _aiSetNumberInput(els.aiAdvisorPriorityStorage, cfg.priorityStorage !== undefined ? cfg.priorityStorage : prio.storage, 90);
    _aiSetNumberInput(els.aiAdvisorPriorityEvcs, cfg.priorityEvcs !== undefined ? cfg.priorityEvcs : prio.evcs, 80);
    _aiSetNumberInput(els.aiAdvisorPriorityThermal, cfg.priorityThermal !== undefined ? cfg.priorityThermal : prio.thermal, 60);
    _aiSetNumberInput(els.aiAdvisorPriorityHeatingRod, cfg.priorityHeatingRod !== undefined ? cfg.priorityHeatingRod : prio.heatingRod, 45);
    _aiSetNumberInput(els.aiAdvisorPriorityGeneric, cfg.priorityGeneric !== undefined ? cfg.priorityGeneric : prio.generic, 40);

    _aiSetCheckbox(els.aiAdvisorCatTariff, cats.tariff, true);
    _aiSetCheckbox(els.aiAdvisorCatPv, cats.pv, true);
    _aiSetCheckbox(els.aiAdvisorCatStorage, cats.storage, true);
    _aiSetCheckbox(els.aiAdvisorCatEvcs, cats.evcs, true);
    _aiSetCheckbox(els.aiAdvisorCatPeak, cats.peak, true);
    _aiSetCheckbox(els.aiAdvisorCatWeather, cats.weather, true);
    _aiSetCheckbox(els.aiAdvisorCatHeating, cats.heating, true);
    _aiSetCheckbox(els.aiAdvisorCatDailyPlan, cats.dailyPlan !== undefined ? cats.dailyPlan : cats.plan, true);
    _aiSetCheckbox(els.aiAdvisorCatAnomaly, cats.anomaly, true);
    _aiSetCheckbox(els.aiAdvisorCatComfort, cats.comfort, true);
    _aiSetCheckbox(els.aiAdvisorCatLearning, cats.learning, true);
    _aiSetCheckbox(els.aiAdvisorCatCo2, cats.co2, true);
    _aiSetCheckbox(els.aiAdvisorCatSystem, cats.system, true);
  }

    // Abschnitt: KI-Konfiguration aus dem DOM einsammeln. Neue Eingabefelder müssen hier gespeichert werden, sonst gehen sie beim Speichern verloren.

function collectAiAdvisorConfigFromUI(base) {
    const out = deepMerge({}, (base && typeof base === 'object') ? base : {});

    const n = (el, def, min, max, roundValue = true) => {
      const raw = el ? Number(el.value) : NaN;
      let v = Number.isFinite(raw) ? raw : def;
      if (Number.isFinite(min)) v = Math.max(min, v);
      if (Number.isFinite(max)) v = Math.min(max, v);
      return roundValue ? Math.round(v) : v;
    };

    const str = (el, def) => {
      const raw = el ? String(el.value || '').trim() : '';
      return raw || def;
    };
    out.enabled = true;
    out.mode = 'advisor';
    out.advisoryOnly = true;
    out.showOnLive = els.aiAdvisorShowOnLive ? !!els.aiAdvisorShowOnLive.checked : true;
    out.showInLive = out.showOnLive;
    out.intervalSec = n(els.aiAdvisorIntervalSec, 60, 10, 3600);
    out.maxSuggestions = n(els.aiAdvisorMaxSuggestions, 6, 1, 10);
    out.minPriority = els.aiAdvisorMinPriority ? String(els.aiAdvisorMinPriority.value || 'info').toLowerCase() : 'info';
    if (!['info', 'warning', 'action', 'critical'].includes(out.minPriority)) out.minPriority = 'info';
    out.optimizationMode = els.aiAdvisorOptimizationMode ? String(els.aiAdvisorOptimizationMode.value || 'balanced').toLowerCase() : 'balanced';
    if (!['balanced', 'cost', 'autarky', 'co2', 'peak'].includes(out.optimizationMode)) out.optimizationMode = 'balanced';
    out.dailyPlanEnabled = els.aiAdvisorDailyPlanEnabled ? !!els.aiAdvisorDailyPlanEnabled.checked : true;
    out.dayPlanEnabled = out.dailyPlanEnabled;
    out.learningEnabled = els.aiAdvisorLearningEnabled ? !!els.aiAdvisorLearningEnabled.checked : true;
    out.anomalyDetectionEnabled = els.aiAdvisorAnomalyDetectionEnabled ? !!els.aiAdvisorAnomalyDetectionEnabled.checked : true;
    out.forecastQualityEnabled = els.aiAdvisorForecastQualityEnabled ? !!els.aiAdvisorForecastQualityEnabled.checked : true;
    out.seasonLogicEnabled = els.aiAdvisorSeasonLogicEnabled ? !!els.aiAdvisorSeasonLogicEnabled.checked : true;

    out.staleTimeoutSec = n(els.aiAdvisorStaleTimeoutSec, 300, 30, 86400);
    out.exportHighW = n(els.aiAdvisorExportHighW, 1500, 0, 1000000000);
    out.importHighW = n(els.aiAdvisorImportHighW, 4000, 0, 1000000000);
    out.peakNearLimitPct = n(els.aiAdvisorPeakNearLimitPct, 90, 50, 100);
    out.peakConnectionUsageWarnPct = out.peakNearLimitPct;
    out.gridConnectionWarnPct = out.peakNearLimitPct;
    out.weatherRainRiskPct = n(els.aiAdvisorWeatherRainRiskPct, 60, 0, 100);
    out.weatherRainProbabilityPct = out.weatherRainRiskPct;
    out.lowSocPct = n(els.aiAdvisorLowSocPct, 25, 0, 100);
    out.highSocPct = n(els.aiAdvisorHighSocPct, 85, 0, 100);
    out.pvForecastHighW = n(els.aiAdvisorPvForecastHighW, 3000, 0, 1000000000);

    out.evReadyBy = str(els.aiAdvisorEvReadyBy, '07:00');
    out.evTargetSocPct = n(els.aiAdvisorEvTargetSocPct, 80, 10, 100);
    out.evBatteryCapacityKwh = n(els.aiAdvisorEvBatteryCapacityKwh, 60, 5, 300);
    out.thermalReadyBy = str(els.aiAdvisorThermalReadyBy, '18:00');
    out.quietHoursStart = str(els.aiAdvisorQuietHoursStart, '22:00');
    out.quietHoursEnd = str(els.aiAdvisorQuietHoursEnd, '06:00');
    out.anomalyHighLoadW = n(els.aiAdvisorAnomalyHighLoadW, 5500, 0, 1000000000);
    out.nightBaseLoadW = n(els.aiAdvisorNightBaseLoadW, 900, 0, 1000000000);
    out.forecastQualityWarnPct = n(els.aiAdvisorForecastQualityWarnPct, 65, 0, 100);
    out.co2LowGPerKwh = n(els.aiAdvisorCo2LowGPerKwh, 250, 0, 2000);
    out.co2HighGPerKwh = n(els.aiAdvisorCo2HighGPerKwh, 500, 0, 3000);
    out.priorityStorage = n(els.aiAdvisorPriorityStorage, 90, 0, 100);
    out.priorityEvcs = n(els.aiAdvisorPriorityEvcs, 80, 0, 100);
    out.priorityThermal = n(els.aiAdvisorPriorityThermal, 60, 0, 100);
    out.priorityHeatingRod = n(els.aiAdvisorPriorityHeatingRod, 45, 0, 100);
    out.priorityGeneric = n(els.aiAdvisorPriorityGeneric, 40, 0, 100);
    out.priorities = {
      storage: out.priorityStorage,
      evcs: out.priorityEvcs,
      thermal: out.priorityThermal,
      heatingRod: out.priorityHeatingRod,
      generic: out.priorityGeneric,
    };

    out.categories = {
      tariff: els.aiAdvisorCatTariff ? !!els.aiAdvisorCatTariff.checked : true,
      pv: els.aiAdvisorCatPv ? !!els.aiAdvisorCatPv.checked : true,
      storage: els.aiAdvisorCatStorage ? !!els.aiAdvisorCatStorage.checked : true,
      evcs: els.aiAdvisorCatEvcs ? !!els.aiAdvisorCatEvcs.checked : true,
      peak: els.aiAdvisorCatPeak ? !!els.aiAdvisorCatPeak.checked : true,
      weather: els.aiAdvisorCatWeather ? !!els.aiAdvisorCatWeather.checked : true,
      heating: els.aiAdvisorCatHeating ? !!els.aiAdvisorCatHeating.checked : true,
      dailyPlan: els.aiAdvisorCatDailyPlan ? !!els.aiAdvisorCatDailyPlan.checked : true,
      plan: els.aiAdvisorCatDailyPlan ? !!els.aiAdvisorCatDailyPlan.checked : true,
      anomaly: els.aiAdvisorCatAnomaly ? !!els.aiAdvisorCatAnomaly.checked : true,
      comfort: els.aiAdvisorCatComfort ? !!els.aiAdvisorCatComfort.checked : true,
      learning: els.aiAdvisorCatLearning ? !!els.aiAdvisorCatLearning.checked : true,
      co2: els.aiAdvisorCatCo2 ? !!els.aiAdvisorCatCo2.checked : true,
      system: els.aiAdvisorCatSystem ? !!els.aiAdvisorCatSystem.checked : true,
    };
    return out;
  }

  function _nwHtmlEscape(input) {
    return String(input == null ? '' : input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 0.8.58 Hotfix: Die Speicherfarm-Master-Detail-Ansicht verwendete nach
  // der TS-Migration versehentlich `htmlEscape`, obwohl die gemeinsame
  // Escape-Funktion `_nwHtmlEscape` heißt. Sobald ein Speicher hinzugefügt oder
  // aus Runtime-State wiederhergestellt wurde, brach buildStorageFarmUI() ab und
  // der Reiter blieb leer. Alias bewusst lokal halten, damit alte Aufrufstellen
  // stabil bleiben und später sauber typisiert ersetzt werden können.
  const htmlEscape = _nwHtmlEscape;

  function _nwSystemProfileCountry() {
    const cp = currentConfig && currentConfig.countryProfile && typeof currentConfig.countryProfile === 'object' ? currentConfig.countryProfile : {};
    const raw = String(cp.country || cp.profile || 'DE').trim().toUpperCase();
    return raw === 'NL' ? 'NL' : 'DE';
  }

  function buildSystemProfileCard() {
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-system-profile-card';
    card.setAttribute('data-card', 'system-profile');

    const cp = currentConfig && currentConfig.countryProfile && typeof currentConfig.countryProfile === 'object' ? currentConfig.countryProfile : {};
    const locale = currentConfig && currentConfig.locale && typeof currentConfig.locale === 'object' ? currentConfig.locale : {};
    const country = _nwSystemProfileCountry();
    const lang = String((locale && (locale.language || locale.htmlLang)) || cp.effectiveLanguage || 'de').trim().toLowerCase() || 'de';
    const source = String((locale && locale.source) || cp.languageSource || 'system.config.common.language');

    card.innerHTML = `
      <div class="nw-config-card__header">
        <div>
          <div class="nw-config-card__title">System &amp; Marktprofil</div>
          <div class="nw-config-card__subtitle">Installer-Einstellung. Die UI-Sprache wird automatisch aus der NexoWatt-EOS-Systemsprache übernommen.</div>
        </div>
      </div>
      <div class="nw-config-card__body">
        <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
          <label class="nw-config-field">
            <span class="nw-config-label">Länderprofil</span>
            <select class="nw-config-input" id="countryProfileCountry">
              <option value="DE">Deutschland</option>
              <option value="NL">Niederlande</option>
            </select>
            <small>Basis für Begriffe, NL/P1/Saldering und spätere Energy-Hub-Funktionen.</small>
          </label>
          <label class="nw-config-field">
            <span class="nw-config-label">Sprache</span>
            <input class="nw-config-input" id="countryProfileLanguageDisplay" type="text" readonly />
            <small>Quelle: NexoWatt EOS Systemeinstellung. Keine Kundeneinstellung im Frontend.</small>
          </label>
        </div>
        <div class="nw-config-separator" style="margin:14px 0 10px;"></div>
        <div class="nw-config-card__subtitle" style="margin-bottom:8px;">Energie-Wertkonto: Datenpunkt- und Länderbasis im Installerbereich; Kostenannahmen und An/Aus-Schalter liegen im Nutzerfrontend unten in den Einstellungen der Tarifseite.</div>
        <div class="nw-config-empty" style="text-align:left;margin-bottom:10px;">
          Der Betreiber kann dort festen Netzstrompreis, Einspeise-/Rücklieferwert und Solar-Ladepunktwert pflegen. Ist ein dynamischer Zeittarif aktiv, nutzt das Wertkonto automatisch den aktuellen Tarifpreis.
        </div>
        <div id="countryProfileHint" class="nw-config-empty" style="margin-top:10px;text-align:left;"></div>
      </div>`;

    const sel = card.querySelector('#countryProfileCountry');
    const display = card.querySelector('#countryProfileLanguageDisplay');
    const hint = card.querySelector('#countryProfileHint');
    if (sel) {
      sel.value = country;
      sel.addEventListener('change', () => {
        currentConfig.countryProfile = currentConfig.countryProfile || {};
        currentConfig.countryProfile.country = String(sel.value || 'DE').toUpperCase() === 'NL' ? 'NL' : 'DE';
        if (hint) hint.textContent = currentConfig.countryProfile.country === 'NL'
          ? 'NL aktiv: Begriffe wie Teruglevering/Netafname und spätere P1-/Saldering-Module werden vorbereitet.'
          : 'DE aktiv: Begriffe wie Einspeisung/Netzbezug und §14a-Module bleiben Standard.';
      });
    }
    if (display) display.value = `${lang.toUpperCase()} (${source})`;
    if (hint) hint.textContent = country === 'NL'
      ? 'NL aktiv: Begriffe wie Teruglevering/Netafname und spätere P1-/Saldering-Module werden vorbereitet.'
      : 'DE aktiv: Begriffe wie Einspeisung/Netzbezug und §14a-Module bleiben Standard.';
    return card;
  }


  function buildNlP1Card() {
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-nl-p1-card';
    card.setAttribute('data-card', 'nl-p1-dsmr');
    const country = _nwSystemProfileCountry();
    const cfg = currentConfig && currentConfig.nlP1 && typeof currentConfig.nlP1 === 'object' ? currentConfig.nlP1 : {};
    const dps = cfg.datapoints && typeof cfg.datapoints === 'object' ? cfg.datapoints : {};
    const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps && currentConfig.emsApps.apps.nlP1 ? currentConfig.emsApps.apps.nlP1 : null;
    const enabled = cfg.enabled === true || !!(app && app.installed && app.enabled);
    const disabledNote = country === 'NL'
      ? 'NL aktiv: P1/DSMR-Datenpunkte können aus einem vorhandenen Geräteadapter oder aus NexoWatt Devices gemappt werden.'
      : 'Länderprofil ist DE. P1/DSMR kann für Tests gemappt werden, läuft aber fachlich als NL-Modul.';
    card.innerHTML = `
      <div class="nw-config-card__header">
        <div>
          <div class="nw-config-card__title">NL P1/DSMR &amp; Teruglevering</div>
          <div class="nw-config-card__subtitle">Installer-Mapping für Netafname/Teruglevering. Read-only, keine Einspeisebegrenzung und keine Hardwaresteuerung.</div>
        </div>
      </div>
      <div class="nw-config-card__body">
        <div class="nw-config-empty" style="text-align:left;margin-bottom:10px;">${_nwHtmlEscape(disabledNote)}</div>
        <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;align-items:end;">
          <label class="nw-config-field"><span class="nw-config-label">P1/DSMR aktiv</span><select class="nw-config-input" data-nlp1-field="enabled"><option value="false" ${enabled ? '' : 'selected'}>Aus</option><option value="true" ${enabled ? 'selected' : ''}>An</option></select><small>Kann automatisch laufen, wenn NL aktiv und Datenpunkte gemappt sind.</small></label>
          <label class="nw-config-field"><span class="nw-config-label">Stale Timeout s</span><input class="nw-config-input" type="number" min="30" max="86400" step="1" data-nlp1-field="staleTimeoutSec" value="${Number.isFinite(Number(cfg.staleTimeoutSec)) ? Number(cfg.staleTimeoutSec) : 300}" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Teruglevering-Wert €/kWh</span><input class="nw-config-input" type="number" min="-5" max="5" step="0.0001" data-nlp1-field="returnValueEurPerKwh" value="${Number.isFinite(Number(cfg.returnValueEurPerKwh)) ? Number(cfg.returnValueEurPerKwh) : 0.08}" /><small>Fallback. Betreiberwert aus Frontend-Einstellungen hat Vorrang.</small></label>
          <label class="nw-config-field"><span class="nw-config-label">Rücklieferkosten €/kWh</span><input class="nw-config-input" type="number" min="0" max="5" step="0.0001" data-nlp1-field="returnCostEurPerKwh" value="${Number.isFinite(Number(cfg.returnCostEurPerKwh)) ? Number(cfg.returnCostEurPerKwh) : 0}" /><small>Vorbereitung für Teruglevering-Kosten.</small></label>
        </div>
        <div class="nw-config-separator" style="margin:14px 0 10px;"></div>
        <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;">
          <label class="nw-config-field"><span class="nw-config-label">Importleistung / Netafname W</span><input class="nw-config-input" data-nlp1-dp="importPowerW" value="${_nwHtmlEscape(dps.importPowerW || '')}" placeholder="dsmr.0.power_delivered_w" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Exportleistung / Teruglevering W</span><input class="nw-config-input" data-nlp1-dp="exportPowerW" value="${_nwHtmlEscape(dps.exportPowerW || '')}" placeholder="dsmr.0.power_returned_w" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Signed Netzleistung optional</span><input class="nw-config-input" data-nlp1-dp="netPowerW" value="${_nwHtmlEscape(dps.netPowerW || '')}" placeholder="Import + / Rücklieferung -" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Importenergie kWh total</span><input class="nw-config-input" data-nlp1-dp="importEnergyKwh" value="${_nwHtmlEscape(dps.importEnergyKwh || '')}" placeholder="dsmr.0.energy_delivered_total" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Exportenergie kWh total</span><input class="nw-config-input" data-nlp1-dp="exportEnergyKwh" value="${_nwHtmlEscape(dps.exportEnergyKwh || '')}" placeholder="dsmr.0.energy_returned_total" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Gas m³ optional</span><input class="nw-config-input" data-nlp1-dp="gasM3" value="${_nwHtmlEscape(dps.gasM3 || '')}" placeholder="dsmr.0.gas_delivered_total" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Aktiver Tarif optional</span><input class="nw-config-input" data-nlp1-dp="activeTariff" value="${_nwHtmlEscape(dps.activeTariff || '')}" placeholder="dsmr.0.active_tariff" /></label>
        </div>
        <div class="nw-config-empty" style="text-align:left;margin-top:10px;">Hinweis: Einspeisebegrenzung/Nulleinspeisung wird nicht hier aktiviert. Dafür bleibt der Export Guard für DE/NL mit separater Installerfreigabe und maximaler Einspeiseleistung zuständig.</div>
      </div>`;
    return card;
  }



  function _chargeKioskHtmlEscape(input) {
    return String(input == null ? '' : input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _chargeKioskStations() {
    const ck = currentConfig && currentConfig.chargeKiosk && typeof currentConfig.chargeKiosk === 'object' ? currentConfig.chargeKiosk : {};
    return Array.isArray(ck.stations) ? ck.stations : [];
  }

  function _chargeKioskToken() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'ST-';
    try {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      for (const b of bytes) out += alphabet[b % alphabet.length];
    } catch (_e) {
      out += Math.random().toString(36).slice(2, 10).toUpperCase();
    }
    return out.replace(/(.{3})(.{4})(.{4})/, '$1-$2-$3');
  }

  function _chargeKioskAssignedToText(v) {
    const arr = Array.isArray(v) ? v : [];
    return arr.map((x) => String(x || '').trim()).filter(Boolean).join(', ');
  }

  function _chargeKioskStationCatalog() {
    const sc = currentConfig && currentConfig.settingsConfig && typeof currentConfig.settingsConfig === 'object'
      ? currentConfig.settingsConfig
      : {};
    const groups = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
    const evcs = Array.isArray(sc.evcsList) ? sc.evcsList : [];
    const byKey = new Map();
    const ensure = (rawKey) => {
      const key = String(rawKey || '').trim();
      if (!key) return null;
      if (!byKey.has(key)) byKey.set(key, { stationKey: key, name: '', chargepoints: [] });
      return byKey.get(key);
    };
    groups.forEach((group) => {
      const item = ensure(group && group.stationKey);
      if (item && group && String(group.name || '').trim()) item.name = String(group.name || '').trim();
    });
    evcs.forEach((row, index) => {
      if (!row || row.enabled === false) return;
      const item = ensure(row.stationKey);
      if (!item) return;
      item.chargepoints.push({
        lp: `lp${index + 1}`,
        connectorNo: Math.max(0, Math.round(Number(row.connectorNo) || 0)),
        name: String(row.name || `Ladepunkt ${index + 1}`).trim(),
      });
    });
    return Array.from(byKey.values()).map((item) => {
      item.chargepoints.sort((a, b) => (a.connectorNo || 999) - (b.connectorNo || 999) || String(a.lp).localeCompare(String(b.lp)));
      return item;
    }).sort((a, b) => String(a.name || a.stationKey).localeCompare(String(b.name || b.stationKey), 'de'));
  }

  function _chargeKioskAssignedForStation(stationKey) {
    const key = String(stationKey || '').trim();
    const item = _chargeKioskStationCatalog().find((entry) => entry.stationKey === key);
    return item ? item.chargepoints.map((entry) => entry.lp) : [];
  }

  function _chargeKioskStationOptionsHtml(selectedKey) {
    const selected = String(selectedKey || '').trim();
    const options = ['<option value="">Keine Stationsgruppe verknüpft</option>'];
    _chargeKioskStationCatalog().forEach((item) => {
      const label = `${item.name || item.stationKey} · ${item.chargepoints.length} Port${item.chargepoints.length === 1 ? '' : 's'} · ${item.stationKey}`;
      options.push(`<option value="${_chargeKioskHtmlEscape(item.stationKey)}" ${selected === item.stationKey ? 'selected' : ''}>${_chargeKioskHtmlEscape(label)}</option>`);
    });
    return options.join('');
  }

  function buildChargeKioskCard() {
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-charge-kiosk-card';
    card.setAttribute('data-card', 'charge-kiosk');
    const isEos = _licenseEdition() === 'eos';
    const ck = currentConfig && currentConfig.chargeKiosk && typeof currentConfig.chargeKiosk === 'object' ? currentConfig.chargeKiosk : {};
    const stations = _chargeKioskStations();
    const rows = stations.map((row, idx) => {
      const r = row && typeof row === 'object' ? row : {};
      const id = String(r.id || `dc_station_${idx + 1}`).trim();
      const name = String(r.name || `DC Ladestation ${idx + 1}`).trim();
      const token = String(r.token || '').trim();
      const type = String(r.type || 'dc').trim().toLowerCase() === 'ac' ? 'ac' : 'dc';
      const assigned = _chargeKioskAssignedToText(r.assignedChargepoints || r.chargepoints || r.lps);
      const stationKey = String(r.stationKey || r.infrastructureStationKey || '').trim();
      const assignmentMode = String(r.assignmentMode || r.assignmentSource || (stationKey ? 'station' : 'manual')).trim().toLowerCase() === 'manual' ? 'manual' : 'station';
      const autoAssigned = _chargeKioskAssignedForStation(stationKey);
      const autoAssignedText = _chargeKioskAssignedToText(autoAssigned);
      const modes = Array.isArray(r.allowedModes) ? r.allowedModes : ['solar', 'fast'];
      const solar = modes.includes('solar');
      const fast = modes.includes('fast');
      const maintenance = r.maintenanceMode === true;
      const watchdogTimeoutSec = Number.isFinite(Number(r.watchdogTimeoutSec)) ? Math.max(15, Math.min(600, Math.round(Number(r.watchdogTimeoutSec)))) : 45;
      const layoutMode = ['single','dual','quad','auto'].includes(String(r.layoutMode || '').toLowerCase()) ? String(r.layoutMode || 'auto').toLowerCase() : 'auto';
      const controlBridgeRaw = String(r.controlBridge || r.commandBridge || 'charging-management').trim().toLowerCase();
      const controlBridge = ['charging-management','ems-intent','generic','readonly'].includes(controlBridgeRaw) ? controlBridgeRaw : 'charging-management';
      const commandStateId = String(r.commandStateId || r.commandObjectId || '').trim();
      const protocolHint = String(r.protocolHint || r.vendor || r.manufacturer || 'manufacturer-open').trim();
      const url = token ? `/display/station/${encodeURIComponent(token)}` : '';
      return `
        <div class="nw-config-card__row nw-charge-kiosk-row" data-charge-kiosk-station-row="${idx}">
          <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end;">
            <label class="nw-config-field"><span class="nw-config-label">Aktiv</span><select class="nw-config-input" data-ck-field="enabled"><option value="true" ${r.enabled !== false ? 'selected' : ''}>Ja</option><option value="false" ${r.enabled === false ? 'selected' : ''}>Nein</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Stations-ID</span><input class="nw-config-input" data-ck-field="id" value="${_chargeKioskHtmlEscape(id)}" placeholder="dc_station_01" /></label>
            <label class="nw-config-field"><span class="nw-config-label">Name am Display</span><input class="nw-config-input" data-ck-field="name" value="${_chargeKioskHtmlEscape(name)}" placeholder="DC Ladestation 01" /></label>
            <label class="nw-config-field"><span class="nw-config-label">Typ</span><select class="nw-config-input" data-ck-field="type"><option value="dc" ${type === 'dc' ? 'selected' : ''}>DC</option><option value="ac" ${type === 'ac' ? 'selected' : ''}>AC</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Steuerbrücke</span><select class="nw-config-input" data-ck-field="controlBridge"><option value="charging-management" ${controlBridge === 'charging-management' || controlBridge === 'ems-intent' ? 'selected' : ''}>Herstelleroffen über NexoWatt EOS</option><option value="generic" ${controlBridge === 'generic' ? 'selected' : ''}>Generischer JSON-Command-State</option><option value="readonly" ${controlBridge === 'readonly' ? 'selected' : ''}>Nur Anzeige</option></select><small>Kein OCPP-Zwang: OCPP, Modbus, MQTT, REST und Herstelleradapter laufen über LP-Mapping oder den optionalen Command-State.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Command-State optional</span><input class="nw-config-input" data-ck-field="commandStateId" value="${_chargeKioskHtmlEscape(commandStateId)}" placeholder="0_userdata.0.nexowatt.dc.command" /><small>Nur für generische Brücken. Platzhalter möglich: {stationId}, {lp}.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Protokoll-/Hersteller-Hinweis</span><input class="nw-config-input" data-ck-field="protocolHint" value="${_chargeKioskHtmlEscape(protocolHint)}" placeholder="OCPP / Modbus / MQTT / Herstelleradapter" /><small>Nur Hinweis/Diagnose. Die Display-Logik bleibt herstelleroffen.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Display-Token</span><input class="nw-config-input" data-ck-field="token" value="${_chargeKioskHtmlEscape(token)}" placeholder="ST-XXXX-XXXX" /></label>
            <div class="nw-config-field"><span class="nw-config-label">Token</span><button type="button" class="nw-btn nw-btn-secondary" data-ck-generate-token="1">Neu erzeugen</button></div>
          </div>
          <div class="nw-config-grid" style="grid-template-columns:minmax(240px,1.5fr) minmax(180px,.8fr) minmax(260px,1.7fr);gap:10px;margin-top:10px;align-items:end;">
            <label class="nw-config-field"><span class="nw-config-label">Ladeinfrastruktur-Station</span><select class="nw-config-input" data-ck-field="stationKey">${_chargeKioskStationOptionsHtml(stationKey)}</select><small>Verknüpft die Displayseite mit der vorhandenen Station unter „Stationen &amp; Ports“.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Port-Zuordnung</span><select class="nw-config-input" data-ck-field="assignmentMode"><option value="station" ${assignmentMode === 'station' ? 'selected' : ''}>Automatisch aus Station</option><option value="manual" ${assignmentMode === 'manual' ? 'selected' : ''}>Manuell (Experte/Legacy)</option></select></label>
            <div class="nw-config-field" data-ck-auto-assignment><span class="nw-config-label">Erkannte Ladepunkte</span><div class="nw-config-empty" style="text-align:left;padding:10px 12px;min-height:42px;" data-ck-auto-preview>${_chargeKioskHtmlEscape(autoAssignedText || (stationKey ? 'Keine aktiven Ports in dieser Station' : 'Bitte Station auswählen'))}</div><small>Alle aktiven Ladepunkte mit demselben Stations-Key erscheinen automatisch auf dieser Stationsseite.</small></div>
          </div>
          <div class="nw-config-grid" style="grid-template-columns:2fr 1fr 1fr;gap:10px;margin-top:10px;align-items:end;">
            <label class="nw-config-field" data-ck-manual-assignment ${assignmentMode === 'manual' ? '' : 'hidden'}><span class="nw-config-label">Manuelle LPs/Connectoren</span><input class="nw-config-input" data-ck-field="assignedChargepoints" value="${_chargeKioskHtmlEscape(assigned)}" placeholder="lp1, lp2" /><small>Nur im manuellen Legacy-/Expertenmodus verwendet.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Solar laden</span><select class="nw-config-input" data-ck-field="solar"><option value="true" ${solar ? 'selected' : ''}>Erlaubt</option><option value="false" ${!solar ? 'selected' : ''}>Aus</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Schnell laden</span><select class="nw-config-input" data-ck-field="fast"><option value="true" ${fast ? 'selected' : ''}>Erlaubt</option><option value="false" ${!fast ? 'selected' : ''}>Aus</option></select></label>
          </div>
          <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:10px;align-items:end;">
            <label class="nw-config-field"><span class="nw-config-label">Solarpreis €/kWh optional</span><input class="nw-config-input" type="number" step="0.0001" min="-1" max="5" data-ck-field="solarPriceEurPerKwh" value="${Number.isFinite(Number(r.solarPriceEurPerKwh)) ? Number(r.solarPriceEurPerKwh) : ''}" /></label>
            <label class="nw-config-field"><span class="nw-config-label">Schnellladepreis €/kWh optional</span><input class="nw-config-input" type="number" step="0.0001" min="-1" max="5" data-ck-field="fastPriceEurPerKwh" value="${Number.isFinite(Number(r.fastPriceEurPerKwh)) ? Number(r.fastPriceEurPerKwh) : ''}" /></label>
            <label class="nw-config-field"><span class="nw-config-label">Start/Stop am Display</span><select class="nw-config-input" data-ck-field="allowStartStop"><option value="true" ${r.allowStartStop !== false ? 'selected' : ''}>Erlaubt</option><option value="false" ${r.allowStartStop === false ? 'selected' : ''}>Nur Anzeige</option></select></label>
          </div>
          <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:10px;align-items:end;">
            <label class="nw-config-field"><span class="nw-config-label">Wartungsmodus</span><select class="nw-config-input" data-ck-field="maintenanceMode"><option value="false" ${r.maintenanceMode === true ? '' : 'selected'}>Aus</option><option value="true" ${r.maintenanceMode === true ? 'selected' : ''}>An</option></select><small>Display zeigt Wartung und blockiert Start/Stop.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Watchdog Timeout s</span><input class="nw-config-input" type="number" step="1" min="15" max="600" data-ck-field="watchdogTimeoutSec" value="${Number.isFinite(Number(r.watchdogTimeoutSec)) ? Number(r.watchdogTimeoutSec) : 45}" /><small>Offline, wenn kein Heartbeat innerhalb dieser Zeit kommt.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Display Refresh s</span><input class="nw-config-input" type="number" step="1" min="1" max="30" data-ck-field="displayRefreshSec" value="${Number.isFinite(Number(r.displayRefreshSec)) ? Number(r.displayRefreshSec) : 3}" /></label>
            <label class="nw-config-field"><span class="nw-config-label">Layout</span><select class="nw-config-input" data-ck-field="layoutMode"><option value="auto" ${String(r.layoutMode || 'auto') === 'auto' ? 'selected' : ''}>Auto</option><option value="single" ${String(r.layoutMode || '') === 'single' ? 'selected' : ''}>1 Connector groß</option><option value="dual" ${String(r.layoutMode || '') === 'dual' ? 'selected' : ''}>2 Connectoren</option><option value="quad" ${String(r.layoutMode || '') === 'quad' ? 'selected' : ''}>3–4 Connectoren</option><option value="compact" ${String(r.layoutMode || '') === 'compact' ? 'selected' : ''}>5+ Connectoren kompakt</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Sprachwahl am Display</span><select class="nw-config-input" data-ck-field="showLanguageSwitch"><option value="false" ${r.showLanguageSwitch === true ? '' : 'selected'}>Aus</option><option value="true" ${r.showLanguageSwitch === true ? 'selected' : ''}>DE/NL/EN anzeigen</option></select></label>
          </div>
          <div class="nw-config-card__subtitle" style="margin-top:10px;">Display-URL: <code>${_chargeKioskHtmlEscape(url || 'Token erzeugen und speichern')}</code></div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;"><button type="button" class="nw-btn nw-btn-danger" data-ck-delete="1">Station entfernen</button></div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="nw-config-card__header">
        <div>
          <div class="nw-config-card__title">EOS Ladestations-Display</div>
          <div class="nw-config-card__subtitle">Separate Vollbildseite pro Station. Bei Stationsverknüpfung erscheinen automatisch alle Ladepunkte/Ports dieser Station.</div>
        </div>
      </div>
      <div class="nw-config-card__body">
        ${isEos ? '' : '<div class="nw-config-empty" style="text-align:left;margin-bottom:10px;">Diese Funktion ist EOS-only. In Home bleibt die normale EVCS-Seite unverändert.</div>'}
        <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:10px;">
          <label class="nw-config-field"><span class="nw-config-label">Stationsdisplay aktiv</span><select class="nw-config-input" id="chargeKioskEnabled" ${isEos ? '' : 'disabled'}><option value="false">Aus</option><option value="true">An</option></select><small>Route: <code>/display/station/&lt;token&gt;</code></small></label>
        </div>
        <div id="chargeKioskStations">${rows || '<div class="nw-config-empty" style="text-align:left;">Noch keine Display-Station angelegt.</div>'}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;"><button type="button" class="nw-btn" id="chargeKioskAddStation" ${isEos ? '' : 'disabled'}>Stationsseite anlegen</button></div>
      </div>`;

    const enabledEl = card.querySelector('#chargeKioskEnabled');
    if (enabledEl) enabledEl.value = ck.enabled === true ? 'true' : 'false';

    card.querySelectorAll('[data-ck-generate-token]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-charge-kiosk-station-row]');
        const inp = row && row.querySelector('[data-ck-field="token"]');
        if (inp) inp.value = _chargeKioskToken();
      });
    });
    const refreshChargeKioskAssignmentRow = (row) => {
      if (!row) return;
      const stationSelect = row.querySelector('[data-ck-field="stationKey"]');
      const modeSelect = row.querySelector('[data-ck-field="assignmentMode"]');
      const manualWrap = row.querySelector('[data-ck-manual-assignment]');
      const preview = row.querySelector('[data-ck-auto-preview]');
      const stationKey = stationSelect ? String(stationSelect.value || '').trim() : '';
      const assignmentMode = modeSelect && modeSelect.value === 'manual' ? 'manual' : 'station';
      const automatic = _chargeKioskAssignedForStation(stationKey);
      if (manualWrap) manualWrap.hidden = assignmentMode !== 'manual';
      if (preview) preview.textContent = automatic.length
        ? _chargeKioskAssignedToText(automatic)
        : (stationKey ? 'Keine aktiven Ports in dieser Station' : 'Bitte Station auswählen');
    };
    card.querySelectorAll('[data-charge-kiosk-station-row]').forEach((row) => {
      const stationSelect = row.querySelector('[data-ck-field="stationKey"]');
      const modeSelect = row.querySelector('[data-ck-field="assignmentMode"]');
      if (stationSelect) stationSelect.addEventListener('change', () => refreshChargeKioskAssignmentRow(row));
      if (modeSelect) modeSelect.addEventListener('change', () => refreshChargeKioskAssignmentRow(row));
      refreshChargeKioskAssignmentRow(row);
    });

    card.querySelectorAll('[data-ck-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('[data-charge-kiosk-station-row]');
        if (row) row.remove();
      });
    });
    const add = card.querySelector('#chargeKioskAddStation');
    if (add) add.addEventListener('click', () => {
      currentConfig.chargeKiosk = currentConfig.chargeKiosk || {};
      const list = Array.isArray(currentConfig.chargeKiosk.stations) ? currentConfig.chargeKiosk.stations.slice() : [];
      const next = list.length + 1;
      const usedStationKeys = new Set(list.map((entry) => String(entry && entry.stationKey || '').trim()).filter(Boolean));
      const catalog = _chargeKioskStationCatalog();
      const linked = catalog.find((entry) => !usedStationKeys.has(entry.stationKey)) || null;
      list.push({
        id: linked ? linked.stationKey : `dc_station_${next}`,
        name: linked ? (linked.name || linked.stationKey) : `DC Ladestation ${next}`,
        type: 'dc',
        token: _chargeKioskToken(),
        enabled: true,
        stationKey: linked ? linked.stationKey : '',
        assignmentMode: linked ? 'station' : 'manual',
        assignedChargepoints: linked ? linked.chargepoints.map((entry) => entry.lp) : [],
        allowedModes: ['solar','fast'],
        showPrice: true,
        showSolarShare: true,
        allowStartStop: true,
        maintenanceMode: false,
        watchdogTimeoutSec: 45,
        displayRefreshSec: 3,
        layoutMode: 'auto',
        showLanguageSwitch: false,
        controlBridge: 'charging-management',
        protocolHint: 'manufacturer-open'
      });
      currentConfig.chargeKiosk.stations = list;
      try { initInstallerBackLink(); } catch (_e) {}

  buildAppsUI();
    });
    return card;
  }

  function _meshHtmlEscape(input) {
    return String(input === undefined || input === null ? '' : input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _meshNodes() {
    const cfg = currentConfig && currentConfig.meshMicrogrid && typeof currentConfig.meshMicrogrid === 'object' ? currentConfig.meshMicrogrid : {};
    return Array.isArray(cfg.nodes) ? cfg.nodes : [];
  }

  function _meshNodeRow(node, index) {
    const n = node && typeof node === 'object' ? node : {};
    const id = _meshHtmlEscape(n.id || `node_${index + 1}`);
    const name = _meshHtmlEscape(n.name || `Energie-Knoten ${index + 1}`);
    const type = _meshHtmlEscape(n.type || 'consumer');
    const role = _meshHtmlEscape(n.role || 'consumer');
    const priority = _meshHtmlEscape(n.priority || 100);
    const powerDp = _meshHtmlEscape(n.powerDp || '');
    const surplusPowerDp = _meshHtmlEscape(n.surplusPowerDp || '');
    const demandPowerDp = _meshHtmlEscape(n.demandPowerDp || '');
    const socDp = _meshHtmlEscape(n.socDp || '');
    const gridImportPowerDp = _meshHtmlEscape(n.gridImportPowerDp || '');
    const gridExportPowerDp = _meshHtmlEscape(n.gridExportPowerDp || '');
    const minPowerW = _meshHtmlEscape(n.minPowerW || '');
    const maxPowerW = _meshHtmlEscape(n.maxPowerW || '');
    const maxImportW = _meshHtmlEscape(n.maxImportW || '');
    const maxExportW = _meshHtmlEscape(n.maxExportW || '');
    const maxChargeW = _meshHtmlEscape(n.maxChargeW || '');
    const maxDischargeW = _meshHtmlEscape(n.maxDischargeW || '');
    const maxLoadW = _meshHtmlEscape(n.maxLoadW || '');
    const maxGenerationW = _meshHtmlEscape(n.maxGenerationW || '');
    const targetGroupIds = _meshHtmlEscape(Array.isArray(n.targetGroupIds) ? n.targetGroupIds.join(',') : (n.targetGroupIds || n.targetGroups || ''));
    const enabled = n.enabled !== false ? 'true' : 'false';
    return `
      <div class="nw-config-subcard" data-mesh-node-row>
        <div class="nw-config-grid nw-config-grid--3">
          <label class="nw-config-field"><span class="nw-config-label">Knoten-ID</span><input class="nw-config-input" data-mesh-field="id" value="${id}" placeholder="pv_dach_1" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Name</span><input class="nw-config-input" data-mesh-field="name" value="${name}" placeholder="PV Dach 1" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Aktiv</span><select class="nw-config-input" data-mesh-field="enabled"><option value="true" ${enabled === 'true' ? 'selected' : ''}>Ja</option><option value="false" ${enabled === 'false' ? 'selected' : ''}>Nein</option></select></label>
          <label class="nw-config-field"><span class="nw-config-label">Typ</span><select class="nw-config-input" data-mesh-field="type">
            ${['producer','consumer','storage','grid','chargepoint','thermal','generic'].map(v => `<option value="${v}" ${type === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select></label>
          <label class="nw-config-field"><span class="nw-config-label">Rolle</span><select class="nw-config-input" data-mesh-field="role">
            ${['producer','consumer','storage','grid'].map(v => `<option value="${v}" ${role === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select><small>Rolle entscheidet, wie Leistung im Cluster gezählt wird.</small></label>
          <label class="nw-config-field"><span class="nw-config-label">Priorität</span><input class="nw-config-input" data-mesh-field="priority" value="${priority}" placeholder="100" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Signed Leistung W</span><input class="nw-config-input" data-mesh-field="powerDp" value="${powerDp}" placeholder="alias.0.pv.power" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Überschuss W optional</span><input class="nw-config-input" data-mesh-field="surplusPowerDp" value="${surplusPowerDp}" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Bedarf W optional</span><input class="nw-config-input" data-mesh-field="demandPowerDp" value="${demandPowerDp}" /></label>
          <label class="nw-config-field"><span class="nw-config-label">SoC % optional</span><input class="nw-config-input" data-mesh-field="socDp" value="${socDp}" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Grid Import W optional</span><input class="nw-config-input" data-mesh-field="gridImportPowerDp" value="${gridImportPowerDp}" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Grid Export W optional</span><input class="nw-config-input" data-mesh-field="gridExportPowerDp" value="${gridExportPowerDp}" /></label>
        </div>
        <div class="nw-config-grid nw-config-grid--4" style="margin-top:10px;">
          <label class="nw-config-field"><span class="nw-config-label">Min. Leistung W</span><input class="nw-config-input" data-mesh-field="minPowerW" value="${minPowerW}" placeholder="0" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Leistung W</span><input class="nw-config-input" data-mesh-field="maxPowerW" value="${maxPowerW}" placeholder="0 = kein Limit" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Import W</span><input class="nw-config-input" data-mesh-field="maxImportW" value="${maxImportW}" placeholder="0" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Export W</span><input class="nw-config-input" data-mesh-field="maxExportW" value="${maxExportW}" placeholder="0" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Laden W</span><input class="nw-config-input" data-mesh-field="maxChargeW" value="${maxChargeW}" placeholder="0" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Entladen W</span><input class="nw-config-input" data-mesh-field="maxDischargeW" value="${maxDischargeW}" placeholder="0" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Last W</span><input class="nw-config-input" data-mesh-field="maxLoadW" value="${maxLoadW}" placeholder="0" /></label>
          <label class="nw-config-field"><span class="nw-config-label">Max. Erzeugung W</span><input class="nw-config-input" data-mesh-field="maxGenerationW" value="${maxGenerationW}" placeholder="0" /></label>
          <label class="nw-config-field nw-config-field--wide"><span class="nw-config-label">Zielgruppen IDs optional</span><input class="nw-config-input" data-mesh-field="targetGroupIds" value="${targetGroupIds}" placeholder="lp_gruppe,speicher_gruppe" /><small>Optional: Knoten direkt Zielgruppen zuordnen. Alternativ Gruppen über memberNodeIds/memberTypes definieren.</small></label>
        </div>
      </div>`;
  }

  /** Microgrid ist eine EMS-App. Der Reiter bindet die geschützte React-Anwendung
   * ein; Einrichtung, Regelung und Abrechnung teilen denselben Installationszustand.
   * Noch nicht gespeicherte Installation darf keine Backend-Seite vorzeitig öffnen. */
  function buildMeshMicrogridCard() {
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-mesh-microgrid-card';
    const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps && currentConfig.emsApps.apps.meshMicrogrid;
    if (!app || !app.installed) {
      card.textContent = 'Microgrid-Installation zuerst mit Speichern übernehmen. Danach stehen Einrichtung und Betreiberübersicht hier bereit.';
      return card;
    }
    const frame = document.createElement('iframe');
    frame.title = 'EMS Microgrid – Einrichtung, Regelung und Abrechnung';
    const instance = new URLSearchParams(window.location.search).get('instance') || '0';
    frame.src = `/ems/microgrid/?embedded=1&instance=${encodeURIComponent(instance)}#/mesh-coordinator`;
    frame.loading = 'lazy';
    frame.style.cssText = 'display:block;width:100%;height:85vh;min-height:700px;border:0;border-radius:12px;';
    card.appendChild(frame);
    // Bestehende neutrale Bridge-Zuordnungen bleiben editierbar, solange noch kein
    // Master/Slave-Koordinator eingerichtet wurde. Neue Anlagen nutzen nur den Koordinator.
    if (currentConfig.meshApp && currentConfig.meshApp.role === 'off' && _meshNodes().length) {
      const legacy = document.createElement('details');
      const title = document.createElement('summary'); title.textContent = 'Vorhandene lokale Bridge-Zuordnungen';
      legacy.appendChild(title); legacy.appendChild(buildLegacyMeshMicrogridCard()); card.appendChild(legacy);
    }
    return card;
  }

  function buildLegacyMeshMicrogridCard() {
    const isEos = _licenseEdition() === 'eos';
    const cfg = currentConfig && currentConfig.meshMicrogrid && typeof currentConfig.meshMicrogrid === 'object' ? currentConfig.meshMicrogrid : {};
    const rows = _meshNodes().map((node, idx) => _meshNodeRow(node, idx)).join('');
    const localBridge = cfg.localBridge && typeof cfg.localBridge === 'object' ? cfg.localBridge : {};
    const localBridgeMappingsJson = _meshHtmlEscape(JSON.stringify(Array.isArray(localBridge.mappings) ? localBridge.mappings : [], null, 2));
    const targetGroupsJson = _meshHtmlEscape(JSON.stringify(Array.isArray(cfg.targetGroups) ? cfg.targetGroups : [], null, 2));
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-mesh-microgrid-card';
    card.innerHTML = `
      <div class="nw-config-card__header"><div><div class="nw-config-card__title">Microgrid · bestehende Bridge-Zuordnungen</div><div class="nw-config-card__subtitle">Bestandskonfiguration der neutralen lokalen Bridge. Sobald Master/Slave eingerichtet ist, übernimmt dessen Regelpfad; diese Zuordnungen bleiben gespeichert.</div></div></div>
      <div class="nw-config-card__body">
        ${isEos ? '' : '<div class="nw-config-empty" style="text-align:left;margin-bottom:10px;">Nur mit EOS-Lizenz verfügbar.</div>'}
        <div class="nw-config-grid nw-config-grid--3">
          <label class="nw-config-field"><span class="nw-config-label">Modus</span><select class="nw-config-input" id="meshMicrogridMode" ${isEos ? '' : 'disabled'}><option value="diagnostic">Diagnose / read-only</option><option value="local_first">Local First vorbereitet</option><option value="grid_last">Grid Last vorbereitet</option><option value="off">Aus</option></select></label>
          <label class="nw-config-field"><span class="nw-config-label">Grid-/Clusterlimit W optional</span><input class="nw-config-input" id="meshMicrogridGridLimitW" value="${_meshHtmlEscape(cfg.gridLimitW || '')}" placeholder="60000" ${isEos ? '' : 'disabled'} /></label>
          <label class="nw-config-field"><span class="nw-config-label">Cluster-ID</span><input class="nw-config-input" id="meshMicrogridClusterId" value="${_meshHtmlEscape(cfg.clusterId || 'cluster_01')}" ${isEos ? '' : 'disabled'} /></label>
          <label class="nw-config-field"><span class="nw-config-label">Cluster-Name</span><input class="nw-config-input" id="meshMicrogridClusterName" value="${_meshHtmlEscape(cfg.clusterName || 'Lokaler Energieverbund')}" ${isEos ? '' : 'disabled'} /></label>
        </div>
        <div class="nw-config-subcard" style="margin-top:12px;">
          <div class="nw-config-card__title">Feldtest-Steuerung & Tailscale Mesh</div>
          <div class="nw-config-card__subtitle">Für den direkten Feldtest wird ein neutraler JSON-Command-State ausgegeben. NexoWatt schreibt weiterhin keine OCPP-/Modbus-/MQTT-/Hersteller-Rohdatenpunkte direkt; die nachgelagerte Bridge oder die zweite NexoWatt-Instanz im separaten Mesh-Tailscale setzt den Intent um.</div>
          <div class="nw-config-grid nw-config-grid--3">
            <label class="nw-config-field"><span class="nw-config-label">Steuermodus</span><select class="nw-config-input" id="meshMicrogridControlMode" ${isEos ? '' : 'disabled'}><option value="diagnostic">Nur Diagnose</option><option value="field_test">Feldtest: JSON-Command-State ausgeben</option><option value="active">Aktiv: Local-First Commands ausgeben</option><option value="off">Aus</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Installateurfreigabe Steuerung</span><select class="nw-config-input" id="meshMicrogridFieldApproved" ${isEos ? '' : 'disabled'}><option value="false">Nein</option><option value="true">Ja</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Max. Commands je Tick</span><input class="nw-config-input" id="meshMicrogridMaxCommandsPerTick" value="${_meshHtmlEscape(cfg.maxCommandsPerTick || 3)}" placeholder="3" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field nw-config-field--wide"><span class="nw-config-label">Neutraler Command-State</span><input class="nw-config-input" id="meshMicrogridCommandStateDp" value="${_meshHtmlEscape(cfg.commandStateDp || '')}" placeholder="0_userdata.0.nexowatt.mesh.command" ${isEos ? '' : 'disabled'} /><small>Hier wird ein JSON-Envelope geschrieben. Die Umsetzung übernimmt eine separate Bridge/Instanz.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Tailscale Mesh aktiv</span><select class="nw-config-input" id="meshMicrogridTailscaleEnabled" ${isEos ? '' : 'disabled'}><option value="false">Aus</option><option value="true">An</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Tailscale Profil</span><input class="nw-config-input" id="meshMicrogridTailscaleProfile" value="${_meshHtmlEscape((cfg.tailscale && cfg.tailscale.profile) || 'mesh-microgrid')}" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field"><span class="nw-config-label">Lokale Mesh-Node-ID</span><input class="nw-config-input" id="meshMicrogridTailscaleLocalNodeId" value="${_meshHtmlEscape((cfg.tailscale && cfg.tailscale.localNodeId) || cfg.clusterId || 'local')}" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field nw-config-field--wide"><span class="nw-config-label">Peer-URLs im Mesh-Tailscale</span><textarea class="nw-config-input" id="meshMicrogridTailscalePeerUrls" rows="3" placeholder="http://100.x.y.z:8188
http://mesh-peer.local:8188" ${isEos ? '' : 'disabled'}>${_meshHtmlEscape(Array.isArray(cfg.tailscale && cfg.tailscale.peerUrls) ? cfg.tailscale.peerUrls.join('\n') : ((cfg.tailscale && cfg.tailscale.peerUrls) || ''))}</textarea><small>Diese Verbindung ist getrennt von der Fernwartung. Hier nur die Mesh/Microgrid-Tailscale-IP/URL eintragen.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Peer Token optional</span><input class="nw-config-input" id="meshMicrogridTailscalePeerToken" value="${_meshHtmlEscape((cfg.tailscale && cfg.tailscale.peerToken) || '')}" ${isEos ? '' : 'disabled'} /></label>
          </div>
        </div>
        <div class="nw-config-subcard" style="margin-top:12px;">
          <div class="nw-config-card__title">Command Receiver / Peer-Handshake</div>
          <div class="nw-config-card__subtitle">Empfängt neutrale Mesh-Kommandos von anderen NexoWatt-Instanzen über das separate Mesh-Tailscale. Der Receiver schreibt keine Hardware direkt, sondern nur den lokalen Empfangs-Command-State für eine nachgelagerte Bridge.</div>
          <div class="nw-config-grid nw-config-grid--3">
            <label class="nw-config-field"><span class="nw-config-label">Command Receiver aktiv</span><select class="nw-config-input" id="meshMicrogridReceiverEnabled" ${isEos ? '' : 'disabled'}><option value="false">Aus</option><option value="true">An</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Remote Commands akzeptieren</span><select class="nw-config-input" id="meshMicrogridReceiverAccept" ${isEos ? '' : 'disabled'}><option value="false">Nein</option><option value="true">Ja</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Cluster-ID prüfen</span><select class="nw-config-input" id="meshMicrogridReceiverRequireCluster" ${isEos ? '' : 'disabled'}><option value="true">Ja</option><option value="false">Nein</option></select></label>
            <label class="nw-config-field nw-config-field--wide"><span class="nw-config-label">Lokaler Empfangs-Command-State</span><input class="nw-config-input" id="meshMicrogridReceiverStateDp" value="${_meshHtmlEscape((cfg.receiver && (cfg.receiver.localCommandStateDp || cfg.receiver.receivedCommandStateDp)) || '')}" placeholder="0_userdata.0.nexowatt.mesh.receivedCommand" ${isEos ? '' : 'disabled'} /><small>Remote-Kommandos werden hier als neutraler JSON-Envelope geschrieben. Die lokale Bridge setzt sie hersteller-/protokollspezifisch um.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">Receiver Token optional</span><input class="nw-config-input" id="meshMicrogridReceiverToken" value="${_meshHtmlEscape((cfg.receiver && cfg.receiver.peerToken) || '')}" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field"><span class="nw-config-label">Replay TTL Sekunden</span><input class="nw-config-input" id="meshMicrogridReceiverReplayTtl" value="${_meshHtmlEscape((cfg.receiver && cfg.receiver.replayTtlSec) || 900)}" placeholder="900" ${isEos ? '' : 'disabled'} /></label>
          </div>
        </div>
        <div class="nw-config-subcard" style="margin-top:12px;">
          <div class="nw-config-card__title">Lokale Bridge-Zuordnung</div>
          <div class="nw-config-card__subtitle">Ordnet neutrale Mesh-Command-Intents lokalen Ziel-Command-States zu. Das bleibt hersteller- und protokolloffen: Die lokale Bridge/Herstellerintegration setzt den JSON-Intent um; Mesh/Microgrid schreibt keine Geräte-Rohbefehle direkt.</div>
          <div class="nw-config-grid nw-config-grid--3">
            <label class="nw-config-field"><span class="nw-config-label">Lokale Bridge aktiv</span><select class="nw-config-input" id="meshMicrogridLocalBridgeEnabled" ${isEos ? '' : 'disabled'}><option value="false">Aus</option><option value="true">An</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Ausgabemodus</span><select class="nw-config-input" id="meshMicrogridLocalBridgeOutputMode" ${isEos ? '' : 'disabled'}><option value="global">Globaler Command-State</option><option value="mapped">Nur gemappte Ziel-States</option><option value="both">Global + gemappt</option></select></label>
            <label class="nw-config-field"><span class="nw-config-label">Default Bridge Command-State</span><input class="nw-config-input" id="meshMicrogridLocalBridgeDefaultState" value="${_meshHtmlEscape(localBridge.defaultCommandStateDp || '')}" placeholder="0_userdata.0.nexowatt.mesh.bridge.command" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field"><span class="nw-config-label">Default Bridge ACK-State optional</span><input class="nw-config-input" id="meshMicrogridLocalBridgeDefaultAckState" value="${_meshHtmlEscape(localBridge.defaultAckStateDp || '')}" placeholder="0_userdata.0.nexowatt.mesh.bridge.ack" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field"><span class="nw-config-label">Bridge-ACK auswerten</span><select class="nw-config-input" id="meshMicrogridLocalBridgeAckEnabled" ${isEos ? '' : 'disabled'}><option value="false">Aus</option><option value="true">An</option></select><small>Nur Rückmeldungen lesen; keine Hardwaresteuerung.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">ACK als Gate erforderlich</span><select class="nw-config-input" id="meshMicrogridLocalBridgeAckRequired" ${isEos ? '' : 'disabled'}><option value="false">Nein, nur Diagnose</option><option value="true">Ja, Folge-Commands blockieren</option></select><small>Bei Timeout/Fehler/offenem ACK werden neue Commands zu diesem Ziel blockiert.</small></label>
            <label class="nw-config-field"><span class="nw-config-label">ACK Timeout Sekunden</span><input class="nw-config-input" id="meshMicrogridLocalBridgeAckTimeoutSec" value="${_meshHtmlEscape(localBridge.ackTimeoutSec || 60)}" placeholder="60" ${isEos ? '' : 'disabled'} /></label>
            <label class="nw-config-field nw-config-field--wide"><span class="nw-config-label">Bridge-Zuordnungen JSON</span><textarea class="nw-config-input" id="meshMicrogridLocalBridgeMappingsJson" rows="6" ${isEos ? '' : 'disabled'}>${localBridgeMappingsJson}</textarea><small>Beispiel je Eintrag: { "id":"lp1_bridge", "nodeId":"lp1", "commandStateDp":"0_userdata.0.nexowatt.mesh.lp1.command", "ackStateDp":"0_userdata.0.nexowatt.mesh.lp1.ack", "type":"chargepoint", "maxPowerW":11000 }. ACK-/Status-States werden nur gelesen; keine ZIP/TGZ und keine Roh-Hardwarebefehle.</small></label>
          </div>
        </div>
        <div class="nw-config-subcard" style="margin-top:12px;">
          <div class="nw-config-card__title">Zielgruppen-Strategie</div>
          <div class="nw-config-card__subtitle">Bündelt Ladepunkte, Speicher, Verbraucher und Erzeuger in Gruppen. Gruppenprioritäten und Gruppenlimits werden im CommandGuard bewertet. Die Ausgabe bleibt ein neutraler Command-Intent ohne direkten Hardwarewrite.</div>
          <label class="nw-config-field nw-config-field--wide"><span class="nw-config-label">Zielgruppen JSON</span><textarea class="nw-config-input" id="meshMicrogridTargetGroupsJson" rows="7" ${isEos ? '' : 'disabled'}>${targetGroupsJson}</textarea><small>Beispiel: [{ "id":"lp_gruppe", "name":"Ladepunkte", "type":"chargepoint", "memberTypes":["chargepoint"], "priority":20, "maxPowerW":22000 }]. 0 = kein Limit.</small></label>
        </div>
        <div class="nw-config-card__subtitle" style="margin-top:10px;">Knoten: PV/Erzeuger, Verbraucher/Gebäude, Speicher, Netzpunkt, Ladepunktgruppen oder thermische Verbraucher. Technische Zuordnung bleibt im Installerbereich.</div>
        <div id="meshMicrogridNodes">${rows || '<div class="nw-config-empty" style="text-align:left;">Noch keine Mesh-/Microgrid-Knoten angelegt.</div>'}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;"><button type="button" class="nw-btn" id="meshMicrogridAddNode" ${isEos ? '' : 'disabled'}>Knoten anlegen</button></div>
      </div>`;
    const enabled = card.querySelector('#meshMicrogridEnabled');
    if (enabled) enabled.value = cfg.enabled === true ? 'true' : 'false';
    const mode = card.querySelector('#meshMicrogridMode');
    if (mode) mode.value = ['off','diagnostic','local_first','grid_last'].includes(String(cfg.mode || '')) ? String(cfg.mode) : 'diagnostic';
    const controlMode = card.querySelector('#meshMicrogridControlMode');
    if (controlMode) controlMode.value = ['off','diagnostic','field_test','active'].includes(String(cfg.controlMode || '')) ? String(cfg.controlMode) : 'diagnostic';
    const approved = card.querySelector('#meshMicrogridFieldApproved');
    if (approved) approved.value = cfg.fieldTestApproved === true || cfg.installerApproved === true ? 'true' : 'false';
    const tsEnabled = card.querySelector('#meshMicrogridTailscaleEnabled');
    if (tsEnabled) tsEnabled.value = cfg.tailscale && cfg.tailscale.enabled === true ? 'true' : 'false';
    const rx = cfg.receiver && typeof cfg.receiver === 'object' ? cfg.receiver : {};
    const receiverEnabled = card.querySelector('#meshMicrogridReceiverEnabled');
    if (receiverEnabled) receiverEnabled.value = rx.enabled === true ? 'true' : 'false';
    const receiverAccept = card.querySelector('#meshMicrogridReceiverAccept');
    if (receiverAccept) receiverAccept.value = rx.acceptRemoteCommands === true ? 'true' : 'false';
    const receiverRequire = card.querySelector('#meshMicrogridReceiverRequireCluster');
    if (receiverRequire) receiverRequire.value = rx.requireClusterMatch === false ? 'false' : 'true';
    const lbEnabled = card.querySelector('#meshMicrogridLocalBridgeEnabled');
    if (lbEnabled) lbEnabled.value = localBridge.enabled === true ? 'true' : 'false';
    const lbMode = card.querySelector('#meshMicrogridLocalBridgeOutputMode');
    if (lbMode) lbMode.value = ['global','mapped','both'].includes(String(localBridge.outputMode || '')) ? String(localBridge.outputMode) : 'global';
    const lbAckEnabled = card.querySelector('#meshMicrogridLocalBridgeAckEnabled');
    if (lbAckEnabled) lbAckEnabled.value = localBridge.ackEnabled === true ? 'true' : 'false';
    const lbAck = card.querySelector('#meshMicrogridLocalBridgeAckEnabled');
    if (lbAck) lbAck.value = localBridge.ackEnabled === true ? 'true' : 'false';
    const lbAckRequired = card.querySelector('#meshMicrogridLocalBridgeAckRequired');
    if (lbAckRequired) lbAckRequired.value = localBridge.ackRequired === true ? 'true' : 'false';
    const add = card.querySelector('#meshMicrogridAddNode');
    if (add) add.addEventListener('click', () => {
      currentConfig.meshMicrogrid = currentConfig.meshMicrogrid || {};
      const list = Array.isArray(currentConfig.meshMicrogrid.nodes) ? currentConfig.meshMicrogrid.nodes.slice() : [];
      const next = list.length + 1;
      list.push({ id: `node_${next}`, name: `Energie-Knoten ${next}`, type: 'consumer', role: 'consumer', enabled: true, priority: 100, powerDp: '' });
      currentConfig.meshMicrogrid.nodes = list;
      try { buildAppsUI(); } catch (_e) {}
    });
    return card;
  }

  function buildAppCenterStructurePanels() {
    const mount = (el, card) => {
      if (!el) return;
      el.innerHTML = '';
      if (card) el.appendChild(card);
    };

    /**
     * App-Center-Ordnungsregel ab 0.8.37:
     * - Der Reiter „Apps“ ist nur der App-Katalog mit Installiert/Aktiv.
     * - Länder-/P1-Konfiguration bleibt in „Zuordnung“.
     * - DC-Stationsseiten bleiben in „Ladepunkte“.
     * - Mesh/Microgrid bekommt einen eigenen Reiter und wird nur sichtbar,
     *   wenn die Funktions-App installiert ist. Dadurch stehen im Apps-Reiter
     *   keine tiefen Modul-Einstellungen mehr.
     */
    const isMeshInstalled = _isAppLicensed('meshMicrogrid') && (() => {
      const cb = document.getElementById('app_meshMicrogrid_installed');
      if (cb) return !!cb.checked;
      const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps && currentConfig.emsApps.apps.meshMicrogrid
        ? currentConfig.emsApps.apps.meshMicrogrid
        : null;
      return !!(app && app.installed);
    })();
    const isOperatingStrategiesInstalled = _isAppLicensed('operatingStrategies') && (() => {
      const cb = document.getElementById('app_operatingStrategies_installed');
      if (cb) return !!cb.checked;
      const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps && currentConfig.emsApps.apps.operatingStrategies
        ? currentConfig.emsApps.apps.operatingStrategies
        : null;
      return !!(app && app.installed);
    })();
    const isNetOperatorInstalled = _isAppLicensed('netOperator') && (() => {
      const cb = document.getElementById('app_netOperator_installed');
      if (cb) return !!cb.checked;
      const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps && currentConfig.emsApps.apps.netOperator
        ? currentConfig.emsApps.apps.netOperator
        : null;
      return !!(app && app.installed);
    })();

    mount(els.systemProfileMount, buildSystemProfileCard());
    mount(els.nlP1Mount, buildNlP1Card());
    mount(els.chargeKioskMount, buildChargeKioskCard());
    mount(els.meshMicrogridMount, isMeshInstalled ? buildMeshMicrogridCard() : null);
    if (els.netOperatorMount) {
      els.netOperatorMount.innerHTML = '';
      if (isNetOperatorInstalled && window.NexoWattNetOperatorAppCenter) {
        const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps ? currentConfig.emsApps.apps.netOperator : null;
        window.NexoWattNetOperatorAppCenter.render(
          els.netOperatorMount,
          currentConfig && currentConfig.netOperatorInterface ? currentConfig.netOperatorInterface : {},
          !!(app && app.installed && app.enabled),
        ).catch(() => undefined);
      }
    }
    if (els.operatingStrategiesMount) {
      els.operatingStrategiesMount.innerHTML = '';
      if (isOperatingStrategiesInstalled && window.NexoWattOperatingStrategiesAppCenter) {
        const app = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps ? currentConfig.emsApps.apps.operatingStrategies : null;
        window.NexoWattOperatingStrategiesAppCenter.render(
          els.operatingStrategiesMount,
          currentConfig || {},
          !!(app && app.installed && app.enabled),
        ).catch(() => undefined);
      }
    }
  }

  function setupInstallerBackButton() {
    const btn = els.backInstaller;
    if (!btn || btn.__nwBackInstallerBound) return;
    btn.__nwBackInstallerBound = true;

    const parseQuery = () => {
      try { return new URLSearchParams(window.location.search || ''); } catch (_e) { return new URLSearchParams(''); }
    };

    const detectInstance = () => {
      const qs = parseQuery();
      const raw = qs.get('instance') || qs.get('inst') || qs.get('adapterInstance') || '';
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return Math.round(n);

      const hash = String(window.location.hash || '');
      const m = hash.match(/tab-nexowatt-ui-(\d+)/i);
      if (m && m[1]) return Math.max(0, Math.round(Number(m[1]) || 0));

      return 0;
    };

    const detectAdminOrigin = () => {
      const qs = parseQuery();
      const queryOrigin = qs.get('adminOrigin') || qs.get('adminUrl') || '';
      if (queryOrigin) {
        try { return new URL(queryOrigin, window.location.href).origin; } catch (_e0) {}
      }

      // Wenn das App-Center direkt aus dem ioBroker-/EOS-Admin geöffnet wurde, ist
      // der Referrer die beste Quelle für Protokoll, Host und individuellen Admin-Port.
      // Wichtig: Referrer vom gleichen Adapter-Webserver-Port werden bewusst ignoriert,
      // weil sie wieder auf 8188/#tab-... führen würden statt zurück zum Admin.
      if (document.referrer) {
        try {
          const ref = new URL(document.referrer);
          const currentOrigin = window.location.origin || '';
          const looksLikeAdmin = (ref.origin !== currentOrigin) && (
            /tab-nexowatt-ui-\d+/i.test(ref.hash || '') ||
            String(ref.port || '') === '8081' ||
            /admin/i.test(ref.pathname || '')
          );
          if (ref && ref.protocol && ref.hostname && looksLikeAdmin) return ref.origin;
        } catch (_e1) {}
      }

      // Direkter Adapter-Port-Fall: gleiche IP/Hostname, aber Admin-Port. 0.0.0.0
      // ist kein sinnvoller Browser-Zielhost und wird auf localhost normalisiert.
      const proto = (window.location.protocol === 'https:') ? 'https:' : 'http:';
      let host = window.location.hostname || '127.0.0.1';
      if (host === '0.0.0.0') host = 'localhost';
      const adminPort = qs.get('adminPort') || qs.get('ioBrokerAdminPort') || qs.get('port') || '8081';
      return `${proto}//${host}:${adminPort}`;
    };

    const buildTarget = () => {
      const instance = detectInstance();
      return `${detectAdminOrigin()}/#tab-nexowatt-ui-${instance}`;
    };

    btn.setAttribute('href', buildTarget());
    btn.addEventListener('click', (ev) => {
      const target = buildTarget();
      try {
        ev.preventDefault();
        window.top.location.href = target;
      } catch (_e) {
        window.location.href = target;
      }
    });
  }

  function buildAppsUI() {
    if (!els.appsList) return;
    els.appsList.innerHTML = '';

    const getSt = (appId) => {
      const a = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps ? currentConfig.emsApps.apps[appId] : null;
      return a && typeof a === 'object' ? a : { installed: false, enabled: false };
    };

    const licenseCard = document.createElement('div');
    licenseCard.className = 'nw-config-card nw-license-edition-card';
    const licenseLimit = ` · Bis ${_maxEvcsCount()} Ladepunkte · ${_maxStorageCount()} Speichersysteme`;
    licenseCard.innerHTML = `<div class="nw-config-card__header"><div><div class="nw-config-card__title">Lizenz: ${_licenseLabel()}</div><div class="nw-config-card__subtitle">${_licenseEdition() === 'eos' ? 'Pro ist die Vollversion mit allen Apps, Industrie-Skalierung und künftigen Erweiterungen.' : (_licenseEdition() === 'hems' ? 'Home zeigt die freigegebenen Basis-Apps mit bis zu 50 kW Speicherleistung.' : 'Keine gültige zentrale Lizenzfreigabe.')}${licenseLimit}</div></div></div>`;
    els.appsList.appendChild(licenseCard);
    // 0.8.37: Reine Zuordnungs-/Stationskarten und große Modul-Konfigurationen
    // werden fachlich passend in eigene Reiter gerendert. Der Apps-Reiter bleibt
    // eine schlanke Liste echter Funktions-Apps mit Installiert/Aktiv-Schaltern.
    buildAppCenterStructurePanels();

    /**
     * App-Center-Struktur ab 0.8.38:
     * Der Apps-Reiter ist strikt ein Katalog. Er zeigt Installiert/Aktiv und höchstens
     * Navigationshinweise zu den fachlich passenden Konfigurationsreitern. Alle
     * echten Einstellungen bleiben in Zuordnung, Ladepunkte oder eigenen Modulreitern.
     */
    const appConfigTargets = {
      charging: { tab: 'evcs', label: 'Ladepunkte konfigurieren' },
      peak: { tab: 'peakconfig', label: 'Peak-Shaving konfigurieren' },
      storage: { tab: 'storageconfig', label: 'Speicher konfigurieren' },
      storagefarm: { tab: 'storagefarm', label: 'Speicherfarm konfigurieren' },
      thermal: { tab: 'thermal', label: 'Thermik konfigurieren' },
      heatingrod: { tab: 'heatingrod', label: 'Heizstab konfigurieren' },
      bhkw: { tab: 'bhkw', label: 'BHKW konfigurieren' },
      generator: { tab: 'generator', label: 'Generator konfigurieren' },
      threshold: { tab: 'threshold', label: 'Schwellwerte konfigurieren' },
      relay: { tab: 'relay', label: 'Relais konfigurieren' },
      grid: { tab: 'grid', label: 'Netzlimits konfigurieren' },
      aiAdvisor: { tab: 'aiadvisor', label: 'KI-Optimierung konfigurieren' },
      tariff: { tab: 'mapping', label: 'Tarif-Zuordnung öffnen' },
      para14a: { tab: 'para14a', label: '§14a konfigurieren' },
      multiuse: { tab: 'multiuse', label: 'MultiUse konfigurieren' },
      meshMicrogrid: { tab: 'meshmicrogrid', label: 'Mesh/Microgrid konfigurieren', operatorUrl: '/ems/microgrid/#/mesh-coordinator', operatorLabel: 'Betreiberansicht öffnen' },
      netOperator: { tab: 'netoperator', label: 'Netzbetreiber-Schnittstelle konfigurieren', operatorUrl: '/netoperator', operatorLabel: 'Betreiberansicht öffnen' },
      operatingStrategies: { tab: 'strategies', label: 'Betriebsstrategien konfigurieren' },
      energyLedger: { tab: 'ledger', label: 'Energieherkunft konfigurieren', operatorUrl: '/ledger/energy-origin', operatorLabel: 'Betreiberansicht öffnen' }
    };

    function appendAppConfigNavigation(body, app, st) {
      const target = appConfigTargets[app.id];
      if (!body || !target) return;
      if (!app.mandatory && !st.installed) return;

      const row = document.createElement('div');
      row.className = 'nw-config-card__row nw-app-config-nav';
      row.setAttribute('data-app-config-nav', app.id);

      const btn = document.createElement(target.url ? 'a' : 'button');
      btn.className = 'nw-btn nw-btn--small nw-app-config-nav__button';
      btn.textContent = target.label || 'Konfiguration öffnen';
      if (target.url) {
        btn.setAttribute('href', target.url);
        btn.setAttribute('target', '_blank');
        btn.setAttribute('rel', 'noopener noreferrer');
      } else {
        btn.setAttribute('type', 'button');
        btn.setAttribute('data-app-config-target', String(target.tab || ''));
        btn.addEventListener('click', () => {
          const tab = String(target.tab || '');
          if (!tab) return;
          const tabEl = document.querySelector(`.nw-tab[data-tab="${tab}"]`);
          if (tabEl) tabEl.click();
        });
      }

      row.appendChild(btn);
      if (target.operatorUrl) {
        const op = document.createElement('a');
        op.className = 'nw-btn nw-btn--small nw-app-config-nav__button';
        op.textContent = target.operatorLabel || 'Betreiberansicht öffnen';
        op.setAttribute('href', target.operatorUrl); // href = '/mesh/microgrid'
        op.setAttribute('target', '_blank');
        op.setAttribute('rel', 'noopener noreferrer');
        row.appendChild(op);
      }
      body.appendChild(row);
    }

    const visibleApps = APP_CATALOG.filter((app) => _isAppLicensed(app.id));
    for (const app of visibleApps) {
      const st = getSt(app.id);

      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.setAttribute('data-app', app.id);
      card.setAttribute('data-app-catalog-card', '1');

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = app.label;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      // UI: use button-style toggles (no visible checkboxes)

      const mkToggle = (id, label, checked, disabled, onLabel = 'An', offLabel = 'Aus', toggleKind = '') => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-app-toggle-row';
        if (toggleKind) wrap.setAttribute('data-toggle-kind', toggleKind);
        wrap.style.display = 'inline-flex';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '8px';
        wrap.style.fontSize = '0.75rem';
        wrap.style.opacity = disabled ? '0.55' : '1';

        const txt = document.createElement('span');
        txt.textContent = label;
        txt.style.opacity = '0.85';

        const grp = document.createElement('div');
        grp.className = 'nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle';
        grp.setAttribute('data-toggle-for', id);
        if (toggleKind) {
          grp.setAttribute('data-toggle-kind', toggleKind);
          grp.classList.add(`nw-app-toggle--${toggleKind}`);
        }

        const bOff = document.createElement('button');
        bOff.type = 'button';
        bOff.setAttribute('data-value', 'false');
        bOff.textContent = offLabel;
        if (!checked) bOff.classList.add('active');
        if (disabled) bOff.disabled = true;

        const bOn = document.createElement('button');
        bOn.type = 'button';
        bOn.setAttribute('data-value', 'true');
        bOn.textContent = onLabel;
        if (checked) bOn.classList.add('active');
        if (disabled) bOn.disabled = true;

        grp.appendChild(bOff);
        grp.appendChild(bOn);

        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.id = id;
        inp.className = 'nw-toggle-hidden';
        inp.checked = !!checked;
        inp.disabled = !!disabled;

        wrap.appendChild(txt);
        wrap.appendChild(grp);
        wrap.appendChild(inp);

        return { wrap, inp, grp };
      };

      const idInstalled = `app_${app.id}_installed`;
      const idEnabled = `app_${app.id}_enabled`;

      const meshProtected = app.id === 'meshMicrogrid' && currentConfig && currentConfig.meshApp && currentConfig.meshApp.protected;
      const tInstalled = mkToggle(idInstalled, 'Installiert', app.id === 'grid' ? true : st.installed, app.mandatory || meshProtected, 'Ja', 'Nein', 'installed');
      const tEnabled = mkToggle(idEnabled, 'Aktiv', app.id === 'grid' ? true : st.enabled, app.mandatory || meshProtected || !st.installed, 'An', 'Aus', 'enabled');

      if (meshProtected) {
        const note = document.createElement('p'); note.textContent = 'Aktiver Microgrid-Schutz: Aus/Deinstallieren erfordert eine geplante Stillsetzung.'; actions.appendChild(note);
      }

      // Netzlimits ist kein optionaler Komfortbaustein, sondern der dauerhafte
      // NVP-/Anschlussschutz. Deshalb gibt es für diese App keinen sichtbaren
      // Aus-/Deinstallieren-Schalter. Die versteckten Eingaben bleiben nur für
      // den bestehenden Save-Vertrag vorhanden und sind unveränderbar auf true.
      if (app.id === 'grid') {
        tInstalled.inp.checked = true;
        tEnabled.inp.checked = true;
        tInstalled.inp.disabled = true;
        tEnabled.inp.disabled = true;
        actions.appendChild(tInstalled.inp);
        actions.appendChild(tEnabled.inp);
        const protection = document.createElement('div');
        protection.className = 'nw-app-core-protection';
        protection.textContent = 'Netzschutz dauerhaft aktiv';
        protection.style.display = 'inline-flex';
        protection.style.alignItems = 'center';
        protection.style.padding = '7px 11px';
        protection.style.borderRadius = '999px';
        protection.style.border = '1px solid rgba(0, 230, 118, .45)';
        protection.style.background = 'rgba(0, 230, 118, .12)';
        protection.style.color = '#7dffbd';
        protection.style.fontWeight = '800';
        protection.style.fontSize = '.78rem';
        actions.appendChild(protection);
      } else {
        // Behaviour: if app is uninstalled, force enabled=false
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an tInstalled.inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        tInstalled.inp.addEventListener('change', () => {
          const installed = !!tInstalled.inp.checked;
          if (!installed) {
            tEnabled.inp.checked = false;
            tEnabled.inp.disabled = true;
          } else {
            tEnabled.inp.disabled = false;
          }

          try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(tEnabled.inp.id); } catch (_e) {}

          // Live UI: Zuordnungs-/Spezialreiter reagieren sofort auf Install/Uninstall.
          // Mesh/Microgrid ist bewusst nicht mehr als Detailkarte im Apps-Reiter,
          // sondern nur im eigenen Reiter vorhanden, sobald die App installiert ist.
          try { buildAppCenterStructurePanels(); } catch (_e) {}
          try { applyAppDependentVisibility(); } catch (_e) {}
        });

        actions.appendChild(tInstalled.wrap);
        actions.appendChild(tEnabled.wrap);
      }

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = app.id === 'grid' ? (app.desc + ' · Nicht abschaltbar') : (app.mandatory ? (app.desc + ' (Basis)') : app.desc);
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // 0.8.38 Strukturhärtung:
      // Der Apps-Reiter ist strikt ein Katalog. Hier stehen nur
      // Installiert/Aktiv und optional ein kompakter Sprung in den zuständigen
      // Reiter oder die Betreiberansicht. Fachliche Einstellungen, Mappingfelder,
      // Preise, Stationsseiten und Mesh-Knoten werden nie in dieser Karte gerendert.
      appendAppConfigNavigation(body, app, st);

      card.appendChild(header);
      if (body.childElementCount > 0) card.appendChild(body);

      els.appsList.appendChild(card);
    }

    els.appsEmpty.style.display = visibleApps.length ? 'none' : 'block';
  }

  function setAppsFromConfig(cfg) {
    if (!cfg) return;
    const apps = (cfg.emsApps && cfg.emsApps.apps && typeof cfg.emsApps.apps === 'object') ? cfg.emsApps.apps : {};
    for (const app of APP_CATALOG) {
      const st = (apps && apps[app.id] && typeof apps[app.id] === 'object') ? apps[app.id] : null;
      const installed = !!(st && st.installed);
      const enabled = !!(st && st.enabled);

      const i1 = document.getElementById(`app_${app.id}_installed`);
      const i2 = document.getElementById(`app_${app.id}_enabled`);
      if (i1) {
        i1.checked = app.mandatory ? true : installed;
        i1.disabled = !!app.mandatory;
        try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(i1.id); } catch (_e) {}
      }
      if (i2) {
        i2.checked = app.mandatory ? true : enabled;
        i2.disabled = !!app.mandatory || !installed;
        try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(i2.id); } catch (_e) {}
      }
    }

    // Phase 3.5: Zuordnungskacheln abhängig von installierten Apps ein-/ausblenden
    try { applyAppDependentVisibility(); } catch (_e) {}
  }

  function applyAppDependentVisibility() {

    const isInstalled = (appId) => {
      const cb = document.getElementById(`app_${appId}_installed`);
      return cb ? !!cb.checked : false;
    };

    const toggleCard = (cardKey, show) => {
      const el = document.querySelector(`.nw-config-card[data-card="${cardKey}"]`);
      if (!el) return;
      el.style.display = show ? '' : 'none';
    };

    // General + energy + live always visible (Basis / VIS-Dashboard)
    toggleCard('general', true);
    toggleCard('live', true);
    toggleCard('expert', true);

    // App-spezifisch (Zuordnung)
    toggleCard('tariff', isInstalled('tariff'));
    toggleCard('storage', isInstalled('storage'));
    toggleCard('peak', isInstalled('peak'));

    // Tabs: optional ein-/ausblenden (App-Center)
    const tabMap = [
      { tab: 'storageconfig', app: 'storage' },
      { tab: 'peakconfig', app: 'peak' },
      { tab: 'aiadvisor', app: 'aiAdvisor' },
      { tab: 'thermal', app: 'thermal' },
      { tab: 'heatingrod', app: 'heatingrod' },
      { tab: 'bhkw', app: 'bhkw' },
      { tab: 'generator', app: 'generator' },
      { tab: 'threshold', app: 'threshold' },
      { tab: 'relay', app: 'relay' },
      { tab: 'grid', app: 'grid' },
      { tab: 'evupv', app: 'grid' },
      { tab: 'para14a', app: 'para14a' },
      { tab: 'evcs', app: 'charging' },
      { tab: 'storagefarm', app: 'storagefarm' },
      { tab: 'multiuse', app: 'multiuse' },
      // 0.8.37: Der separate Mesh/Microgrid-Reiter wird erst sichtbar, wenn
      // die EOS-App installiert ist. Nicht installierte Module sollen nicht
      // als leere Konfigurationsbereiche im App-Center auftauchen.
      { tab: 'meshmicrogrid', app: 'meshMicrogrid' },
      { tab: 'netoperator', app: 'netOperator' },
      { tab: 'strategies', app: 'operatingStrategies' },
      { tab: 'ledger', app: 'energyLedger' },
    ];

    for (const t of tabMap) {
      const el = document.querySelector(`.nw-tab[data-tab="${t.tab}"]`);
      if (!el) continue;
      el.style.display = isInstalled(t.app) ? '' : 'none';
    }

    // Wenn der aktuelle Tab ausgeblendet wird: auf „Apps“ zurückspringen
    const activeTab = document.querySelector('.nw-tab.nw-tab--active');
    if (activeTab && activeTab.style.display === 'none') {
      const appsTab = document.querySelector('.nw-tab[data-tab="apps"]');
      if (appsTab) appsTab.click();
    }
  }

  function _psDefaultWindow() {
    return {
      enabled: true,
      label: 'HLZF',
      season: 'winter',
      months: [],
      weekdays: [1, 2, 3, 4, 5],
      from: '07:00',
      to: '10:00',
      validFrom: '',
      validTo: '',
    };
  }

  function _psGetPeakCfg() {
    currentConfig = currentConfig || {};
    currentConfig.peakShaving = currentConfig.peakShaving && typeof currentConfig.peakShaving === 'object' ? currentConfig.peakShaving : {};
    currentConfig.peakShaving.atypical = currentConfig.peakShaving.atypical && typeof currentConfig.peakShaving.atypical === 'object' ? currentConfig.peakShaving.atypical : {};
    return currentConfig.peakShaving;
  }

  function _psGetWindowsFromCfg(cfg) {
    const atypical = (cfg && cfg.atypical && typeof cfg.atypical === 'object') ? cfg.atypical : {};
    if (Array.isArray(atypical.highLoadWindows)) return atypical.highLoadWindows;
    if (Array.isArray(atypical.windows)) return atypical.windows;
    return [];
  }

  function buildAtypicalWindowsUI() {
    if (!els.psAtypicalWindows) return;
    const ps = _psGetPeakCfg();
    const wins = _psGetWindowsFromCfg(ps);
    els.psAtypicalWindows.innerHTML = '';

    if (!wins.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Noch keine Hochlastzeitfenster hinterlegt. Über „+ Fenster“ ein Zeitfenster hinzufügen.';
      els.psAtypicalWindows.appendChild(empty);
    }

    wins.forEach((win, idx) => {
      const w = win && typeof win === 'object' ? win : {};
      const row = document.createElement('div');
      row.className = 'nw-config-card';
      row.style.margin = '0 0 8px 0';
      row.setAttribute('data-ps-hlzf-row', String(idx));

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';
      header.innerHTML = `
        <div class="nw-config-card__header-top">
          <div>
            <div class="nw-config-card__title">Fenster ${idx + 1}</div>
            <div class="nw-config-card__subtitle">Label, Saison/Monate, Wochentage und Uhrzeit</div>
          </div>
          <div class="nw-config-row__actions">
            <button type="button" class="nw-config-btn nw-config-btn--ghost" data-ps-window-delete="${idx}">Entfernen</button>
          </div>
        </div>`;

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';
      body.innerHTML = `
        <div class="nw-config-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Aktiv</span>
            <input class="nw-config-checkbox" type="checkbox" data-ps-window-field="enabled" ${w.enabled === false ? '' : 'checked'} />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Label</span>
            <input class="nw-config-input" type="text" data-ps-window-field="label" value="${String(w.label || w.name || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" placeholder="z.B. Winter morgens" />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Saison</span>
            <select class="nw-config-input" data-ps-window-field="season">
              <option value="">keine / Monate nutzen</option>
              <option value="winter">Winter</option>
              <option value="summer">Sommer</option>
              <option value="transition">Übergang</option>
            </select>
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Monate</span>
            <input class="nw-config-input" type="text" data-ps-window-field="months" value="${_psFormatNumberList(w.months || w.month)}" placeholder="z.B. 1,2,12" />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Wochentage</span>
            <input class="nw-config-input" type="text" data-ps-window-field="weekdays" value="${_psFormatNumberList(w.weekdays || w.days)}" placeholder="1,2,3,4,5" />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Von</span>
            <input class="nw-config-input" type="time" data-ps-window-field="from" value="${String(w.from || w.start || w.startTime || '').replace(/"/g,'&quot;')}" />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Bis</span>
            <input class="nw-config-input" type="time" data-ps-window-field="to" value="${String(w.to || w.end || w.endTime || '').replace(/"/g,'&quot;')}" />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Gültig von</span>
            <input class="nw-config-input" type="date" data-ps-window-field="validFrom" value="${String(w.validFrom || w.validFromDate || '').replace(/"/g,'&quot;')}" />
          </label>
          <label class="nw-config-field-control nw-config-field-control--stack">
            <span class="nw-config-field-label" style="width:auto;">Gültig bis</span>
            <input class="nw-config-input" type="date" data-ps-window-field="validTo" value="${String(w.validTo || w.validToDate || '').replace(/"/g,'&quot;')}" />
          </label>
        </div>`;
      row.appendChild(header);
      row.appendChild(body);
      els.psAtypicalWindows.appendChild(row);

      const seasonSelect = row.querySelector('[data-ps-window-field="season"]');
      if (seasonSelect) {
        const sv = String(w.season || w.jahreszeit || '').trim().toLowerCase();
        if (['winter', 'summer', 'transition'].includes(sv)) seasonSelect.value = sv;
        else if (sv === 'sommer') seasonSelect.value = 'summer';
        else if (sv === 'uebergang' || sv === 'übergang') seasonSelect.value = 'transition';
      }
    });
  }

  function _psCollectWindowRows() {
    const out = [];
    if (!els.psAtypicalWindows) return out;
    const rows = Array.from(els.psAtypicalWindows.querySelectorAll('[data-ps-hlzf-row]'));
    for (const row of rows) {

      const get = (field) => row.querySelector(`[data-ps-window-field="${field}"]`);
      const enabledEl = get('enabled');
      const label = String((get('label') && get('label').value) || '').trim();
      const season = String((get('season') && get('season').value) || '').trim();
      const months = _psParseNumberList((get('months') && get('months').value) || '', 1, 12);
      const weekdays = _psParseNumberList((get('weekdays') && get('weekdays').value) || '', 0, 7);
      const from = String((get('from') && get('from').value) || '').trim();
      const to = String((get('to') && get('to').value) || '').trim();
      const validFrom = String((get('validFrom') && get('validFrom').value) || '').trim();
      const validTo = String((get('validTo') && get('validTo').value) || '').trim();
      const w = {
        enabled: enabledEl ? !!enabledEl.checked : true,
        ...(label ? { label } : {}),
        ...(season ? { season } : {}),
        ...(months.length ? { months } : {}),
        ...(weekdays.length ? { weekdays } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(validFrom ? { validFrom } : {}),
        ...(validTo ? { validTo } : {}),
      };
      if (w.from && w.to) out.push(w);
    }
    return out;
  }

  function _psUpdateAtypicalFieldState() {
    const mode = els.psStrategyMode ? String(els.psStrategyMode.value || 'standard') : 'standard';
    const atypicalOn = mode === 'atypical' || mode === 'hybrid' || mode === 'monitor';
    const standardOn = mode === 'standard' || mode === 'hybrid';

    const atypicalIds = [
      'psAtypicalVoltageLevel', 'psAtypicalThresholdPercent', 'psAtypicalApplyVoltageThreshold',
      'psAtypicalPAbsRefW', 'psAtypicalMinShiftW', 'psAtypicalTargetLimitW', 'psAtypicalSafetyMarginW',
      'psAtypicalGridOperator', 'psAtypicalYear', 'psAtypicalSourceDocument', 'psAtypicalSourcePublishedAt',
      'psAtypicalSourceUrl', 'psAtypicalSourceNote',
      'psAtypicalIncludeWeekends', 'psAtypicalExcludeChristmasNewYear', 'psAtypicalHolidays',
      'psAtypicalBridgeDays', 'psAtypicalCalendarExceptions', 'psAtypicalAddWindow',
      'psAtypicalReviewEnabled', 'psAtypicalReviewResetToken', 'psAtypicalReviewInfluxLogEnabled',
      'psAtypicalReviewAuditIntervalMinutes', 'psAtypicalReviewPAbsActualW',
      'psAtypicalReviewPHlzfMaxW', 'psAtypicalReviewPowerPriceEurPerKwYear',
      'psAtypicalReviewEnergyPriceEurPerKwh', 'psAtypicalReviewAnnualEnergyKwh',
      'psAtypicalReviewSavingsBagatelleEur', 'psAtypicalReviewGeneralGridFeeEur',
      'psAtypicalReviewMaxReductionPercent', 'psAtypicalReviewNote',
      'psAtypicalReviewRefresh', 'psAtypicalReviewExportFrom', 'psAtypicalReviewExportTo', 'psAtypicalReviewExportCsv', 'psAtypicalReviewExportPdf'
    ];
    atypicalIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !atypicalOn;
    });
    if (els.psAtypicalWindows) {
      els.psAtypicalWindows.querySelectorAll('input,select,textarea,button').forEach((el) => { el.disabled = !atypicalOn; });
    }

    const standardIds = ['psStandardMode', 'psReserveW'];
    standardIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !standardOn;
    });
  }

  function buildPeakShavingUI() {
    if (!els.psStrategyMode) return;
    const ps = _psGetPeakCfg();
    const a = (ps.atypical && typeof ps.atypical === 'object') ? ps.atypical : {};

    let strategy = String(ps.strategyMode || ps.strategy || '').trim().toLowerCase();
    if (!['standard', 'atypical', 'hybrid', 'monitor'].includes(strategy)) {
      strategy = a.enabled ? String(a.mode || 'hybrid').trim().toLowerCase() : 'standard';
      if (!['atypical', 'hybrid', 'monitor'].includes(strategy)) strategy = a.enabled ? 'hybrid' : 'standard';
    }
    _psSetSelect(els.psStrategyMode, strategy, 'standard');
    _psSetSelect(els.psStandardMode, String(ps.mode || 'static'), 'static');
    _psSetNumberInput(els.psReserveW, ps.reserveW);
    _psSetNumberInput(els.psSafetyMarginW, ps.safetyMarginW);
    _psSetNumberInput(els.psHysteresisW, ps.hysteresisW);
    _psSetNumberInput(els.psSmoothingSeconds, ps.smoothingSeconds);
    _psSetNumberInput(els.psActivateDelaySeconds, ps.activateDelaySeconds);
    _psSetNumberInput(els.psReleaseDelaySeconds, ps.releaseDelaySeconds);
    _psSetNumberInput(els.psStaleTimeoutSec, ps.staleTimeoutSec);
    if (els.psFastTripEnabled) els.psFastTripEnabled.checked = ps.fastTripEnabled !== false;

    const vLevel = _psVoltageKey(a.voltageLevel || 'MS');
    _psSetSelect(els.psAtypicalVoltageLevel, vLevel, 'MS');
    const threshold = Number.isFinite(Number(a.thresholdPercent)) ? Number(a.thresholdPercent) : _psThresholdForVoltage(vLevel);
    _psSetNumberInput(els.psAtypicalThresholdPercent, threshold);
    _psSetNumberInput(els.psAtypicalPAbsRefW, a.annualPeakReferenceW ?? a.pAbsRefW ?? a.pAbsMaxW ?? a.referencePeakW ?? a.referencePeakPowerW);
    _psSetNumberInput(els.psAtypicalMinShiftW, a.minShiftW ?? 100000);
    _psSetNumberInput(els.psAtypicalTargetLimitW, a.targetLimitW ?? a.hlzfTargetW ?? a.highLoadLimitW ?? a.capW);
    _psSetNumberInput(els.psAtypicalSafetyMarginW, a.safetyMarginW);
    if (els.psAtypicalIncludeWeekends) els.psAtypicalIncludeWeekends.checked = a.includeWeekends === true;
    if (els.psAtypicalExcludeChristmasNewYear) els.psAtypicalExcludeChristmasNewYear.checked = a.excludeChristmasNewYear !== false;
    if (els.psAtypicalHolidays) els.psAtypicalHolidays.value = _psFormatDateList(a.holidays || a.holidayDates || []);
    if (els.psAtypicalBridgeDays) els.psAtypicalBridgeDays.value = _psFormatDateList(a.bridgeDays || a.bridgeDayDates || []);
    if (els.psAtypicalCalendarExceptions) els.psAtypicalCalendarExceptions.value = _psFormatDateList(a.calendarExceptions || a.exceptions || []);

    _psSetTextInput(els.psAtypicalGridOperator, a.gridOperatorName || a.gridOperator || a.networkOperator || a.netzbetreiber || '');
    _psSetNumberInput(els.psAtypicalYear, a.year || a.validityYear || a.calendarYear);
    _psSetTextInput(els.psAtypicalSourceDocument, a.sourceDocument || a.sourceName || a.source || '');
    _psSetTextInput(els.psAtypicalSourcePublishedAt, a.sourcePublishedAt || a.publishedAt || '');
    _psSetTextInput(els.psAtypicalSourceUrl, a.sourceUrl || a.sourceLink || '');
    _psSetTextInput(els.psAtypicalSourceNote, a.sourceNote || a.notes || a.comment || a.note || '');

    const review = (a.review && typeof a.review === 'object') ? a.review : (a.nachkontrolle && typeof a.nachkontrolle === 'object' ? a.nachkontrolle : {});
    if (els.psAtypicalReviewEnabled) els.psAtypicalReviewEnabled.checked = review.enabled !== false;
    if (els.psAtypicalReviewInfluxLogEnabled) els.psAtypicalReviewInfluxLogEnabled.checked = review.influxLogEnabled !== false;
    _psSetNumberInput(els.psAtypicalReviewAuditIntervalMinutes, review.auditIntervalMinutes ?? review.influxSampleIntervalMinutes ?? 15);
    _psSetTextInput(els.psAtypicalReviewResetToken, review.resetToken || review.resetKey || '');
    _psSetNumberInput(els.psAtypicalReviewPAbsActualW, review.pAbsActualW ?? review.actualAnnualPeakW ?? review.pAbsIstW);
    _psSetNumberInput(els.psAtypicalReviewPHlzfMaxW, review.pHlzfMaxW ?? review.hlzfPeakW ?? review.pHlzfIstW);
    _psSetNumberInput(els.psAtypicalReviewPowerPriceEurPerKwYear, review.powerPriceEurPerKwYear ?? review.powerPriceEurPerKwA ?? review.leistungspreisEurProKwJahr);
    _psSetNumberInput(els.psAtypicalReviewEnergyPriceEurPerKwh, review.energyPriceEurPerKwh ?? review.arbeitspreisEurProKwh);
    _psSetNumberInput(els.psAtypicalReviewAnnualEnergyKwh, review.annualEnergyKwh ?? review.jahresarbeitKwh);
    _psSetNumberInput(els.psAtypicalReviewSavingsBagatelleEur, review.bagatelleEur ?? review.bagatellgrenzeEur ?? review.savingsBagatelleEur ?? 500);
    _psSetNumberInput(els.psAtypicalReviewGeneralGridFeeEur, review.generalGridFeeEur ?? review.generalGridFee ?? review.allgemeinesNetzentgeltEur);
    _psSetNumberInput(els.psAtypicalReviewMaxReductionPercent, review.maxReductionPercent ?? 80);
    _psSetTextInput(els.psAtypicalReviewNote, review.note || review.reviewNote || '');
    try {
      const exportYear = _psNumOrNull(els.psAtypicalYear && els.psAtypicalYear.value) || new Date().getFullYear();
      const y = Math.round(exportYear);
      if (els.psAtypicalReviewExportFrom && !els.psAtypicalReviewExportFrom.value) els.psAtypicalReviewExportFrom.value = `${y}-01-01`;
      if (els.psAtypicalReviewExportTo && !els.psAtypicalReviewExportTo.value) els.psAtypicalReviewExportTo.value = `${y}-12-31`;
    } catch (_e) {}

    buildAtypicalWindowsUI();
    _psUpdateAtypicalFieldState();
    _psUpdateAtypicalReviewPreview();
  }

  function collectPeakShavingConfigFromUI(baseCfg) {
    const out = deepMerge({}, baseCfg || {});
    if (!els.psStrategyMode) return out;

    const strategy = String(els.psStrategyMode.value || 'standard').trim().toLowerCase();
    out.strategyMode = ['standard', 'atypical', 'hybrid', 'monitor'].includes(strategy) ? strategy : 'standard';
    if (els.psStandardMode) out.mode = (els.psStandardMode.value === 'dynamic') ? 'dynamic' : 'static';

    const setNum = (key, el, min = 0, max = Number.POSITIVE_INFINITY) => {
      if (!el) return;
      const n = Number(el.value);
      if (Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, n));
      else delete out[key];
    };
    setNum('reserveW', els.psReserveW, 0);
    setNum('safetyMarginW', els.psSafetyMarginW, 0);
    setNum('hysteresisW', els.psHysteresisW, 0);
    setNum('smoothingSeconds', els.psSmoothingSeconds, 1, 600);
    setNum('activateDelaySeconds', els.psActivateDelaySeconds, 0, 3600);
    setNum('releaseDelaySeconds', els.psReleaseDelaySeconds, 0, 3600);
    setNum('staleTimeoutSec', els.psStaleTimeoutSec, 1, 3600);
    if (els.psFastTripEnabled) out.fastTripEnabled = !!els.psFastTripEnabled.checked;

    const atypicalEnabled = out.strategyMode === 'atypical' || out.strategyMode === 'hybrid' || out.strategyMode === 'monitor';
    const a = deepMerge({}, out.atypical || {});
    a.enabled = !!atypicalEnabled;
    a.mode = out.strategyMode === 'monitor' ? 'monitor' : (out.strategyMode === 'atypical' ? 'enforce' : 'hybrid');
    a.enforce = out.strategyMode !== 'monitor';
    a.voltageLevel = _psVoltageKey(els.psAtypicalVoltageLevel ? els.psAtypicalVoltageLevel.value : 'MS');

    const threshold = _psNumOrNull(els.psAtypicalThresholdPercent && els.psAtypicalThresholdPercent.value);
    a.thresholdPercent = threshold === null ? _psThresholdForVoltage(a.voltageLevel) : Math.min(100, Math.max(0, threshold));

    const pAbs = _psNumOrNull(els.psAtypicalPAbsRefW && els.psAtypicalPAbsRefW.value);
    if (pAbs !== null && pAbs > 0) a.annualPeakReferenceW = Math.round(pAbs); else delete a.annualPeakReferenceW;
    const minShift = _psNumOrNull(els.psAtypicalMinShiftW && els.psAtypicalMinShiftW.value);
    a.minShiftW = minShift !== null ? Math.max(0, Math.round(minShift)) : 100000;
    const target = _psNumOrNull(els.psAtypicalTargetLimitW && els.psAtypicalTargetLimitW.value);
    if (target !== null && target > 0) a.targetLimitW = Math.round(target); else delete a.targetLimitW;
    const margin = _psNumOrNull(els.psAtypicalSafetyMarginW && els.psAtypicalSafetyMarginW.value);
    if (margin !== null && margin >= 0) a.safetyMarginW = Math.round(margin); else delete a.safetyMarginW;

    a.includeWeekends = !!(els.psAtypicalIncludeWeekends && els.psAtypicalIncludeWeekends.checked);
    a.excludeChristmasNewYear = !(els.psAtypicalExcludeChristmasNewYear && els.psAtypicalExcludeChristmasNewYear.checked === false);
    a.holidays = _psParseDateList(els.psAtypicalHolidays && els.psAtypicalHolidays.value);
    a.bridgeDays = _psParseDateList(els.psAtypicalBridgeDays && els.psAtypicalBridgeDays.value);
    a.calendarExceptions = _psParseDateList(els.psAtypicalCalendarExceptions && els.psAtypicalCalendarExceptions.value);
    a.highLoadWindows = _psCollectWindowRows();

    const setStr = (key, el) => {
      if (!el) return;
      const v = String(el.value || '').trim();
      if (v) a[key] = v; else delete a[key];
    };
    setStr('gridOperator', els.psAtypicalGridOperator);
    const year = _psNumOrNull(els.psAtypicalYear && els.psAtypicalYear.value);
    if (year !== null && year > 0) a.year = Math.round(year); else delete a.year;
    setStr('sourceDocument', els.psAtypicalSourceDocument);
    setStr('sourcePublishedAt', els.psAtypicalSourcePublishedAt);
    setStr('sourceUrl', els.psAtypicalSourceUrl);
    setStr('sourceNote', els.psAtypicalSourceNote);
    setStr('notes', els.psAtypicalSourceNote);

    const review = {};
    if (els.psAtypicalReviewEnabled) review.enabled = !!els.psAtypicalReviewEnabled.checked;
    if (els.psAtypicalReviewInfluxLogEnabled) review.influxLogEnabled = !!els.psAtypicalReviewInfluxLogEnabled.checked;
    const auditIntervalMinutes = _psNumOrNull(els.psAtypicalReviewAuditIntervalMinutes && els.psAtypicalReviewAuditIntervalMinutes.value);
    if (auditIntervalMinutes !== null && auditIntervalMinutes > 0) review.auditIntervalMinutes = Math.max(1, Math.min(1440, Math.round(auditIntervalMinutes)));
    const resetToken = String((els.psAtypicalReviewResetToken && els.psAtypicalReviewResetToken.value) || '').trim();
    if (resetToken) review.resetToken = resetToken;
    const pAbsActual = _psNumOrNull(els.psAtypicalReviewPAbsActualW && els.psAtypicalReviewPAbsActualW.value);
    if (pAbsActual !== null && pAbsActual > 0) review.pAbsActualW = Math.round(pAbsActual);
    const pHlzf = _psNumOrNull(els.psAtypicalReviewPHlzfMaxW && els.psAtypicalReviewPHlzfMaxW.value);
    if (pHlzf !== null && pHlzf >= 0) review.pHlzfMaxW = Math.round(pHlzf);
    const price = _psNumOrNull(els.psAtypicalReviewPowerPriceEurPerKwYear && els.psAtypicalReviewPowerPriceEurPerKwYear.value);
    if (price !== null && price >= 0) review.powerPriceEurPerKwYear = price;
    const generalGridFee = _psNumOrNull(els.psAtypicalReviewGeneralGridFeeEur && els.psAtypicalReviewGeneralGridFeeEur.value);
    if (generalGridFee !== null && generalGridFee >= 0) review.generalGridFeeEur = generalGridFee;
    const energyPrice = _psNumOrNull(els.psAtypicalReviewEnergyPriceEurPerKwh && els.psAtypicalReviewEnergyPriceEurPerKwh.value);
    if (energyPrice !== null && energyPrice >= 0) review.energyPriceEurPerKwh = energyPrice;
    const annualEnergy = _psNumOrNull(els.psAtypicalReviewAnnualEnergyKwh && els.psAtypicalReviewAnnualEnergyKwh.value);
    if (annualEnergy !== null && annualEnergy >= 0) review.annualEnergyKwh = annualEnergy;
    const bag = _psNumOrNull(els.psAtypicalReviewSavingsBagatelleEur && els.psAtypicalReviewSavingsBagatelleEur.value);
    review.bagatelleEur = bag !== null && bag >= 0 ? bag : 500;
    const maxReduction = _psNumOrNull(els.psAtypicalReviewMaxReductionPercent && els.psAtypicalReviewMaxReductionPercent.value);
    review.maxReductionPercent = maxReduction !== null ? Math.min(100, Math.max(0, maxReduction)) : 80;
    const note = String((els.psAtypicalReviewNote && els.psAtypicalReviewNote.value) || '').trim();
    if (note) review.note = note;
    if (Object.keys(review).length) a.review = review; else delete a.review;

    out.atypical = a;
    return out;
  }

  function buildDpTable(container, fields, getter, setter, options) {
    container.innerHTML = '';

    const fieldInputs = new Map();
    const metaUpdaters = [];

    const isRequiredGroupSatisfied = (groupName) => {
      if (!groupName) return false;

      const getVal = (key) => String(fieldInputs.get(key)?.value || '').trim();
      if (groupName === 'gridPairOrSigned') {
        const signed = getVal('gridPointPower');
        const buy = getVal('gridBuyPower');
        const sell = getVal('gridSellPower');
        return !!signed || (!!buy && !!sell);
      }
      return false;
    };

    const refreshAllMeta = () => {
      metaUpdaters.forEach((fn) => {
        try { fn(); } catch (_e) {}
      });
    };

    const makeRow = (field) => {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = field.label;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = field.key;

      left.appendChild(title);
      left.appendChild(sub);

      const inputId = (options && options.idPrefix ? options.idPrefix : 'dp_') + field.key;

      // Optional: erklärender Hinweistext (Auto/Override/Info)
      let hintEl = null;
      if (field.hintAuto || field.hintOverride || field.hint) {
        hintEl = document.createElement('div');
        hintEl.className = 'nw-config-item__hint';
        hintEl.id = 'hint_' + inputId;
        left.appendChild(hintEl);
      }

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.placeholder = field.placeholder || '';
      input.value = valueOrEmpty(getter(field.key));
      input.id = inputId;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.title = String(input.value || '').trim();
      input.scrollLeft = 0;
      fieldInputs.set(field.key, input);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => openDpModal(input.id));

      right.appendChild(input);

      // Einheit pro Datenpunkt (Energiefluss): W vs kW
      if (field.power) {
        const unitLabel = document.createElement('label');
        unitLabel.className = 'nw-unit-toggle';
        unitLabel.title = 'Wenn aktiv: Datenpunkt liefert Watt (W). Wenn aus: Datenpunkt liefert bereits kW (1 = 1 kW).';

        const unitCb = document.createElement('input');
        unitCb.type = 'checkbox';
        unitCb.className = 'nw-unit-toggle__cb';
        unitCb.id = 'unit_' + input.id;
        unitCb.checked = _getFlowPowerDpIsW(field.key);
        unitCb.setAttribute('data-flow-power-unit-key', field.key);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an unitCb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        unitCb.addEventListener('change', () => {
          _setFlowPowerDpIsW(field.key, unitCb.checked);
        });

        const unitText = document.createElement('span');
        unitText.textContent = 'W';

        unitLabel.appendChild(unitCb);
        unitLabel.appendChild(unitText);
        right.appendChild(unitLabel);
      }

      right.appendChild(btn);

      // Mode badge (Pflicht / Auto / Override) – nur wenn relevant
      let modeBadge = null;
      if (field.required || field.auto) {
        modeBadge = document.createElement('span');
        modeBadge.className = 'nw-config-badge nw-config-badge--idle';
        modeBadge.id = 'mode_' + input.id;
        modeBadge.textContent = '—';
        right.appendChild(modeBadge);
      }

      // Validation badge (existiert / warn / error)
      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + input.id;
      badge.textContent = '—';
      right.appendChild(badge);

      row.appendChild(left);
      row.appendChild(right);

      const updateMeta = () => {
        const v = String(input.value || '').trim();
        const isSet = !!v;

        if (modeBadge) {
          if (field.required) {
            const groupSatisfied = field.requiredGroup ? isRequiredGroupSatisfied(field.requiredGroup) : null;
            const requiredOk = (groupSatisfied !== null) ? groupSatisfied : isSet;
            modeBadge.textContent = 'PFLICHT';
            modeBadge.className = 'nw-config-badge ' + (requiredOk ? 'nw-config-badge--ok' : 'nw-config-badge--error');
          } else if (field.auto) {
            if (isSet) {
              modeBadge.textContent = 'OVERRIDE';
              modeBadge.className = 'nw-config-badge nw-config-badge--override';
            } else {
              modeBadge.textContent = 'AUTO';
              modeBadge.className = 'nw-config-badge nw-config-badge--auto';
            }
          }
        }

        if (hintEl) {
          let t = '';
          if (field.hintAuto || field.hintOverride) {
            t = isSet ? (field.hintOverride || '') : (field.hintAuto || '');
          } else {
            t = field.hint || '';
          }

          hintEl.textContent = t;
          hintEl.style.display = t ? 'block' : 'none';
        }
      };

      const commitDpValue = () => {
        const normalized = String(input.value || '').trim();
        setter(field.key, normalized);
        input.title = normalized;
        return normalized;
      };

      input.dataset.dpInput = '1';
      // Bereits beim Tippen/Einfügen in das lokale Config-Modell übernehmen.
      // Dadurch kann ein Tabwechsel oder Re-Render nicht mehr den alten bzw.
      // verkürzten DP-Wert zurück in das Feld schreiben.
      input.addEventListener('input', () => {
        commitDpValue();
        updateMeta();
        refreshAllMeta();
        scheduleValidation(350);
      });
      // Der DP-Picker löst `change` aus; auch dieser Pfad schreibt die vollständige ID.
      input.addEventListener('change', () => {
        commitDpValue();
        updateMeta();
        refreshAllMeta();
        scheduleValidation(200);
      });
      input.addEventListener('blur', () => {
        commitDpValue();
        input.scrollLeft = 0;
      });

      metaUpdaters.push(updateMeta);
      updateMeta();
      return row;
    };

    for (const f of fields) {
      const row = makeRow(f);
      container.appendChild(row);
      // Optional hook for callers to inject additional UI rows close to a specific field
      if (options && typeof options.afterRow === 'function') {
        try {
          options.afterRow(f, row, container);
        } catch (e) {
          console.warn('buildDpTable.afterRow failed', e);
        }
      }
    }

    refreshAllMeta();
  }

  // ------------------------------
  // Energiefluss: optionale Slots (Verbraucher/Erzeuger)
  // ------------------------------

  function _ensureVis() {
    currentConfig = currentConfig || {};
    currentConfig.vis = (currentConfig.vis && typeof currentConfig.vis === 'object') ? currentConfig.vis : {};
    return currentConfig.vis;
  }

  function _normalizeFlowConsumerType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'generic';
    if (s === 'heatpump' || s === 'heat_pump' || s === 'heat-pump' || s === 'waermepumpe' || s === 'wärmepumpe' || s === 'hvac' || s === 'klima') return 'heatPump';
    if (s === 'heatingrod' || s === 'heating_rod' || s === 'heating-rod' || s === 'heizstab' || s === 'rod' || s === 'immersion') return 'heatingRod';
    return 'generic';
  }

  function _getFlowConsumerTypeLabel(raw) {
    const t = _normalizeFlowConsumerType(raw);
    if (t === 'heatPump') return 'Wärmepumpe / Klima';
    if (t === 'heatingRod') return 'Heizstab';
    return 'Allgemein';
  }

  function _ensureFlowSlots() {
    const vis = _ensureVis();
    vis.flowSlots = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
    const fs = vis.flowSlots;

    fs.consumers = Array.isArray(fs.consumers) ? fs.consumers : [];
    fs.producers = Array.isArray(fs.producers) ? fs.producers : [];

    /**
     * Code-Teil: Arrow-Funktion `norm`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: norm
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const norm = (arr, count, kind) => {
      const out = [];
      for (let i = 0; i < count; i++) {
        const it = arr[i] && typeof arr[i] === 'object' ? arr[i] : {};
        const rawCtrl = (it.ctrl && typeof it.ctrl === 'object') ? { ...it.ctrl } : {};
        const ctrl = { ...rawCtrl };

        /**
         * Code-Teil: Arrow-Funktion `ensureString`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const ensureString = (key, def = '') => {
          if (ctrl[key] === undefined || ctrl[key] === null) ctrl[key] = def;
          else ctrl[key] = String(ctrl[key]);
        };
        /**
         * Code-Teil: ensureValue
         * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
         * Zusammenhang: Gehört zu Installer/App-Center (Admin-Konfiguration, EMS-Apps, DP-Zuordnung und Installer-Funktionen) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
         * Wartung/TypeScript: Änderungen müssen mit main.js/native Config und EMS-Modulen synchron bleiben, sonst speichern Installerwerte falsch. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
         */
        const ensureValue = (key, def = '') => {
          if (ctrl[key] === undefined || ctrl[key] === null) ctrl[key] = def;
        };
        /**
         * Code-Teil: Arrow-Funktion `ensureBool`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const ensureBool = (key, def = false) => {
          if (ctrl[key] === undefined || ctrl[key] === null) ctrl[key] = def;
          else ctrl[key] = !!ctrl[key];
        };

        ensureString('switchWriteId');
        ensureString('switchReadId');
        ensureString('setpointWriteId');
        ensureString('setpointReadId');
        ensureString('setpointLabel');
        ensureString('setpointUnit', 'W');
        ensureValue('setpointMin', '');
        ensureValue('setpointMax', '');
        ensureValue('setpointStep', '');
        ensureString('sgReadyAWriteId');
        ensureString('sgReadyAReadId');
        ensureString('sgReadyBWriteId');
        ensureString('sgReadyBReadId');
        ensureBool('sgReadyAInvert', false);
        ensureBool('sgReadyBInvert', false);

        for (let s = 1; s <= 12; s++) {
          ensureString(`stage${s}WriteId`);
          ensureString(`stage${s}ReadId`);
        }

        const slot = {
          name: (it.name !== undefined && it.name !== null) ? String(it.name) : '',
          icon: (it.icon !== undefined && it.icon !== null) ? String(it.icon) : '',
          ctrl,
        };

        if (kind === 'consumers') {
          slot.consumerType = _normalizeFlowConsumerType(it.consumerType || it.type || it.category);
        }

        out.push(slot);
      }
      return out;
    };

    fs.consumers = norm(fs.consumers, FLOW_CONSUMER_SLOT_COUNT, 'consumers');
    fs.producers = norm(fs.producers, FLOW_PRODUCER_SLOT_COUNT, 'producers');

    fs.core = (fs.core && typeof fs.core === 'object') ? fs.core : {};
    fs.core.pvName = (fs.core.pvName !== undefined && fs.core.pvName !== null) ? String(fs.core.pvName) : '';
    return fs;
  }
  /**
   * Code-Teil: _defaultSlotName
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _defaultSlotName(kind, idx1based) {
    if (kind === 'consumers' && idx1based === 1) return 'Heizung/Wärmepumpe';
    return (kind === 'consumers' ? `Verbraucher ${idx1based}` : `Erzeuger ${idx1based}`);
  }
  /**
   * Code-Teil: buildFlowSlotsUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildFlowSlotsUI(kind, slotCount = 10) {
    const container = (kind === 'consumers') ? els.flowConsumers : els.flowProducers;
    if (!container) return;

    const fs = _ensureFlowSlots();
    const slots = (kind === 'consumers') ? fs.consumers : fs.producers;

    // Backward compatibility: map old heating DP into first consumer slot on display, but do not delete.
    const dps = (currentConfig && currentConfig.datapoints) ? currentConfig.datapoints : {};
    if (kind === 'consumers') {
      const c1 = String(dps.consumer1Power || '').trim();
      const legacyHeat = String(dps.consumptionHeating || '').trim();
      if (!c1 && legacyHeat) {
        currentConfig.datapoints = currentConfig.datapoints || {};
        currentConfig.datapoints.consumer1Power = legacyHeat;
      }
    }

    container.innerHTML = '';

    // Überschriften für bessere Übersicht (Name / Icon / Datenpunkt / Auswahl / Steuerung)
    const legend = document.createElement('div');
    legend.className = 'nw-flow-slot-legend';
    legend.innerHTML = `
      <div class="nw-flow-slot-legend__meta">Slot</div>
      <div class="nw-flow-slot-legend__fields">
        <span class="c-name">Name</span>
        <span class="c-icon">Icon</span>
        <span class="c-dp">Datenpunkt (W/kW)</span>
        <span class="c-meta">Auswahl / Status</span>
        <span class="c-ctrl">Steuerung</span>
      </div>
    `;
    container.appendChild(legend);

    for (let i = 0; i < slotCount; i++) {
      const idx = i + 1;
      const dpKey = (kind === 'consumers') ? `consumer${idx}Power` : `producer${idx}Power`;

      const row = document.createElement('div');
      row.className = 'nw-flow-slot';

      const meta = document.createElement('div');
      meta.className = 'nw-flow-slot__meta';
      const title = document.createElement('div');
      title.className = 'nw-flow-slot__title';
      title.textContent = _defaultSlotName(kind, idx);
      const key = document.createElement('div');
      key.className = 'nw-flow-slot__key';
      key.textContent = dpKey;
      meta.appendChild(title);
      meta.appendChild(key);

      const fields = document.createElement('div');
      fields.className = 'nw-flow-slot__fields';

      const nameInput = document.createElement('input');
      nameInput.className = 'nw-config-input nw-flow-slot__name';
      nameInput.type = 'text';
      nameInput.id = `flow_${kind}_name_${idx}`;
      nameInput.placeholder = 'Name (z.B. Wärmepumpe)';
      nameInput.value = (slots[i] && slots[i].name) ? String(slots[i].name) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an nameInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      nameInput.addEventListener('change', () => {
        const fs2 = _ensureFlowSlots();
        const target = (kind === 'consumers') ? fs2.consumers : fs2.producers;
        target[i] = target[i] || { name: '', icon: '' };
        target[i].name = String(nameInput.value || '').trim();
      });

      const iconSelect = document.createElement('select');
      iconSelect.className = 'nw-config-input nw-flow-slot__icon';
      iconSelect.id = `flow_${kind}_icon_${idx}`;
      iconSelect.title = 'Icon (optional)';

      // Options
      FLOW_ICON_CHOICES.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        iconSelect.appendChild(o);
      });
      iconSelect.value = (slots[i] && slots[i].icon !== undefined && slots[i].icon !== null) ? String(slots[i].icon) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an iconSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      iconSelect.addEventListener('change', () => {
        const fs2 = _ensureFlowSlots();
        const target = (kind === 'consumers') ? fs2.consumers : fs2.producers;
        target[i] = target[i] || { name: '', icon: '' };
        target[i].icon = String(iconSelect.value || '').trim();
      });

      let consumerTypeSelect = null;
      if (kind === 'consumers') {
        consumerTypeSelect = document.createElement('select');
        consumerTypeSelect.className = 'nw-config-input nw-flow-slot__icon';
        consumerTypeSelect.id = `flow_${kind}_type_${idx}`;
        consumerTypeSelect.title = 'Verbraucher-Typ';
        [
          { value: 'generic', label: 'Allgemein' },
          { value: 'heatPump', label: 'Wärmepumpe / Klima' },
          { value: 'heatingRod', label: 'Heizstab' },
        ].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          consumerTypeSelect.appendChild(o);
        });
        consumerTypeSelect.value = _normalizeFlowConsumerType(slots[i] && slots[i].consumerType);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an consumerTypeSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        consumerTypeSelect.addEventListener('change', () => {
          const fs2 = _ensureFlowSlots();
          const target = fs2.consumers;
          target[i] = target[i] || { name: '', icon: '', ctrl: {}, consumerType: 'generic' };
          target[i].consumerType = _normalizeFlowConsumerType(consumerTypeSelect.value);
          if (!String(target[i].icon || '').trim()) {
            if (target[i].consumerType === 'heatingRod') {
              target[i].icon = '🔥';
              iconSelect.value = '🔥';
            } else if (target[i].consumerType === 'heatPump') {
              target[i].icon = '♨️';
              iconSelect.value = '♨️';
            }
          }
          try { if (typeof updateConsumerControlVisibility === 'function') updateConsumerControlVisibility(); } catch (_e) {}
          try { buildThermalUI(); } catch (_e) {}
          try { buildHeatingRodUI(); } catch (_e) {}
          try { setDirty(); } catch (_e) {}
        });
      }

      const dpInput = document.createElement('input');
      dpInput.className = 'nw-config-input nw-flow-slot__dp';
      dpInput.type = 'text';
      dpInput.id = `flow_${kind}_dp_${idx}`;
      dpInput.placeholder = 'Datenpunkt (W/kW) (optional)';
      dpInput.value = valueOrEmpty(dps[dpKey]);
      dpInput.dataset.dpInput = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an dpInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      dpInput.addEventListener('change', () => {
        currentConfig.datapoints = currentConfig.datapoints || {};
        currentConfig.datapoints[dpKey] = String(dpInput.value || '').trim();
        scheduleValidation(200);
      });

      // Einheit pro Slot-Datenpunkt (W vs kW)
      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-flow-slot__dpwrap';
      dpWrap.appendChild(dpInput);

      const unitLbl = document.createElement('label');
      unitLbl.className = 'nw-unit-toggle nw-unit-toggle--mini';
      unitLbl.title = 'Wenn aktiv: Datenpunkt liefert Watt (W). Wenn aus: Datenpunkt liefert bereits kW (1 = 1 kW).';

      const unitCb = document.createElement('input');
      unitCb.type = 'checkbox';
      unitCb.id = `flow_${kind}_unit_${idx}`;
      unitCb.checked = _getFlowPowerDpIsW(dpKey);
      unitCb.setAttribute('data-flow-power-unit-key', dpKey);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an unitCb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      unitCb.addEventListener('change', () => {
        _setFlowPowerDpIsW(dpKey, !!unitCb.checked);
      });

      const unitTxt = document.createElement('span');
      unitTxt.textContent = 'W';
      unitLbl.appendChild(unitCb);
      unitLbl.appendChild(unitTxt);
      dpWrap.appendChild(unitLbl);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      btn.setAttribute('data-browse', dpInput.id);

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + dpInput.id;
      badge.textContent = '—';

      fields.appendChild(nameInput);
      fields.appendChild(iconSelect);
      if (consumerTypeSelect) fields.appendChild(consumerTypeSelect);
      fields.appendChild(dpWrap);
      fields.appendChild(btn);
      fields.appendChild(badge);

      // Schnellsteuerung (optional) – in der VIS als klickbarer Kreis nutzbar
      const advBtn = document.createElement('button');
      advBtn.type = 'button';
      advBtn.className = 'nw-config-btn nw-config-btn--ghost nw-flow-slot__advbtn';
      advBtn.textContent = 'Steuerung';

      const advanced = document.createElement('div');
      advanced.className = 'nw-flow-slot__advanced';

      const ctrlGrid = document.createElement('div');
      ctrlGrid.className = 'nw-flow-ctrl-grid';

      /**
       * Code-Teil: Arrow-Funktion `ensureCtrl`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: ensureCtrl
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const ensureCtrl = () => {
        const fs2 = _ensureFlowSlots();
        const target = (kind === 'consumers') ? fs2.consumers : fs2.producers;
        target[i] = target[i] || { name: '', ctrl: {} };
        target[i].ctrl = (target[i].ctrl && typeof target[i].ctrl === 'object') ? target[i].ctrl : {};
        return target[i].ctrl;
      };

      const ctrl = ensureCtrl();

      /**
       * Code-Teil: Arrow-Funktion `mkDpField`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkDpField
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkDpField = (labelText, id, value, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-flow-ctrl-field';

        const lbl = document.createElement('div');
        lbl.style.fontSize = '0.78rem';
        lbl.style.fontWeight = '600';
        lbl.style.color = '#e5e7eb';
        lbl.textContent = labelText;

        const dpWrap = document.createElement('div');
        dpWrap.className = 'nw-config-dp-input-wrapper';

        const input = document.createElement('input');
        input.className = 'nw-config-input nw-config-dp-input';
        input.type = 'text';
        input.id = id;
        input.value = value ? String(value) : '';
        input.dataset.dpInput = '1';
        input.placeholder = 'optional';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

        const b = document.createElement('button');
        b.className = 'nw-config-dp-button';
        b.type = 'button';
        b.setAttribute('data-browse', id);
        b.textContent = 'Auswählen…';

        const badge = document.createElement('span');
        badge.className = 'nw-config-badge nw-config-badge--idle';
        badge.id = 'val_' + id;
        badge.textContent = '—';

        dpWrap.appendChild(input);
        dpWrap.appendChild(b);
        dpWrap.appendChild(badge);

        wrap.appendChild(lbl);
        wrap.appendChild(dpWrap);
        return wrap;
      };

      /**
       * Code-Teil: Arrow-Funktion `mkSimpleField`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkSimpleField
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkSimpleField = (labelText, id, type, value, placeholder, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-flow-ctrl-field';

        const lbl = document.createElement('div');
        lbl.style.fontSize = '0.78rem';
        lbl.style.fontWeight = '600';
        lbl.style.color = '#e5e7eb';
        lbl.textContent = labelText;

        const input = document.createElement('input');
        input.className = 'nw-config-input';
        input.type = type;
        input.id = id;
        if (placeholder) input.placeholder = placeholder;
        input.value = (value !== undefined && value !== null) ? String(value) : '';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        input.addEventListener('change', () => { onChange(input.value); });

        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
      };

      /**
       * Code-Teil: Arrow-Funktion `mkCheckField`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkCheckField
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkCheckField = (labelText, id, checked, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-flow-ctrl-field';

        const lbl = document.createElement('div');
        lbl.style.fontSize = '0.78rem';
        lbl.style.fontWeight = '600';
        lbl.style.color = '#e5e7eb';
        lbl.textContent = labelText;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = !!checked;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        input.addEventListener('change', () => { onChange(!!input.checked); });

        const txt = document.createElement('div');
        txt.style.fontSize = '0.82rem';
        txt.style.opacity = '0.8';
        txt.textContent = 'aktiv';

        row.appendChild(input);
        row.appendChild(txt);

        wrap.appendChild(lbl);
        wrap.appendChild(row);
        return wrap;
      };

      // IDs müssen pro Slot eindeutig sein (für DP-Browser + Validierung)
      const baseId = `flow_${kind}_${idx}`;
      const ctrlFieldsGeneric = [];
      const ctrlFieldsHeatPump = [];

      /**
       * Code-Teil: Arrow-Funktion `addGenericField`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: addGenericField
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const addGenericField = (el) => {
        ctrlFieldsGeneric.push(el);
        ctrlGrid.appendChild(el);
        return el;
      };
      /**
       * Code-Teil: addHeatPumpField
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const addHeatPumpField = (el) => {
        ctrlFieldsHeatPump.push(el);
        ctrlGrid.appendChild(el);
        return el;
      };

      addGenericField(mkDpField('Schalten (Write, bool)', `${baseId}_sw_w`, ctrl.switchWriteId, (v) => { const c = ensureCtrl(); c.switchWriteId = v; }));
      addGenericField(mkDpField('Schalten (Read, bool)', `${baseId}_sw_r`, ctrl.switchReadId, (v) => { const c = ensureCtrl(); c.switchReadId = v; }));
      addGenericField(mkDpField('Sollwert (Write, Zahl)', `${baseId}_sp_w`, ctrl.setpointWriteId, (v) => { const c = ensureCtrl(); c.setpointWriteId = v; }));
      addGenericField(mkDpField('Sollwert (Read, Zahl)', `${baseId}_sp_r`, ctrl.setpointReadId, (v) => { const c = ensureCtrl(); c.setpointReadId = v; }));

      addHeatPumpField(mkDpField('SG‑Ready Relais A (Write, bool)', `${baseId}_sg1_w`, ctrl.sgReadyAWriteId, (v) => { const c = ensureCtrl(); c.sgReadyAWriteId = v; }));
      addHeatPumpField(mkDpField('SG‑Ready Relais A (Read, bool)', `${baseId}_sg1_r`, ctrl.sgReadyAReadId, (v) => { const c = ensureCtrl(); c.sgReadyAReadId = v; }));
      addHeatPumpField(mkDpField('SG‑Ready Relais B (Write, bool)', `${baseId}_sg2_w`, ctrl.sgReadyBWriteId, (v) => { const c = ensureCtrl(); c.sgReadyBWriteId = v; }));
      addHeatPumpField(mkDpField('SG‑Ready Relais B (Read, bool)', `${baseId}_sg2_r`, ctrl.sgReadyBReadId, (v) => { const c = ensureCtrl(); c.sgReadyBReadId = v; }));
      addHeatPumpField(mkCheckField('SG‑Ready Invert Relais A', `${baseId}_sg1_inv`, !!ctrl.sgReadyAInvert, (b) => { const c = ensureCtrl(); c.sgReadyAInvert = !!b; }));
      addHeatPumpField(mkCheckField('SG‑Ready Invert Relais B', `${baseId}_sg2_inv`, !!ctrl.sgReadyBInvert, (b) => { const c = ensureCtrl(); c.sgReadyBInvert = !!b; }));

      addGenericField(mkSimpleField('Sollwert‑Bezeichnung', `${baseId}_sp_lbl`, 'text', ctrl.setpointLabel, 'z.B. Sollleistung / Solltemperatur', (v) => { const c = ensureCtrl(); c.setpointLabel = String(v || '').trim(); }));
      addGenericField(mkSimpleField('Sollwert‑Einheit', `${baseId}_sp_unit`, 'text', ctrl.setpointUnit || 'W', 'z.B. W / °C', (v) => { const c = ensureCtrl(); const t = String(v || '').trim(); c.setpointUnit = t || 'W'; }));
      addGenericField(mkSimpleField('Sollwert Min', `${baseId}_sp_min`, 'number', ctrl.setpointMin, 'optional', (v) => { const c = ensureCtrl(); const n = Number(v); c.setpointMin = Number.isFinite(n) ? n : ''; }));
      addGenericField(mkSimpleField('Sollwert Max', `${baseId}_sp_max`, 'number', ctrl.setpointMax, 'optional', (v) => { const c = ensureCtrl(); const n = Number(v); c.setpointMax = Number.isFinite(n) ? n : ''; }));
      addGenericField(mkSimpleField('Sollwert Step', `${baseId}_sp_step`, 'number', ctrl.setpointStep, 'optional', (v) => { const c = ensureCtrl(); const n = Number(v); c.setpointStep = Number.isFinite(n) ? n : ''; }));

      const rodInfo = document.createElement('div');
      rodInfo.className = 'nw-help';
      rodInfo.style.display = 'none';
      rodInfo.style.marginTop = '6px';
      rodInfo.textContent = 'Für Heizstab-Verbraucher werden die Relais-/KNX-Datenpunkte direkt im Tab „Heizstab“ pro Stufe zugeordnet. Im Energiefluss bleiben hier nur Name, Leistungsmessung und der Typ erhalten.';

      const hint = document.createElement('div');
      hint.className = 'nw-config-field-hint';
      hint.style.marginTop = '6px';
      advanced.appendChild(ctrlGrid);
      advanced.appendChild(rodInfo);
      advanced.appendChild(hint);

      /**
       * Code-Teil: Arrow-Funktion `setVisible`
       * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: setVisible
       * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const setVisible = (el, visible) => {
        if (!el) return;
        el.style.display = visible ? '' : 'none';
      };
      /**
       * Code-Teil: updateConsumerControlVisibility
       * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const updateConsumerControlVisibility = () => {
        const slotType = (kind === 'consumers')
          ? _normalizeFlowConsumerType(consumerTypeSelect ? consumerTypeSelect.value : (slots[i] && slots[i].consumerType))
          : 'generic';
        const isRod = (slotType === 'heatingRod');
        const isHeatPump = (slotType === 'heatPump');

        ctrlFieldsGeneric.forEach((el) => setVisible(el, !isRod));
        ctrlFieldsHeatPump.forEach((el) => setVisible(el, !isRod && isHeatPump));
        setVisible(rodInfo, !!isRod);

        if (kind !== 'consumers') {
          advBtn.textContent = 'Steuerung';
          hint.textContent = 'Wenn Write-Datenpunkte gesetzt sind, wird der Kreis im Energiefluss klickbar (Schnellsteuerung). Read-Datenpunkte sind optional für Status/Feedback.';
          return;
        }

        if (isRod) {
          advBtn.textContent = 'Info';
          hint.textContent = 'Heizstab-Schnellsteuerung (Regelung, Stufe 1–3, Boost) kommt automatisch aus der Heizstab-App. Stage-DPs bitte nur im Tab „Heizstab“ pflegen.';
        } else if (isHeatPump) {
          advBtn.textContent = 'Steuerung';
          hint.textContent = 'Wärmepumpe/Klima: Schalten, Sollwert und optional SG‑Ready pflegen. Damit funktioniert auch die Schnellsteuerung im Energiefluss.';
        } else {
          advBtn.textContent = 'Steuerung';
          hint.textContent = 'Allgemeiner Verbraucher: optional Schalten und/oder Sollwert-Datenpunkte pflegen. SG‑Ready ist hier ausgeblendet.';
        }
      };

      updateConsumerControlVisibility();
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an advBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      advBtn.addEventListener('click', () => {
        advanced.classList.toggle('is-open');
      });

      fields.appendChild(advBtn);

      row.appendChild(meta);
      row.appendChild(fields);
      row.appendChild(advanced);
      container.appendChild(row);
    }
  }
  /**
   * Code-Teil: buildFlowPvNameRow
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildFlowPvNameRow() {
    const fs = _ensureFlowSlots();

    const row = document.createElement('div');
    row.className = 'nw-config-item';

    const left = document.createElement('div');
    left.className = 'nw-config-item__left';
    const title = document.createElement('div');
    title.className = 'nw-config-item__title';
    title.textContent = 'PV Name (optional)';
    const subtitle = document.createElement('div');
    subtitle.className = 'nw-config-item__subtitle';
    subtitle.textContent = 'pvName';
    const hint = document.createElement('div');
    hint.className = 'nw-config-item__hint';
    hint.textContent = 'Wird im Energiefluss-Kreis (PV) als Name angezeigt. Leer lassen = "PV".';
    left.appendChild(title);
    left.appendChild(subtitle);
    left.appendChild(hint);

    const right = document.createElement('div');
    right.className = 'nw-config-item__right';
    const input = document.createElement('input');
    input.className = 'nw-config-input';
    input.type = 'text';
    input.id = 'flow_pvName';
    input.maxLength = 24;
    input.placeholder = 'z.B. PV 1 / Anlage 1';
    input.value = (fs.core && fs.core.pvName) ? String(fs.core.pvName) : '';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    input.addEventListener('change', () => {
      const fs2 = _ensureFlowSlots();
      fs2.core = fs2.core && typeof fs2.core === 'object' ? fs2.core : {};
      fs2.core.pvName = String(input.value || '').trim().slice(0, 24);
      input.value = fs2.core.pvName;
    });
    right.appendChild(input);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  // ------------------------------
  // Thermik / Heizstab: PV‑Überschuss‑Regelung für Verbraucher‑Slots
  // ------------------------------
  /**
   * Code-Teil: _getFlowConsumerSlotCfg
   * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _getFlowConsumerSlotCfg(slot) {
    const fs = _ensureFlowSlots();
    const arr = Array.isArray(fs.consumers) ? fs.consumers : [];
    return (arr[slot - 1] && typeof arr[slot - 1] === 'object') ? arr[slot - 1] : { name: '', icon: '', ctrl: {}, consumerType: 'generic' };
  }
  /**
   * Code-Teil: _getFlowConsumerName
   * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _getFlowConsumerName(slot) {
    const slotCfg = _getFlowConsumerSlotCfg(slot);
    return String(slotCfg.name || '').trim() || `Verbraucher ${slot}`;
  }
  /**
   * Code-Teil: _getFlowConsumerTypeForSlot
   * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _getFlowConsumerTypeForSlot(slot) {
    const slotCfg = _getFlowConsumerSlotCfg(slot);
    return _normalizeFlowConsumerType(slotCfg.consumerType || slotCfg.type || slotCfg.category);
  }
  /**
   * Code-Teil: _getRawHeatingRodDeviceForSlot
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _getRawHeatingRodDeviceForSlot(slot) {
    currentConfig = currentConfig || {};
    const h = (currentConfig.heatingRod && typeof currentConfig.heatingRod === 'object') ? currentConfig.heatingRod : {};
    const arr = Array.isArray(h.devices) ? h.devices : [];
    let dev = null;
    if (arr[slot - 1] && typeof arr[slot - 1] === 'object') {
      const s = _clampInt(arr[slot - 1].slot ?? arr[slot - 1].consumerSlot ?? slot, 1, FLOW_CONSUMER_SLOT_COUNT, slot);
      if (s === slot) dev = arr[slot - 1];
    }
    if (!dev) dev = arr.find((it) => it && _clampInt(it.slot ?? it.consumerSlot, 1, FLOW_CONSUMER_SLOT_COUNT, 0) === slot) || null;
    return dev;
  }
  /**
   * Code-Teil: _getHeatingRodStageDpPair
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _getHeatingRodStageDpPair(slot, stageIdx) {
    const dev = _getRawHeatingRodDeviceForSlot(slot);
    const stages = Array.isArray(dev && dev.stages) ? dev.stages : [];
    const stage = (stages[stageIdx - 1] && typeof stages[stageIdx - 1] === 'object') ? stages[stageIdx - 1] : {};
    let writeId = String(stage.writeId || stage.dpWriteId || stage.writeDp || '').trim();
    let readId = String(stage.readId || stage.dpReadId || stage.readDp || '').trim();

    if (!writeId || !readId) {
      const slotCfg = _getFlowConsumerSlotCfg(slot);
      const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};
      if (!writeId) writeId = String(ctrl[`stage${stageIdx}WriteId`] || ctrl[`heatingStage${stageIdx}WriteId`] || ((stageIdx === 1) ? (ctrl.switchWriteId || '') : '') || '').trim();
      if (!readId) readId = String(ctrl[`stage${stageIdx}ReadId`] || ctrl[`heatingStage${stageIdx}ReadId`] || ((stageIdx === 1) ? (ctrl.switchReadId || '') : '') || '').trim();
    }

    return { writeId, readId };
  }
  /**
   * Code-Teil: _countHeatingRodWiredStages
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _countHeatingRodWiredStages(slot) {
    let cnt = 0;
    for (let s = 1; s <= 12; s++) {
      const pair = _getHeatingRodStageDpPair(slot, s);
      if (String(pair.writeId || '').trim() && cnt === (s - 1)) cnt = s;
    }
    return cnt;
  }
  /**
   * Code-Teil: _thermalDefaultSetpoints
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _thermalDefaultSetpoints(profile) {
    const p = String(profile || 'heating').trim().toLowerCase();
    if (p === 'cooling' || p === 'cool') return { on: 20, off: 24, boost: 18 };
    if (p === 'neutral') return { on: 22, off: 22, boost: 22 };
    return { on: 55, off: 45, boost: 60 };
  }
  /**
   * Code-Teil: _defaultHeatingRodStagePower
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _defaultHeatingRodStagePower(maxPowerW, stageCount, index) {
    const cnt = _clampInt(stageCount, 1, 12, 1);
    const maxW = Math.max(0, Math.round(Number(maxPowerW) || 0));
    if (!maxW) return 0;
    const base = Math.floor(maxW / cnt);
    const rest = maxW - (base * cnt);
    return base + (index === (cnt - 1) ? rest : 0);
  }
  /**
   * Code-Teil: _computeHeatingRodStageDefaults
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _computeHeatingRodStageDefaults(maxPowerW, stageCount) {
    const cnt = _clampInt(stageCount, 1, 12, 1);
    const out = [];
    let cumulative = 0;
    for (let i = 0; i < cnt; i++) {
      const powerW = _defaultHeatingRodStagePower(maxPowerW, cnt, i);
      cumulative += powerW;
      const margin = Math.max(100, Math.round(powerW * 0.4));
      out.push({
        index: i + 1,
        powerW,
        onAboveW: cumulative,
        offBelowW: Math.max(0, cumulative - margin),
      });
    }
    return out;
  }
  /**
   * Code-Teil: _syncHeatingRodDeviceStages
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _syncHeatingRodDeviceStages(dev, opts = {}) {
    if (!dev || typeof dev !== 'object') return dev;
    const count = _clampInt(dev.stageCount, 1, 12, 1);
    const maxPowerW = Math.max(0, Math.round(Number(dev.maxPowerW) || 0));
    const prev = Array.isArray(dev.stages) ? dev.stages : [];
    const defs = _computeHeatingRodStageDefaults(maxPowerW, count);
    const next = [];

    for (let i = 0; i < count; i++) {
      const p = (prev[i] && typeof prev[i] === 'object') ? prev[i] : {};
      const d = defs[i];
      const resetAll = !!opts.resetAll;
      const powerW = resetAll ? d.powerW : (Number.isFinite(Number(p.powerW)) ? Number(p.powerW) : d.powerW);
      const onAboveW = resetAll ? d.onAboveW : (Number.isFinite(Number(p.onAboveW)) ? Number(p.onAboveW) : d.onAboveW);
      let offBelowW = resetAll ? d.offBelowW : (Number.isFinite(Number(p.offBelowW)) ? Number(p.offBelowW) : d.offBelowW);
      if (!Number.isFinite(offBelowW)) offBelowW = d.offBelowW;
      offBelowW = Math.max(0, Math.min(offBelowW, onAboveW));
      next.push({
        index: i + 1,
        powerW: Math.max(0, Math.round(powerW)),
        onAboveW: Math.max(0, Math.round(onAboveW)),
        offBelowW: Math.max(0, Math.round(offBelowW)),
        writeId: String(p.writeId || p.dpWriteId || p.writeDp || '').trim(),
        readId: String(p.readId || p.dpReadId || p.readDp || '').trim(),
      });
    }

    dev.stageCount = count;
    dev.maxPowerW = maxPowerW;
    dev.stages = next;
    return dev;
  }
  /**
   * Code-Teil: _ensureThermalCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureThermalCfg() {
    currentConfig = currentConfig || {};
    currentConfig.thermal = (currentConfig.thermal && typeof currentConfig.thermal === 'object') ? currentConfig.thermal : {};
    const t = currentConfig.thermal;
    t.devices = Array.isArray(t.devices) ? t.devices : [];
    t.manualHoldMin = _clampInt(t.manualHoldMin, 0, 24 * 60, 20);

    const bySlot = new Map();
    for (const raw of t.devices) {
      if (!raw || typeof raw !== 'object') continue;
      const slot = _clampInt(raw.slot ?? raw.consumerSlot, 1, FLOW_CONSUMER_SLOT_COUNT, 0);
      if (!slot) continue;
      bySlot.set(slot, raw);
    }

    const out = [];
    for (let slot = 1; slot <= FLOW_CONSUMER_SLOT_COUNT; slot++) {
      const prev = bySlot.get(slot) || {};
      const profileRaw = String(prev.profile || '').trim().toLowerCase();
      const profile = (profileRaw === 'cooling' || profileRaw === 'cool') ? 'cooling' : (profileRaw === 'neutral' ? 'neutral' : 'heating');
      const defSp = _thermalDefaultSetpoints(profile);
      const typeRaw = String(prev.type || prev.deviceType || prev.kind || '').trim().toLowerCase();
      const type = (typeRaw === 'sgready' || typeRaw === 'sg-ready' || typeRaw === 'sg_ready' || typeRaw === 'sg')
        ? 'sgready'
        : ((typeRaw === 'setpoint' || typeRaw === 'temp' || typeRaw === 'temperature') ? 'setpoint' : 'power');
      const modeRaw = String(prev.mode || 'pvAuto').trim().toLowerCase();
      const mode = (modeRaw === 'manual' || modeRaw === 'off') ? modeRaw : 'pvAuto';
      out.push({
        slot,
        enabled: (typeof prev.enabled === 'boolean') ? !!prev.enabled : false,
        mode,
        name: String(prev.name || '').trim(),
        type,
        profile,
        priority: _clampInt(prev.priority, 1, 999, 100 + slot),
        maxPowerW: Math.max(0, Math.round(Number(prev.maxPowerW ?? 2500) || 2500)),
        estimatedPowerW: Math.max(0, Math.round(Number(prev.estimatedPowerW ?? 1500) || 1500)),
        startSurplusW: Math.max(0, Math.round(Number(prev.startSurplusW ?? 800) || 800)),
        stopSurplusW: Math.max(0, Math.round(Number(prev.stopSurplusW ?? 300) || 300)),
        minOnSec: Math.max(0, Math.round(Number(prev.minOnSec ?? 300) || 300)),
        minOffSec: Math.max(0, Math.round(Number(prev.minOffSec ?? 300) || 300)),
        autoOnSetpoint: Number.isFinite(Number(prev.autoOnSetpoint)) ? Number(prev.autoOnSetpoint) : defSp.on,
        autoOffSetpoint: Number.isFinite(Number(prev.autoOffSetpoint)) ? Number(prev.autoOffSetpoint) : defSp.off,
        boostSetpoint: Number.isFinite(Number(prev.boostSetpoint)) ? Number(prev.boostSetpoint) : defSp.boost,
        boostEnabled: (typeof prev.boostEnabled === 'boolean') ? !!prev.boostEnabled : true,
        boostDurationMin: Math.max(0, Math.round(Number(prev.boostDurationMin ?? 30) || 30)),
        boostPowerW: Math.max(0, Math.round(Number(prev.boostPowerW ?? prev.maxPowerW ?? 2500) || 2500)),
        maxSgStage: _clampInt(prev.maxSgStage, 1, 4, 4),
      });
    }

    t.devices = out;
    return t;
  }
  /**
   * Code-Teil: _normalizeHeatingRodAutoMode
   * Zweck: Normalisiert die Betriebsart hinter dem einen Frontend-Auto-Button der Heizstab-App.
   * Zusammenhang: Das Dropdown speichert nur die Auto-Strategie; Kunden bedienen weiter `Auto`,
   * während die Runtime entweder NVP-PV-Überschuss oder 0-W/Forecast nutzt.
   * TypeScript: Beim späteren Umbau als Union-Typ `'pvSurplus' | 'zeroExportForecast'` führen.
   */
  function _normalizeHeatingRodAutoMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'zeroexportforecast' || s === 'zero-export-forecast' || s === 'zero_export_forecast'
      || s === 'zeroexport' || s === 'zero-export' || s === 'zero_export'
      || s === 'zerofeedin' || s === 'zero-feed-in' || s === 'zero_feed_in'
      || s === 'zero' || s === '0w' || s === '0-w' || s === '0_w'
      || s === '0einspeisung' || s === '0-einspeisung' || s === '0_einspeisung'
      || s === 'zeroeinspeisung' || s === 'forecast') return 'zeroExportForecast';
    return 'pvSurplus';
  }

  /**
   * Code-Teil: _heatingRodAutoModeLabel
   * Zweck: Liefert kurze, konsistente UI-Texte zur Heizstab-Betriebsart.
   * Zusammenhang: Wird im AppCenter und in Status-/Hinweistexten genutzt; bei neuen
   * Betriebsarten immer gemeinsam mit Runtime und Schnellsteuerung erweitern.
   */
  function _heatingRodAutoModeLabel(mode) {
    return _normalizeHeatingRodAutoMode(mode) === 'zeroExportForecast'
      ? '0-W-Einspeisung / Forecast'
      : 'PV-Überschuss am NVP';
  }

  function _normalizeHeatingRodClockTime(raw, fallback = '00:00') {
    const source = String(raw ?? '').trim();
    const match = /^(\d{1,2}):(\d{1,2})$/.exec(source);
    if (!match) return String(fallback || '00:00');
    const hour = Math.max(0, Math.min(23, Math.round(Number(match[1]) || 0)));
    const minute = Math.max(0, Math.min(59, Math.round(Number(match[2]) || 0)));
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  /**
   * Code-Teil: _ensureHeatingRodCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureHeatingRodCfg() {
    currentConfig = currentConfig || {};
    currentConfig.heatingRod = (currentConfig.heatingRod && typeof currentConfig.heatingRod === 'object') ? currentConfig.heatingRod : {};
    const h = currentConfig.heatingRod;
    h.devices = Array.isArray(h.devices) ? h.devices : [];
    const _hrReserveRaw = Number(h.storageReserveW);
    h.storageReserveW = Math.max(0, Math.round(Number.isFinite(_hrReserveRaw) ? _hrReserveRaw : 1000));
    const _hrSocRaw = Number(h.storageTargetSocPct);
    h.storageTargetSocPct = Math.max(0, Math.min(100, Math.round(Number.isFinite(_hrSocRaw) ? _hrSocRaw : 90)));
    const hMinPvRaw = Number(h.minPvPowerW ?? h.pvAutoMinPvPowerW ?? h.minCurrentPvW);
    h.minPvPowerW = Math.max(0, Math.round(Number.isFinite(hMinPvRaw) ? hMinPvRaw : 800));
    h.blockPvAutoAtNight = (typeof h.blockPvAutoAtNight === 'boolean') ? !!h.blockPvAutoAtNight : true;
    h.nightStartTime = _normalizeHeatingRodClockTime(h.nightStartTime, '20:00');
    h.nightEndTime = _normalizeHeatingRodClockTime(h.nightEndTime, '06:00');
    h.useBudgetGates = true;
    const legacyZeroForBudget = (h.zeroExport && typeof h.zeroExport === 'object') ? h.zeroExport : {};
    // Das alte Detail-Flag `zeroExport.enabled` wird nur zur Migration verwendet.
    // Danach steuert ausschließlich `h.autoMode`, welche Regelstrategie der normale
    // Auto-Button nutzt; so gibt es keine zweite, widersprüchliche Aktivierung mehr.
    const legacyZeroModeActive = !!(legacyZeroForBudget.enabled || legacyZeroForBudget.active);
    h.autoMode = _normalizeHeatingRodAutoMode(
      h.autoMode || h.automationMode || legacyZeroForBudget.autoMode || legacyZeroForBudget.mode || (legacyZeroModeActive ? 'zeroExportForecast' : 'pvSurplus')
    );
    const legacyBudgetAliases = {
      maxGridImportW: ['maxGridImportW', 'gridImportTripW'],
      gridImportHoldSec: ['gridImportHoldSec', 'gridImportTripSec'],
      hardGridImportW: ['hardGridImportW'],
      storageDischargeToleranceW: ['storageDischargeToleranceW'],
      storageDischargeHoldSec: ['storageDischargeHoldSec', 'storageDischargeTripSec'],
      hardStorageDischargeW: ['hardStorageDischargeW'],
      budgetSafetyReserveW: ['budgetSafetyReserveW', 'pvSafetyReserveW'],
      stageUpDelaySec: ['stageUpDelaySec', 'budgetStageUpDelaySec', 'pvStageUpDelaySec'],
      minStageRunSec: ['minStageRunSec', 'minAutoStageRunSec', 'pvMinStageRunSec'],
      cooldownAfterOffSec: ['cooldownAfterOffSec', 'autoCooldownAfterOffSec', 'pvCooldownAfterOffSec'],
    };
    /**
     * Code-Teil: Arrow-Funktion `hn`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: hn
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const hn = (key, def, min, max) => {
      let raw = h[key];
      if (raw === undefined || raw === null || raw === '') {
        const aliases = legacyBudgetAliases[key] || [];
        for (const alias of aliases) {
          const zRaw = legacyZeroForBudget[alias];
          if (zRaw !== undefined && zRaw !== null && zRaw !== '') { raw = zRaw; break; }
        }
      }
      let n = Number(raw);
      if (!Number.isFinite(n)) n = def;
      h[key] = Math.round(Math.max(min, Math.min(max, n)));
    };
    hn('maxGridImportW', 250, 0, 1000000);
    hn('gridImportHoldSec', 45, 0, 3600);
    hn('hardGridImportW', 1500, 0, 1000000);
    hn('storageDischargeToleranceW', 300, 0, 1000000);
    hn('storageDischargeHoldSec', 45, 0, 3600);
    hn('hardStorageDischargeW', 2000, 0, 1000000);
    hn('budgetSafetyReserveW', 200, 0, 1000000);
    hn('stageUpDelaySec', 20, 0, 3600);
    hn('minStageRunSec', 120, 0, 86400);
    hn('cooldownAfterOffSec', 180, 0, 86400);
    h.zeroExport = (h.zeroExport && typeof h.zeroExport === 'object') ? h.zeroExport : {};
    const z = h.zeroExport;
    /**
     * Code-Teil: Arrow-Funktion `zn`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    const zn = (key, def, min, max, integer = true) => {
      const raw = z[key];
      let n = Number(raw);
      if (!Number.isFinite(n)) n = def;
      n = Math.max(min, Math.min(max, n));
      z[key] = integer ? Math.round(n) : n;
    };
    z.enabled = h.autoMode === 'zeroExportForecast';
    z.autoMode = h.autoMode;
    zn('feedInLimitW', 1000, 0, 1000000);
    zn('feedInToleranceW', 150, 0, 100000);
    zn('targetExportBufferW', 100, 0, 100000);
    zn('minPvPowerW', 1000, 0, 1000000);
    z.requireForecast = (typeof z.requireForecast === 'boolean') ? !!z.requireForecast : true;
    zn('minForecastPeakW', 1000, 0, 1000000);
    zn('minForecastKwh6h', 0.5, 0, 100000, false);
    zn('storageFullSocPct', 95, 0, 100);
    zn('gridImportTripW', 150, 0, 1000000);
    zn('gridImportTripSec', 5, 0, 3600);
    zn('hardGridImportW', 500, 0, 1000000);
    zn('storageDischargeToleranceW', 300, 0, 1000000);
    zn('storageDischargeTripSec', 8, 0, 3600);
    zn('hardStorageDischargeW', 800, 0, 1000000);
    zn('stepUpDelaySec', 60, 0, 86400);
    zn('stepDownDelaySec', 5, 0, 86400);
    zn('cooldownSec', 60, 0, 86400);
    zn('probeObserveSec', 45, 0, 3600);
    zn('probeMinPvRisePct', 20, 0, 1000);
    zn('probeMinPvRiseW', 150, 0, 1000000);
    zn('probeRetrySec', 600, 0, 86400);

    const bySlot = new Map();
    for (const raw of h.devices) {
      if (!raw || typeof raw !== 'object') continue;
      const slot = _clampInt(raw.slot ?? raw.consumerSlot, 1, FLOW_CONSUMER_SLOT_COUNT, 0);
      if (!slot) continue;
      bySlot.set(slot, raw);
    }

    const out = [];
    for (let slot = 1; slot <= FLOW_CONSUMER_SLOT_COUNT; slot++) {
      const prev = bySlot.get(slot) || {};
      const slotCfg = _getFlowConsumerSlotCfg(slot);
      const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};
      /**
       * Code-Teil: Arrow-Funktion `stageCountDefault`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: stageCountDefault
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const stageCountDefault = (() => {
        const fromStages = Array.isArray(prev.stages) ? prev.stages.reduce((max, st, idx) => {
          if (!st || typeof st !== 'object') return max;
          const writeId = String(st.writeId || st.dpWriteId || st.writeDp || '').trim();
          const readId = String(st.readId || st.dpReadId || st.readDp || '').trim();
          return (writeId || readId) ? Math.max(max, idx + 1) : max;
        }, 0) : 0;
        if (fromStages > 0) return fromStages;
        const wired = _countHeatingRodWiredStages(slot);
        if (wired > 0) return wired;
        if (Array.isArray(prev.stages) && prev.stages.length) return prev.stages.length;
        return 3;
      })();
      const dev = {
        slot,
        enabled: (typeof prev.enabled === 'boolean') ? !!prev.enabled : false,
        mode: (String(prev.mode || '').trim().toLowerCase() === 'manual') ? 'manual' : (String(prev.mode || '').trim().toLowerCase() === 'off' ? 'off' : 'pvAuto'),
        name: String(prev.name || '').trim(),
        maxPowerW: Math.max(0, Math.round(Number(prev.maxPowerW ?? (stageCountDefault * 2000)) || (stageCountDefault * 2000))),
        stageCount: _clampInt(prev.stageCount ?? stageCountDefault, 1, 12, stageCountDefault),
        priority: _clampInt(prev.priority, 1, 999, 200 + slot),
        minOnSec: Math.max(0, Math.round(Number(prev.minOnSec ?? 60) || 60)),
        minOffSec: Math.max(0, Math.round(Number(prev.minOffSec ?? 60) || 60)),
        stages: Array.isArray(prev.stages) ? prev.stages : [],
      };
      _syncHeatingRodDeviceStages(dev);

      for (let s = 1; s <= dev.stageCount; s++) {
        const stage = dev.stages[s - 1] || { index: s };
        const writeId = String(stage.writeId || ctrl[`stage${s}WriteId`] || ctrl[`heatingStage${s}WriteId`] || ((s === 1) ? (ctrl.switchWriteId || '') : '') || '').trim();
        const readId = String(stage.readId || ctrl[`stage${s}ReadId`] || ctrl[`heatingStage${s}ReadId`] || ((s === 1) ? (ctrl.switchReadId || '') : '') || '').trim();
        stage.writeId = writeId;
        stage.readId = readId;
        dev.stages[s - 1] = stage;
      }

      out.push(dev);
    }

    h.devices = out;
    return h;
  }
  /**
   * Code-Teil: _mkCfgInput
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgInput(type, value, onChange, opts = {}) {
    const inp = document.createElement('input');
    inp.type = type || 'text';
    inp.className = (type === 'checkbox') ? '' : ((opts.className) ? opts.className : 'nw-config-input');
    if (type !== 'checkbox') inp.value = (value ?? '') === null ? '' : String(value ?? '');
    if (opts.placeholder) inp.placeholder = opts.placeholder;
    if (opts.min != null) inp.min = String(opts.min);
    if (opts.max != null) inp.max = String(opts.max);
    if (opts.step != null) inp.step = String(opts.step);
    if (opts.width) inp.style.width = opts.width;
    if (opts.disabled) inp.disabled = true;
    /**
     * Code-Teil: Arrow-Funktion `commit`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: commit
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const commit = () => {
      const v = (type === 'number') ? Number(inp.value) : (type === 'checkbox' ? !!inp.checked : inp.value);
      onChange(v, inp);
    };
    // Number/text fields must update the in-memory config immediately. Otherwise a
    // fast save or a reactive UI refresh can write the previous value again (e.g.
    // Heizstab Speicher-Reserve snapped back to the default 1000 W).
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    inp.addEventListener('change', commit);
    // Installer-UX: Some controls trigger a structural re-render of their
    // section (for example changing the heating-rod stage count). For normal
    // text/number fields we still commit live, but callers can disable live
    // input commits with opts.commitOnInput=false so typing inside deep forms
    // never rebuilds the section and jumps the page to the top.
    if (type !== 'checkbox' && opts.commitOnInput !== false) inp.addEventListener('input', commit);
    return inp;
  }
  /**
   * Code-Teil: _mkHeatingRodNumberInput
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkHeatingRodNumberInput(key, value, onChange, opts = {}) {
    const inp = _mkCfgInput('number', value, onChange, opts);
    inp.dataset.heatingRodCfgKey = String(key || '');
    inp.id = `heatingRod_${String(key || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    return inp;
  }
  /**
   * Code-Teil: flushHeatingRodConfigFromDom
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function flushHeatingRodConfigFromDom() {
    try {
      if (!document || !document.querySelectorAll) return;
      currentConfig = currentConfig || {};
      currentConfig.heatingRod = (currentConfig.heatingRod && typeof currentConfig.heatingRod === 'object') ? currentConfig.heatingRod : {};
      const h = currentConfig.heatingRod;
      const numericKeys = new Set([
        'storageReserveW', 'storageTargetSocPct', 'minPvPowerW', 'budgetSafetyReserveW',
        'stageUpDelaySec', 'minStageRunSec', 'cooldownAfterOffSec', 'maxGridImportW',
        'gridImportHoldSec', 'storageDischargeToleranceW', 'storageDischargeHoldSec'
      ]);
      document.querySelectorAll('[data-heating-rod-cfg-key]').forEach((el) => {
        const key = String(el.dataset.heatingRodCfgKey || '').trim();
        if (!key || !numericKeys.has(key)) return;
        const n = Number(el.value);
        if (!Number.isFinite(n)) return;
        if (key === 'storageTargetSocPct') h[key] = Math.max(0, Math.min(100, Math.round(n)));
        else h[key] = Math.max(0, Math.round(n));
      });
    } catch (_e) {}
  }
  /**
   * Code-Teil: _mkCfgSelect
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgSelect(value, options, onChange, opts = {}) {
    const sel = document.createElement('select');
    sel.className = opts.className || 'nw-config-select';
    if (opts.width) sel.style.width = opts.width;
    if (opts.disabled) sel.disabled = true;
    (options || []).forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    sel.value = value;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    sel.addEventListener('change', () => onChange(sel.value, sel));
    return sel;
  }
  /**
   * Code-Teil: _mkCfgToggle
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgToggle(checked, onChange, opts = {}) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!checked;
    if (opts.disabled) cb.disabled = true;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    cb.addEventListener('change', () => onChange(!!cb.checked, cb));
    return cb;
  }
  /**
   * Code-Teil: _mkCfgField
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgField(label, control, hint) {
    const wrap = document.createElement('div');
    wrap.className = 'nw-config-mini-field';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '4px';
    wrap.style.minWidth = '130px';
    wrap.style.maxWidth = '100%';
    const lab = document.createElement('div');
    lab.textContent = label;
    lab.style.fontSize = '0.72rem';
    lab.style.opacity = '0.75';
    wrap.appendChild(lab);
    wrap.appendChild(control);
    if (hint) {
      const h = document.createElement('div');
      h.className = 'nw-config-field-hint';
      h.style.margin = '0';
      h.textContent = hint;
      wrap.appendChild(h);
    }
    return wrap;
  }
  /**
   * Code-Teil: _mkCfgGroup
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgGroup(title) {
    const wrap = document.createElement('div');
    wrap.className = 'nw-config-group';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    wrap.style.padding = '10px 12px';
    wrap.style.border = '1px solid rgba(255,255,255,0.08)';
    wrap.style.borderRadius = '12px';
    wrap.style.background = 'rgba(255,255,255,0.02)';
    wrap.style.flex = '1 1 320px';
    wrap.style.minWidth = '0';
    wrap.style.maxWidth = '100%';

    const head = document.createElement('div');
    head.textContent = title;
    head.style.fontWeight = '600';
    head.style.fontSize = '0.82rem';
    head.style.opacity = '0.92';

    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexWrap = 'wrap';
    body.style.gap = '10px';
    body.style.alignItems = 'flex-end';

    wrap.appendChild(head);
    wrap.appendChild(body);
    return { wrap, body };
  }
  /**
   * Code-Teil: _mkCfgDetailsGroup
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgDetailsGroup(title, open = false) {
    const wrap = document.createElement('details');
    wrap.className = 'nw-config-group nw-config-group--details';
    wrap.open = !!open;
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    wrap.style.padding = '10px 12px';
    wrap.style.border = '1px solid rgba(255,255,255,0.08)';
    wrap.style.borderRadius = '12px';
    wrap.style.background = 'rgba(255,255,255,0.02)';
    wrap.style.flex = '1 1 320px';
    wrap.style.minWidth = '0';
    wrap.style.maxWidth = '100%';

    const summary = document.createElement('summary');
    summary.textContent = title;
    summary.style.cursor = 'pointer';
    summary.style.fontWeight = '600';
    summary.style.fontSize = '0.82rem';
    summary.style.opacity = '0.92';

    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexWrap = 'wrap';
    body.style.gap = '10px';
    body.style.alignItems = 'flex-end';
    body.style.marginTop = '10px';

    wrap.appendChild(summary);
    wrap.appendChild(body);
    return { wrap, body };
  }
  /**
   * Code-Teil: _mkCfgBadge
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkCfgBadge(text, tone = 'default') {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.padding = '3px 8px';
    span.style.borderRadius = '999px';
    span.style.fontSize = '0.72rem';
    span.style.fontWeight = '600';
    span.style.border = '1px solid rgba(255,255,255,0.12)';
    span.style.background = 'rgba(255,255,255,0.04)';
    if (tone === 'warn') {
      span.style.background = 'rgba(255,180,0,0.10)';
      span.style.borderColor = 'rgba(255,180,0,0.35)';
    } else if (tone === 'ok') {
      span.style.background = 'rgba(56,189,104,0.10)';
      span.style.borderColor = 'rgba(56,189,104,0.35)';
    }
    return span;
  }
  /**
   * Code-Teil: _mkDeviceRow
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkDeviceRow(title, subtitle, badges = []) {
    const row = document.createElement('div');
    row.className = 'nw-config-item nw-config-item--device-row';
    row.style.alignItems = 'start';
    row.style.minWidth = '0';
    row.style.overflow = 'hidden';

    const left = document.createElement('div');
    left.className = 'nw-config-item__left';
    left.style.maxWidth = '280px';
    left.style.minWidth = '0';

    const ttl = document.createElement('div');
    ttl.className = 'nw-config-item__title';
    ttl.textContent = title;

    const sub = document.createElement('div');
    sub.className = 'nw-config-item__subtitle';
    sub.textContent = subtitle || '';

    const badgeWrap = document.createElement('div');
    badgeWrap.style.display = 'flex';
    badgeWrap.style.flexWrap = 'wrap';
    badgeWrap.style.gap = '6px';
    badgeWrap.style.marginTop = '8px';
    (badges || []).forEach((b) => badgeWrap.appendChild(b));

    left.appendChild(ttl);
    if (subtitle) left.appendChild(sub);
    if ((badges || []).length) left.appendChild(badgeWrap);

    const right = document.createElement('div');
    right.className = 'nw-config-item__right';
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '12px';
    right.style.flex = '1';
    right.style.minWidth = '0';
    right.style.maxWidth = '100%';

    row.appendChild(left);
    row.appendChild(right);
    return { row, left, right, badgeWrap };
  }
  /**
   * Code-Teil: buildThermalUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildThermalUI() {
    if (!els.thermalDevices) return;
    const cfg = _ensureThermalCfg();
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const app = (apps && apps.thermal) ? apps.thermal : { installed: false, enabled: false };

    if (els.thermalHoldMinutes) {
      els.thermalHoldMinutes.value = String(cfg.manualHoldMin ?? 20);
      els.thermalHoldMinutes.onchange = () => {
        const tcfg = _ensureThermalCfg();
        tcfg.manualHoldMin = _clampInt(els.thermalHoldMinutes.value, 0, 24 * 60, 20);
        els.thermalHoldMinutes.value = String(tcfg.manualHoldMin);
        setDirty();
      };
      els.thermalHoldMinutes.disabled = !app.enabled;
    }

    els.thermalDevices.innerHTML = '';

    const modeOptions = [
      { value: 'pvAuto', label: 'Auto' },
      { value: 'manual', label: 'Manuell' },
      { value: 'off', label: 'Aus' },
    ];
    const typeOptions = [
      { value: 'setpoint', label: 'Sollwert / Setpoint' },
      { value: 'sgready', label: 'SG-Ready' },
      { value: 'power', label: 'Leistung (modulierend)' },
    ];
    const profileOptions = [
      { value: 'heating', label: 'Heizen' },
      { value: 'cooling', label: 'Kühlen' },
      { value: 'neutral', label: 'Neutral' },
    ];

    cfg.devices.forEach((dev, idx) => {
      const slot = idx + 1;
      const slotCfg = _getFlowConsumerSlotCfg(slot);
      const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};
      const slotType = _getFlowConsumerTypeForSlot(slot);
      const title = `Slot ${slot} – ${_getFlowConsumerName(slot)}`;
      const badges = [
        _mkCfgBadge(slotType === 'heatingRod' ? 'Heizstab-Slot' : (slotType === 'heatPump' ? 'Wärmepumpe/Klima' : 'Allgemeiner Verbraucher'), slotType === 'heatingRod' ? 'warn' : 'ok'),
        _mkCfgBadge(app.enabled ? 'App aktiv' : 'App deaktiviert'),
      ];
      const { row, right } = _mkDeviceRow(title, 'Thermik-Regelung für Wärmepumpe, Klima oder thermische Setpoint-/SG-Ready-Geräte.', badges);

      const info = document.createElement('div');
      info.className = 'nw-config-field-hint';
      info.style.margin = '0';
      info.textContent = [
        `Leistung: ${String((currentConfig.datapoints && currentConfig.datapoints[`consumer${slot}Power`]) || '').trim() ? '✓' : 'fehlt'}`,
        `Switch: ${String(ctrl.switchWriteId || '').trim() ? '✓' : '–'}`,
        `Setpoint: ${String(ctrl.setpointWriteId || '').trim() ? '✓' : '–'}`,
        `SG-Ready: ${(String(ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim() && String(ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim()) ? '✓' : '–'}`,
      ].join(' • ');
      right.appendChild(info);

      if (slotType === 'heatingRod') {
        const warn = document.createElement('div');
        warn.className = 'nw-help';
        warn.textContent = 'Dieser Verbraucher-Slot ist im Energiefluss als Heizstab markiert und wird deshalb nicht mehr von der Thermik-App geregelt. Bitte im Tab „Heizstab“ parametrieren.';
        right.appendChild(warn);
        els.thermalDevices.appendChild(row);
        return;
      }

      const grpBasic = _mkCfgGroup('Grunddaten');
      grpBasic.body.appendChild(_mkCfgField('PV-Auto aktiv', _mkCfgToggle(dev.enabled, (v) => { dev.enabled = !!v; setDirty(); }), 'Aktiviert die automatische Überschuss-Regelung für diesen Slot.'));
      grpBasic.body.appendChild(_mkCfgField('Name (optional)', _mkCfgInput('text', dev.name || '', (v) => { dev.name = String(v || '').trim(); setDirty(); }, { width: '220px', placeholder: 'Anzeige-Name' }), 'Leer lassen = Name aus Energiefluss-Slot verwenden.'));
      grpBasic.body.appendChild(_mkCfgField('Modus', _mkCfgSelect(dev.mode || 'pvAuto', modeOptions, (v) => { dev.mode = v; setDirty(); }, { width: '160px' }), 'PV-Auto = EMS regelt, Manuell = nur Ist-Leistung bilanzieren, Aus = immer aus.'));
      grpBasic.body.appendChild(_mkCfgField('Regelart', _mkCfgSelect(dev.type || 'setpoint', typeOptions, (v) => { dev.type = v; syncVisibility(); setDirty(); }, { width: '220px' }), 'Setpoint / SG-Ready / modulierende Leistungsansteuerung.'));
      grpBasic.body.appendChild(_mkCfgField('Profil', _mkCfgSelect(dev.profile || 'heating', profileOptions, (v) => { dev.profile = v; const defs = _thermalDefaultSetpoints(v); if (!Number.isFinite(Number(dev.autoOnSetpoint))) dev.autoOnSetpoint = defs.on; if (!Number.isFinite(Number(dev.autoOffSetpoint))) dev.autoOffSetpoint = defs.off; if (!Number.isFinite(Number(dev.boostSetpoint))) dev.boostSetpoint = defs.boost; buildThermalUI(); setDirty(); }, { width: '150px' }), 'Bestimmt nur sinnvolle Default-Sollwerte für Setpoint-Geräte.'));
      grpBasic.body.appendChild(_mkCfgField('Priorität', _mkCfgInput('number', dev.priority, (v) => { dev.priority = _clampInt(v, 1, 999, 100 + slot); setDirty(); }, { min: 1, max: 999, step: 1, width: '110px' }), 'Kleinere Zahl = wird früher bedient.'));
      right.appendChild(grpBasic.wrap);

      const grpThresholds = _mkCfgGroup('PV-Auto & Hysterese');
      grpThresholds.body.appendChild(_mkCfgField('Start Überschuss (W)', _mkCfgInput('number', dev.startSurplusW, (v) => { dev.startSurplusW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '130px' }), 'Ab hier wird zugeschaltet bzw. angehoben.'));
      grpThresholds.body.appendChild(_mkCfgField('Stop Überschuss (W)', _mkCfgInput('number', dev.stopSurplusW, (v) => { dev.stopSurplusW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '130px' }), 'Unterhalb dieser Schwelle wird wieder reduziert/abgeschaltet.'));
      grpThresholds.body.appendChild(_mkCfgField('Min. Ein-Zeit (s)', _mkCfgInput('number', dev.minOnSec, (v) => { dev.minOnSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '120px' }), 'Verhindert Flattern.'));
      grpThresholds.body.appendChild(_mkCfgField('Min. Aus-Zeit (s)', _mkCfgInput('number', dev.minOffSec, (v) => { dev.minOffSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '120px' }), 'Verhindert Flattern.'));
      right.appendChild(grpThresholds.wrap);

      const grpSetpoint = _mkCfgGroup('Setpoint / Sollwert');
      grpSetpoint.body.appendChild(_mkCfgField('Auto-On Sollwert', _mkCfgInput('number', dev.autoOnSetpoint, (v) => { dev.autoOnSetpoint = Number.isFinite(v) ? v : dev.autoOnSetpoint; setDirty(); }, { step: 0.1, width: '130px' }), 'Sollwert während PV-Auto.'));
      grpSetpoint.body.appendChild(_mkCfgField('Auto-Off Sollwert', _mkCfgInput('number', dev.autoOffSetpoint, (v) => { dev.autoOffSetpoint = Number.isFinite(v) ? v : dev.autoOffSetpoint; setDirty(); }, { step: 0.1, width: '130px' }), 'Sollwert im reduzierten Zustand.'));
      grpSetpoint.body.appendChild(_mkCfgField('Boost Sollwert', _mkCfgInput('number', dev.boostSetpoint, (v) => { dev.boostSetpoint = Number.isFinite(v) ? v : dev.boostSetpoint; setDirty(); }, { step: 0.1, width: '130px' }), 'Sollwert bei Schnellsteuerung/Boost.'));
      grpSetpoint.body.appendChild(_mkCfgField('Leistungs-Schätzung (W)', _mkCfgInput('number', dev.estimatedPowerW, (v) => { dev.estimatedPowerW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '140px' }), 'Nur für PV-Budgetierung und Anzeige.'));
      right.appendChild(grpSetpoint.wrap);

      const grpPower = _mkCfgGroup('Leistungsregelung');
      grpPower.body.appendChild(_mkCfgField('Max. Leistung (W)', _mkCfgInput('number', dev.maxPowerW, (v) => { dev.maxPowerW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '140px' }), 'Für modulierende Leistungsgeräte.'));
      grpPower.body.appendChild(_mkCfgField('Boost Leistung (W)', _mkCfgInput('number', dev.boostPowerW, (v) => { dev.boostPowerW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '140px' }), 'Wert für Schnellsteuerung/Boost.'));
      right.appendChild(grpPower.wrap);

      const grpSg = _mkCfgGroup('SG-Ready');
      grpSg.body.appendChild(_mkCfgField('Leistungs-Schätzung (W)', _mkCfgInput('number', dev.estimatedPowerW, (v) => { dev.estimatedPowerW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '140px' }), 'Typischer Verbrauch im aktiven SG-Ready-Zustand.'));
      grpSg.body.appendChild(_mkCfgField('Max. SG-Stufe', _mkCfgInput('number', dev.maxSgStage, (v) => { dev.maxSgStage = _clampInt(v, 1, 4, 4); setDirty(); }, { min: 1, max: 4, step: 1, width: '120px' }), 'Zur Dokumentation; SG-Ready nutzt Relais A/B aus dem Energiefluss-Slot.'));
      right.appendChild(grpSg.wrap);

      const grpBoost = _mkCfgGroup('Schnellsteuerung');
      const boostToggleWrap = document.createElement('div');
      boostToggleWrap.style.display = 'flex';
      boostToggleWrap.style.alignItems = 'center';
      boostToggleWrap.style.gap = '8px';
      boostToggleWrap.appendChild(_mkCfgToggle(dev.boostEnabled, (v) => { dev.boostEnabled = !!v; syncVisibility(); setDirty(); }));
      const boostLbl = document.createElement('span');
      boostLbl.textContent = 'Boost erlauben';
      boostToggleWrap.appendChild(boostLbl);
      grpBoost.body.appendChild(_mkCfgField('Boost', boostToggleWrap, 'Erlaubt zeitlich begrenzte manuelle Übersteuerung aus der VIS.'));
      grpBoost.body.appendChild(_mkCfgField('Boost Dauer (min)', _mkCfgInput('number', dev.boostDurationMin, (v) => { dev.boostDurationMin = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '130px' }), 'Wie lange Boost aktiv bleibt.'));
      right.appendChild(grpBoost.wrap);
      /**
       * Code-Teil: syncVisibility
       * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      function syncVisibility() {
        const type = String(dev.type || 'setpoint');
        grpSetpoint.wrap.style.display = (type === 'setpoint') ? '' : 'none';
        grpPower.wrap.style.display = (type === 'power') ? '' : 'none';
        grpSg.wrap.style.display = (type === 'sgready') ? '' : 'none';
        grpBoost.wrap.style.opacity = dev.boostEnabled ? '1' : '0.9';
      }
      syncVisibility();

      els.thermalDevices.appendChild(row);
    });
  }
  /**
   * Code-Teil: rebuildHeatingRodUIStable
   * Zweck: Rendert die Heizstab-Konfiguration neu, ohne den Installateur beim
   * Bearbeiten tiefer Felder an den Seitenanfang zu springen. Diese Funktion
   * ist nur für echte Strukturänderungen gedacht (z. B. Stufenzahl oder DP-
   * Auswahl). Reine Zahlenänderungen in Stufenfeldern dürfen nicht komplett
   * neu rendern, weil sonst Fokus, Cursor und Scrollposition verloren gehen.
   */
  function rebuildHeatingRodUIStable(reason = '') {
    let scrollX = 0;
    let scrollY = 0;
    let activeId = '';
    let activeValue = null;
    try {
      scrollX = window.scrollX || 0;
      scrollY = window.scrollY || 0;
      const active = document && document.activeElement;
      activeId = active && active.id ? String(active.id) : '';
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
        activeValue = ('value' in active) ? active.value : null;
      }
    } catch (_e) {}

    try { buildHeatingRodUI(); } catch (_e) {}

    try {
      requestAnimationFrame(() => {
        try {
          window.scrollTo(scrollX, scrollY);
          if (activeId) {
            const restored = document.getElementById(activeId);
            if (restored && typeof restored.focus === 'function') {
              restored.focus({ preventScroll: true });
              if (activeValue !== null && 'value' in restored && restored.value === '') restored.value = activeValue;
            }
          }
        } catch (_e2) {}
      });
    } catch (_e) {}
  }

  /**
   * Code-Teil: buildHeatingRodUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildHeatingRodUI() {
    if (!els.heatingRodDevices) return;
    const cfg = _ensureHeatingRodCfg();
    els.heatingRodDevices.innerHTML = '';

    const visibleSlots = [];
    for (let slot = 1; slot <= FLOW_CONSUMER_SLOT_COUNT; slot++) {
      if (_getFlowConsumerTypeForSlot(slot) === 'heatingRod') visibleSlots.push(slot);
    }

    if (!visibleSlots.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-help';
      empty.textContent = 'Noch kein Verbraucher-Slot als Heizstab markiert. Bitte zuerst im Energiefluss beim gewünschten Verbraucher den Typ „Heizstab“ auswählen. Die Stufenzahl, Relais-/KNX-Datenpunkte und Schaltschwellen werden anschließend komplett hier im Tab „Heizstab“ gepflegt.';
      els.heatingRodDevices.appendChild(empty);
      return;
    }

    const modeOptions = [
      { value: 'pvAuto', label: 'Auto' },
      { value: 'manual', label: 'Manuell' },
      { value: 'off', label: 'Aus' },
    ];
    const stageCountOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}` }));

    const grpMode = _mkCfgGroup('Betriebsart');
    const modeInfo = document.createElement('div');
    modeInfo.className = 'nw-config-field-hint';
    modeInfo.style.flexBasis = '100%';
    modeInfo.textContent = 'Diese Einstellung entscheidet, welche Regelstrategie der normale Auto-Button verwendet. Es wird bewusst kein zweiter Auto-Button erzeugt.';
    grpMode.body.appendChild(modeInfo);
    const autoModeSelect = _mkCfgSelect(cfg.autoMode || 'pvSurplus', [
      { value: 'pvSurplus', label: 'PV-Überschuss am NVP' },
      { value: 'zeroExportForecast', label: '0-W-Einspeisung / Forecast' },
    ], (v) => {
      cfg.autoMode = _normalizeHeatingRodAutoMode(v);
      cfg.zeroExport = (cfg.zeroExport && typeof cfg.zeroExport === 'object') ? cfg.zeroExport : {};
      cfg.zeroExport.enabled = cfg.autoMode === 'zeroExportForecast';
      cfg.zeroExport.autoMode = cfg.autoMode;
      rebuildHeatingRodUIStable('heatingrod-auto-mode');
      setDirty();
    }, { width: '260px' });
    grpMode.body.appendChild(_mkCfgField('Automatik-Regelung', autoModeSelect, cfg.autoMode === 'zeroExportForecast'
      ? 'Auto nutzt Forecast, Teststufen und Live-Netzpunkt-/Speicher-Schutz für Anlagen mit 0-W-Einspeisung.'
      : 'Auto nutzt den gemessenen PV-Überschuss am Netzverknüpfungspunkt.'));
    const modeStatus = document.createElement('div');
    modeStatus.className = 'nw-config-field-hint';
    modeStatus.style.flexBasis = '100%';
    modeStatus.textContent = `Auto-Button verwendet aktuell: ${_heatingRodAutoModeLabel(cfg.autoMode)}`;
    grpMode.body.appendChild(modeStatus);
    els.heatingRodDevices.appendChild(grpMode.wrap);

    const grpAuto = _mkCfgGroup('Auto – Budget & Speicher');
    const autoInfo = document.createElement('div');
    autoInfo.className = 'nw-config-field-hint';
    autoInfo.style.flexBasis = '100%';
    autoInfo.textContent = 'Bei aktiver zentraler Nulleinspeisung unter Netzlimits folgt die PV-Automatik dem gemeinsamen PV-Budget; Temperatur-, Netz- und Speicherschutz bleiben wirksam. Ohne zentrale Strategie gilt: ' + (cfg.autoMode === 'zeroExportForecast'
      ? 'Der lokale 0-W-/Forecast-Modus prüft PV-Nachregelung über begrenzte Probe-Stufen.'
      : 'Der klassische PV-Überschussmodus nutzt das EMS-Budget und den gemessenen Überschuss. Externe KNX-/Relais-Schaltungen werden nur beobachtet.');
    grpAuto.body.appendChild(autoInfo);
    grpAuto.body.appendChild(_mkCfgField('PV-Auto nachts sperren', _mkCfgToggle(cfg.blockPvAutoAtNight !== false, (v) => {
      cfg.blockPvAutoAtNight = !!v;
      setDirty();
    }), 'Im Nachtfenster werden nur automatisch gesetzte Heizstab-Stufen aktiv ausgeschaltet. Manual 1/2/3, Boost und eine erkannte externe manuelle KNX-/Relais-Freigabe bleiben möglich.'));
    grpAuto.body.appendChild(_mkCfgField('Nacht beginnt', _mkCfgInput('time', cfg.nightStartTime || '20:00', (v) => {
      cfg.nightStartTime = _normalizeHeatingRodClockTime(v, '20:00');
      setDirty();
    }, { width: '135px' }), 'Lokale Uhrzeit des EOS-Controllers. Das Fenster darf über Mitternacht laufen.'));
    grpAuto.body.appendChild(_mkCfgField('Nacht endet', _mkCfgInput('time', cfg.nightEndTime || '06:00', (v) => {
      cfg.nightEndTime = _normalizeHeatingRodClockTime(v, '06:00');
      setDirty();
    }, { width: '135px' }), 'Ab dieser Uhrzeit darf PV-Auto wieder selbstständig regeln.'));
    grpAuto.body.appendChild(_mkCfgField('Speicher-Reserve (W)', _mkHeatingRodNumberInput('storageReserveW', cfg.storageReserveW, (v) => { cfg.storageReserveW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 50, width: '150px' }), 'Bleibt für Speicherladung frei, solange der Speicher unter dem Ziel-SoC liegt.'));
    grpAuto.body.appendChild(_mkCfgField('Reserve bis SoC (%)', _mkHeatingRodNumberInput('storageTargetSocPct', cfg.storageTargetSocPct, (v) => { cfg.storageTargetSocPct = Math.max(0, Math.min(100, Math.round(Number(v) || 0))); setDirty(); }, { min: 0, max: 100, step: 1, width: '130px' }), 'Ab diesem SoC darf der Heizstab den Überschuss ohne Speicherreserve nutzen.'));
    grpAuto.body.appendChild(_mkCfgField('Auto ab PV (W)', _mkHeatingRodNumberInput('minPvPowerW', cfg.minPvPowerW, (v) => { cfg.minPvPowerW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 50, width: '150px' }), 'Start-/Hochschaltgrenze. Unterhalb wird nicht neu zugeschaltet, laufende Auto-Stufen werden aber über Netz-/Speichergates stabil gehalten.'));
    grpAuto.body.appendChild(_mkCfgField('Sicherheitsreserve (W)', _mkHeatingRodNumberInput('budgetSafetyReserveW', cfg.budgetSafetyReserveW, (v) => { cfg.budgetSafetyReserveW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '150px' }), 'Abzug vom Heizstab-Budget gegen Messrauschen.'));
    els.heatingRodDevices.appendChild(grpAuto.wrap);

    const grpSwitch = _mkCfgGroup('Robustes Schalten');
    const switchInfo = document.createElement('div');
    switchInfo.className = 'nw-config-field-hint';
    switchInfo.style.flexBasis = '100%';
    switchInfo.textContent = 'Hysterese gegen Netz- und WR-Schwankungen: erst stabil hochfahren, bei kleinem Netzbezug halten und nur nach Haltezeit reduzieren.';
    grpSwitch.body.appendChild(switchInfo);
    grpSwitch.body.appendChild(_mkCfgField('Stufe-hoch Wartezeit (s)', _mkHeatingRodNumberInput('stageUpDelaySec', cfg.stageUpDelaySec, (v) => { cfg.stageUpDelaySec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '150px' }), 'Maximal eine physische Stufe pro Wartezeit.'));
    grpSwitch.body.appendChild(_mkCfgField('Min. Laufzeit Auto-Stufe (s)', _mkHeatingRodNumberInput('minStageRunSec', cfg.minStageRunSec, (v) => { cfg.minStageRunSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '170px' }), 'Verhindert nervöses Runterschalten bei kurzen Budget-Dellen.'));
    grpSwitch.body.appendChild(_mkCfgField('Cooldown nach Abwurf (s)', _mkHeatingRodNumberInput('cooldownAfterOffSec', cfg.cooldownAfterOffSec, (v) => { cfg.cooldownAfterOffSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '170px' }), 'Wartezeit bevor nach komplettem AUS wieder gestartet wird.'));
    grpSwitch.body.appendChild(_mkCfgField('Netzbezug erlaubt (W)', _mkHeatingRodNumberInput('maxGridImportW', cfg.maxGridImportW, (v) => { cfg.maxGridImportW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '150px' }), 'Kleiner erlaubter Bezug, damit der Heizstab bei NVP-Schwankungen an bleibt.'));
    grpSwitch.body.appendChild(_mkCfgField('Netzbezug Haltezeit (s)', _mkHeatingRodNumberInput('gridImportHoldSec', cfg.gridImportHoldSec, (v) => { cfg.gridImportHoldSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '160px' }), 'Erst wenn der Bezug so lange überschritten ist, wird eine Auto-Stufe reduziert.'));
    grpSwitch.body.appendChild(_mkCfgField('Speicherentladung erlaubt (W)', _mkHeatingRodNumberInput('storageDischargeToleranceW', cfg.storageDischargeToleranceW, (v) => { cfg.storageDischargeToleranceW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '170px' }), 'Akku-Schutz: kurze Messdellen sind erlaubt, dauerhafte Entladung reduziert Auto-Stufen.'));
    grpSwitch.body.appendChild(_mkCfgField('Speicherentladung Haltezeit (s)', _mkHeatingRodNumberInput('storageDischargeHoldSec', cfg.storageDischargeHoldSec, (v) => { cfg.storageDischargeHoldSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '190px' }), 'Dauer bis zur Reduzierung bei Akku-Entladung.'));
    els.heatingRodDevices.appendChild(grpSwitch.wrap);

    const grpProtect = _mkCfgDetailsGroup('Erweitert: harte Schutzgrenzen', false);
    grpProtect.body.appendChild(_mkCfgField('Harter Netzbezug AUS/Runter (W)', _mkCfgInput('number', cfg.hardGridImportW, (v) => { cfg.hardGridImportW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '180px' }), 'Sofortschutz bei deutlich zu hohem Netzbezug.'));
    grpProtect.body.appendChild(_mkCfgField('Harte Speicherentladung AUS/Runter (W)', _mkCfgInput('number', cfg.hardStorageDischargeW, (v) => { cfg.hardStorageDischargeW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '210px' }), 'Sofortschutz bei deutlicher Akku-Entladung.'));
    els.heatingRodDevices.appendChild(grpProtect.wrap);

    const zeroCfg = cfg.zeroExport || {};
    const zeroModeActive = cfg.autoMode === 'zeroExportForecast';
    zeroCfg.enabled = zeroModeActive;
    zeroCfg.autoMode = cfg.autoMode;
    const grpZero = _mkCfgDetailsGroup('Details: 0-W-Einspeisung / Forecast', zeroModeActive);
    const zeroInfo = document.createElement('div');
    zeroInfo.className = 'nw-config-field-hint';
    zeroInfo.style.flexBasis = '100%';
    zeroInfo.textContent = zeroModeActive
      ? 'Bei aktiver zentraler Nulleinspeisung unter Netzlimits führt deren gemeinsames PV-Budget auch die Heizstab-Automatik. Diese lokalen Forecast-/Testwerte gelten für die eigenständige Betriebsart, wenn die zentrale Strategie nicht aktiv ist.'
      : 'Die zentrale Nulleinspeise-Strategie unter Netzlimits berücksichtigt geeignete Heizstäbe im PV-Automatikbetrieb ohne separaten Forecast-Modus. Diese lokalen Detailwerte bleiben für die eigenständige Betriebsart „0-W-Einspeisung / Forecast“ gespeichert.';
    grpZero.body.appendChild(zeroInfo);
    grpZero.body.appendChild(_mkCfgField('Erlaubte Einspeisung (W)', _mkCfgInput('number', zeroCfg.feedInLimitW, (v) => { zeroCfg.feedInLimitW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 50, width: '150px' }), '0 bei echter 0-Einspeisung, 1000 bei -1 kW Limit.'));
    grpZero.body.appendChild(_mkCfgField('Mindest-PV Testlast (W)', _mkCfgInput('number', zeroCfg.minPvPowerW, (v) => { zeroCfg.minPvPowerW = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 50, width: '150px' }), 'Zusätzliche Freigabe für Testlasten.'));
    grpZero.body.appendChild(_mkCfgField('Forecast erforderlich', _mkCfgToggle(zeroCfg.requireForecast !== false, (v) => { zeroCfg.requireForecast = !!v; setDirty(); }), 'Forecast nur als Plausibilität; Netzpunkt entscheidet danach.'));
    grpZero.body.appendChild(_mkCfgField('Speicher-Vorrang bis SoC (%)', _mkCfgInput('number', zeroCfg.storageFullSocPct, (v) => { zeroCfg.storageFullSocPct = Math.max(0, Math.min(100, Math.round(Number(v) || 0))); setDirty(); }, { min: 0, max: 100, step: 1, width: '150px' }), 'Bis hier wird versteckte PV zuerst dem Speicher gelassen.'));
    grpZero.body.appendChild(_mkCfgField('PV-Nachregelprüfung (s)', _mkCfgInput('number', zeroCfg.probeObserveSec, (v) => { zeroCfg.probeObserveSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '150px' }), 'Zeitfenster nach Zuschalten einer Teststufe.'));
    grpZero.body.appendChild(_mkCfgField('Erneuter Test nach Fehler (s)', _mkCfgInput('number', zeroCfg.probeRetrySec, (v) => { zeroCfg.probeRetrySec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 10, width: '170px' }), 'Standard 600 s = 10 Minuten.'));
    els.heatingRodDevices.appendChild(grpZero.wrap);

    /**
     * Code-Teil: Arrow-Funktion `mkStageDpField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    const mkStageDpField = (labelText, inputId, value, onChange, placeholder = 'optional') => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '4px';

      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.72rem';
      lbl.style.opacity = '0.75';
      lbl.style.fontWeight = '600';
      lbl.textContent = labelText;

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.placeholder = placeholder;
      input.dataset.dpInput = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);
      wrap.appendChild(lbl);
      wrap.appendChild(dpWrap);
      return wrap;
    };

    visibleSlots.forEach((slot) => {
      const dev = cfg.devices[slot - 1];
      const wiredStages = _countHeatingRodWiredStages(slot);
      const badges = [
        _mkCfgBadge(`Verdrahtet: ${wiredStages}/${dev.stageCount} Stufen`, wiredStages >= dev.stageCount ? 'ok' : 'warn'),
        _mkCfgBadge(`Max: ${dev.maxPowerW} W`),
      ];
      const { row, left, right } = _mkDeviceRow(`Slot ${slot} – ${_getFlowConsumerName(slot)}`, 'Native gestufte Heizstab-Regelung. Leistungsmessung kommt aus dem Energiefluss-Slot, die Stage-Relais/KNX-Datenpunkte werden direkt hier in der Heizstab-App gepflegt.', badges);
      row.classList.add('nw-heatingrod-device-row');
      left.classList.add('nw-heatingrod-device-left');
      right.classList.add('nw-heatingrod-device-right');

      const info = document.createElement('div');
      info.className = 'nw-config-field-hint';
      info.style.margin = '0';
      info.textContent = `Leistungs-DP: ${String((currentConfig.datapoints && currentConfig.datapoints[`consumer${slot}Power`]) || '').trim() ? '✓' : 'fehlt'} • Verdrahtete Stage-Write-DPs: ${wiredStages}/${dev.stageCount}`;
      right.appendChild(info);

      const grpBasic = _mkCfgGroup('Grunddaten');
      grpBasic.body.appendChild(_mkCfgField('Auto aktiv', _mkCfgToggle(dev.enabled, (v) => { dev.enabled = !!v; setDirty(); }), 'Aktiviert die native Heizstab-Automatik für diesen Slot. Die Betriebsart kommt aus dem Dropdown oben.'));
      grpBasic.body.appendChild(_mkCfgField('Name (optional)', _mkCfgInput('text', dev.name || '', (v) => { dev.name = String(v || '').trim(); setDirty(); }, { width: '220px', placeholder: 'Anzeige-Name' }), 'Leer lassen = Name aus Energiefluss-Slot.'));
      grpBasic.body.appendChild(_mkCfgField('Modus', _mkCfgSelect(dev.mode || 'pvAuto', modeOptions, (v) => { dev.mode = v; setDirty(); }, { width: '160px' }), 'Auto = native Stufenregelung mit der oben gewählten Betriebsart; Manuell = nur bilanzieren; Aus = alles aus.'));
      grpBasic.body.appendChild(_mkCfgField('Priorität', _mkCfgInput('number', dev.priority, (v) => { dev.priority = _clampInt(v, 1, 999, 200 + slot); setDirty(); }, { min: 1, max: 999, step: 1, width: '110px' }), 'Kleinere Zahl = wird früher aus PV versorgt.'));
      grpBasic.body.appendChild(_mkCfgField('Max. Leistung (W)', _mkCfgInput('number', dev.maxPowerW, (v) => { dev.maxPowerW = Math.max(0, Math.round(Number(v) || 0)); _syncHeatingRodDeviceStages(dev); rebuildHeatingRodUIStable('heatingrod-max-power'); setDirty(); }, { min: 0, step: 10, width: '150px', commitOnInput: false }), 'Gesamtleistung des Heizstabs / Verbunds.'));
      grpBasic.body.appendChild(_mkCfgField('Stufen', _mkCfgSelect(String(dev.stageCount || 1), stageCountOptions, (v) => { dev.stageCount = _clampInt(v, 1, 12, 1); _syncHeatingRodDeviceStages(dev); rebuildHeatingRodUIStable('heatingrod-stage-count'); setDirty(); }, { width: '110px' }), 'Anzahl nativer Heizstab-Stufen.'));
      right.appendChild(grpBasic.wrap);

      const grpTiming = _mkCfgGroup('Timing');
      grpTiming.body.appendChild(_mkCfgField('Min. Ein-Zeit (s)', _mkCfgInput('number', dev.minOnSec, (v) => { dev.minOnSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '130px' }), 'Verhindert schnelles Rückschalten.'));
      grpTiming.body.appendChild(_mkCfgField('Min. Aus-Zeit (s)', _mkCfgInput('number', dev.minOffSec, (v) => { dev.minOffSec = Math.max(0, Math.round(Number(v) || 0)); setDirty(); }, { min: 0, step: 1, width: '130px' }), 'Verhindert zu frühes Wiederschalten.'));
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'nw-config-btn nw-config-btn--ghost';
      resetBtn.textContent = 'Stufen aus Max.-Leistung neu verteilen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an resetBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      resetBtn.addEventListener('click', () => {
        _syncHeatingRodDeviceStages(dev, { resetAll: true });
        rebuildHeatingRodUIStable('heatingrod-stage-reset');
        setDirty();
      });
      grpTiming.body.appendChild(_mkCfgField('Stufenhilfe', resetBtn, 'Verteilt die Gesamtleistung gleichmäßig über alle aktuell konfigurierten Stufen und setzt passende Default-Grenzen.'));
      right.appendChild(grpTiming.wrap);

      const stageWrap = document.createElement('div');
      stageWrap.className = 'nw-heatingrod-stage-wrap';
      stageWrap.style.display = 'flex';
      stageWrap.style.flexDirection = 'column';
      stageWrap.style.gap = '8px';
      stageWrap.style.padding = '10px 12px';
      stageWrap.style.border = '1px solid rgba(255,255,255,0.08)';
      stageWrap.style.borderRadius = '12px';
      stageWrap.style.background = 'rgba(255,255,255,0.02)';
      stageWrap.style.minWidth = '0';
      stageWrap.style.maxWidth = '100%';
      stageWrap.style.overflowX = 'auto';

      const stageHead = document.createElement('div');
      stageHead.className = 'nw-heatingrod-stage-head';
      stageHead.style.display = 'flex';
      stageHead.style.flexWrap = 'wrap';
      stageHead.style.justifyContent = 'space-between';
      stageHead.style.gap = '8px';
      const stageTitle = document.createElement('div');
      stageTitle.textContent = 'Stufenparameter & DP-Zuordnung';
      stageTitle.style.fontWeight = '600';
      stageTitle.style.fontSize = '0.82rem';
      const stageHint = document.createElement('div');
      stageHint.className = 'nw-config-field-hint';
      stageHint.style.margin = '0';
      stageHint.textContent = 'Pro Stufe: zusätzliche Leistung dieser physisch schaltbaren Stufe, obere/untere Überschuss-Grenze sowie eigener Write-/Read-DP. Die Summe der Stufenleistungen sollte der Max.-Leistung entsprechen.';
      stageHead.appendChild(stageTitle);
      stageHead.appendChild(stageHint);
      stageWrap.appendChild(stageHead);

      const headRow = document.createElement('div');
      headRow.className = 'nw-heatingrod-stage-row nw-heatingrod-stage-row--head';
      headRow.style.display = 'grid';
      headRow.style.gridTemplateColumns = '100px repeat(3, minmax(120px, 1fr))';
      headRow.style.gap = '10px';
      headRow.style.alignItems = 'end';
      ['Stufe', 'Leistung (W)', 'Ein ab (W)', 'Aus unter (W)'].forEach((txt) => {
        const h = document.createElement('div');
        h.textContent = txt;
        h.style.fontSize = '0.72rem';
        h.style.opacity = '0.75';
        h.style.fontWeight = '600';
        headRow.appendChild(h);
      });
      stageWrap.appendChild(headRow);

      (dev.stages || []).forEach((stage, index) => {
        const s = index + 1;
        const sRow = document.createElement('div');
        sRow.className = 'nw-heatingrod-stage-row';
        sRow.style.display = 'grid';
        sRow.style.gridTemplateColumns = '100px repeat(3, minmax(120px, 1fr))';
        sRow.style.gap = '10px';
        sRow.style.alignItems = 'end';

        const label = document.createElement('div');
        label.style.display = 'flex';
        label.style.flexDirection = 'column';
        label.style.gap = '4px';
        const labelMain = document.createElement('div');
        labelMain.textContent = `Stufe ${s}`;
        labelMain.style.fontWeight = '600';
        const labelSub = document.createElement('div');
        labelSub.className = 'nw-config-field-hint';
        labelSub.style.margin = '0';
        const stageWriteId = String(stage.writeId || '').trim();
        const stageReadId = String(stage.readId || '').trim();
        labelSub.textContent = stageWriteId ? 'DP ✓' : 'DP fehlt';
        labelSub.title = `Write: ${stageWriteId || '—'} • Read: ${stageReadId || '—'}`;
        label.appendChild(labelMain);
        label.appendChild(labelSub);
        sRow.appendChild(label);

        // Wichtig: Diese drei Stufenfelder dürfen beim Tippen nicht die komplette
        // Heizstab-UI neu aufbauen. Ein Rebuild entfernt das aktive Eingabefeld
        // aus dem DOM und der Browser springt in langen Installerseiten an den
        // Anfang. Deshalb schreiben wir hier nur in die In-Memory-Konfiguration;
        // Strukturänderungen bleiben auf Stufenzahl, Reset und DP-Auswahl begrenzt.
        let offBelowInput = null;
        const powerInput = _mkCfgInput('number', stage.powerW, (v) => {
          stage.powerW = Math.max(0, Math.round(Number(v) || 0));
          dev.maxPowerW = Math.max(0, (dev.stages || []).reduce((sum, it) => sum + Math.max(0, Math.round(Number(it.powerW) || 0)), 0));
          setDirty();
        }, { min: 0, step: 10, width: '100%' });
        sRow.appendChild(powerInput);

        const onAboveInput = _mkCfgInput('number', stage.onAboveW, (v) => {
          stage.onAboveW = Math.max(0, Math.round(Number(v) || 0));
          if (stage.offBelowW > stage.onAboveW) {
            stage.offBelowW = stage.onAboveW;
            if (offBelowInput) offBelowInput.value = String(stage.offBelowW);
          }
          setDirty();
        }, { min: 0, step: 10, width: '100%' });
        sRow.appendChild(onAboveInput);

        offBelowInput = _mkCfgInput('number', stage.offBelowW, (v) => {
          stage.offBelowW = Math.max(0, Math.round(Number(v) || 0));
          if (stage.offBelowW > stage.onAboveW) {
            stage.offBelowW = stage.onAboveW;
            offBelowInput.value = String(stage.offBelowW);
          }
          setDirty();
        }, { min: 0, step: 10, width: '100%' });
        sRow.appendChild(offBelowInput);

        stageWrap.appendChild(sRow);

        const dpRow = document.createElement('div');
        dpRow.className = 'nw-heatingrod-stage-row nw-heatingrod-stage-dp-row';
        dpRow.style.display = 'grid';
        dpRow.style.gridTemplateColumns = '100px repeat(2, minmax(240px, 1fr))';
        dpRow.style.gap = '10px';
        dpRow.style.alignItems = 'start';

        const spacer = document.createElement('div');
        spacer.className = 'nw-config-field-hint';
        spacer.style.margin = '0';
        spacer.textContent = 'Relais / KNX';
        dpRow.appendChild(spacer);

        dpRow.appendChild(mkStageDpField(`Stufe ${s} Write (bool)`, `heatingrod_${slot}_stage${s}_w`, stage.writeId || '', (v) => {
          stage.writeId = String(v || '').trim();
          rebuildHeatingRodUIStable('heatingrod-stage-write-dp');
          setDirty();
        }, 'Schalt-DP / KNX Write'));

        dpRow.appendChild(mkStageDpField(`Stufe ${s} Read (bool)`, `heatingrod_${slot}_stage${s}_r`, stage.readId || '', (v) => {
          stage.readId = String(v || '').trim();
          rebuildHeatingRodUIStable('heatingrod-stage-read-dp');
          setDirty();
        }, 'Status-DP / KNX Read (optional)'));

        stageWrap.appendChild(dpRow);
      });

      const sumInfo = document.createElement('div');
      sumInfo.className = 'nw-config-field-hint';
      sumInfo.style.margin = '0';
      const sumW = (dev.stages || []).reduce((sum, st) => sum + Math.max(0, Math.round(Number(st.powerW) || 0)), 0);
      sumInfo.textContent = `Summe konfigurierte Stufenleistung: ${sumW} W${sumW !== dev.maxPowerW ? ` (abweichend von Max. Leistung ${dev.maxPowerW} W)` : ''}.`;
      stageWrap.appendChild(sumInfo);

      const writeIdCounts = new Map();
      (dev.stages || []).forEach((st) => {
        const id = String(st && st.writeId || '').trim();
        if (!id) return;
        const key = id.toLowerCase();
        writeIdCounts.set(key, { id, count: ((writeIdCounts.get(key) || {}).count || 0) + 1 });
      });
      const duplicateWriteIds = Array.from(writeIdCounts.values()).filter((it) => it.count > 1).map((it) => it.id);
      if (duplicateWriteIds.length) {
        const warnDup = document.createElement('div');
        warnDup.className = 'nw-help';
        warnDup.textContent = `Achtung: Derselbe Write-DP ist mehreren Stufen zugeordnet (${duplicateWriteIds.join(', ')}). Für echte Stufen braucht jede Stufe einen eigenen Ausgang. Bei zwei Relais bitte nur zwei Stufen konfigurieren und die Leistung je Relais eintragen.`;
        stageWrap.appendChild(warnDup);
      }

      if (wiredStages < dev.stageCount) {
        const warn = document.createElement('div');
        warn.className = 'nw-help';
        warn.textContent = `Achtung: Es sind aktuell nur ${wiredStages} von ${dev.stageCount} Stufen mit Write-/Read-DPs hinterlegt. Die native Heizstab-Regelung schaltet nur die wirklich zugeordneten Kanäle.`;
        stageWrap.appendChild(warn);
      }

      right.appendChild(stageWrap);
      els.heatingRodDevices.appendChild(row);
    });
  }



  // ------------------------------
  // BHKW Steuerung
  // ------------------------------
  /**
   * Code-Teil: _ensureBhkwCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureBhkwCfg() {
    currentConfig = currentConfig || {};
    currentConfig.bhkw = (currentConfig.bhkw && typeof currentConfig.bhkw === 'object') ? currentConfig.bhkw : {};
    const b = currentConfig.bhkw;
    b.devices = Array.isArray(b.devices) ? b.devices : [];

    const used = new Set();
    const normalized = [];

    /**
     * Code-Teil: Arrow-Funktion `mkDefault`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkDefault
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkDefault = (idx) => ({
      idx,
      enabled: false,
      name: `BHKW ${idx}`,
      showInLive: true,
      userCanControl: true,

      startWriteId: '',
      stopWriteId: '',
      runWriteId: '',
      runningReadId: '',
      powerReadId: '',
      powerScale: 1,

      socStartPct: 25,
      socStopPct: 60,
      minRunMin: 10,
      minOffMin: 5,
      maxAgeSec: 30,
      socMaxAgeSec: 60,
      gridMaxAgeSec: 15,

      commandType: 'pulse',
      pulseMs: 800,
      requireReadback: true,
      commandTimeoutSec: 60,
      retryDelaySec: 15,
      maxRetries: 2,
      faultLockSec: 300,
      requireGridImportForAutoStart: false,
      gridImportStartW: 500,
      stopOnGridExportW: 0,
      runningPowerThresholdW: 100,
    });

    for (let i = 0; i < b.devices.length; i++) {
      const it = b.devices[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const d = mkDefault(idx);

      d.enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : d.enabled;
      d.name = String(it.name || '').trim() || d.name;
      d.showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : d.showInLive;
      d.userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : d.userCanControl;

      d.startWriteId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
      d.stopWriteId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
      d.runWriteId = String(it.runWriteId || it.runObjectId || it.enableWriteId || it.enableId || '').trim();
      d.runningReadId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
      d.powerReadId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();
      d.powerScale = Number.isFinite(Number(it.powerScale)) ? Number(it.powerScale) : d.powerScale;

      d.socStartPct = Number.isFinite(Number(it.socStartPct)) ? Number(it.socStartPct) : d.socStartPct;
      d.socStopPct = Number.isFinite(Number(it.socStopPct)) ? Number(it.socStopPct) : d.socStopPct;
      d.minRunMin = Number.isFinite(Number(it.minRunMin)) ? Number(it.minRunMin) : d.minRunMin;
      d.minOffMin = Number.isFinite(Number(it.minOffMin)) ? Number(it.minOffMin) : d.minOffMin;
      d.maxAgeSec = Number.isFinite(Number(it.maxAgeSec)) ? Number(it.maxAgeSec) : d.maxAgeSec;
      d.socMaxAgeSec = Number.isFinite(Number(it.socMaxAgeSec)) ? Number(it.socMaxAgeSec) : d.socMaxAgeSec;
      d.gridMaxAgeSec = Number.isFinite(Number(it.gridMaxAgeSec)) ? Number(it.gridMaxAgeSec) : d.gridMaxAgeSec;

      const commandTypeRaw = String(it.commandProfile || it.commandType || '').trim().toLowerCase();
      d.commandType = ['runlevel', 'run-level', 'run'].includes(commandTypeRaw) ? 'runLevel' : (['level', 'duallevel', 'dual-level'].includes(commandTypeRaw) ? 'level' : 'pulse');
      d.pulseMs = Number.isFinite(Number(it.pulseMs)) ? Number(it.pulseMs) : d.pulseMs;
      d.requireReadback = (typeof it.requireReadback === 'boolean') ? !!it.requireReadback : !!(d.runningReadId || d.powerReadId);
      d.commandTimeoutSec = Number.isFinite(Number(it.commandTimeoutSec ?? it.readbackTimeoutSec)) ? Number(it.commandTimeoutSec ?? it.readbackTimeoutSec) : d.commandTimeoutSec;
      d.retryDelaySec = Number.isFinite(Number(it.retryDelaySec)) ? Number(it.retryDelaySec) : d.retryDelaySec;
      d.maxRetries = Number.isFinite(Number(it.maxRetries)) ? Number(it.maxRetries) : d.maxRetries;
      d.faultLockSec = Number.isFinite(Number(it.faultLockSec)) ? Number(it.faultLockSec) : d.faultLockSec;
      d.requireGridImportForAutoStart = (typeof it.requireGridImportForAutoStart === 'boolean') ? !!it.requireGridImportForAutoStart : d.requireGridImportForAutoStart;
      d.gridImportStartW = Number.isFinite(Number(it.gridImportStartW ?? it.minGridImportWForStart)) ? Number(it.gridImportStartW ?? it.minGridImportWForStart) : d.gridImportStartW;
      d.stopOnGridExportW = Number.isFinite(Number(it.stopOnGridExportW)) ? Number(it.stopOnGridExportW) : d.stopOnGridExportW;
      d.runningPowerThresholdW = Number.isFinite(Number(it.runningPowerThresholdW)) ? Number(it.runningPowerThresholdW) : d.runningPowerThresholdW;

      // A "placeholder" slot is an additional device entry (idx>1) with no IO‑Broker IDs configured.
      // Earlier hotfixes pre-created multiple empty slots which confused customers.
      // We aggressively hide unused additional slots unless the user configures at least one ID
      // or explicitly enables the device.
      const isPlaceholder = (
        !d.enabled &&
        !d.startWriteId &&
        !d.stopWriteId &&
        !d.runWriteId &&
        !d.runningReadId &&
        !d.powerReadId &&
        (d.name === `BHKW ${idx}` || !String(d.name || '').trim())
      );

      // Clean up legacy placeholders (older hotfixes pre-created 5 empty slots).
      if (idx > 1 && isPlaceholder) continue;

      normalized.push(d);
    }

    // Default: only 1 device (idx=1). Additional devices can be added later.
    if (!normalized.length) {
      normalized.push(mkDefault(1));
    }

    normalized.sort((a, b) => a.idx - b.idx);
    b.devices = normalized;
    return b;
  }
  /**
   * Code-Teil: buildBhkwUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildBhkwUI() {
    if (!els.bhkwDevices) return;
    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.bhkw) ? apps.bhkw : { installed: false, enabled: false };

    els.bhkwDevices.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „BHKW“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.bhkwDevices.appendChild(msg);
      return;
    }

    const b = _ensureBhkwCfg();    const mkFieldRow = (labelTxt, controlEl, hintTxt = '') => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      row.style.flexWrap = 'wrap';

      const label = document.createElement('div');
      label.className = 'nw-config-field-label';
      label.textContent = labelTxt;
      // Give the control more room (DP picker is wide)
      label.style.flex = '0 0 34%';
      label.style.maxWidth = '34%';

      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-field-control';
      ctrl.style.flex = '1 1 66%';
      ctrl.appendChild(controlEl);

      row.appendChild(label);
      row.appendChild(ctrl);

      if (hintTxt) {
        const h = document.createElement('div');
        h.className = 'nw-config-field-hint';
        h.textContent = hintTxt;
        h.style.flex = '0 0 100%';
        h.style.maxWidth = '100%';
        h.style.marginTop = '2px';
        row.appendChild(h);
      }

      return row;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkTextInput`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    const mkTextInput = (value, onChange, placeholder = '') => {
      const i = document.createElement('input');
      i.type = 'text';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      if (placeholder) i.placeholder = placeholder;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an i. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      i.addEventListener('input', () => { try { onChange(i.value); } catch(_e) {} scheduleValidation(); });
      return i;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkNumInput`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkNumInput
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkNumInput = (value, onChange) => {
      const i = document.createElement('input');
      i.type = 'number';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an i. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      i.addEventListener('input', () => {
        const n = Number(i.value);
        try { onChange(Number.isFinite(n) ? n : 0); } catch(_e) {}
        scheduleValidation();
      });
      return i;
    };

    // Checkbox helper (label + checkbox). Note: .nw-config-checkbox is the checkbox INPUT styling.
    // Using it on the label would clamp the label size (14x14) and cause overlaps.
    /**
     * Code-Teil: Arrow-Funktion `mkCheckbox`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkCheckbox
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkCheckbox = (checked, text, onChange) => {
      const label = document.createElement('label');
      label.className = 'nw-config-checklabel';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = !!checked;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => { try { onChange(!!cb.checked); } catch(_e) {} scheduleValidation(); });

      const span = document.createElement('span');
      span.textContent = text;

      label.appendChild(cb);
      label.appendChild(span);
      return label;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkSelect`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkSelect
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkSelect = (value, opts, onChange) => {
      const s = document.createElement('select');
      s.className = 'nw-config-input';
      for (const o of opts) {
        const op = document.createElement('option');
        op.value = o.value;
        op.textContent = o.label;
        s.appendChild(op);
      }
      s.value = String(value || opts[0]?.value || '');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an s. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      s.addEventListener('change', () => { try { onChange(s.value); } catch(_e) {} scheduleValidation(); });
      return s;
    };

    for (const dev of b.devices) {
      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.style.marginBottom = '10px';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const headerTop = document.createElement('div');
      headerTop.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = `BHKW ${dev.idx}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const advBtn = document.createElement('button');
      advBtn.type = 'button';
      advBtn.className = 'nw-config-btn nw-config-btn--ghost';
      advBtn.textContent = 'Erweitert';
      actions.appendChild(advBtn);

      headerTop.appendChild(title);
      headerTop.appendChild(actions);
      header.appendChild(headerTop);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = 'Leistung (W) ist für Energiefluss/Monitoring wichtig; Start/Stop + Laufstatus für saubere Auto‑Logik.';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      body.appendChild(mkFieldRow('Name', mkTextInput(dev.name, (v) => { dev.name = String(v || '').trim(); }, `BHKW ${dev.idx}`)));

      // Optionen kompakt in einer Zeile
      const opts = document.createElement('div');
      opts.style.display = 'flex';
      opts.style.flexWrap = 'wrap';
      opts.style.alignItems = 'center';
      opts.style.gap = '12px';
      opts.appendChild(mkCheckbox(dev.enabled, 'Regelung aktiv', (v) => { dev.enabled = v; }));
      opts.appendChild(mkCheckbox(dev.showInLive, 'In VIS anzeigen', (v) => { dev.showInLive = v; }));
      opts.appendChild(mkCheckbox(dev.userCanControl, 'Endkunde darf bedienen', (v) => { dev.userCanControl = v; }));
      body.appendChild(mkFieldRow('Optionen', opts));

      // Datapoints (mit Picker)
      body.appendChild(mkFieldRow('Start (Write)', _mkDpWrap(`bhkw_b${dev.idx}_startWriteId`, dev.startWriteId, 'Write‑Datenpunkt', (v) => { dev.startWriteId = v; }),
        'Für Pulse oder 2-Draht-Level.'));
      body.appendChild(mkFieldRow('Stop (Write)', _mkDpWrap(`bhkw_b${dev.idx}_stopWriteId`, dev.stopWriteId, 'Write‑Datenpunkt', (v) => { dev.stopWriteId = v; }),
        'Für Pulse oder 2-Draht-Level.'));
      body.appendChild(mkFieldRow('Run / Enable (Write)', _mkDpWrap(`bhkw_b${dev.idx}_runWriteId`, dev.runWriteId, 'Single-Run-Datenpunkt', (v) => { dev.runWriteId = v; }),
        'Nur beim Profil „Ein Run-Level“: TRUE = Start, FALSE = Stop.'));
      body.appendChild(mkFieldRow('Laufstatus (Read)', _mkDpWrap(`bhkw_b${dev.idx}_runningReadId`, dev.runningReadId, 'Read‑Datenpunkt', (v) => { dev.runningReadId = v; }),
        'Für Auto-Betrieb und bestätigte Start/Stop-Kommandos dringend empfohlen.'));
      body.appendChild(mkFieldRow('Leistung (W) (Read)', _mkDpWrap(`bhkw_b${dev.idx}_powerReadId`, dev.powerReadId, 'Read‑Datenpunkt (W/kW)', (v) => { dev.powerReadId = v; }),
        'Erforderlich für die Anzeige im Energiefluss (BHKW als Erzeuger).'));
      body.appendChild(mkFieldRow('Leistungsfaktor', mkNumInput(dev.powerScale, (v) => { dev.powerScale = v; }),
        '1 bei Watt, 1000 wenn der gelesene Datenpunkt kW liefert.'));

      // Advanced (ausklappbar)
      const adv = document.createElement('div');
      adv.style.display = 'none';
      adv.style.marginTop = '6px';
      adv.appendChild(mkFieldRow('SoC Start‑Schwelle (%)', mkNumInput(dev.socStartPct, (v) => { dev.socStartPct = v; }), 'Auto‑Start wenn SoC <= Start‑Schwelle.'));
      adv.appendChild(mkFieldRow('SoC Stop‑Schwelle (%)', mkNumInput(dev.socStopPct, (v) => { dev.socStopPct = v; }), 'Auto‑Stop wenn SoC >= Stop‑Schwelle.'));
      adv.appendChild(mkFieldRow('Mindestlaufzeit (min)', mkNumInput(dev.minRunMin, (v) => { dev.minRunMin = v; })));
      adv.appendChild(mkFieldRow('Mindeststillstand (min)', mkNumInput(dev.minOffMin, (v) => { dev.minOffMin = v; })));
      adv.appendChild(mkFieldRow('Max. Status-/Leistungsalter (s)', mkNumInput(dev.maxAgeSec, (v) => { dev.maxAgeSec = v; }),
        'Ältere Laufstatus-/Leistungswerte lösen keine Auto-Aktion aus.'));
      adv.appendChild(mkFieldRow('Max. SoC-Alter (s)', mkNumInput(dev.socMaxAgeSec, (v) => { dev.socMaxAgeSec = v; })));
      adv.appendChild(mkFieldRow('Befehlsprofil', mkSelect(dev.commandType, [
        { value: 'pulse', label: 'Start-/Stop-Pulse' },
        { value: 'level', label: '2-Draht-Level (Start/Stop)' },
        { value: 'runLevel', label: 'Ein Run-Level (TRUE/FALSE)' },
      ], (v) => { dev.commandType = (v === 'runLevel') ? 'runLevel' : (v === 'level' ? 'level' : 'pulse'); })));
      adv.appendChild(mkFieldRow('Pulse‑Dauer (ms)', mkNumInput(dev.pulseMs, (v) => { dev.pulseMs = v; })));
      adv.appendChild(mkFieldRow('Readback erforderlich', mkCheckbox(dev.requireReadback, 'Start/Stop erst nach Laufstatus bestätigen', (v) => { dev.requireReadback = v; })));
      adv.appendChild(mkFieldRow('Befehls-/Readback-Timeout (s)', mkNumInput(dev.commandTimeoutSec, (v) => { dev.commandTimeoutSec = v; })));
      adv.appendChild(mkFieldRow('Wiederholungsabstand (s)', mkNumInput(dev.retryDelaySec, (v) => { dev.retryDelaySec = v; })));
      adv.appendChild(mkFieldRow('Max. Wiederholungen', mkNumInput(dev.maxRetries, (v) => { dev.maxRetries = v; })));
      adv.appendChild(mkFieldRow('Fehlerverriegelung (s)', mkNumInput(dev.faultLockSec, (v) => { dev.faultLockSec = v; })));
      adv.appendChild(mkFieldRow('NVP-Startfreigabe', mkCheckbox(dev.requireGridImportForAutoStart, 'Auto-Start nur bei frischem Netzbezug', (v) => { dev.requireGridImportForAutoStart = v; })));
      adv.appendChild(mkFieldRow('NVP-Startschwelle (W)', mkNumInput(dev.gridImportStartW, (v) => { dev.gridImportStartW = v; })));
      adv.appendChild(mkFieldRow('Stop bei Einspeisung ab (W)', mkNumInput(dev.stopOnGridExportW, (v) => { dev.stopOnGridExportW = v; }),
        '0 = deaktiviert. Ein Auto-Stop erfolgt erst nach der Mindestlaufzeit.'));
      adv.appendChild(mkFieldRow('Max. NVP-Alter (s)', mkNumInput(dev.gridMaxAgeSec, (v) => { dev.gridMaxAgeSec = v; })));
      adv.appendChild(mkFieldRow('Lauf-Erkennung ab Leistung (W)', mkNumInput(dev.runningPowerThresholdW, (v) => { dev.runningPowerThresholdW = v; }),
        'Fallback, wenn kein separater Laufstatus vorhanden ist.'));
      body.appendChild(adv);

      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an advBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      advBtn.addEventListener('click', () => {
        const open = adv.style.display !== 'none';
        adv.style.display = open ? 'none' : '';
        advBtn.textContent = open ? 'Erweitert' : 'Weniger';
      });

      const footer = document.createElement('div');
      footer.className = 'nw-config-card__row';
      footer.style.opacity = '0.82';
      footer.style.marginTop = '6px';
      footer.textContent = 'Hinweis: In der VIS ist Start/Stop nur im Modus „Manuell“ aktiv.';
      body.appendChild(footer);

      card.appendChild(header);
      card.appendChild(body);
      els.bhkwDevices.appendChild(card);
    }
  }


  // ------------------------------
  // Generator Steuerung (Notstrom/Netzparallelbetrieb)
  // ------------------------------
  /**
   * Code-Teil: _ensureGeneratorCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureGeneratorCfg() {
    currentConfig = currentConfig || {};
    currentConfig.generator = (currentConfig.generator && typeof currentConfig.generator === 'object') ? currentConfig.generator : {};
    const g = currentConfig.generator;
    g.devices = Array.isArray(g.devices) ? g.devices : [];

    const used = new Set();
    const normalized = [];

    /**
     * Code-Teil: Arrow-Funktion `mkDefault`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkDefault
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkDefault = (idx) => ({
      idx,
      enabled: false,
      name: `Generator ${idx}`,
      showInLive: true,
      userCanControl: true,

      startWriteId: '',
      stopWriteId: '',
      runWriteId: '',
      runningReadId: '',
      powerReadId: '',
      powerScale: 1,

      socStartPct: 25,
      socStopPct: 60,
      minRunMin: 10,
      minOffMin: 5,
      maxAgeSec: 30,
      socMaxAgeSec: 60,
      gridMaxAgeSec: 15,

      commandType: 'pulse',
      pulseMs: 800,
      requireReadback: true,
      commandTimeoutSec: 60,
      retryDelaySec: 15,
      maxRetries: 2,
      faultLockSec: 300,
      requireGridImportForAutoStart: false,
      gridImportStartW: 500,
      stopOnGridExportW: 0,
      runningPowerThresholdW: 100,
    });

    for (let i = 0; i < g.devices.length; i++) {
      const it = g.devices[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const d = mkDefault(idx);

      d.enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : d.enabled;
      d.name = String(it.name || '').trim() || d.name;
      d.showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : d.showInLive;
      d.userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : d.userCanControl;

      d.startWriteId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
      d.stopWriteId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
      d.runWriteId = String(it.runWriteId || it.runObjectId || it.enableWriteId || it.enableId || '').trim();
      d.runningReadId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
      d.powerReadId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();
      d.powerScale = Number.isFinite(Number(it.powerScale)) ? Number(it.powerScale) : d.powerScale;

      d.socStartPct = Number.isFinite(Number(it.socStartPct)) ? Number(it.socStartPct) : d.socStartPct;
      d.socStopPct = Number.isFinite(Number(it.socStopPct)) ? Number(it.socStopPct) : d.socStopPct;
      d.minRunMin = Number.isFinite(Number(it.minRunMin)) ? Number(it.minRunMin) : d.minRunMin;
      d.minOffMin = Number.isFinite(Number(it.minOffMin)) ? Number(it.minOffMin) : d.minOffMin;
      d.maxAgeSec = Number.isFinite(Number(it.maxAgeSec)) ? Number(it.maxAgeSec) : d.maxAgeSec;
      d.socMaxAgeSec = Number.isFinite(Number(it.socMaxAgeSec)) ? Number(it.socMaxAgeSec) : d.socMaxAgeSec;
      d.gridMaxAgeSec = Number.isFinite(Number(it.gridMaxAgeSec)) ? Number(it.gridMaxAgeSec) : d.gridMaxAgeSec;

      const commandTypeRaw = String(it.commandProfile || it.commandType || '').trim().toLowerCase();
      d.commandType = ['runlevel', 'run-level', 'run'].includes(commandTypeRaw) ? 'runLevel' : (['level', 'duallevel', 'dual-level'].includes(commandTypeRaw) ? 'level' : 'pulse');
      d.pulseMs = Number.isFinite(Number(it.pulseMs)) ? Number(it.pulseMs) : d.pulseMs;
      d.requireReadback = (typeof it.requireReadback === 'boolean') ? !!it.requireReadback : !!(d.runningReadId || d.powerReadId);
      d.commandTimeoutSec = Number.isFinite(Number(it.commandTimeoutSec ?? it.readbackTimeoutSec)) ? Number(it.commandTimeoutSec ?? it.readbackTimeoutSec) : d.commandTimeoutSec;
      d.retryDelaySec = Number.isFinite(Number(it.retryDelaySec)) ? Number(it.retryDelaySec) : d.retryDelaySec;
      d.maxRetries = Number.isFinite(Number(it.maxRetries)) ? Number(it.maxRetries) : d.maxRetries;
      d.faultLockSec = Number.isFinite(Number(it.faultLockSec)) ? Number(it.faultLockSec) : d.faultLockSec;
      d.requireGridImportForAutoStart = (typeof it.requireGridImportForAutoStart === 'boolean') ? !!it.requireGridImportForAutoStart : d.requireGridImportForAutoStart;
      d.gridImportStartW = Number.isFinite(Number(it.gridImportStartW ?? it.minGridImportWForStart)) ? Number(it.gridImportStartW ?? it.minGridImportWForStart) : d.gridImportStartW;
      d.stopOnGridExportW = Number.isFinite(Number(it.stopOnGridExportW)) ? Number(it.stopOnGridExportW) : d.stopOnGridExportW;
      d.runningPowerThresholdW = Number.isFinite(Number(it.runningPowerThresholdW)) ? Number(it.runningPowerThresholdW) : d.runningPowerThresholdW;

      // Consider "unused" extra slots as placeholders. Keep only idx=1 by default
      // to avoid confusing customers.
      const hasAnyId = !!(d.startWriteId || d.stopWriteId || d.runWriteId || d.runningReadId || d.powerReadId);
      const isPlaceholder = (!d.enabled && !hasAnyId && (d.name === `Generator ${idx}` || !d.name));

      // Clean up legacy placeholders (older hotfixes pre-created 5 empty slots).
      if (idx > 1 && isPlaceholder) continue;

      normalized.push(d);
    }

    // Default: only 1 device (idx=1). Additional devices can be added later.
    if (!normalized.length) {
      normalized.push(mkDefault(1));
    }

    normalized.sort((a, b) => a.idx - b.idx);
    g.devices = normalized;
    return g;
  }
  /**
   * Code-Teil: buildGeneratorUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildGeneratorUI() {
    if (!els.generatorDevices) return;

    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.generator) ? apps.generator : { installed: false, enabled: false };

    els.generatorDevices.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Generator“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.generatorDevices.appendChild(msg);
      return;
    }

    const gCfg = _ensureGeneratorCfg();    const mkFieldRow = (labelTxt, controlEl, hintTxt = '') => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      row.style.flexWrap = 'wrap';

      const label = document.createElement('div');
      label.className = 'nw-config-field-label';
      label.textContent = labelTxt;
      // Give the control more room (DP picker is wide)
      label.style.flex = '0 0 34%';
      label.style.maxWidth = '34%';

      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-field-control';
      ctrl.style.flex = '1 1 66%';
      ctrl.appendChild(controlEl);

      row.appendChild(label);
      row.appendChild(ctrl);

      if (hintTxt) {
        const h = document.createElement('div');
        h.className = 'nw-config-field-hint';
        h.textContent = hintTxt;
        h.style.flex = '0 0 100%';
        h.style.maxWidth = '100%';
        h.style.marginTop = '2px';
        row.appendChild(h);
      }

      return row;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkTextInput`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    const mkTextInput = (value, onChange, placeholder = '') => {
      const i = document.createElement('input');
      i.type = 'text';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      if (placeholder) i.placeholder = placeholder;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an i. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      i.addEventListener('input', () => { try { onChange(i.value); } catch(_e) {} scheduleValidation(); });
      return i;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkNumInput`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkNumInput
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkNumInput = (value, onChange) => {
      const i = document.createElement('input');
      i.type = 'number';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an i. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      i.addEventListener('input', () => {
        const n = Number(i.value);
        try { onChange(Number.isFinite(n) ? n : 0); } catch(_e) {}
        scheduleValidation();
      });
      return i;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkCheckbox`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkCheckbox
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkCheckbox = (checked, text, onChange) => {
      // Important: `.nw-config-checkbox` is the *input* style (14x14).
      // The label itself must be flexible, otherwise text overlaps.
      const label = document.createElement('label');
      label.className = 'nw-config-checklabel';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = !!checked;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => { try { onChange(!!cb.checked); } catch(_e) {} scheduleValidation(); });

      const span = document.createElement('span');
      span.textContent = text;

      label.appendChild(cb);
      label.appendChild(span);
      return label;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkSelect`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkSelect
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkSelect = (value, opts, onChange) => {
      const s = document.createElement('select');
      s.className = 'nw-config-input';
      for (const o of opts) {
        const op = document.createElement('option');
        op.value = o.value;
        op.textContent = o.label;
        s.appendChild(op);
      }
      s.value = String(value || opts[0]?.value || '');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an s. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      s.addEventListener('change', () => { try { onChange(s.value); } catch(_e) {} scheduleValidation(); });
      return s;
    };

    for (const dev of gCfg.devices) {
      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.style.marginBottom = '10px';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const headerTop = document.createElement('div');
      headerTop.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = `Generator ${dev.idx}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const advBtn = document.createElement('button');
      advBtn.type = 'button';
      advBtn.className = 'nw-config-btn nw-config-btn--ghost';
      advBtn.textContent = 'Erweitert';
      actions.appendChild(advBtn);

      headerTop.appendChild(title);
      headerTop.appendChild(actions);
      header.appendChild(headerTop);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = 'Leistung (W) ist für Energiefluss/Monitoring wichtig; Start/Stop + Laufstatus für saubere Auto‑Logik.';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      body.appendChild(mkFieldRow('Name', mkTextInput(dev.name, (v) => { dev.name = String(v || '').trim(); }, `Generator ${dev.idx}`)));

      const opts = document.createElement('div');
      opts.style.display = 'flex';
      opts.style.flexWrap = 'wrap';
      opts.style.alignItems = 'center';
      opts.style.gap = '12px';
      opts.appendChild(mkCheckbox(dev.enabled, 'Regelung aktiv', (v) => { dev.enabled = v; }));
      opts.appendChild(mkCheckbox(dev.showInLive, 'In VIS anzeigen', (v) => { dev.showInLive = v; }));
      opts.appendChild(mkCheckbox(dev.userCanControl, 'Endkunde darf bedienen', (v) => { dev.userCanControl = v; }));
      body.appendChild(mkFieldRow('Optionen', opts));

      body.appendChild(mkFieldRow('Start (Write)', _mkDpWrap(`gen_g${dev.idx}_startWriteId`, dev.startWriteId, 'Write‑Datenpunkt', (v) => { dev.startWriteId = v; }),
        'Für Pulse oder 2-Draht-Level.'));
      body.appendChild(mkFieldRow('Stop (Write)', _mkDpWrap(`gen_g${dev.idx}_stopWriteId`, dev.stopWriteId, 'Write‑Datenpunkt', (v) => { dev.stopWriteId = v; }),
        'Für Pulse oder 2-Draht-Level.'));
      body.appendChild(mkFieldRow('Run / Enable (Write)', _mkDpWrap(`gen_g${dev.idx}_runWriteId`, dev.runWriteId, 'Single-Run-Datenpunkt', (v) => { dev.runWriteId = v; }),
        'Nur beim Profil „Ein Run-Level“: TRUE = Start, FALSE = Stop.'));
      body.appendChild(mkFieldRow('Laufstatus (Read)', _mkDpWrap(`gen_g${dev.idx}_runningReadId`, dev.runningReadId, 'Read‑Datenpunkt', (v) => { dev.runningReadId = v; }),
        'Für Auto-Betrieb und bestätigte Start/Stop-Kommandos dringend empfohlen.'));
      body.appendChild(mkFieldRow('Leistung (W) (Read)', _mkDpWrap(`gen_g${dev.idx}_powerReadId`, dev.powerReadId, 'Read‑Datenpunkt (W/kW)', (v) => { dev.powerReadId = v; }),
        'Erforderlich für die Anzeige im Energiefluss (Generator als Erzeuger).'));
      body.appendChild(mkFieldRow('Leistungsfaktor', mkNumInput(dev.powerScale, (v) => { dev.powerScale = v; }),
        '1 bei Watt, 1000 wenn der gelesene Datenpunkt kW liefert.'));

      const adv = document.createElement('div');
      adv.style.display = 'none';
      adv.style.marginTop = '6px';
      adv.appendChild(mkFieldRow('SoC Start‑Schwelle (%)', mkNumInput(dev.socStartPct, (v) => { dev.socStartPct = v; }), 'Auto‑Start wenn SoC <= Start‑Schwelle.'));
      adv.appendChild(mkFieldRow('SoC Stop‑Schwelle (%)', mkNumInput(dev.socStopPct, (v) => { dev.socStopPct = v; }), 'Auto‑Stop wenn SoC >= Stop‑Schwelle.'));
      adv.appendChild(mkFieldRow('Mindestlaufzeit (min)', mkNumInput(dev.minRunMin, (v) => { dev.minRunMin = v; })));
      adv.appendChild(mkFieldRow('Mindeststillstand (min)', mkNumInput(dev.minOffMin, (v) => { dev.minOffMin = v; })));
      adv.appendChild(mkFieldRow('Max. Status-/Leistungsalter (s)', mkNumInput(dev.maxAgeSec, (v) => { dev.maxAgeSec = v; }),
        'Ältere Laufstatus-/Leistungswerte lösen keine Auto-Aktion aus.'));
      adv.appendChild(mkFieldRow('Max. SoC-Alter (s)', mkNumInput(dev.socMaxAgeSec, (v) => { dev.socMaxAgeSec = v; })));
      adv.appendChild(mkFieldRow('Befehlsprofil', mkSelect(dev.commandType, [
        { value: 'pulse', label: 'Start-/Stop-Pulse' },
        { value: 'level', label: '2-Draht-Level (Start/Stop)' },
        { value: 'runLevel', label: 'Ein Run-Level (TRUE/FALSE)' },
      ], (v) => { dev.commandType = (v === 'runLevel') ? 'runLevel' : (v === 'level' ? 'level' : 'pulse'); })));
      adv.appendChild(mkFieldRow('Pulse‑Dauer (ms)', mkNumInput(dev.pulseMs, (v) => { dev.pulseMs = v; })));
      adv.appendChild(mkFieldRow('Readback erforderlich', mkCheckbox(dev.requireReadback, 'Start/Stop erst nach Laufstatus bestätigen', (v) => { dev.requireReadback = v; })));
      adv.appendChild(mkFieldRow('Befehls-/Readback-Timeout (s)', mkNumInput(dev.commandTimeoutSec, (v) => { dev.commandTimeoutSec = v; })));
      adv.appendChild(mkFieldRow('Wiederholungsabstand (s)', mkNumInput(dev.retryDelaySec, (v) => { dev.retryDelaySec = v; })));
      adv.appendChild(mkFieldRow('Max. Wiederholungen', mkNumInput(dev.maxRetries, (v) => { dev.maxRetries = v; })));
      adv.appendChild(mkFieldRow('Fehlerverriegelung (s)', mkNumInput(dev.faultLockSec, (v) => { dev.faultLockSec = v; })));
      adv.appendChild(mkFieldRow('NVP-Startfreigabe', mkCheckbox(dev.requireGridImportForAutoStart, 'Auto-Start nur bei frischem Netzbezug', (v) => { dev.requireGridImportForAutoStart = v; })));
      adv.appendChild(mkFieldRow('NVP-Startschwelle (W)', mkNumInput(dev.gridImportStartW, (v) => { dev.gridImportStartW = v; })));
      adv.appendChild(mkFieldRow('Stop bei Einspeisung ab (W)', mkNumInput(dev.stopOnGridExportW, (v) => { dev.stopOnGridExportW = v; }),
        '0 = deaktiviert. Ein Auto-Stop erfolgt erst nach der Mindestlaufzeit.'));
      adv.appendChild(mkFieldRow('Max. NVP-Alter (s)', mkNumInput(dev.gridMaxAgeSec, (v) => { dev.gridMaxAgeSec = v; })));
      adv.appendChild(mkFieldRow('Lauf-Erkennung ab Leistung (W)', mkNumInput(dev.runningPowerThresholdW, (v) => { dev.runningPowerThresholdW = v; }),
        'Fallback, wenn kein separater Laufstatus vorhanden ist.'));
      body.appendChild(adv);

      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an advBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      advBtn.addEventListener('click', () => {
        const open = adv.style.display !== 'none';
        adv.style.display = open ? 'none' : '';
        advBtn.textContent = open ? 'Erweitert' : 'Weniger';
      });

      const footer = document.createElement('div');
      footer.className = 'nw-config-card__row';
      footer.style.opacity = '0.82';
      footer.style.marginTop = '6px';
      footer.textContent = 'Hinweis: In der VIS ist Start/Stop nur im Modus „Manuell“ aktiv.';
      body.appendChild(footer);

      card.appendChild(header);
      card.appendChild(body);
      els.generatorDevices.appendChild(card);
    }
  }


  // ------------------------------
  // Schwellwertsteuerung (Regeln)
  // ------------------------------
  /**
   * Code-Teil: _ensureThresholdCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureThresholdCfg() {
    currentConfig = currentConfig || {};
    currentConfig.threshold = (currentConfig.threshold && typeof currentConfig.threshold === 'object') ? currentConfig.threshold : {};
    const t = currentConfig.threshold;
    t.rules = Array.isArray(t.rules) ? t.rules : [];

    const out = [];
    const used = new Set();

    /**
     * Code-Teil: Arrow-Funktion `normOutType`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: normOutType
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const normOutType = (v) => {
      const s = String(v || '').trim().toLowerCase();
      return (s === 'boolean' || s === 'bool' || s === 'switch') ? 'boolean' : 'number';
    };
    /**
     * Code-Teil: normCompare
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const normCompare = (v) => {
      const s = String(v || '').trim().toLowerCase();
      return (s === 'below' || s === '<' || s === 'lt' || s === 'kleiner') ? 'below' : 'above';
    };

    for (let i = 0; i < t.rules.length; i++) {
      const r0 = t.rules[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(r0.idx ?? r0.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const outType = normOutType(r0.outputType);
      const onDef = (outType === 'boolean') ? true : 1;
      const offDef = (outType === 'boolean') ? false : 0;

      out.push({
        idx,
        enabled: (typeof r0.enabled === 'boolean') ? !!r0.enabled : true,
        name: String(r0.name || '').trim() || `Regel ${idx}`,
        inputId: String(r0.inputId || r0.inputObjectId || '').trim(),
        compare: normCompare(r0.compare),
        threshold: (Number.isFinite(Number(r0.threshold))) ? Number(r0.threshold) : 0,
        hysteresis: (Number.isFinite(Number(r0.hysteresis))) ? Math.max(0, Number(r0.hysteresis)) : 0,
        minOnSec: (Number.isFinite(Number(r0.minOnSec))) ? Math.max(0, Number(r0.minOnSec)) : 0,
        minOffSec: (Number.isFinite(Number(r0.minOffSec))) ? Math.max(0, Number(r0.minOffSec)) : 0,
        outputType: outType,
        outputId: String(r0.outputId || r0.outputObjectId || '').trim(),
        onValue: (r0.onValue !== undefined) ? r0.onValue : onDef,
        offValue: (r0.offValue !== undefined) ? r0.offValue : offDef,
        maxAgeMs: (Number.isFinite(Number(r0.maxAgeMs))) ? Math.max(500, Math.round(Number(r0.maxAgeMs))) : 5000,
        // RC39: Ein Schwellwert-Aktor gilt standardmäßig als reale Last. Nur
        // bewusst als nicht energierelevant markierte Automationen dürfen ohne
        // Leistungsmodell arbeiten. Damit kann die finale Write-Firewall den
        // Netzanschluss und §14a auch bei generischen Relais berücksichtigen.
        safetyRelevant: (typeof r0.safetyRelevant === 'boolean') ? !!r0.safetyRelevant : true,
        estimatedPowerW: (Number.isFinite(Number(r0.estimatedPowerW ?? r0.installedPowerW ?? r0.maxPowerW)))
          ? Math.max(0, Math.round(Number(r0.estimatedPowerW ?? r0.installedPowerW ?? r0.maxPowerW)))
          : 0,
        safetyApp: String(r0.safetyApp || r0.para14aApp || 'custom').trim() || 'custom',
        phaseCount: (Number.isFinite(Number(r0.phaseCount ?? r0.phases)))
          ? Math.max(1, Math.min(3, Math.round(Number(r0.phaseCount ?? r0.phases))))
          : 3,
        voltageV: (Number.isFinite(Number(r0.voltageV))) ? Math.max(200, Math.min(260, Number(r0.voltageV))) : 230,
        userCanToggle: (typeof r0.userCanToggle === 'boolean') ? !!r0.userCanToggle : true,
        userCanSetThreshold: (typeof r0.userCanSetThreshold === 'boolean') ? !!r0.userCanSetThreshold : true,
        userCanSetMinOnSec: (typeof r0.userCanSetMinOnSec === 'boolean') ? !!r0.userCanSetMinOnSec : ((typeof r0.userCanSetThreshold === 'boolean') ? !!r0.userCanSetThreshold : true),
        userCanSetMinOffSec: (typeof r0.userCanSetMinOffSec === 'boolean') ? !!r0.userCanSetMinOffSec : ((typeof r0.userCanSetThreshold === 'boolean') ? !!r0.userCanSetThreshold : true),
      });
    }

    out.sort((a, b) => a.idx - b.idx);
    t.rules = out;
    return t;
  }
  /**
   * Code-Teil: _nextFreeThresholdIdx
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nextFreeThresholdIdx() {
    const t = _ensureThresholdCfg();
    const used = new Set((t.rules || []).map(r => Number(r && r.idx)).filter(n => Number.isFinite(n)));
    for (let i = 1; i <= 10; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }
  /**
   * Code-Teil: buildThresholdUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildThresholdUI() {
    if (!els.thresholdRules) return;

    const t = _ensureThresholdCfg();

    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.threshold) ? apps.threshold : { installed: false, enabled: false };

    els.thresholdRules.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Schwellwertsteuerung“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.thresholdRules.appendChild(msg);
      return;
    }

    /**
     * Code-Teil: Arrow-Funktion `mkHdr`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkHdr
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkHdr = (title, subtitle) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-help';
      const t1 = document.createElement('div');
      t1.style.fontWeight = '700';
      t1.textContent = title;
      const t2 = document.createElement('div');
      t2.style.opacity = '0.85';
      t2.style.marginTop = '4px';
      t2.textContent = subtitle;
      wrap.appendChild(t1);
      wrap.appendChild(t2);
      return wrap;
    };

    if (!t.rules.length) {
      els.thresholdRules.appendChild(mkHdr('Noch keine Regeln.', 'Klicke auf „Regel hinzufügen“, um die erste Automation zu erstellen.'));
    }

    const listWrap = document.createElement('div');
    listWrap.className = 'nw-config-list';

    /**
     * Code-Teil: Arrow-Funktion `mkLabel`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkLabel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkLabel = (text) => {
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = text;
      return lbl;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkDpField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkDpField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkDpField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';

      wrap.appendChild(mkLabel(labelText));

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'Datenpunkt';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkNumField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkNumField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkNumField = (labelText, inputId, value, onChange, placeholder, unit) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null) ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : 0);
      });

      row.appendChild(input);
      if (unit) {
        const u = document.createElement('span');
        u.className = 'nw-config-muted';
        u.textContent = unit;
        row.appendChild(u);
      }

      wrap.appendChild(row);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkTextField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkTextField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkTextField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null) ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => onChange(String(input.value || '').trim()));

      wrap.appendChild(input);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkSelectField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkSelectField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkSelectField = (labelText, inputId, value, options, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const sel = document.createElement('select');
      sel.className = 'nw-config-input';
      sel.id = inputId;
      for (const o of options) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      }
      sel.value = String(value || options[0].v);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      sel.addEventListener('change', () => onChange(String(sel.value)));

      wrap.appendChild(sel);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkBoolSelect`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkBoolSelect
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkBoolSelect = (labelText, inputId, value, onChange) => {
      return mkSelectField(labelText, inputId, (value ? '1' : '0'), [
        { v: '1', t: 'Ein / True' },
        { v: '0', t: 'Aus / False' },
      ], (v) => onChange(v === '1'));
    };

    /**
     * Code-Teil: Arrow-Funktion `mkChk`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkChk
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkChk = (labelText, inputId, checked, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const lbl = document.createElement('label');
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.marginTop = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = inputId;
      cb.checked = !!checked;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => onChange(!!cb.checked));

      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('aktiv'));

      wrap.appendChild(lbl);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `updateRule`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: updateRule
     * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const updateRule = (idx, patch) => {
      const t2 = _ensureThresholdCfg();
      const r = t2.rules.find(x => Number(x.idx) === Number(idx));
      if (!r) return;
      Object.assign(r, patch || {});
      // normalize types
      r.outputType = (String(r.outputType || '').toLowerCase() === 'boolean') ? 'boolean' : 'number';
      r.compare = (String(r.compare || '').toLowerCase() === 'below') ? 'below' : 'above';
    };

    for (const r of t.rules) {
      const idx = Number(r.idx);

      const item = document.createElement('div');
      item.className = 'nw-config-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      item.style.gap = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '10px';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = `Regel ${idx}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = 'Wenn Input ' + (r.compare === 'below' ? '<' : '>') + ' Schwellwert → schreibe Output';
      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.style.display = 'inline-flex';
      right.style.gap = '10px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      const enWrap = document.createElement('label');
      enWrap.style.display = 'inline-flex';
      enWrap.style.alignItems = 'center';
      enWrap.style.gap = '6px';
      enWrap.style.fontSize = '0.85rem';
      enWrap.style.color = '#e5e7eb';
      const en = document.createElement('input');
      en.type = 'checkbox';
      en.checked = !!r.enabled;
      en.id = `thr_rule_${idx}_enabled`;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an en. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      en.addEventListener('change', () => updateRule(idx, { enabled: !!en.checked }));
      enWrap.appendChild(en);
      enWrap.appendChild(document.createTextNode('Regel an'));
      right.appendChild(enWrap);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        const t2 = _ensureThresholdCfg();
        t2.rules = (t2.rules || []).filter(x => Number(x.idx) !== Number(idx));
        buildThresholdUI();
        scheduleValidation(200);
      });
      right.appendChild(del);

      head.appendChild(left);
      head.appendChild(right);

      const grid = document.createElement('div');
      grid.className = 'nw-flow-ctrl-grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';

      grid.appendChild(mkTextField('Name', `thr_rule_${idx}_name`, r.name, (v) => updateRule(idx, { name: v }), 'z.B. Heizstab PV'));
      grid.appendChild(mkSelectField('Vergleich', `thr_rule_${idx}_compare`, r.compare, [
        { v: 'above', t: 'Input > Schwellwert' },
        { v: 'below', t: 'Input < Schwellwert' },
      ], (v) => { updateRule(idx, { compare: v }); buildThresholdUI(); }));

      grid.appendChild(mkDpField('Input‑Datenpunkt', `thr_rule_${idx}_inputId`, r.inputId, (v) => updateRule(idx, { inputId: v }), 'z.B. ...power'));
      grid.appendChild(mkNumField('Schwellwert', `thr_rule_${idx}_threshold`, r.threshold, (n) => updateRule(idx, { threshold: n }), '', ''));
      grid.appendChild(mkNumField('Hysterese', `thr_rule_${idx}_hysteresis`, r.hysteresis, (n) => updateRule(idx, { hysteresis: Math.max(0, n) }), '', ''));
      grid.appendChild(mkNumField('MinOn', `thr_rule_${idx}_minOnSec`, r.minOnSec, (n) => updateRule(idx, { minOnSec: Math.max(0, n) }), '', 's'));
      grid.appendChild(mkNumField('MinOff', `thr_rule_${idx}_minOffSec`, r.minOffSec, (n) => updateRule(idx, { minOffSec: Math.max(0, n) }), '', 's'));

      grid.appendChild(mkSelectField('Output‑Typ', `thr_rule_${idx}_outputType`, r.outputType, [
        { v: 'boolean', t: 'Switch (bool)' },
        { v: 'number', t: 'Wert (number)' },
      ], (v) => { updateRule(idx, { outputType: v }); buildThresholdUI(); }));

      grid.appendChild(mkDpField('Output‑Datenpunkt', `thr_rule_${idx}_outputId`, r.outputId, (v) => updateRule(idx, { outputId: v }), 'z.B. ...setpoint'));

      if (String(r.outputType) === 'boolean') {
        grid.appendChild(mkBoolSelect('On‑Wert', `thr_rule_${idx}_onValue`, !!r.onValue, (b) => updateRule(idx, { onValue: !!b })));
        grid.appendChild(mkBoolSelect('Off‑Wert', `thr_rule_${idx}_offValue`, !!r.offValue, (b) => updateRule(idx, { offValue: !!b })));
      } else {
        grid.appendChild(mkNumField('On‑Wert', `thr_rule_${idx}_onValue`, Number(r.onValue), (n) => updateRule(idx, { onValue: n }), '', ''));
        grid.appendChild(mkNumField('Off‑Wert', `thr_rule_${idx}_offValue`, Number(r.offValue), (n) => updateRule(idx, { offValue: n }), '', ''));
      }

      grid.appendChild(mkNumField('Max. Alter Input', `thr_rule_${idx}_maxAgeMs`, r.maxAgeMs, (n) => updateRule(idx, { maxAgeMs: Math.max(500, Math.round(n)) }), '', 'ms'));

      grid.appendChild(mkChk('Netzanschluss-/§14a-Schutz anwenden', `thr_rule_${idx}_safetyRelevant`, r.safetyRelevant !== false, (b) => { updateRule(idx, { safetyRelevant: !!b }); buildThresholdUI(); }));
      if (r.safetyRelevant !== false) {
        grid.appendChild(mkNumField('Leistungsaufnahme bei EIN', `thr_rule_${idx}_estimatedPowerW`, r.estimatedPowerW, (n) => updateRule(idx, { estimatedPowerW: Math.max(0, Math.round(n)) }), 'Pflichtwert für die sichere Gesamtleistungsbilanz. Bei 0 W bleibt die Regel produktiv AUS.', 'W'));
        grid.appendChild(mkSelectField('§14a-/Safety-Gruppe', `thr_rule_${idx}_safetyApp`, r.safetyApp || 'custom', [
          { v: 'custom', t: 'Sonstiger steuerbarer Verbraucher' },
          { v: 'thermal', t: 'Wärmepumpe / Klima' },
          { v: 'heatingRod', t: 'Heizstab' },
          { v: 'evcs', t: 'Ladeinfrastruktur' },
          { v: 'storage', t: 'Speicher-Netzladung' },
        ], (v) => updateRule(idx, { safetyApp: v })));
        grid.appendChild(mkSelectField('Phasen', `thr_rule_${idx}_phaseCount`, String(r.phaseCount || 3), [
          { v: '1', t: '1-phasig' },
          { v: '2', t: '2-phasig' },
          { v: '3', t: '3-phasig' },
        ], (v) => updateRule(idx, { phaseCount: Math.max(1, Math.min(3, Math.round(Number(v) || 3))) })));
      }

      grid.appendChild(mkChk('Endkunde darf Regel ein/aus', `thr_rule_${idx}_userCanToggle`, r.userCanToggle !== false, (b) => updateRule(idx, { userCanToggle: !!b })));
      grid.appendChild(mkChk('Endkunde darf Schwellwert ändern', `thr_rule_${idx}_userCanSetThreshold`, r.userCanSetThreshold !== false, (b) => updateRule(idx, { userCanSetThreshold: !!b })));
      grid.appendChild(mkChk('Endkunde darf MinOn ändern', `thr_rule_${idx}_userCanSetMinOnSec`, r.userCanSetMinOnSec !== false, (b) => updateRule(idx, { userCanSetMinOnSec: !!b })));
      grid.appendChild(mkChk('Endkunde darf MinOff ändern', `thr_rule_${idx}_userCanSetMinOffSec`, r.userCanSetMinOffSec !== false, (b) => updateRule(idx, { userCanSetMinOffSec: !!b })));

      item.appendChild(head);
      item.appendChild(grid);

      listWrap.appendChild(item);
    }

    els.thresholdRules.appendChild(listWrap);

    // Buttons
    if (els.thresholdAddRule) {
      els.thresholdAddRule.onclick = () => {
        const next = _nextFreeThresholdIdx();
        if (!next) {
          setStatus('Maximal 10 Regeln möglich.', 'error');
          return;
        }
        const t2 = _ensureThresholdCfg();
        t2.rules.push({ idx: next, enabled: true, name: `Regel ${next}`, compare: 'above', threshold: 0, hysteresis: 0, minOnSec: 0, minOffSec: 0, outputType: 'boolean', onValue: true, offValue: false, maxAgeMs: 5000, safetyRelevant: true, estimatedPowerW: 0, safetyApp: 'custom', phaseCount: 3, voltageV: 230, userCanToggle: true, userCanSetThreshold: true, userCanSetMinOnSec: true, userCanSetMinOffSec: true, inputId: '', outputId: '' });
        buildThresholdUI();
        scheduleValidation(200);
      };
    }

    if (els.thresholdResetRules) {
      els.thresholdResetRules.onclick = () => {
        const ok = window.confirm('Alle Schwellwert-Regeln wirklich leeren?');
        if (!ok) return;
        const t2 = _ensureThresholdCfg();
        t2.rules = [];
        buildThresholdUI();
        scheduleValidation(200);
      };
    }
  }



  

  // ------------------------------
  // Relaissteuerung (manuell)
  // ------------------------------
  /**
   * Code-Teil: _ensureRelayCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureRelayCfg() {
    currentConfig = currentConfig || {};
    currentConfig.relay = (currentConfig.relay && typeof currentConfig.relay === 'object') ? currentConfig.relay : {};
    const r = currentConfig.relay;
    r.relays = Array.isArray(r.relays) ? r.relays : [];

    const out = [];
    const used = new Set();

    /**
     * Code-Teil: Arrow-Funktion `normType`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: normType
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const normType = (v) => {
      const s = String(v || '').trim().toLowerCase();
      return (s === 'boolean' || s === 'bool' || s === 'switch') ? 'boolean' : 'number';
    };
    /**
     * Code-Teil: numOrNull
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const numOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    for (let i = 0; i < r.relays.length; i++) {
      const it0 = r.relays[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(it0.idx ?? it0.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const type = normType(it0.type);

      out.push({
        idx,
        enabled: (typeof it0.enabled === 'boolean') ? !!it0.enabled : true,
        showInLive: (typeof it0.showInLive === 'boolean') ? !!it0.showInLive : true,
        name: String(it0.name || '').trim() || `Ausgang ${idx}`,
        type,
        writeId: String(it0.writeId || it0.writeObjectId || '').trim(),
        readId: String(it0.readId || it0.readObjectId || '').trim(),
        invert: (typeof it0.invert === 'boolean') ? !!it0.invert : false,
        userCanToggle: (typeof it0.userCanToggle === 'boolean') ? !!it0.userCanToggle : true,
        userCanSetValue: (typeof it0.userCanSetValue === 'boolean') ? !!it0.userCanSetValue : true,
        min: numOrNull(it0.min),
        max: numOrNull(it0.max),
        step: numOrNull(it0.step),
        unit: String(it0.unit || '').trim(),
      });
    }

    out.sort((a, b) => a.idx - b.idx);
    r.relays = out;
    return r;
  }
  /**
   * Code-Teil: _nextFreeRelayIdx
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nextFreeRelayIdx() {
    const r = _ensureRelayCfg();
    const used = new Set((r.relays || []).map(x => Number(x && x.idx)).filter(n => Number.isFinite(n)));
    for (let i = 1; i <= 10; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }
  /**
   * Code-Teil: buildRelayUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildRelayUI() {
    if (!els.relayControls) return;

    const r = _ensureRelayCfg();

    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.relay) ? apps.relay : { installed: false, enabled: false };

    els.relayControls.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Relaissteuerung“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.relayControls.appendChild(msg);
      return;
    }

    /**
     * Code-Teil: Arrow-Funktion `mkHdr`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkHdr
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkHdr = (title, subtitle) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-help';
      const t1 = document.createElement('div');
      t1.style.fontWeight = '700';
      t1.textContent = title;
      const t2 = document.createElement('div');
      t2.style.opacity = '0.85';
      t2.style.marginTop = '4px';
      t2.textContent = subtitle;
      wrap.appendChild(t1);
      wrap.appendChild(t2);
      return wrap;
    };

    if (!r.relays.length) {
      els.relayControls.appendChild(mkHdr('Noch keine Ausgänge.', 'Klicke auf „Ausgang hinzufügen“, um den ersten Ausgang anzulegen.'));
    }

    const listWrap = document.createElement('div');
    listWrap.className = 'nw-config-list';

    /**
     * Code-Teil: Arrow-Funktion `mkLabel`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkLabel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkLabel = (text) => {
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = text;
      return lbl;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkDpField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkDpField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkDpField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';

      wrap.appendChild(mkLabel(labelText));

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'Datenpunkt';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkTextField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkTextField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkTextField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null) ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => onChange(String(input.value || '').trim()));

      wrap.appendChild(input);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkNumField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkNumField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkNumField = (labelText, inputId, value, onChange, unit) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = inputId;
      input.value = (value !== undefined && value !== null && value !== '') ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : null);
      });

      row.appendChild(input);
      if (unit) {
        const u = document.createElement('span');
        u.className = 'nw-config-muted';
        u.textContent = unit;
        row.appendChild(u);
      }

      wrap.appendChild(row);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkSelectField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkSelectField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkSelectField = (labelText, inputId, value, options, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const sel = document.createElement('select');
      sel.className = 'nw-config-input';
      sel.id = inputId;
      for (const o of options) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      }
      sel.value = String(value || options[0].v);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      sel.addEventListener('change', () => onChange(String(sel.value)));

      wrap.appendChild(sel);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkChk`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkChk
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkChk = (labelText, inputId, checked, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const lbl = document.createElement('label');
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.marginTop = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = inputId;
      cb.checked = !!checked;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => onChange(!!cb.checked));

      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('aktiv'));

      wrap.appendChild(lbl);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `updateRelay`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: updateRelay
     * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const updateRelay = (idx, patch) => {
      const r2 = _ensureRelayCfg();
      const it = r2.relays.find(x => Number(x.idx) === Number(idx));
      if (!it) return;
      Object.assign(it, patch || {});
      it.type = (String(it.type || '').toLowerCase() === 'boolean') ? 'boolean' : 'number';
    };

    for (const it of r.relays) {
      const idx = Number(it.idx);

      const item = document.createElement('div');
      item.className = 'nw-config-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      item.style.gap = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '10px';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = `Ausgang ${idx}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = it.type === 'boolean' ? 'Switch (bool) – Ein/Aus' : 'Wert (number) – z.B. Sollwert';
      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.style.display = 'inline-flex';
      right.style.gap = '10px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      const enWrap = document.createElement('label');
      enWrap.style.display = 'inline-flex';
      enWrap.style.alignItems = 'center';
      enWrap.style.gap = '6px';
      enWrap.style.fontSize = '0.85rem';
      enWrap.style.color = '#e5e7eb';
      const en = document.createElement('input');
      en.type = 'checkbox';
      en.checked = !!it.enabled;
      en.id = `relay_${idx}_enabled`;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an en. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      en.addEventListener('change', () => updateRelay(idx, { enabled: !!en.checked }));
      enWrap.appendChild(en);
      enWrap.appendChild(document.createTextNode('aktiv'));
      right.appendChild(enWrap);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        const r2 = _ensureRelayCfg();
        r2.relays = (r2.relays || []).filter(x => Number(x.idx) !== Number(idx));
        buildRelayUI();
        scheduleValidation(200);
      });
      right.appendChild(del);

      head.appendChild(left);
      head.appendChild(right);

      const grid = document.createElement('div');
      grid.className = 'nw-flow-ctrl-grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';

      grid.appendChild(mkTextField('Name', `relay_${idx}_name`, it.name, (v) => updateRelay(idx, { name: v }), 'z.B. Heizstab'));
      grid.appendChild(mkSelectField('Typ', `relay_${idx}_type`, it.type, [
        { v: 'boolean', t: 'Switch (bool)' },
        { v: 'number', t: 'Wert (number)' },
      ], (v) => { updateRelay(idx, { type: v }); buildRelayUI(); }));

      grid.appendChild(mkDpField('Write‑Datenpunkt', `relay_${idx}_writeId`, it.writeId, (v) => updateRelay(idx, { writeId: v }), '…write'));
      grid.appendChild(mkDpField('Read‑Datenpunkt (optional)', `relay_${idx}_readId`, it.readId, (v) => updateRelay(idx, { readId: v }), '…read'));

      grid.appendChild(mkChk('Invert (bool: umdrehen)', `relay_${idx}_invert`, !!it.invert, (b) => updateRelay(idx, { invert: !!b })));
      grid.appendChild(mkChk('In VIS anzeigen', `relay_${idx}_showInLive`, it.showInLive !== false, (b) => updateRelay(idx, { showInLive: !!b })));

      if (String(it.type) === 'boolean') {
        grid.appendChild(mkChk('Endkunde darf schalten', `relay_${idx}_userCanToggle`, it.userCanToggle !== false, (b) => updateRelay(idx, { userCanToggle: !!b })));
      } else {
        grid.appendChild(mkChk('Endkunde darf Wert setzen', `relay_${idx}_userCanSetValue`, it.userCanSetValue !== false, (b) => updateRelay(idx, { userCanSetValue: !!b })));
        grid.appendChild(mkNumField('Min (optional)', `relay_${idx}_min`, it.min, (n) => updateRelay(idx, { min: n }), ''));
        grid.appendChild(mkNumField('Max (optional)', `relay_${idx}_max`, it.max, (n) => updateRelay(idx, { max: n }), ''));
        grid.appendChild(mkNumField('Step (optional)', `relay_${idx}_step`, it.step, (n) => updateRelay(idx, { step: n }), ''));
        grid.appendChild(mkTextField('Unit (optional)', `relay_${idx}_unit`, it.unit, (v) => updateRelay(idx, { unit: v }), 'z.B. W'));
      }

      item.appendChild(head);
      item.appendChild(grid);

      listWrap.appendChild(item);
    }

    els.relayControls.appendChild(listWrap);

    // Buttons
    if (els.relayAdd) {
      els.relayAdd.onclick = () => {
        const next = _nextFreeRelayIdx();
        if (!next) {
          setStatus('Maximal 10 Ausgänge möglich.', 'error');
          return;
        }
        const r2 = _ensureRelayCfg();
        r2.relays.push({ idx: next, enabled: true, showInLive: true, name: `Ausgang ${next}`, type: 'boolean', writeId: '', readId: '', invert: false, userCanToggle: true, userCanSetValue: true, min: null, max: null, step: null, unit: '' });
        buildRelayUI();
        scheduleValidation(200);
      };
    }

    if (els.relayReset) {
      els.relayReset.onclick = () => {
        const ok = window.confirm('Alle Ausgänge wirklich leeren?');
        if (!ok) return;
        const r2 = _ensureRelayCfg();
        r2.relays = [];
        buildRelayUI();
        scheduleValidation(200);
      };
    }
  }

// ------------------------------
  // §14a: Netzsteuerung / Leistungsdeckel für steuerbare Verbraucher
  // ------------------------------


  // --- Grid-Constraints / Netzlimits (Installer) ---
  /**
   * Code-Teil: _normalizeGridExportControlCfg
   * Zweck: Hält die sichtbaren Netzlimits und ihre Runtime-Aliase deckungsgleich.
   * Ein-/Ausgabe: Grid-Config (wird aktualisiert), Leistungen in W; 0 ist gültig.
   * Zusammenhang: Aufruf beim Laden und vor /api/installer/config. Kanonische
   * exportLimit*-Werte haben beim Laden dieselbe Priorität wie im Export Guard;
   * UI-Ereignisse ändern anschließend immer beide Namen. Keine Hardware-Schreibzugriffe.
   */
  function _normalizeGridExportControlCfg(gc) {
    const approved = typeof gc.exportLimitInstallerApproved === 'boolean'
      ? gc.exportLimitInstallerApproved
      : typeof gc.zeroExportInstallerApproved === 'boolean'
        ? gc.zeroExportInstallerApproved
        : gc.zeroExportEnabled === true;
    gc.exportLimitInstallerApproved = approved;
    gc.zeroExportInstallerApproved = approved;
    const candidates = [gc.exportLimitMaxFeedInW, gc.zeroExportMaxExportW, gc.maxFeedInPowerW, gc.maxExportW, gc.allowedFeedInW];
    let maxExportW = 0;
    for (const value of candidates) {
      if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) { maxExportW = Math.round(parsed); break; }
    }
    gc.exportLimitMaxFeedInW = maxExportW;
    gc.zeroExportMaxExportW = maxExportW;
    const fallback = Number(gc.fallbackExportPowerW ?? gc.externalFallbackExportPowerW ?? maxExportW);
    gc.fallbackExportPowerW = Number.isFinite(fallback) && fallback >= 0 ? Math.min(maxExportW, Math.round(fallback)) : maxExportW;
    const mode = String(gc.exportLimitRunMode ?? gc.zeroExportRunMode ?? gc.exportGuardMode ?? 'active').trim().toLowerCase();
    gc.exportLimitRunMode = ['diagnostic', 'test', 'dryrun', 'dry-run', 'simulation'].includes(mode) ? 'diagnostic' : 'active';
    const probe = gc.zeroExportProbeMaxW;
    const probeW = probe === null || probe === undefined || (typeof probe === 'string' && !probe.trim()) ? 4200 : Number(probe);
    gc.zeroExportProbeMaxW = Number.isFinite(probeW) ? Math.max(0, Math.min(50000, Math.round(probeW))) : 4200;
    for (const [key, fallback, min, max] of [
      ['zeroExportPvHoldMaxW', 600, 0, 2000], ['zeroExportPvHoldSec', 45, 0, 120], ['zeroExportPvRestartSec', 180, 60, 3600],
    ]) {
      const value = gc[key];
      const n = value === null || value === undefined || typeof value === 'boolean' || (typeof value === 'string' && !value.trim()) ? NaN : Number(value);
      gc[key] = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    }
    return gc;
  }

  /**
   * Code-Teil: _ensureGridConstraintsCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureGridConstraintsCfg() {
    currentConfig = currentConfig || {};
    currentConfig.gridConstraints = (currentConfig.gridConstraints && typeof currentConfig.gridConstraints === 'object') ? currentConfig.gridConstraints : {};
    const gc = currentConfig.gridConstraints;

    if (typeof gc.rlmEnabled !== 'boolean') gc.rlmEnabled = false;
    if (typeof gc.rlmAligned !== 'boolean') gc.rlmAligned = true;

    // RC81: Zuordnung → Allgemein ist die einzige statische Quelle für
    // Netzanschlussleistung und signierte NVP-Messung. Netzlimits darf weder
    // eine zweite Hard-Limit-Vorgabe noch einen zweiten NVP-Datenpunkt führen.
    // Alte RC79/RC80-Overrides werden beim nächsten Speichern neutralisiert und
    // von der Runtime zusätzlich ignoriert. Soft bleibt automatisch 90 % der
    // wirksamen, aus der Zuordnung abgeleiteten Hard-Grenze.
    gc.importSoftLimitEnabled = true;
    gc.importHardLimitW = 0;
    gc.gridImportHardLimitW = 0;
    gc.gridPowerId = '';
    gc.importSoftLimitW = 0;
    gc.importSoftReserveW = 0;
    const importSoftHysteresisW = Number(gc.importSoftHysteresisW ?? 500);
    gc.importSoftHysteresisW = Number.isFinite(importSoftHysteresisW) && importSoftHysteresisW >= 0 ? Math.round(importSoftHysteresisW) : 500;
    const importSoftReleaseDelaySec = Number(gc.importSoftReleaseDelaySec ?? 10);
    gc.importSoftReleaseDelaySec = Number.isFinite(importSoftReleaseDelaySec) && importSoftReleaseDelaySec >= 0 ? Math.round(importSoftReleaseDelaySec) : 10;

    if (typeof gc.zeroExportEnabled !== 'boolean') gc.zeroExportEnabled = false;

    // Einspeisebegrenzung/Export Guard: bewusst unter Netzlimits im Installer, nicht im Kundenfrontend.
    // Das neue Freigabe-Flag schützt vor versehentlicher Aktivierung. Bestehende Anlagen mit
    // bereits aktiver 0-Einspeisung bleiben kompatibel freigegeben.
    _normalizeGridExportControlCfg(gc);
    // Diagnose berechnet den Export Guard ohne WR-Schreibzugriff; die zentrale
    // 0-Einspeise-PV-Strategie erteilt dort auch keine zusätzlichen Prüflasten.
    // Stable 1.0.0: Reihenfolge für echte 0‑Einspeisung. Verbrauch ist immer natürliche
    // erste Senke, danach freigegebene Ladepunkte/flexible Verbraucher, anschließend
    // Speicher und Mesh/Microgrid; erst der verbleibende Rest wird am WR abgeregelt.
    // Optionale Command-States bleiben neutral und
    // herstelleroffen; keine direkten Hardware-Rohbefehle im App-Center.
    if (typeof gc.zeroExportStorageChargeCommandStateId !== 'string') gc.zeroExportStorageChargeCommandStateId = '';
    if (typeof gc.zeroExportChargingCommandStateId !== 'string') gc.zeroExportChargingCommandStateId = '';
    if (typeof gc.zeroExportFlexLoadCommandStateId !== 'string') gc.zeroExportFlexLoadCommandStateId = '';
    if (typeof gc.zeroExportMeshCommandStateId !== 'string') gc.zeroExportMeshCommandStateId = '';

    // Angezeigte Standardwerte entsprechen dem Export Guard; explizite 0 bleibt gültig.
    if (gc.zeroExportBiasW === undefined || gc.zeroExportBiasW === null) gc.zeroExportBiasW = 80;
    if (gc.zeroExportDeadbandW === undefined || gc.zeroExportDeadbandW === null) gc.zeroExportDeadbandW = 50;

    // PV Abregelung (EVU Relais) – optional zusätzlich zur 0‑Einspeisung
    if (typeof gc.pvEvuEnabled !== 'boolean') gc.pvEvuEnabled = false;
    if (typeof gc.pvEvuRelay60Id !== 'string') gc.pvEvuRelay60Id = '';
    if (typeof gc.pvEvuRelay30Id !== 'string') gc.pvEvuRelay30Id = '';
    if (typeof gc.pvEvuRelay0Id !== 'string') gc.pvEvuRelay0Id = '';

    // Wechselrichter‑Gruppen (pro WR) – bevorzugt gegenüber Legacy‑Einzel‑DP
    if (!Array.isArray(gc.pvCurtailInvertersEvu)) gc.pvCurtailInvertersEvu = [];
    if (!Array.isArray(gc.pvCurtailInvertersZero)) gc.pvCurtailInvertersZero = [];

    // Alte Editor-Versionen führten einen verschachtelten Entwurf, den der
    // Regler nicht las. Nur wirklich fehlende kanonische Felder übernehmen;
    // explizit leere Zuordnungen dürfen dadurch nicht erneut aktiviert werden.
    const legacyDraft = gc.pvCurtailLegacy;
    if (legacyDraft && typeof legacyDraft === 'object') {
      for (const [canonical, old] of [
        ['pvFeedInLimitWId', 'feedInLimitWId'], ['pvLimitWId', 'pvLimitWId'], ['pvLimitPctId', 'pvLimitPctId'],
      ]) {
        if (!Object.prototype.hasOwnProperty.call(gc, canonical) && typeof legacyDraft[old] === 'string') gc[canonical] = legacyDraft[old].trim();
      }
      if (!Object.prototype.hasOwnProperty.call(gc, 'pvCurtailMode')) {
        gc.pvCurtailMode = ({ feedInW: 'feedInLimitW', pvW: 'pvLimitW', pvPct: 'pvLimitPct' })[legacyDraft.mode] || 'auto';
      }
    }
    if (typeof gc.pvCurtailMode !== 'string') gc.pvCurtailMode = 'auto';

    // Normalise strings in inverter tables
    /**
     * Code-Teil: Arrow-Funktion `normInv`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: normInv
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const normInv = (it) => {
      if (!it || typeof it !== 'object') return null;
      const name = String(it.name || '').trim();
      const kwp = Number(String(it.kwp ?? '').replace(',', '.'));
      return {
        name,
        kwp: (Number.isFinite(kwp) && kwp >= 0) ? kwp : 0,
        feedInLimitWId: String(it.feedInLimitWId || it.pvFeedInLimitWId || '').trim(),
        pvLimitWId: String(it.pvLimitWId || '').trim(),
        pvLimitPctId: String(it.pvLimitPctId || '').trim(),
        // PV-Messung muss Neuzeichnen und Speichern überleben (main: PV-Summierung).
        pvPowerReadId: String(it.pvPowerReadId || '').trim(),
      };
    };
    gc.pvCurtailInvertersEvu = (gc.pvCurtailInvertersEvu || []).map(normInv).filter(Boolean);
    gc.pvCurtailInvertersZero = (gc.pvCurtailInvertersZero || []).map(normInv).filter(Boolean);

    return gc;
  }
  /**
   * Code-Teil: buildGridConstraintsUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildGridConstraintsUI() {
    const meterEl = els.gridConstraintsMeter;
    const importEl = els.gridConstraintsImportLimits;
    const rlmEl = els.gridConstraintsRlm;
    const zeroEl = els.gridConstraintsZero;
    const evuEl = els.gridConstraintsEvu;
    const pvEl = els.gridConstraintsPvCurtail;

    if (!meterEl && !importEl && !rlmEl && !zeroEl && !evuEl && !pvEl) return;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = { installed: true, enabled: true, ...((apps && apps.grid && typeof apps.grid === 'object') ? apps.grid : {}) };
    a.installed = true;
    a.enabled = true;

    /**
     * Code-Teil: Arrow-Funktion `mkMsg`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkMsg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkMsg = (text) => {
      const d = document.createElement('div');
      d.className = 'nw-help';
      d.textContent = text;
      return d;
    };

    /**
     * Code-Teil: Arrow-Funktion `clearAll`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: clearAll
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const clearAll = () => {
      if (meterEl) meterEl.innerHTML = '';
      if (importEl) importEl.innerHTML = '';
      if (rlmEl) rlmEl.innerHTML = '';
      if (zeroEl) zeroEl.innerHTML = '';
      if (evuEl) evuEl.innerHTML = '';
      if (pvEl) pvEl.innerHTML = '';
    };

    clearAll();

    if (!a.installed) {
      const msg = mkMsg('Die App „Netzlimits“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.');
      if (meterEl) meterEl.appendChild(msg.cloneNode(true));
      if (importEl) importEl.appendChild(msg.cloneNode(true));
      if (rlmEl) rlmEl.appendChild(msg.cloneNode(true));
      if (zeroEl) zeroEl.appendChild(msg.cloneNode(true));
      if (evuEl) evuEl.appendChild(msg.cloneNode(true));
      if (pvEl) pvEl.appendChild(msg.cloneNode(true));
      return;
    }

    const gc = _ensureGridConstraintsCfg();

    /**
     * Code-Teil: Arrow-Funktion `mkLabel`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkLabel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkLabel = (text) => {
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = text;
      return lbl;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkFieldWrap`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkFieldWrap
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkFieldWrap = (labelText) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkChk`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkChk
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkChk = (labelText, inputId, checked, onChange) => {
      const wrap = mkFieldWrap(labelText);

      const lbl = document.createElement('label');
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.marginTop = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = inputId;
      cb.checked = !!checked;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => onChange(!!cb.checked));

      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('aktiv'));

      wrap.appendChild(lbl);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkNum`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkNum
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkNum = (labelText, inputId, value, onChange, unit, placeholder) => {
      const wrap = mkFieldWrap(labelText);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null && value !== '') ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : 0);
      });

      row.appendChild(input);
      if (unit) {
        const u = document.createElement('span');
        u.className = 'nw-config-muted';
        u.textContent = unit;
        row.appendChild(u);
      }

      wrap.appendChild(row);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkSelect`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkSelect
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkSelect = (labelText, inputId, value, options, onChange) => {
      const wrap = mkFieldWrap(labelText);

      const sel = document.createElement('select');
      sel.className = 'nw-config-input';
      sel.id = inputId;
      for (const o of options) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      }
      sel.value = String(value || options[0].v);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      sel.addEventListener('change', () => onChange(String(sel.value)));

      wrap.appendChild(sel);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkDpField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkDpField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkDpField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = mkFieldWrap(labelText);

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'Datenpunkt';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkHint`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkHint
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkHint = (text) => {
      const h = document.createElement('div');
      h.className = 'nw-config-muted';
      h.style.fontSize = '0.78rem';
      h.style.marginTop = '8px';
      h.textContent = text;
      return h;
    };

    /**
     * Code-Teil: renderExportGuardRuntimeDiagnostics
     * Zweck: Zeigt dem Installateur die aktuelle Export-Guard-Lage direkt im App-Center.
     * Zusammenhang: Die Anzeige liest ausschließlich Runtime-States aus `/api/state`. Sie speichert keine
     * Konfiguration und schreibt keine Hardware. Dadurch bleibt die Trennung sauber: Nutzerfrontend = Bedienung,
     * Installerbereich = technische Diagnose/Zuordnung.
     */
    const renderExportGuardRuntimeDiagnostics = (target) => {
      if (!target) return;
      const box = document.createElement('div');
      box.className = 'nw-help';
      box.style.marginTop = '10px';
      box.textContent = 'Export-Guard-Diagnose wird geladen …';
      target.appendChild(box);

      const fmtW = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '—';
        if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + ' kW';
        return Math.round(n) + ' W';
      };
      const readVal = (data, key) => {
        const rec = data && data[key];
        return rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : undefined;
      };
      const parseJson = (raw) => {
        if (!raw) return null;
        try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_e) { return null; }
      };
      fetchJson('/api/state?t=' + Date.now(), { cache: 'no-store' })
        .then((data) => {
          const enabled = !!readVal(data, 'gridConstraints.exportLimit.enabled');
          const approved = !!readVal(data, 'gridConstraints.exportLimit.installerApproved');
          const runMode = String(readVal(data, 'gridConstraints.exportLimit.runMode') || gc.exportLimitRunMode || 'active');
          const currentExport = readVal(data, 'gridConstraints.exportLimit.currentExportW');
          const configuredLimit = readVal(data, 'gridConstraints.exportLimit.configuredMaxFeedInW');
          const limit = readVal(data, 'gridConstraints.exportLimit.effectiveMaxFeedInW');
          const controlSource = String(readVal(data, 'gridConstraints.exportLimit.controlSource') || 'eos-local');
          const externalExpected = !!readVal(data, 'gridConstraints.exportLimit.authority.expected');
          const externalActive = !!readVal(data, 'gridConstraints.exportLimit.authority.active');
          const externalBinding = !!readVal(data, 'gridConstraints.exportLimit.authority.binding');
          const externalAllowedRaw = Number(readVal(data, 'gridConstraints.exportLimit.authority.allowedExportPowerW'));
          const externalAllowed = Number.isFinite(externalAllowedRaw) && externalAllowedRaw >= 0 ? externalAllowedRaw : null;
          const fallbackLimit = readVal(data, 'gridConstraints.exportLimit.authority.fallbackExportPowerW');
          const authorityValidUntil = Number(readVal(data, 'gridConstraints.exportLimit.authority.validUntil') || 0);
          const authoritySource = String(readVal(data, 'gridConstraints.exportLimit.authority.source') || '—');
          const authorityQuality = String(readVal(data, 'gridConstraints.exportLimit.authority.quality') || '—');
          const authorityReason = String(readVal(data, 'gridConstraints.exportLimit.authority.reason') || '—');
          const authorityFailSafe = String(readVal(data, 'gridConstraints.exportLimit.authority.failSafePolicy') || '—');
          const over = readVal(data, 'gridConstraints.exportLimit.exportOverLimitW');
          const remaining = readVal(data, 'gridConstraints.exportLimit.remainingFeedInW');
          const usage = Number(readVal(data, 'gridConstraints.exportLimit.usagePercent'));
          const curt = readVal(data, 'gridConstraints.exportLimit.estimatedCurtailmentW');
          const pvActual = readVal(data, 'gridConstraints.zeroExport.pvActualW');
          const localAbsorption = readVal(data, 'gridConstraints.zeroExport.localAbsorptionW');
          const pvFeedForwardTarget = readVal(data, 'gridConstraints.zeroExport.pvFeedForwardTargetW');
          const pvFeedbackCorrection = readVal(data, 'gridConstraints.zeroExport.pvFeedbackCorrectionW');
          const storageActual = readVal(data, 'gridConstraints.zeroExport.storageActualW');
          const storageTarget = readVal(data, 'gridConstraints.zeroExport.storageTargetW');
          const storageConflict = !!readVal(data, 'gridConstraints.zeroExport.storageDischargeConflict');
          const pvSetpointReason = String(readVal(data, 'gridConstraints.zeroExport.pvSetpointReason') || '—');
          const status = String(readVal(data, 'gridConstraints.exportLimit.statusLabel') || '—');
          const planned = String(readVal(data, 'gridConstraints.exportLimit.plannedAction') || '—');
          const message = String(readVal(data, 'gridConstraints.exportLimit.installerMessage') || '');
          const writeCapable = !!readVal(data, 'gridConstraints.exportLimit.writeCapable');
          const writeWarning = String(readVal(data, 'gridConstraints.exportLimit.writeWarning') || '');
          const negative = !!readVal(data, 'gridConstraints.exportLimit.negativePriceActive');
          const negStrategy = String(readVal(data, 'gridConstraints.exportLimit.negativePriceStrategy') || '');
          const checklist = parseJson(readVal(data, 'gridConstraints.exportLimit.installerChecklistJson')) || {};
          const sinkPlan = parseJson(readVal(data, 'gridConstraints.exportLimit.sinkPriorityPlanJson')) || {};
          const commissioning = parseJson(readVal(data, 'gridConstraints.exportLimit.commissioning.reportJson')) || {};
          const commissioningChecklist = parseJson(readVal(data, 'gridConstraints.exportLimit.commissioning.checklistJson')) || {};
          const nextSink = String(readVal(data, 'gridConstraints.exportLimit.nextSinkAction') || sinkPlan.nextAction || '—');
          // Gemeinsame PV-Prüfstrategie aus CoreLimits: reine Diagnose, kein Sollwert.
          const zeroPvActive = readVal(data, 'ems.zeroExportPv.active');
          const zeroPvStatus = readVal(data, 'ems.zeroExportPv.status');
          const zeroPvReason = readVal(data, 'ems.zeroExportPv.reason');
          const zeroPvOwner = readVal(data, 'ems.zeroExportPv.owner');
          const zeroPvProbeW = readVal(data, 'ems.zeroExportPv.probeW');
          const zeroPvOperatingMarginW = readVal(data, 'ems.zeroExportPv.operatingMarginW');
          const zeroPvEnergyWh = Number(readVal(data, 'ems.zeroExportPv.energyWh'));
          const zeroPvValidUntil = Number(readVal(data, 'ems.zeroExportPv.validUntil'));

          box.innerHTML = '';
          const title = document.createElement('div');
          title.style.fontWeight = '700';
          title.style.marginBottom = '6px';
          title.textContent = 'Einspeisebegrenzung – aktueller Status';
          box.appendChild(title);

          const summary = document.createElement('div');
          summary.className = 'nw-zero-status-grid';
          for (const [label, value] of [
            ['Regelung', status],
            ['Betriebsart', runMode === 'diagnostic' ? 'Diagnose · keine WR-Befehle' : 'Aktiv'],
            ['WR-Schreibzuordnung', writeCapable ? 'Konfiguriert' : 'Zuordnung prüfen'],
            ['PV-Istleistung', fmtW(pvActual)],
            ['Aktuelle Einspeisung', fmtW(currentExport)],
            ['Wirksame Einspeisegrenze', fmtW(limit)],
          ]) {
            const item = document.createElement('div');
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            const valueEl = document.createElement('strong');
            valueEl.textContent = value;
            item.appendChild(labelEl);
            item.appendChild(valueEl);
            summary.appendChild(item);
          }
          box.appendChild(summary);
          const details = document.createElement('details');
          details.className = 'nw-zero-diagnostics';
          const detailsTitle = document.createElement('summary');
          detailsTitle.textContent = 'Technische Diagnose und vollständige Prüfliste';
          details.appendChild(detailsTitle);

          const rows = [
            ['Status', status],
            ['Betriebsart', runMode === 'diagnostic' ? 'Diagnose/Testmodus – keine WR-Schreibbefehle' : 'Aktiv – WR-Schreibbefehle erlaubt'],
            ['Installateurfreigabe', approved ? 'Ja' : 'Nein'],
            ['Wirksame Führungsquelle', controlSource === 'certified-controller' ? 'Zertifizierter EZA-/Parkregler' : controlSource === 'certified-controller-last-valid' ? 'Letzte gültige Regler-Vorgabe' : controlSource === 'certified-controller-failsafe' ? 'Regler-Fail-Safe (0 W)' : controlSource === 'eos-local-fallback' ? 'EOS Rückfallgrenze' : 'EOS Netzlimits lokal'],
            ['Zertifizierter Regler erwartet', externalExpected ? 'Ja' : 'Nein'],
            ['Externe Vorgabe aktiv / bindend', `${externalActive ? 'Ja' : 'Nein'} / ${externalBinding ? 'Ja' : 'Nein'}`],
            ['Regler-/Vorgabenquelle', authoritySource],
            ['Vorgabenqualität', authorityQuality],
            ['Externe Einspeisegrenze', externalAllowed === null ? '—' : fmtW(externalAllowed)],
            ['Lokale Sicherheitsobergrenze', fmtW(configuredLimit)],
            ['Rückfallgrenze', fmtW(fallbackLimit)],
            ['Wirksames Einspeiselimit', fmtW(limit)],
            ['Vorgabe gültig bis', authorityValidUntil > 0 ? new Date(authorityValidUntil).toLocaleString('de-DE') : '—'],
            ['Fail-Safe-Vertrag', authorityFailSafe],
            ['Quellenentscheidung', authorityReason],
            ['Aktuelle Einspeisung', fmtW(currentExport)],
            ['Überschreitung', fmtW(over)],
            ['Rest bis Limit', fmtW(remaining)],
            ['Auslastung', Number.isFinite(usage) ? Math.round(usage) + ' %' : '—'],
            ['Geschätzte Abregelung', fmtW(curt)],
            ['PV Ist', fmtW(pvActual)],
            ['Lokale Aufnahme inkl. Speicher', fmtW(localAbsorption)],
            ['PV Feed‑Forward‑Ziel', fmtW(pvFeedForwardTarget)],
            ['NVP‑Korrektur', fmtW(pvFeedbackCorrection)],
            ['Speicher Ist (+Entladen / −Laden)', fmtW(storageActual)],
            ['Speicher Soll (+Entladen / −Laden)', fmtW(storageTarget)],
            ['PV/Speicher‑Konflikt', storageConflict ? 'PV wird freigegeben – Speicher entlädt' : 'Nein'],
            ['PV‑Vorgabegrund', pvSetpointReason],
            ['Geplante Aktion', planned],
            ['0‑Einspeise nächste Senke', nextSink],
            ['Zentrale PV-Strategie', typeof zeroPvActive === 'boolean' ? (zeroPvActive ? 'Aktiv' : 'Nicht aktiv') : 'Noch keine Runtime-Daten'],
            ['PV-Strategiestatus', String(zeroPvStatus || '—')],
            ['PV-Strategiegrund', String(zeroPvReason || '—')],
            ['Aktuell geprüfter Verbraucher', String(zeroPvOwner || '—')],
            ['Zusätzliche PV-Prüflast', fmtW(zeroPvProbeW)],
            ['Bestätigter Netzanteil / Betriebsreserve', fmtW(zeroPvOperatingMarginW)],
            ['Erfasste Prüfenergie', Number.isFinite(zeroPvEnergyWh) ? zeroPvEnergyWh.toFixed(2) + ' Wh' : '—'],
            ['Prüffreigabe gültig bis', Number.isFinite(zeroPvValidUntil) && zeroPvValidUntil > 0 ? new Date(zeroPvValidUntil).toLocaleString('de-DE') : '—'],
            ['WR-Schreibzuordnung', writeCapable ? 'Konfiguriert' : 'Fehlt / prüfen'],
            ['Negative-Preis-Strategie', negative ? (negStrategy || 'aktiv') : 'nicht aktiv'],
            ['Inbetriebnahme', commissioning.ready ? `Bereit (${commissioning.scorePercent || 0} %)` : `Prüfen (${commissioning.scorePercent || 0} %)`],
          ];
          const table = document.createElement('div');
          table.className = 'nw-zero-diagnostics__table';
          for (const [k, v] of rows) {
            const a = document.createElement('div');
            a.style.opacity = '.78';
            a.textContent = k;
            const b = document.createElement('div');
            b.style.fontWeight = '600';
            b.textContent = String(v || '—');
            table.appendChild(a);
            table.appendChild(b);
          }
          details.appendChild(table);
          box.appendChild(details);
          if (sinkPlan && Array.isArray(sinkPlan.steps)) {
            const order = document.createElement('div');
            order.className = 'nw-config-muted';
            order.style.marginTop = '8px';
            order.textContent = '0‑Einspeise-Reihenfolge: ' + sinkPlan.steps.map((x) => `${x.index}. ${x.label}${x.mapped ? '' : ' (nicht gemappt)'}`).join(' → ');
            details.appendChild(order);
          }

          if (commissioningChecklist && Array.isArray(commissioningChecklist.items)) {
            const wrap = document.createElement('div');
            wrap.className = 'nw-config-muted';
            wrap.style.marginTop = '10px';
            const failed = commissioningChecklist.items.filter((i) => i.required && !i.ok).slice(0, 4);
            const optional = commissioningChecklist.items.filter((i) => !i.required && !i.ok).slice(0, 3);
            wrap.textContent = failed.length
              ? '0‑Einspeise Checkliste offen: ' + failed.map((i) => i.label).join(' | ')
              : (optional.length ? '0‑Einspeise Pflichtprüfung OK. Optionale Senken offen: ' + optional.map((i) => i.label).join(' | ') : '0‑Einspeise Inbetriebnahme-Checkliste OK.');
            box.appendChild(wrap);
          }

          if (message) {
            const m = document.createElement('div');
            m.className = 'nw-config-muted';
            m.style.marginTop = '8px';
            m.textContent = message;
            box.appendChild(m);
          }
          if (writeWarning) {
            const w = document.createElement('div');
            w.style.marginTop = '8px';
            w.style.color = '#facc15';
            w.textContent = 'Fehlende WR-Write-Datenpunkte: ' + writeWarning;
            box.appendChild(w);
          }
          if (checklist && checklist.nextStep) {
            const n = document.createElement('div');
            n.className = 'nw-config-muted';
            n.style.marginTop = '8px';
            n.textContent = 'Nächster Schritt: ' + checklist.nextStep;
            box.appendChild(n);
          }
          if (!writeCapable && zeroPvEl) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nw-config-btn nw-config-btn--ghost';
            btn.style.marginTop = '8px';
            btn.textContent = 'Zum WR-Mapping springen';
            btn.addEventListener('click', () => { try { zeroPvEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_e) {} });
            box.appendChild(btn);
          }
        })
        .catch(() => {
          box.textContent = 'Export-Guard-Diagnose konnte nicht geladen werden. Adapter/API prüfen.';
        });
    };

    /**
     * RC81: Runtime-Diagnose fuer das zentral zugeordnete Importlimit. Die Anzeige ist
     * rein lesend und zeigt bewusst den signierten NVP: Bezug positiv,
     * Einspeisung negativ.
     */
    const renderGridImportRuntimeDiagnostics = (target) => {
      if (!target) return;
      const box = document.createElement('div');
      box.className = 'nw-help';
      box.style.marginTop = '10px';
      box.textContent = 'Importlimit-Diagnose wird geladen …';
      target.appendChild(box);

      const fmtW = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '—';
        const sign = n > 0 ? '+' : '';
        if (Math.abs(n) >= 1000) return sign + (n / 1000).toFixed(2) + ' kW';
        return sign + Math.round(n) + ' W';
      };
      const readVal = (data, key) => {
        const rec = data && data[key];
        return rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : undefined;
      };
      const stageLabel = (stage) => ({
        normal: 'Normal',
        soft: 'Soft-Limit aktiv',
        hard: 'Hard-Limit aktiv',
        stale: 'NVP nicht verwendbar',
        unconfigured: 'Hard-Limit fehlt',
      }[String(stage || '')] || String(stage || '—'));

      fetchJson('/api/state?t=' + Date.now(), { cache: 'no-store' })
        .then((data) => {
          const stage = readVal(data, 'gridConstraints.importLimits.stage');
          const rows = [
            ['Stufe', stageLabel(stage)],
            ['Quelle', String(readVal(data, 'gridConstraints.importLimits.source') || '—')],
            ['Netzanschlussleistung (Zuordnung)', fmtW(readVal(data, 'gridConstraints.importLimits.baseConnectionPowerW'))],
            ['Signierter NVP', fmtW(readVal(data, 'gridConstraints.importLimits.signedNvpW'))],
            ['Soft-Limit wirksam', fmtW(readVal(data, 'gridConstraints.importLimits.softLimitW'))],
            ['Hard-Limit wirksam', fmtW(readVal(data, 'gridConstraints.importLimits.hardLimitW'))],
            ['Reserve Soft → Hard', fmtW(readVal(data, 'gridConstraints.importLimits.reserveW'))],
            ['Headroom bis Soft', fmtW(readVal(data, 'gridConstraints.importLimits.softHeadroomW'))],
            ['Headroom bis Hard', fmtW(readVal(data, 'gridConstraints.importLimits.hardHeadroomW'))],
            ['Erforderliche Reduktion', fmtW(readVal(data, 'gridConstraints.importLimits.requiredReductionW'))],
            ['Grund', String(readVal(data, 'gridConstraints.importLimits.reason') || '—')],
          ];
          box.innerHTML = '';
          const title = document.createElement('div');
          title.style.fontWeight = '700';
          title.style.marginBottom = '6px';
          title.textContent = 'Import Soft-/Hard-Limit Runtime-Diagnose';
          box.appendChild(title);
          const table = document.createElement('div');
          table.style.display = 'grid';
          table.style.gridTemplateColumns = 'minmax(155px, 1fr) minmax(160px, 1.6fr)';
          table.style.gap = '4px 10px';
          for (const [key, value] of rows) {
            const left = document.createElement('div');
            left.style.opacity = '.78';
            left.textContent = key;
            const right = document.createElement('div');
            right.style.fontWeight = '600';
            right.textContent = String(value || '—');
            table.appendChild(left);
            table.appendChild(right);
          }
          box.appendChild(table);
        })
        .catch(() => {
          box.textContent = 'Importlimit-Diagnose konnte nicht geladen werden. Adapter/API prüfen.';
        });
    };

    // NVP-Messung / Timeout: Zuordnung → Allgemein ist die einzige Quelle.
    if (meterEl) {
      const assignedNvpId = String(currentConfig?.datapoints?.gridPointPower || '').trim();
      meterEl.appendChild(mkHint(assignedNvpId
        ? `Verwendeter NVP-Datenpunkt aus Zuordnung → Allgemein: ${assignedNvpId}`
        : 'Kein NVP-Datenpunkt zugeordnet. Bitte unter Zuordnung → Allgemein → Netzpunkt-Messung auswählen.'));
      meterEl.appendChild(mkNum('Stale‑Timeout', 'gc_staleTimeoutSec', (gc.staleTimeoutSec !== undefined && gc.staleTimeoutSec !== null) ? Number(gc.staleTimeoutSec) : 15, (n) => { gc.staleTimeoutSec = (n > 0) ? Math.max(5, Math.round(n)) : 15; }, 's', 'z.B. 15'));
      meterEl.appendChild(mkHint('Wenn der zugeordnete NVP älter als der Timeout ist, werden keine neuen positiven Lastfreigaben erteilt.'));
    }

    // Zweistufiges Importlimit: ausschließlich aus Zuordnung → Allgemein.
    if (importEl) {
      const permanentStatus = document.createElement('div');
      permanentStatus.className = 'nw-config-badge nw-config-badge--ok';
      permanentStatus.style.display = 'inline-flex';
      permanentStatus.style.alignItems = 'center';
      permanentStatus.style.marginBottom = '10px';
      permanentStatus.style.padding = '7px 11px';
      permanentStatus.style.fontWeight = '800';
      permanentStatus.textContent = 'Netzschutz dauerhaft aktiv · nicht abschaltbar';
      importEl.appendChild(permanentStatus);
      const assignedHardW = Number(currentConfig?.installerConfig?.gridConnectionPower || 0) || 0;
      const fixedReserveW = assignedHardW > 0 ? Math.round(assignedHardW * 0.10) : 0;
      const fixedSoftW = assignedHardW > 0 ? Math.max(0, Math.round(assignedHardW) - fixedReserveW) : 0;
      importEl.appendChild(mkHint(assignedHardW > 0
        ? `Quelle: Zuordnung → Allgemein. Netzanschlussleistung / Hard‑Limit: ${Math.round(assignedHardW).toLocaleString('de-DE')} W (100 %). Soft‑Limit: ${fixedSoftW.toLocaleString('de-DE')} W (90 %). Reserve: ${fixedReserveW.toLocaleString('de-DE')} W (10 %).`
        : 'Keine Netzanschlussleistung gesetzt. Bitte unter Zuordnung → Allgemein eintragen; dort wird das Hard‑Limit zentral festgelegt.'));
      importEl.appendChild(mkNum('Hysterese', 'gc_importSoftHysteresisW', Number(gc.importSoftHysteresisW || 500) || 0, (n) => { gc.importSoftHysteresisW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 500'));
      importEl.appendChild(mkNum('Wiederfreigabe‑Verzögerung', 'gc_importSoftReleaseDelaySec', Number(gc.importSoftReleaseDelaySec || 10) || 0, (n) => { gc.importSoftReleaseDelaySec = Math.max(0, Math.round(n)); }, 's', 'z.B. 10'));
      importEl.appendChild(mkHint('Netzlimits besitzt bewusst keine zweite Leistungs- oder NVP-Vorgabe. Ein RLM-/Netzbetreiberdeckel darf die aus der Zuordnung stammende Grenze nur absenken, niemals ersetzen oder erhöhen. Einspeisung (negativer NVP) erhöht den Headroom bis zur Bezugsgrenze.'));
      renderGridImportRuntimeDiagnostics(importEl);
    }

    // RLM
    if (rlmEl) {
      rlmEl.appendChild(mkChk('RLM Deckel aktiv', 'gc_rlmEnabled', !!gc.rlmEnabled, (b) => { gc.rlmEnabled = b; }));
      rlmEl.appendChild(mkNum('RLM Limit', 'gc_rlmLimitW', Number(gc.rlmLimitW || 0) || 0, (n) => { gc.rlmLimitW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 25000'));
      rlmEl.appendChild(mkNum('Sicherheitsmarge', 'gc_rlmSafetyMarginW', Number(gc.rlmSafetyMarginW || 0) || 0, (n) => { gc.rlmSafetyMarginW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 500'));
      rlmEl.appendChild(mkChk('Alignment auf 15‑Minuten‑Raster', 'gc_rlmAligned', (gc.rlmAligned !== false), (b) => { gc.rlmAligned = b; }));
      rlmEl.appendChild(mkHint('Der RLM‑Deckel kann das Hard‑Limit dynamisch weiter absenken.'));
    }

    // EVU-Relaisstufen bleiben eine eigene optionale Schutzfunktion.
    if (evuEl) {
      evuEl.appendChild(mkChk('EVU‑Abregelung aktiv', 'gc_pvEvuEnabled', !!gc.pvEvuEnabled, (b) => {
        gc.pvEvuEnabled = b;
        buildGridConstraintsUI();
        scheduleValidation(200);
      }));
      if (gc.pvEvuEnabled) {
        evuEl.appendChild(mkDpField('Relais 60% (Read)', 'gc_pvEvuRelay60Id', gc.pvEvuRelay60Id, (v) => { gc.pvEvuRelay60Id = v; }, 'BOOL / 0|1'));
        evuEl.appendChild(mkDpField('Relais 30% (Read)', 'gc_pvEvuRelay30Id', gc.pvEvuRelay30Id, (v) => { gc.pvEvuRelay30Id = v; }, 'BOOL / 0|1'));
        evuEl.appendChild(mkDpField('Relais 0% (Read)', 'gc_pvEvuRelay0Id', gc.pvEvuRelay0Id, (v) => { gc.pvEvuRelay0Id = v; }, 'BOOL / 0|1'));
        evuEl.appendChild(mkHint('Sind mehrere Relais gleichzeitig aktiv, gilt automatisch die strengste Stufe: 0 % > 30 % > 60 % > 100 %.'));
      } else {
        evuEl.appendChild(mkHint('EVU‑Relaisstufen sind deaktiviert. Die 0‑Einspeisung unter Netzlimits kann unabhängig davon aktiv sein.'));
      }
    }

    /**
     * Gruppiert die Nulleinspeisung über die volle Kartenbreite. Basis, WR-Zuordnung
     * und Status bleiben sichtbar; zusätzliche Parameter/Diagnose sind aufklappbar.
     * Die vorhandenen Config-Felder/IDs bleiben gleich: kein zweiter Regler/Writer.
     */
    const mkZeroSection = (parent, titleText, id, collapsed = false) => {
      const section = document.createElement(collapsed ? 'details' : 'section');
      section.className = 'nw-zero-section';
      section.id = id;
      const title = document.createElement(collapsed ? 'summary' : 'h3');
      title.textContent = titleText;
      section.appendChild(title);
      const body = document.createElement('div');
      body.className = 'nw-zero-section__body';
      section.appendChild(body);
      parent.appendChild(section);
      return body;
    };
    const mkZeroFields = (parent) => {
      const fields = document.createElement('div');
      fields.className = 'nw-zero-fields';
      parent.appendChild(fields);
      return fields;
    };
    let zeroPvEl = null;
    let zeroLegacyEl = null;

    // 0-Einspeisung liegt verbindlich unter Netzlimits.
    if (zeroEl) {
      zeroEl.className = 'nw-zero-layout';
      const setup = mkZeroSection(zeroEl, '1 · Anlage und Einspeisegrenze', 'gc_zero_setup');
      setup.appendChild(mkHint('Zuerst unter Zuordnung → Allgemein die Netzanschlussleistung und den Netzpunkt (NVP) prüfen: Bezug positiv, Einspeisung negativ, Einheit W. Die Anlagen-PV ist eine Messung; der WR-Sollwert wird unten separat zugeordnet.'));
      const basic = mkZeroFields(setup);
      basic.appendChild(mkChk('0‑Einspeisung / Einspeisebegrenzung aktiv', 'gc_zeroExportEnabled', !!gc.zeroExportEnabled, (b) => {
        gc.zeroExportEnabled = b;
        if (!b) gc.exportLimitInstallerApproved = gc.zeroExportInstallerApproved = false;
        buildGridConstraintsUI();
        scheduleValidation(200);
      }));
      if (gc.zeroExportEnabled) {
        basic.appendChild(mkChk('Installateurfreigabe Einspeisebegrenzung', 'gc_zeroExportInstallerApproved', !!gc.zeroExportInstallerApproved, (b) => { gc.exportLimitInstallerApproved = gc.zeroExportInstallerApproved = b; }));
        basic.appendChild(mkSelect('Betriebsart Einspeisebegrenzung', 'gc_exportLimitRunMode', String(gc.exportLimitRunMode || 'active'), [
          { v: 'diagnostic', t: 'Diagnose/Testmodus – nur berechnen, nicht schreiben' },
          { v: 'active', t: 'Aktiv – WR-/PV-Setpoints schreiben' },
        ], (v) => { gc.exportLimitRunMode = (v === 'diagnostic') ? 'diagnostic' : 'active'; }));
        basic.appendChild(mkNum('Lokale Sicherheitsobergrenze Einspeisung', 'gc_zeroExportMaxExportW', Number(gc.zeroExportMaxExportW || 0) || 0, (n) => {
          const previousMaxW = Math.max(0, Math.round(Number(gc.zeroExportMaxExportW) || 0));
          const previousFallbackW = Math.max(0, Math.round(Number(gc.fallbackExportPowerW) || 0));
          gc.exportLimitMaxFeedInW = gc.zeroExportMaxExportW = Math.max(0, Math.round(n));
          gc.fallbackExportPowerW = previousFallbackW === previousMaxW
            ? gc.zeroExportMaxExportW
            : Math.min(gc.zeroExportMaxExportW, previousFallbackW);
        }, 'W', '0 = echte Nulleinspeisung; ein externer Regler darf diesen Wert nur verschärfen'));
        setup.appendChild(mkHint('Für Nulleinspeisung: Einspeisegrenze 0 W. Zunächst Diagnose/Testmodus wählen und speichern. Dieser Modus berechnet nur; er begrenzt den Wechselrichter nicht. Nach Prüfung von Messrichtung und Zuordnung Installateurfreigabe erteilen, unter kontrollierten Bedingungen Aktiv wählen und speichern. Erst dann die tatsächliche WR-Reaktion prüfen.'));
      }
      // WR-Zuordnung bleibt auch vor der Aktivierung sichtbar und vorkonfigurierbar.
      zeroPvEl = mkZeroSection(zeroEl, '2 · PV-Wechselrichter zuordnen', 'gc_zero_inverters');
      zeroPvEl.appendChild(mkHint('Je Wechselrichter Name, Bezugsleistung und mindestens einen passenden Schreibdatenpunkt angeben. PV-Istleistung (Lesen) und PV-Leistungsbegrenzung (Schreiben) sind verschiedene Datenpunkte.'));
      if (gc.zeroExportEnabled) {
        const advanced = mkZeroSection(zeroEl, '3 · Regelung, PV-Nutzung und Taktschutz', 'gc_zero_tuning', true);
        const advancedFields = mkZeroFields(advanced);
        advancedFields.appendChild(mkNum('Rückfallgrenze bei Reglerausfall', 'gc_fallbackExportPowerW', Number(gc.fallbackExportPowerW ?? gc.zeroExportMaxExportW) || 0, (n) => { gc.fallbackExportPowerW = Math.min(gc.zeroExportMaxExportW, Math.max(0, Math.round(n))); }, 'W', 'gilt beim Fail-Safe „Rückfallgrenze aus Netzlimits“'));
        advancedFields.appendChild(mkNum('Ziel‑Netzbezug / Bias', 'gc_zeroExportBiasW', Number(gc.zeroExportBiasW ?? 80), (n) => { gc.zeroExportBiasW = Math.max(0, Math.round(n)); }, 'W', 'Standard 80 W'));
        advancedFields.appendChild(mkNum('Regeltoleranz (Deadband)', 'gc_zeroExportDeadbandW', Number(gc.zeroExportDeadbandW ?? 50), (n) => { gc.zeroExportDeadbandW = Math.max(0, Math.round(n)); }, 'W', 'Standard 50 W'));
        advanced.appendChild(mkHint('Ziel-Netzbezug: kleiner gewünschter Netzbezug als Reserve (Standard 80 W). Regeltoleranz: Bereich ohne Nachkorrektur (Standard 50 W). Vorhandene Werte bleiben erhalten. Die Rückfallgrenze betrifft nur die optionale externe Reglerführung und darf die lokale Einspeisegrenze nicht erhöhen.'));
        const probeField = mkNum('Maximale zusätzliche PV-Prüflast', 'gc_zeroExportProbeMaxW', gc.zeroExportProbeMaxW, (n) => {
          gc.zeroExportProbeMaxW = Math.max(0, Math.min(50000, Math.round(n)));
        }, 'W', '0 = zusätzliche Teststarts aus; Standard 4200');
        const probeInput = probeField.querySelector('input');
        if (probeInput) { probeInput.min = '0'; probeInput.max = '50000'; probeInput.step = '100'; }
        advancedFields.appendChild(probeField);
        for (const [key, label, unit, min, max] of [
          ['zeroExportPvHoldMaxW', 'PV-Laden: gemeinsame Netzüberbrückung', 'W', 0, 2000],
          ['zeroExportPvHoldSec', 'PV-Laden: maximale Überbrückungsdauer', 's', 0, 120],
          ['zeroExportPvRestartSec', 'PV-Laden: Pause nach Ladestopp', 's', 60, 3600],
        ]) {
          const field = mkNum(label, 'gc_' + key, gc[key], (n) => { gc[key] = Math.max(min, Math.min(max, n)); }, unit, '');
          const input = field.querySelector('input');
          if (input) { input.min = String(min); input.max = String(max); input.step = '1'; }
          advancedFields.appendChild(field);
        }
        advanced.appendChild(mkHint('Taktschutz bei Nulleinspeisung: Bereits laufende PV-Ladepunkte dürfen kurze Einbrüche gemeinsam mit maximal 600 W Netzleistung für höchstens 45 s überbrücken (Standardwerte). Dieser Anteil zählt nicht als PV. 0 W oder 0 s schaltet die Überbrückung aus. Nach einem Ladestopp gilt standardmäßig eine Wiederanlaufsperre von 180 s; Schutzgrenzen und fehlende Messwerte wirken sofort.'));
        advanced.appendChild(mkHint('Bei aktiver, freigegebener Nulleinspeisung mit 0 W koordiniert EOS die PV-Nutzung zentral: freigegebene Ladepunkte, Heizstäbe und Speicher verwenden ein gemeinsames Leistungsbudget. Ein strengeres wirksames Netzbetreiberlimit bleibt maßgeblich. Ausgeschaltete, manuelle oder nicht geeignete Verbraucher werden dadurch nicht automatisch aktiviert.'));
        advanced.appendChild(mkHint('Begrenzte Prüflasten können kurzzeitig Netzstrom oder Speicherenergie benötigen. Die zentrale Prüfung wartet höchstens 20 s auf eine Lastreaktion und beobachtet danach bis zu 3 s die PV-Nachregelung; höchstens 20 Wh Prüfenergie sind zulässig. 0 W Prüflast sperrt nur zusätzliche Teststarts; nachgewiesener PV-Überschuss bleibt nutzbar. Liegt die technische Mindestleistung eines Ladepunkts (auch DC) über der Prüflastgrenze, wartet er auf ausreichend nachgewiesene PV-Leistung.'));
        advanced.appendChild(mkHint('Bei bereits bestätigter PV-Nutzung kann der konfigurierte Ziel-Netzbezug / Bias (Standard 80 W) als kleiner, gesondert erfasster Netzanteil bestehen bleiben, damit ein laufender Verbraucher seine technische Mindestleistung hält. Dieser Anteil ist Netzstrom und zählt nicht als PV-Überschuss.'));
        advanced.appendChild(mkHint('AC-Phasenumschaltung folgt der Ladepunkt-Zuordnung: nur mit unterstützter und eingerichteter 1-/3-Phasenumschaltung im Modus „Auto PV 1p/3p“. Mindestströme, Abschaltung vor dem Wechsel, Stabilitätszeiten und Sperrzeiten bleiben wirksam. DC-Ladepunkte behalten ihre Strom-/Leistungsgrenzen.'));
        advanced.appendChild(mkHint('Reihenfolge: 1 reale lokale Verbraucher, 2 freigegebene Ladepunkte und flexible Verbraucher, 3 verfügbaren Rest in den Speicher laden, 4 optional Mesh/Microgrid, 5 nur den danach verbleibenden PV‑Überschuss abregeln. PV‑Abregelung und Speicherentladung dürfen nicht gleichzeitig bestehen.'));
        advanced.appendChild(mkHint('Ist die Netzbetreiber-/EZA-Regler-App aktiv, in Betrieb genommen und vom Installateur freigegeben, hat ihre frische bindende Einspeisevorgabe Vorrang. Die lokale Sicherheitsobergrenze bleibt als maximale Obergrenze bestehen. Ohne diese vollständige Freigabe regelt EOS allein.'));
        const integration = mkZeroSection(zeroEl, 'Sonderintegration · optionale Command-Datenpunkte', 'gc_zero_commands', true);
        integration.appendChild(mkHint('Für direkt in EOS eingerichtete Ladepunkte, Heizstäbe und Speicher hier nichts eintragen. Nur für eine ausdrücklich eingerichtete externe Anbindung; diese JSON-Command-Datenpunkte ersetzen keine WR-Schreibzuordnung.'));
        const commands = mkZeroFields(integration);
        commands.appendChild(mkDpField('Speicher-Lade-Command-State optional', 'gc_zeroExportStorageChargeCommandStateId', gc.zeroExportStorageChargeCommandStateId || '', (v) => { gc.zeroExportStorageChargeCommandStateId = v; }, 'Neutraler JSON-Command-State, z.B. 0_userdata.0.nexowatt.zero.storage.command'));
        commands.appendChild(mkDpField('Ladepunkt-Command-State optional', 'gc_zeroExportChargingCommandStateId', gc.zeroExportChargingCommandStateId || '', (v) => { gc.zeroExportChargingCommandStateId = v; }, 'Neutraler JSON-Command-State für Wallbox/DC-Ladepunkte'));
        commands.appendChild(mkDpField('Flexible Verbraucher Command-State optional', 'gc_zeroExportFlexLoadCommandStateId', gc.zeroExportFlexLoadCommandStateId || '', (v) => { gc.zeroExportFlexLoadCommandStateId = v; }, 'Heizstab/Wärmepumpe/flexible Last – neutraler JSON-Command-State'));
        commands.appendChild(mkDpField('Mesh/Microgrid Command-State optional', 'gc_zeroExportMeshCommandStateId', gc.zeroExportMeshCommandStateId || '', (v) => { gc.zeroExportMeshCommandStateId = v; }, 'Optionaler Übergang in Mesh/Microgrid-Zielgruppen'));
        advanced.appendChild(mkHint('Die PV‑Vorgabe folgt dynamisch der lokalen Aufnahme inklusive zulässiger Speicherladung. Bei steigendem Verbrauch wird PV schnell freigegeben; bei sinkendem Verbrauch wird nur der nicht nutzbare Rest abgeregelt.'));
        advanced.appendChild(mkHint('Neue Anlagen zuerst im Diagnose/Testmodus prüfen. Erst nach plausibler NVP‑Richtung und bestätigter WR‑Schreibfähigkeit auf „Aktiv“ stellen.'));
        const status = mkZeroSection(zeroEl, '4 · Status und Inbetriebnahme', 'gc_zero_status');
        status.appendChild(mkHint('Anzeige der gespeicherten, laufenden Konfiguration. Änderungen erst speichern; nach Übernahme neu laden.'));
        renderExportGuardRuntimeDiagnostics(status);
      } else {
        setup.appendChild(mkHint('0‑Einspeisung/Einspeisebegrenzung ist deaktiviert. Die WR-Zuordnung kann bereits vorbereitet werden.'));
      }
      zeroLegacyEl = mkZeroSection(zeroEl, 'Bestehende Anlagen · Einzel-WR / Sammel-Datenpunkt', 'gc_zero_legacy', true);
      zeroEl.appendChild(mkHint('Führungsgröße ist der signierte NVP aus Zuordnung → Allgemein → Netzpunkt: Import + / Export −.'));
    }

    const curMode = gc.pvEvuEnabled && gc.zeroExportEnabled
      ? 'combined'
      : (gc.pvEvuEnabled ? 'evu' : (gc.zeroExportEnabled ? 'zero' : 'off'));

    // Card 2: Wechselrichter‑Gruppen (pro WR)
    if (pvEl || zeroPvEl) {
      const showEvuGroup = !!pvEl;
      const showZeroGroup = !!zeroPvEl;

      /**
       * Code-Teil: Arrow-Funktion `mkTitle`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkTitle
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkTitle = (text) => {
        const h = document.createElement('div');
        h.className = 'nw-config-card__divider';
        h.textContent = text;
        return h;
      };

      /**
       * Code-Teil: Arrow-Funktion `mkBadge`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkBadge
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkBadge = (label, ok) => {
        const b = document.createElement('span');
        b.className = 'nw-config-badge ' + (ok ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        b.textContent = label;
        return b;
      };

      /**
       * Code-Teil: Arrow-Funktion `mkInvItem`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkInvItem
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkInvItem = (list, idx, groupPrefix, groupLabel) => {
        const inv = list[idx];

        const row = document.createElement('div');
        row.className = 'nw-flow-slot nw-inv-item';

        const meta = document.createElement('div');
        meta.className = 'nw-flow-slot__meta';

        const t = document.createElement('div');
        t.className = 'nw-flow-slot__title';
        t.textContent = inv.name ? inv.name : `Wechselrichter ${idx + 1}`;

        const k = document.createElement('div');
        k.className = 'nw-flow-slot__key';
        const kwpTxt = (Number.isFinite(inv.kwp) && inv.kwp > 0) ? `${inv.kwp} kW Bezugsleistung` : 'Bezugsleistung fehlt';
        k.textContent = `${groupLabel} · ${kwpTxt}`;

        meta.appendChild(t);
        meta.appendChild(k);

        const summary = document.createElement('div');
        summary.className = 'nw-inv-summary';

        // Name + kWp bleiben in der Übersicht – die langen DP-Felder liegen in „Details“.
        const nameInput = document.createElement('input');
        nameInput.id = `gc_${groupPrefix}_inv_${idx}_name`;
        nameInput.className = 'nw-config-input nw-inv-name';
        nameInput.type = 'text';
        nameInput.placeholder = 'Name';
        nameInput.setAttribute('aria-label', 'Name des Wechselrichters');
        nameInput.value = inv.name || '';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an nameInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        nameInput.addEventListener('change', () => {
          inv.name = String(nameInput.value || '').trim();
          t.textContent = inv.name ? inv.name : `Wechselrichter ${idx + 1}`;
          scheduleValidation(200);
        });

        const kwpInput = document.createElement('input');
        kwpInput.id = `gc_${groupPrefix}_inv_${idx}_kwp`;
        kwpInput.className = 'nw-config-input nw-inv-kwp';
        kwpInput.type = 'number';
        kwpInput.min = '0';
        kwpInput.step = '0.01';
        kwpInput.placeholder = 'Bezugsleistung kW';
        kwpInput.setAttribute('aria-label', 'Bezugsleistung des Wechselrichters in kW');
        kwpInput.title = 'Positive Bezugsleistung in kW; für die Verteilung und als 100-%-Basis des Prozent-Sollwerts.';
        kwpInput.value = (inv.kwp === undefined || inv.kwp === null) ? '' : String(inv.kwp);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an kwpInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        kwpInput.addEventListener('change', () => {
          const n = Number(String(kwpInput.value || '').replace(',', '.'));
          inv.kwp = (Number.isFinite(n) && n >= 0) ? n : 0;
          const kwpTxt2 = (Number.isFinite(inv.kwp) && inv.kwp > 0) ? `${inv.kwp} kW Bezugsleistung` : 'Bezugsleistung fehlt';
          k.textContent = `${groupLabel} · ${kwpTxt2}`;
          scheduleValidation(200);
        });

        const chips = document.createElement('div');
        chips.className = 'nw-inv-chips';
        const chipFeed = mkBadge('Einsp. W', !!inv.feedInLimitWId);
        const chipPvW = mkBadge('PV W', !!inv.pvLimitWId);
        const chipPvPct = mkBadge('PV %', !!inv.pvLimitPctId);
        const chipPvRead = mkBadge('PV Ist', !!inv.pvPowerReadId);
        chips.appendChild(chipFeed);
        chips.appendChild(chipPvW);
        chips.appendChild(chipPvPct);
        chips.appendChild(chipPvRead);

        const editBtn = document.createElement('button');
        editBtn.className = 'nw-config-mini-btn';
        editBtn.type = 'button';
        editBtn.textContent = 'Details';

        const delBtn = document.createElement('button');
        delBtn.className = 'nw-config-mini-btn';
        delBtn.type = 'button';
        delBtn.textContent = 'Entfernen';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an delBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        delBtn.addEventListener('click', () => {
          list.splice(idx, 1);
          buildGridConstraintsUI();
          scheduleValidation(200);
        });

        const advanced = document.createElement('div');
        advanced.className = 'nw-flow-slot__advanced' + (groupPrefix === 'zero' ? ' is-open' : '');
        editBtn.textContent = groupPrefix === 'zero' ? 'Weniger' : 'Datenpunkte zuordnen';
        editBtn.setAttribute('aria-expanded', groupPrefix === 'zero' ? 'true' : 'false');

        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an editBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        editBtn.addEventListener('click', () => {
          const open = advanced.classList.toggle('is-open');
          editBtn.textContent = open ? 'Weniger' : 'Datenpunkte zuordnen';
          editBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        const advGrid = document.createElement('div');
        advGrid.className = 'nw-flow-ctrl-grid';
        advGrid.appendChild(mkDpField('PV-Istleistung (W) · Lesen', `gc_${groupPrefix}_inv_${idx}_pvRead`, inv.pvPowerReadId || '', (v) => {
          inv.pvPowerReadId = v;
          chipPvRead.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }, 'Optional: Für PV‑Gesamtleistung (Energiefluss), wenn kein globaler PV‑Datenpunkt gemappt ist.'));
        advGrid.appendChild(mkDpField('Netzeinspeisegrenze (W) · Schreiben', `gc_${groupPrefix}_inv_${idx}_feedIn`, inv.feedInLimitWId || '', (v) => {
          inv.feedInLimitWId = v;
          chipFeed.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }));
        advGrid.appendChild(mkDpField('PV-Erzeugungsgrenze (W) · Schreiben', `gc_${groupPrefix}_inv_${idx}_limitW`, inv.pvLimitWId || '', (v) => {
          inv.pvLimitWId = v;
          chipPvW.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }));
        advGrid.appendChild(mkDpField('PV-Erzeugungsgrenze (%) · Schreiben', `gc_${groupPrefix}_inv_${idx}_limitPct`, inv.pvLimitPctId || '', (v) => {
          inv.pvLimitPctId = v;
          chipPvPct.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }));

        const hint = document.createElement('div');
        hint.className = 'nw-config-field-hint';
        hint.style.marginTop = '6px';
        hint.textContent = 'Bezugsleistung > 0 kW: EOS verteilt die Sollleistung im Verhältnis dieser Werte; bei Prozentregelung muss sie der 100-%-Basis des WR entsprechen. W begrenzt die PV-Erzeugung, % erwartet 0 bis 100. Netzeinspeisegrenze begrenzt nur die Abgabe ins Netz (bei Nulleinspeisung 0 W) und ist kein PV-Erzeugungssollwert. Für die PV-Erzeugung normalerweise entweder W oder % wählen. Nur tatsächlich unterstützte numerische Schreibdatenpunkte zuordnen; alle zugeordneten Ausgänge werden bedient. Dieselbe ID nicht für verschiedene Sollwertarten verwenden. PV-Istleistung wird für die PV-Summe genutzt, wenn kein globaler PV-Messpunkt zugeordnet ist.';

        advanced.appendChild(advGrid);
        advanced.appendChild(hint);

        summary.appendChild(nameInput);
        summary.appendChild(kwpInput);
        summary.appendChild(chips);
        summary.appendChild(editBtn);
        summary.appendChild(delBtn);

        row.appendChild(meta);
        row.appendChild(summary);
        row.appendChild(advanced);

        return row;
      };

      /**
       * Code-Teil: Arrow-Funktion `mkInvGroup`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkInvGroup
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkInvGroup = (target, titleText, list, groupPrefix, groupLabel, inactiveHint) => {
        target.appendChild(mkTitle(titleText));
        if (inactiveHint) target.appendChild(mkHint(inactiveHint));

        const listWrap = document.createElement('div');
        listWrap.className = 'nw-inv-list';

        if (!list.length) {
          const empty = document.createElement('div');
          empty.className = 'nw-config-empty';
          empty.textContent = 'Keine Wechselrichter konfiguriert.';
          listWrap.appendChild(empty);
        } else {
          for (let i = 0; i < list.length; i++) {
            listWrap.appendChild(mkInvItem(list, i, groupPrefix, groupLabel));
          }
        }

        target.appendChild(listWrap);

        const add = document.createElement('button');
        add.className = 'nw-config-mini-btn';
        add.type = 'button';
        add.textContent = 'Wechselrichter hinzufügen';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an add. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        add.addEventListener('click', () => {
          list.push({ name: '', kwp: 0, pvPowerReadId: '', feedInLimitWId: '', pvLimitWId: '', pvLimitPctId: '' });
          buildGridConstraintsUI();
          scheduleValidation(200);
        });
        target.appendChild(add);
      };

      if (showEvuGroup) {
        mkInvGroup(
          pvEl,
          'Gruppe 1: EVU‑Abregelung (Relais‑Stufen)',
          gc.pvCurtailInvertersEvu,
          'evu',
          'EVU',
          (curMode === 'off') ? 'Modus ist aktuell AUS – du kannst die Gruppe vorkonfigurieren.' : null
        );
      }

      if (showZeroGroup) {
        mkInvGroup(
          zeroPvEl,
          'Wechselrichter für Einspeisebegrenzung / 0‑Einspeisung',
          gc.pvCurtailInvertersZero,
          'zero',
          'EXPORT',
          (curMode === 'off') ? 'Modus ist aktuell AUS – du kannst die Gruppe vorkonfigurieren.' : null
        );
      }

      // Legacy-Konfiguration gehört zur gleichen WR-Regelung; kein zweiter Schreibpfad.
      const legacyTarget = zeroLegacyEl || pvEl;
      if (legacyTarget) {
        legacyTarget.appendChild(mkTitle('Fallback (Legacy): Einzel‑WR / Sammel‑DP'));
        legacyTarget.appendChild(mkHint('Wenn keine Wechselrichter‑Gruppen konfiguriert sind, nutzt die Regelung folgende Datenpunkte. Für neue Setups bitte bevorzugt die Gruppen oben verwenden.'));

        // Der Regler liest diese flachen Felder. Kein separates pvCurtailLegacy-
        // Objekt anlegen: Darin gespeicherte Werte würden die Hardware nie erreichen.
        const legacyWrap = document.createElement('div');
        legacyWrap.className = 'nw-flow-ctrl-grid';

        legacyWrap.appendChild(mkSelect('Begrenzungs‑Modus', 'gc_legacy_mode', gc.pvCurtailMode || 'auto', [
          { v: 'auto', t: 'Auto (beste verfügbare Methode)' },
          { v: 'feedInLimitW', t: 'Einspeise‑Limit (W)' },
          { v: 'pvLimitW', t: 'PV‑Limit (W)' },
          { v: 'pvLimitPct', t: 'PV‑Limit (%)' }
        ], (v) => { gc.pvCurtailMode = v; scheduleValidation(200); }));

        legacyWrap.appendChild(mkNum('WR-Bezugsleistung (100-%-Basis)', 'gc_legacy_ratedPowerW', Number(gc.pvRatedPowerW || 0), (n) => { gc.pvRatedPowerW = Math.max(0, Math.round(n)); scheduleValidation(200); }, 'W', 'z. B. 10000'));

        legacyWrap.appendChild(mkDpField('Einspeise‑Limit (W) (Write) (optional)', 'gc_legacy_feedIn', gc.pvFeedInLimitWId || '', (v) => { gc.pvFeedInLimitWId = v; scheduleValidation(200); }));
        legacyWrap.appendChild(mkDpField('PV‑Limit (W) (Write) (optional)', 'gc_legacy_pvW', gc.pvLimitWId || '', (v) => { gc.pvLimitWId = v; scheduleValidation(200); }));
        legacyWrap.appendChild(mkDpField('PV‑Limit (%) (Write) (optional)', 'gc_legacy_pvPct', gc.pvLimitPctId || '', (v) => { gc.pvLimitPctId = v; scheduleValidation(200); }));

        legacyTarget.appendChild(legacyWrap);
        legacyTarget.appendChild(mkHint('Nur verwenden, wenn die entsprechende WR-Gruppe leer ist. Auto wählt zuerst die Netzeinspeisegrenze, sonst PV-W, sonst PV-%. Für PV-W oder PV-% ist eine positive Bezugsleistung in W erforderlich. Vorhandene Einzel-WR-Zuordnungen bleiben erhalten.'));
      }
    }
  }


  const PARA14A_TYPES = [
    { v: 'heatPump', t: 'Wärmepumpe' },
    { v: 'heatingRod', t: 'Heizstab' },
    { v: 'airCondition', t: 'Klima' },
    { v: 'storage', t: 'Speicher (Laden)' },
    { v: 'custom', t: 'Sonstiger Verbraucher' }
  ];

  const PARA14A_CTL = [
    { v: 'limitW', t: 'Leistung (W) begrenzen' },
    { v: 'onOff', t: 'Ein/Aus (Enable)' }
  ];
  /**
   * Code-Teil: _ensurePara14aCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensurePara14aCfg() {
    currentConfig = currentConfig || {};
    currentConfig.installerConfig = (currentConfig.installerConfig && typeof currentConfig.installerConfig === 'object')
      ? currentConfig.installerConfig
      : {};
    const ic = currentConfig.installerConfig;

    const modeRaw = String(ic.para14aMode || '').trim().toLowerCase();
    ic.para14aMode = (modeRaw === 'direct') ? 'direct' : 'ems';

    const min = Number(ic.para14aMinPerDeviceW);
    ic.para14aMinPerDeviceW = Number.isFinite(min) ? Math.max(4200, Math.round(min)) : 4200;
    const signalMaxAgeSec = Number(ic.para14aSignalMaxAgeSec);
    ic.para14aSignalMaxAgeSec = (Number.isFinite(signalMaxAgeSec) && signalMaxAgeSec >= 1) ? Math.min(300, Math.round(signalMaxAgeSec)) : 30;
    const stalePolicy = String(ic.para14aStalePolicy || 'local-pmin').trim().toLowerCase();
    ic.para14aStalePolicy = stalePolicy === 'release'
      ? 'local-pmin'
      : (['local-pmin', 'hold-active', 'force-active'].includes(stalePolicy) ? stalePolicy : 'local-pmin');
    ic.para14aLegacyDirectWritesEnabled = ic.para14aLegacyDirectWritesEnabled === true;

    ic.para14aActiveId = (typeof ic.para14aActiveId === 'string') ? ic.para14aActiveId.trim() : '';
    ic.para14aEmsSetpointWId = (typeof ic.para14aEmsSetpointWId === 'string') ? ic.para14aEmsSetpointWId.trim() : '';

    const list = Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : [];
    const out = [];
    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      const typeRaw = String(it.type || 'custom').trim();
      const type = PARA14A_TYPES.some(x => x.v === typeRaw) ? typeRaw : 'custom';

      const ctlRaw = String(it.controlType || it.control || '').trim().toLowerCase();
      const controlType = (ctlRaw === 'onoff' || ctlRaw === 'switch' || ctlRaw === 'enable') ? 'onOff' : 'limitW';

      const maxW = Number(it.maxPowerW ?? it.installedPowerW);
      const prio = Number(it.priority);

      out.push({
        key: String(it.key || '').trim(),
        enabled: (typeof it.enabled === 'boolean') ? !!it.enabled : true,
        name: String(it.name || '').trim(),
        type,
        controlType,
        maxPowerW: Number.isFinite(maxW) && maxW >= 0 ? Math.round(maxW) : 0,
        installedPowerW: Number.isFinite(maxW) && maxW >= 0 ? Math.round(maxW) : 0,
        priority: Number.isFinite(prio) && prio >= 0 ? Math.round(prio) : 0,
        groupId: String(it.groupId || it.para14aGroupId || it.storageConstructId || '').trim(),
        source: String(it.source || (it.automatic === true ? 'automatic-migration' : 'manual')).trim(),
        automatic: it.automatic === true,
        setPowerWId: String(it.setPowerWId || it.setpointWId || '').trim(),
        enableId: String(it.enableId || '').trim(),
      });
    }

    ic.para14aConsumers = out;
    return ic;
  }
  /**
   * Code-Teil: _mkDpWrap
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _mkDpWrap(id, value, placeholder, onChange) {
    const dpWrap = document.createElement('div');
    dpWrap.className = 'nw-config-dp-input-wrapper';

    const input = document.createElement('input');
    input.className = 'nw-config-input nw-config-dp-input';
    input.type = 'text';
    input.id = id;
    input.value = value ? String(value) : '';
    input.dataset.dpInput = '1';
    input.placeholder = placeholder || 'optional';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    input.addEventListener('change', () => {
      onChange(String(input.value || '').trim());
      scheduleValidation(200);
    });

    const b = document.createElement('button');
    b.className = 'nw-config-dp-button';
    b.type = 'button';
    b.setAttribute('data-browse', id);
    b.textContent = 'Auswählen…';

    const badge = document.createElement('span');
    badge.className = 'nw-config-badge nw-config-badge--idle';
    badge.id = 'val_' + id;
    badge.textContent = '—';

    dpWrap.appendChild(input);
    dpWrap.appendChild(b);
    dpWrap.appendChild(badge);
    return dpWrap;
  }
  /**
   * Code-Teil: rebuildPara14aConsumersUI
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function rebuildPara14aConsumersUI() {
    if (!els.para14aConsumers) return;
    const ic = _ensurePara14aCfg();
    const list = Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : [];
    const visibleRows = list
      .map((consumer, configIndex) => ({ consumer, configIndex }))
      .filter(({ consumer }) => consumer && consumer.automatic !== true);
    els.para14aConsumers.innerHTML = '';

    if (!visibleRows.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine zusätzlichen manuellen Verbraucher konfiguriert. Zugeordnete Ladepunkte, aktive Wärme-/Klimageräte, Heizstäbe und Speicher mit erlaubtem Netzladen werden automatisch eingebunden.';
      els.para14aConsumers.appendChild(empty);
      return;
    }

    visibleRows.forEach(({ consumer: c, configIndex }, visibleIndex) => {
      const idx = visibleIndex + 1;

      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = c.name ? c.name : `Verbraucher ${idx}`;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      const typeLabel = (PARA14A_TYPES.find(x => x.v === c.type) || PARA14A_TYPES[3]).t;
      const ctlLabel = (PARA14A_CTL.find(x => x.v === c.controlType) || PARA14A_CTL[0]).t;
      sub.textContent = `${typeLabel} · ${ctlLabel}`;

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      // Enabled
      const en = document.createElement('input');
      en.type = 'checkbox';
      en.id = `p14a_cons_${idx}_en`;
      en.checked = !!c.enabled;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an en. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      en.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].enabled = !!en.checked;
      });
      const enLbl = document.createElement('label');
      enLbl.htmlFor = en.id;
      enLbl.style.fontSize = '0.82rem';
      enLbl.style.color = '#e5e7eb';
      enLbl.style.display = 'inline-flex';
      enLbl.style.alignItems = 'center';
      enLbl.style.gap = '6px';
      enLbl.appendChild(en);
      enLbl.appendChild(document.createTextNode('Aktiv'));
      right.appendChild(enLbl);

      // Name
      const name = document.createElement('input');
      name.className = 'nw-config-input';
      name.type = 'text';
      name.style.width = '180px';
      name.placeholder = 'Name';
      name.value = String(c.name || '');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an name. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      name.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].name = String(name.value || '').trim();
        // refresh labels
        rebuildPara14aConsumersUI();
      });
      right.appendChild(name);

      // Type
      const typeSel = document.createElement('select');
      typeSel.className = 'nw-config-input';
      typeSel.style.width = '165px';
      for (const o of PARA14A_TYPES) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        typeSel.appendChild(op);
      }
      typeSel.value = String(c.type || 'custom');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an typeSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      typeSel.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].type = String(typeSel.value || 'custom');
      });
      right.appendChild(typeSel);

      // Control type
      const ctlSel = document.createElement('select');
      ctlSel.className = 'nw-config-input';
      ctlSel.style.width = '200px';
      for (const o of PARA14A_CTL) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        ctlSel.appendChild(op);
      }
      ctlSel.value = String(c.controlType || 'limitW');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an ctlSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      ctlSel.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].controlType = String(ctlSel.value || 'limitW');
      });
      right.appendChild(ctlSel);

      // max power
      const maxW = document.createElement('input');
      maxW.className = 'nw-config-input';
      maxW.type = 'number';
      maxW.style.width = '120px';
      maxW.placeholder = 'Max W';
      maxW.value = (c.maxPowerW !== undefined && c.maxPowerW !== null) ? String(c.maxPowerW) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxW. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxW.addEventListener('change', () => {
        const n = Number(maxW.value);
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) {
          const normalized = (Number.isFinite(n) && n >= 0) ? Math.round(n) : 0;
          ic2.para14aConsumers[configIndex].maxPowerW = normalized;
          ic2.para14aConsumers[configIndex].installedPowerW = normalized;
        }
      });
      right.appendChild(maxW);

      // priority
      const pr = document.createElement('input');
      pr.className = 'nw-config-input';
      pr.type = 'number';
      pr.style.width = '110px';
      pr.placeholder = 'Prio';
      pr.value = (c.priority !== undefined && c.priority !== null) ? String(c.priority) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an pr. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      pr.addEventListener('change', () => {
        const n = Number(pr.value);
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].priority = (Number.isFinite(n) && n >= 0) ? Math.round(n) : 0;
      });
      right.appendChild(pr);

      // DP fields
      const sp = _mkDpWrap(`p14a_cons_${idx}_sp`, c.setPowerWId, 'Setpoint W (Write)', (v) => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].setPowerWId = v;
      });
      sp.style.minWidth = '360px';
      right.appendChild(sp);
      const enDp = _mkDpWrap(`p14a_cons_${idx}_enDp`, c.enableId, 'Enable (Write)', (v) => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[configIndex]) ic2.para14aConsumers[configIndex].enableId = v;
      });
      enDp.style.minWidth = '360px';
      right.appendChild(enDp);

      // remove
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'nw-config-btn nw-config-btn--ghost';
      rm.textContent = 'Entfernen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an rm. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rm.addEventListener('click', () => {
        const ic2 = _ensurePara14aCfg();
        ic2.para14aConsumers.splice(configIndex, 1);
        rebuildPara14aConsumersUI();
      });
      right.appendChild(rm);

      row.appendChild(left);
      row.appendChild(right);
      els.para14aConsumers.appendChild(row);
    });
  }
  /**
   * Code-Teil: buildPara14aUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildPara14aUI() {
    // Panel can be absent in older builds
    if (!els.para14aMode && !els.para14aConsumers) return;

    const ic = _ensurePara14aCfg();

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = apps && apps.para14a ? apps.para14a : { installed: false, enabled: false };
    const installed = !!a.installed;

    // disable/enable inputs based on installed
    const disable = !installed;
    /**
     * Code-Teil: Arrow-Funktion `lock`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: lock
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const lock = (el) => { if (el) el.disabled = disable; };

    lock(els.para14aMode);
    lock(els.para14aMinPerDeviceW);
    lock(els.para14aSignalMaxAgeSec);
    lock(els.para14aStalePolicy);
    lock(els.para14aLegacyDirectWritesEnabled);
    lock(els.para14aActiveId);
    lock(els.para14aEmsSetpointWId);
    lock(els.addPara14aConsumer);

    if (els.para14aMode) els.para14aMode.value = String(ic.para14aMode || 'ems');
    if (els.para14aMinPerDeviceW) els.para14aMinPerDeviceW.value = String(Number.isFinite(Number(ic.para14aMinPerDeviceW)) ? Math.round(Number(ic.para14aMinPerDeviceW)) : 4200);
    if (els.para14aSignalMaxAgeSec) els.para14aSignalMaxAgeSec.value = String(ic.para14aSignalMaxAgeSec || 30);
    if (els.para14aStalePolicy) els.para14aStalePolicy.value = String(ic.para14aStalePolicy || 'local-pmin');
    if (els.para14aLegacyDirectWritesEnabled) els.para14aLegacyDirectWritesEnabled.checked = ic.para14aLegacyDirectWritesEnabled === true;
    if (els.para14aActiveId) els.para14aActiveId.value = String(ic.para14aActiveId || '');
    if (els.para14aEmsSetpointWId) els.para14aEmsSetpointWId.value = String(ic.para14aEmsSetpointWId || '');

    if (!installed) {
      if (els.para14aConsumers) {
        els.para14aConsumers.innerHTML = '';
        const msg = document.createElement('div');
        msg.className = 'nw-help';
        msg.textContent = 'Die App „§14a Steuerung“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
        els.para14aConsumers.appendChild(msg);
      }
      return;
    }

    rebuildPara14aConsumersUI();
  }
  /**
   * Code-Teil: getStorageMode
   * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getStorageMode() {
    const v = (els.storageControlMode && els.storageControlMode.value) ? String(els.storageControlMode.value) : 'targetPower';
    return (['targetPower','limits','enableFlags'].includes(v)) ? v : 'targetPower';
  }

  /**
   * Code-Teil: getStorageCoupling
   * Zweck: Ermittelt den Einzel-Speicher-Typ fuer die Speicherregelungs-App.
   * Zusammenhang: AC-Speicher werden wie getrennte Batterie-Wechselrichter bewertet;
   * DC-/Hybrid-Speicher koennen PV und Batterie an einem Ausgang mischen und bekommen
   * deshalb einen eigenen PV-Messdatenpunkt fuer saubere Zuordnung und Diagnose.
   */
  function getStorageCoupling() {
    const v = (els.storageCouplingMode && els.storageCouplingMode.value) ? String(els.storageCouplingMode.value).trim().toLowerCase() : 'ac';
    return v === 'dc' ? 'dc' : 'ac';
  }

  /**
   * Code-Teil: normalizeStorageVendorProfile
   * Zweck: Normalisiert die herstellerspezifische Speicher-Auswahl auf stabile Config-Werte.
   * Zusammenhang: Herstellerprofile duerfen die Grundlogik nicht ersetzen, sondern nur
   * den Schreibpfad und Sonderguards fuer Hybrid-/Gateway-Speicher anpassen.
   */
  function normalizeStorageVendorProfile(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'fenecon' || s === 'openems' || s === 'fems' || s === 'fenecon-openems') return 'fenecon-openems';
    if (s === 'sungrow' || s === 'sungrow-ess' || s === 'sungrow-hybrid') return 'sungrow-hybrid';
    if (s === 'e3dc' || s === 'e3/dc' || s === 'e3dc-rscp' || s === 'e3dc-rscp-iobroker') return 'e3dc-rscp';
    return 'generic';
  }


  function normalizeFeneconControlMode(v) {
    const s = String(v || '').trim().toLowerCase();
    if (['fems-grid', 'fems', 'fems-nvp', 'native', 'native-grid', 'grid-target'].includes(s)) return 'fems-grid';
    if (['direct-ess', 'direct', 'ess', 'set-active-power', 'direct-power'].includes(s)) return 'direct-ess';
    return 'auto';
  }

  function isFeneconGridTargetId(value) {
    const id = String(value || '').trim().replace(/\s+/g, '').toLowerCase();
    if (!id) return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.(?:gridsetpointw|napsetpointw)(?:$|\.)/.test(id)
      || /setgridactivepower/.test(id)
      || /ctrlbalancing/.test(id);
  }

  function isFeneconDirectEssSetpointId(value) {
    const id = String(value || '').trim().replace(/\s+/g, '').toLowerCase();
    if (!id) return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.powersetpointw(?:$|\.)/.test(id)
      || /setactivepowerequals/.test(id)
      || /(?:^|[._/-])706(?:$|[._/-])/.test(id);
  }

  function isFeneconGridMeasurementId(value) {
    const id = String(value || '').trim().replace(/\s+/g, '').toLowerCase();
    if (!id || isFeneconGridTargetId(id)) return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
      || /(?:^|\.)r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
      || /(?:^|[._/-])(?:gridpower|powergrid|nvppower|nappower)(?:$|[._/-])/.test(id);
  }

  function isFeneconHybridUi(profile, coupling) {
    return normalizeStorageVendorProfile(profile) === 'fenecon-openems' && String(coupling || '').trim().toLowerCase() === 'dc';
  }

  /**
   * Code-Teil: getStorageVendorProfile
   * Zweck: Liest das ausgewaehlte Herstellerprofil im Speicher-Reiter.
   * Zusammenhang: Das Profil aktiviert FENECON-Setpoint-Keepalive oder Sungrow-NVP-Assist;
   * Generic bleibt die unveraenderte Eigenverbrauchsoptimierung.
   */
  function getStorageVendorProfile() {
    const v = (els.storageVendorProfile && els.storageVendorProfile.value) ? String(els.storageVendorProfile.value) : 'generic';
    return normalizeStorageVendorProfile(v);
  }

  /**
   * Code-Teil: updateStorageCouplingUi
   * Zweck: Blendet DC-/Hybrid-Hinweise und die passenden Speicher-DP-Felder ein.
   * Zusammenhang: Der Reiter „Speicher“ bleibt dadurch fuer Einzelanlagen uebersichtlich;
   * DC-Sonderfelder erscheinen nur, wenn dieser Speichertyp wirklich gewaehlt wurde.
   */
  function updateStorageCouplingUi() {
    const coupling = getStorageCoupling();
    if (els.storageDcPvHintRow) els.storageDcPvHintRow.style.display = (coupling === 'dc') ? '' : 'none';
  }

  /**
   * Code-Teil: updateStorageVendorProfileUi
   * Zweck: Zeigt nur die Optionen des aktiven Herstellerprofils.
   * Zusammenhang: FENECON/OpenEMS und Sungrow Hybrid nutzen unterschiedliche
   * Schreibstrategien und duerfen nicht ueber denselben Haken vermischt werden.
   */
  function updateStorageVendorProfileUi() {
    const profile = getStorageVendorProfile();
    const isFenecon = profile === 'fenecon-openems';
    if (els.storageFeneconOptionsRow) els.storageFeneconOptionsRow.style.display = isFenecon ? '' : 'none';
    let feneconMode = 'auto';
    if (els.storageFeneconControlMode) {
      els.storageFeneconControlMode.disabled = !isFenecon;
      const mode = String(els.storageFeneconControlMode.value || 'auto');
      if (!['auto', 'fems-grid', 'direct-ess'].includes(mode)) els.storageFeneconControlMode.value = 'auto';
      feneconMode = String(els.storageFeneconControlMode.value || 'auto');
    }
    const feneconAutoHybrid = isFeneconHybridUi(profile, getStorageCoupling()) && feneconMode === 'auto';
    if (els.storageFeneconHybridAutoSettings) els.storageFeneconHybridAutoSettings.style.display = feneconAutoHybrid ? 'grid' : 'none';
    if (els.storageFeneconDayNoWrite) {
      // Legacy-Haken bleibt intern synchron, ist aber nicht mehr manuell
      // bedienbar: Im Auto-Modus entspricht er der FEMS-No-Write-Phase.
      els.storageFeneconDayNoWrite.checked = feneconAutoHybrid;
      els.storageFeneconDayNoWrite.disabled = true;
    }
    if (els.storageFeneconAssist) {
      els.storageFeneconAssist.checked = false;
      els.storageFeneconAssist.disabled = true;
    }
    if (els.storageFeneconAcMode) {
      els.storageFeneconAcMode.checked = isFenecon;
      els.storageFeneconAcMode.disabled = true;
    }
    if (els.storageSungrowOptionsRow) els.storageSungrowOptionsRow.style.display = (profile === 'sungrow-hybrid') ? '' : 'none';
    if (els.storageE3dcOptionsRow) els.storageE3dcOptionsRow.style.display = (profile === 'e3dc-rscp') ? '' : 'none';
  }
  /**
   * Code-Teil: rebuildStorageTable
   * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function rebuildStorageTable() {
    const mode = getStorageMode();
    const coupling = getStorageCoupling();
    const vendorProfile = getStorageVendorProfile();
    updateStorageCouplingUi();
    updateStorageVendorProfileUi();
    const fields = STORAGE_DP_FIELDS.filter(f => {
      if (Array.isArray(f.showForCoupling) && f.showForCoupling.length && !f.showForCoupling.includes(coupling)) return false;
      if (Array.isArray(f.showForVendor) && f.showForVendor.length && !f.showForVendor.includes(vendorProfile)) return false;
      if (!f.requiredModes || !f.requiredModes.length) return true;
      return f.requiredModes.includes(mode);
    });

    const storageDp = (currentConfig && currentConfig.storage && currentConfig.storage.datapoints) ? currentConfig.storage.datapoints : {};

    buildDpTable(
      els.storageTable,
      fields,
      (key) => storageDp[key],
      (key, val) => {
        currentConfig.storage = currentConfig.storage || {};
        currentConfig.storage.datapoints = currentConfig.storage.datapoints || {};
        currentConfig.storage.datapoints[key] = val;
      },
      { idPrefix: 'st_' }
    );
  }
  // 0.8.33: Master-Detail-Auswahl für die Speicherfarm.
  // Bei mehreren Speichern darf das App-Center nicht alle Detailformulare
  // untereinander rendern, weil der Installateur sonst sehr weit scrollen muss.
  // Links wird die Speicherliste angezeigt, rechts nur der ausgewählte Speicher.
  let _storageFarmSelectedIndex = 0;

  // ------------------------------
  // Speicherfarm (mehrere Speicher)
  // ------------------------------
  /**
   * Code-Teil: _ensureStorageFarmCfg
   * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureStorageFarmCfg() {
    currentConfig = currentConfig || {};
    currentConfig.storageFarm = (currentConfig.storageFarm && typeof currentConfig.storageFarm === 'object') ? currentConfig.storageFarm : {};
    const sf = currentConfig.storageFarm;

    const modeRaw = String(sf.mode || 'pool').trim().toLowerCase();
    sf.mode = (modeRaw === 'groups') ? 'groups' : 'pool';
    // Bestandsanlagen behalten beim Update ihr bisheriges Verhalten. Erst wenn
    // der Installateur den Haken aktiv entfernt, werden Tarif-/Reserve-/LSK-
    // Netzladepfade gesperrt; PV-/Eigenverbrauchsladen bleibt davon unberührt.
    sf.allowGridCharge = sf.allowGridCharge !== false;

    const sched = Number(sf.schedulerIntervalMs);
    sf.schedulerIntervalMs = Number.isFinite(sched) ? Math.max(250, Math.min(1000, Math.round(sched))) : 1000;

    // Die Farm besitzt eine eigene NVP-Abstimmung. Bei bestehenden Anlagen
    // werden fehlende Werte einmalig aus der bisherigen Einzel-Speicher-App
    // uebernommen, damit das Verhalten beim Update stabil bleibt.
    const singleStorageCfg = (currentConfig.storage && typeof currentConfig.storage === 'object') ? currentConfig.storage : {};
    const singleTargetRaw = singleStorageCfg.standaloneSelfTargetGridImportW !== undefined
      ? singleStorageCfg.standaloneSelfTargetGridImportW
      : singleStorageCfg.selfTargetGridImportW;
    const singleDeadbandRaw = singleStorageCfg.standaloneSelfImportThresholdW !== undefined
      ? singleStorageCfg.standaloneSelfImportThresholdW
      : singleStorageCfg.selfImportThresholdW;
    sf.selfTargetGridImportW = _clampInt(sf.selfTargetGridImportW, 0, 1000000, _clampInt(singleTargetRaw, 0, 1000000, 50));
    sf.selfImportThresholdW = _clampInt(sf.selfImportThresholdW, 0, 1000000, _clampInt(singleDeadbandRaw, 0, 1000000, 20));

    sf.storages = Array.isArray(sf.storages) ? sf.storages : [];
    sf.groups = Array.isArray(sf.groups) ? sf.groups : [];

    // Preserve all existing mappings so a downgrade can be reviewed and repaired.
    const storOut = [];
    for (let i = 0; i < sf.storages.length; i++) {
      const r = _normalizeRecoveredStorageFarmRow(sf.storages[i] || {}, i);
      storOut.push(r);
    }
    // If array is empty, keep it empty (no implicit storages)
    sf.storages = storOut;

    const maxGroups = 5;
    const grpOut = [];
    for (let i = 0; i < Math.min(maxGroups, sf.groups.length); i++) {
      const g = sf.groups[i] || {};
      const name = String(g.name || '').trim() || `Gruppe ${String.fromCharCode(65 + i)}`;
      grpOut.push({
        enabled: (g.enabled === false) ? false : true,
        name,
        socMin: (g.socMin !== undefined && g.socMin !== null && g.socMin !== '') ? Number(g.socMin) : '',
        socMax: (g.socMax !== undefined && g.socMax !== null && g.socMax !== '') ? Number(g.socMax) : '',
        priority: (g.priority !== undefined && g.priority !== null && g.priority !== '') ? Number(g.priority) : (100 + i),
      });
    }
    sf.groups = grpOut;

    return sf;
  }
  /**
   * Code-Teil: buildStorageFarmUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildStorageFarmUI() {
    if (!els.storageFarmStorages) return;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && typeof apps.storagefarm === 'object') ? apps.storagefarm : { installed: false, enabled: false };

    const sf = _ensureStorageFarmCfg();

    const maxStorages = _maxStorageCount();
    const licenseHint = document.getElementById('storageFarmLicenseLimit');
    if (licenseHint) {
      const label = _licenseEdition() === 'hems' ? 'Home' : (_licenseEdition() === 'eos' ? 'Pro' : 'Keine gültige Lizenz');
      licenseHint.textContent = `${label}: ${sf.storages.length} von maximal ${maxStorages} Speichersystemen konfiguriert.`
        + (sf.storages.length > maxStorages ? ' Lizenzgrenze überschritten: Zusätzliche Speicher sind für die Regelung gesperrt. Bitte Zuordnung vor dem Speichern anpassen.' : '');
      licenseHint.setAttribute('role', sf.storages.length > maxStorages ? 'alert' : 'status');
    }
    if (els.storageFarmAddStorage) {
      els.storageFarmAddStorage.disabled = !a.installed || sf.storages.length >= maxStorages;
      els.storageFarmAddStorage.title = `Maximal ${maxStorages} Speichersysteme in dieser Lizenz`;
    }

    // Clear containers
    els.storageFarmStorages.innerHTML = '';
    if (els.storageFarmGroups) els.storageFarmGroups.innerHTML = '';

    if (els.storageFarmAllowGridCharge) {
      els.storageFarmAllowGridCharge.checked = sf.allowGridCharge !== false;
      els.storageFarmAllowGridCharge.onchange = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.allowGridCharge = els.storageFarmAllowGridCharge.checked === true;
        scheduleValidation(200);
      };
    }

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Speicherfarm“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.storageFarmStorages.appendChild(msg);
      if (els.storageFarmGroupsCard) els.storageFarmGroupsCard.style.display = 'none';
      return;
    }

    // General controls
    if (els.storageFarmMode) {
      els.storageFarmMode.innerHTML = '';
      const opt1 = document.createElement('option');
      opt1.value = 'pool';
      opt1.textContent = 'Pool (gemeinsamer Speicher)';
      const opt2 = document.createElement('option');
      opt2.value = 'groups';
      opt2.textContent = 'Gruppen (SoC‑Zonen je Gruppe)';
      els.storageFarmMode.appendChild(opt1);
      els.storageFarmMode.appendChild(opt2);
      els.storageFarmMode.value = String(sf.mode || 'pool');
      els.storageFarmMode.onchange = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.mode = String(els.storageFarmMode.value || 'pool') === 'groups' ? 'groups' : 'pool';
        buildStorageFarmUI();
      };
    }

    if (els.storageFarmSchedulerIntervalMs) {
      els.storageFarmSchedulerIntervalMs.value = numOrEmpty(sf.schedulerIntervalMs);
      els.storageFarmSchedulerIntervalMs.onchange = () => {
        const n = Number(els.storageFarmSchedulerIntervalMs.value);
        const sf2 = _ensureStorageFarmCfg();
        sf2.schedulerIntervalMs = Number.isFinite(n) ? Math.max(250, Math.min(1000, Math.round(n))) : 1000;
      };
    }
    if (els.storageFarmSelfTargetGridImportW) {
      els.storageFarmSelfTargetGridImportW.value = numOrEmpty(sf.selfTargetGridImportW);
      els.storageFarmSelfTargetGridImportW.oninput = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.selfTargetGridImportW = _clampInt(els.storageFarmSelfTargetGridImportW.value, 0, 1000000, 50);
      };
      els.storageFarmSelfTargetGridImportW.onchange = els.storageFarmSelfTargetGridImportW.oninput;
    }
    if (els.storageFarmSelfImportThresholdW) {
      els.storageFarmSelfImportThresholdW.value = numOrEmpty(sf.selfImportThresholdW);
      els.storageFarmSelfImportThresholdW.oninput = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.selfImportThresholdW = _clampInt(els.storageFarmSelfImportThresholdW.value, 0, 1000000, 20);
      };
      els.storageFarmSelfImportThresholdW.onchange = els.storageFarmSelfImportThresholdW.oninput;
    }

    if (els.storageFarmGroupsCard) {
      els.storageFarmGroupsCard.style.display = (sf.mode === 'groups') ? '' : 'none';
    }

    /**
     * Code-Teil: Arrow-Funktion `mkField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkField = (labelText) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = labelText;
      wrap.appendChild(lbl);
      return { wrap, lbl };
    };

    /**
     * Code-Teil: Arrow-Funktion `mkDpField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkDpField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkDpField = (labelText, id, value, onChange, placeholder) => {
      const { wrap } = mkField(labelText);
      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = id;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'optional';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', id);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + id;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkTextField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkTextField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkTextField = (labelText, id, value, onChange, placeholder) => {
      const { wrap } = mkField(labelText);
      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = id;
      if (placeholder) input.placeholder = placeholder;
      input.value = value ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); });
      wrap.appendChild(input);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkNumField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkNumField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkNumField = (labelText, id, value, onChange, placeholder) => {
      const { wrap } = mkField(labelText);
      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = id;
      if (placeholder) input.placeholder = placeholder;
      input.value = (value !== undefined && value !== null && value !== '') ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : '');
      });
      wrap.appendChild(input);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkSelectField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkSelectField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkSelectField = (labelText, id, value, options, onChange) => {
      const { wrap } = mkField(labelText);
      const sel = document.createElement('select');
      sel.className = 'nw-config-select';
      sel.id = id;
      (options || []).forEach((opt) => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = String(opt.label);
        sel.appendChild(o);
      });
      sel.value = (value !== undefined && value !== null) ? String(value) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      sel.addEventListener('change', () => { onChange(String(sel.value || '')); });
      wrap.appendChild(sel);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkCheckField`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkCheckField
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkCheckField = (labelText, id, checked, onChange) => {
      const { wrap } = mkField(labelText);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.id = id;
      box.checked = !!checked;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an box. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      box.addEventListener('change', () => { onChange(!!box.checked); });
      const lbl = document.createElement('label');
      lbl.htmlFor = id;
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '6px';
      lbl.style.fontSize = '0.82rem';
      lbl.style.color = '#e5e7eb';
      lbl.appendChild(box);
      lbl.appendChild(document.createTextNode(labelText));
      wrap.appendChild(lbl);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkGridDivider`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkGridDivider
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkGridDivider = (text) => {
      const d = document.createElement('div');
      d.style.gridColumn = '1 / -1';
      d.style.marginTop = '4px';
      d.style.paddingTop = '6px';
      d.style.borderTop = '1px solid rgba(255,255,255,0.08)';
      d.style.fontSize = '0.72rem';
      d.style.fontWeight = '600';
      d.style.letterSpacing = '0.04em';
      d.style.textTransform = 'uppercase';
      d.style.opacity = '0.75';
      d.textContent = text;
      return d;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkGridHelp`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkGridHelp
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkGridHelp = (text) => {
      const d = document.createElement('div');
      d.style.gridColumn = '1 / -1';
      d.style.fontSize = '0.76rem';
      d.style.lineHeight = '1.35';
      d.style.color = '#9ca3af';
      d.textContent = text;
      return d;
    };

    // Speicherfarm-Migrationsschutz: Wenn die App-Center-jsonConfig leer war,
    // aber storageFarm.configJson noch funktionierende Speicher enthielt, wurden
    // diese beim Laden wiederhergestellt. Sichtbar machen, damit der Installateur
    // nach dem Speichern weiß, dass die Admin-Konfiguration wieder gefüllt wird.
    if (sf._runtimeRecovered) {
      const recovered = document.createElement('div');
      recovered.className = 'nw-help';
      recovered.textContent = `Speicherfarm-Konfiguration wurde aus dem Runtime-State ${sf.__runtimeStateFallbackSource || 'storageFarm.configJson'} wiederhergestellt. Bitte prüfen und speichern, damit die Admin-Konfiguration wieder vollständig ist. Die laufende Farm-Regelung wurde dadurch nicht geändert.`;
      els.storageFarmStorages.appendChild(recovered);
    }

    // Storages list (0.8.33 Master-Detail)
    // Wichtig: Bei mehreren Speichern wird nur noch der ausgewählte Speicher als
    // Detailformular gerendert. Die linke Liste bleibt kurz und übersichtlich; damit
    // muss der Installateur nicht bei 5–10 Speichern durch alle DP-Felder scrollen.
    if (!sf.storages || sf.storages.length === 0) {
      _storageFarmSelectedIndex = 0;
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Noch keine Speicher hinzugefügt.';
      els.storageFarmStorages.appendChild(empty);
    } else {
      if (!Number.isFinite(Number(_storageFarmSelectedIndex))) _storageFarmSelectedIndex = 0;
      _storageFarmSelectedIndex = Math.max(0, Math.min(sf.storages.length - 1, Math.round(Number(_storageFarmSelectedIndex) || 0)));

      const shell = document.createElement('div');
      shell.className = 'nw-storagefarm-master-detail';

      const list = document.createElement('div');
      list.className = 'nw-storagefarm-storage-list';

      const totalCapacity = sf.storages.reduce((sum, item) => {
        const n = Number(item && item.capacityKWh);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
      const listHead = document.createElement('div');
      listHead.className = 'nw-config-empty';
      listHead.style.textAlign = 'left';
      listHead.style.margin = '0 0 8px 0';
      listHead.textContent = `${sf.storages.length} Speicher${totalCapacity > 0 ? ` · ${totalCapacity.toFixed(1)} kWh` : ''}`;
      list.appendChild(listHead);

      for (let i = 0; i < sf.storages.length; i++) {
        const st = sf.storages[i] || {};
        const selected = i === _storageFarmSelectedIndex;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = selected ? 'nw-storagefarm-storage-pill active' : 'nw-storagefarm-storage-pill';
        const cpl = String(st.coupling || '').trim().toUpperCase() || 'AUTO';
        const grp = String(st.group || '').trim();
        const hasIst = !!(String(st.socId || '').trim() || String(st.signedPowerId || '').trim() || String(st.chargePowerId || '').trim() || String(st.dischargePowerId || '').trim());
        const hasSet = !!(String(st.feneconGridSetpointId || '').trim() || String(st.setSignedPowerId || '').trim() || String(st.setChargePowerId || '').trim() || String(st.setDischargePowerId || '').trim());
        const vendor = normalizeStorageVendorProfile(st.vendorProfile || 'generic');
        const feneconMode = String(st.feneconControlMode || 'auto');
        const profileLabel = vendor === 'fenecon-openems'
          ? `FENECON Hybrid · ${feneconMode === 'fems-grid'
            ? 'FEMS-NVP-Master (Experte)'
            : (feneconMode === 'direct-ess' ? 'Direkte ESS' : 'PV→FEMS / Nacht→ESS')}`
          : 'Standard';
        btn.innerHTML = `
          <span class="nw-storagefarm-storage-pill__name">${htmlEscape(String(st.name || '').trim() || `Speicher ${i + 1}`)}</span>
          <span class="nw-storagefarm-storage-pill__meta">${i >= maxStorages ? 'Lizenzgrenze: gesperrt' : (st.enabled === false ? 'inaktiv' : 'aktiv')} · ${cpl}${sf.mode === 'groups' ? ` · ${htmlEscape(grp || 'ohne Gruppe')}` : ''}</span>
          <span class="nw-storagefarm-storage-pill__meta">${htmlEscape(profileLabel)} · Ist: ${hasIst ? 'gesetzt' : 'fehlt'} · Soll: ${hasSet ? 'gesetzt' : 'fehlt'}</span>`;
        btn.addEventListener('click', () => {
          _storageFarmSelectedIndex = i;
          buildStorageFarmUI();
        });
        list.appendChild(btn);
      }

      const detail = document.createElement('div');
      detail.className = 'nw-storagefarm-storage-detail';

      const i = _storageFarmSelectedIndex;
      const s = sf.storages[i] || {};
      const idx = i + 1;

      const titleRow = document.createElement('div');
      titleRow.className = 'nw-storagefarm-detail-head';
      titleRow.innerHTML = `<div><b>${htmlEscape(String(s.name || '').trim() || `Speicher ${idx}`)}</b><div class="nw-config-help">Detailkonfiguration für Speicher ${idx}. Wechsel links den Speicher, ohne durch alle anderen Speicher zu scrollen.</div></div>`;
      detail.appendChild(titleRow);

      const grid = document.createElement('div');
      grid.className = 'nw-flow-ctrl-grid nw-storagefarm-detail-grid';

      // Grunddaten
      grid.appendChild(mkCheckField('Aktiv', `sf_${idx}_enabled`, s.enabled !== false, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].enabled = !!v; buildStorageFarmUI(); }));
      grid.appendChild(mkTextField('Name', `sf_${idx}_name`, s.name, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].name = v; }, 'z.B. Batterie 1'));
      grid.appendChild(mkNumField('Kapazität (kWh)', `sf_${idx}_cap`, s.capacityKWh, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].capacityKWh = v; }, 'optional'));
      if (sf.mode === 'groups') {
        grid.appendChild(mkTextField('Gruppe', `sf_${idx}_group`, s.group, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].group = v; }, 'z.B. Gruppe A'));
      }

      grid.appendChild(mkSelectField('Kopplung', `sf_${idx}_coupling`, s.coupling || '', [
        { value: '', label: 'Auto/Unbekannt' },
        { value: 'ac', label: 'AC' },
        { value: 'dc', label: 'DC' },
      ], (v) => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.storages[i].coupling = String(v || '').trim().toLowerCase();
        buildStorageFarmUI();
      }));
      grid.appendChild(mkSelectField('Regelprofil', `sf_${idx}_vendorProfile`, normalizeStorageVendorProfile(s.vendorProfile || 'generic'), [
        { value: 'generic', label: 'Standard / herstellerunabhängig' },
        { value: 'fenecon-openems', label: 'FENECON Hybrid / OpenEMS' },
      ], (v) => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.storages[i].vendorProfile = normalizeStorageVendorProfile(v);
        if (sf2.storages[i].vendorProfile !== 'fenecon-openems') sf2.storages[i].feneconControlMode = 'auto';
        buildStorageFarmUI();
      }));

      const farmVendorProfile = normalizeStorageVendorProfile(s.vendorProfile || 'generic');
      if (farmVendorProfile === 'fenecon-openems') {
        grid.appendChild(mkSelectField('FENECON-Regelart', `sf_${idx}_feneconControlMode`, s.feneconControlMode || 'auto', [
          { value: 'auto', label: 'Automatisch: echter FEMS-NVP-DP → FEMS, sonst direkte ESS-Leistung' },
          { value: 'direct-ess', label: 'Direkte ESS-Leistung – 706 + echte ESS-Istleistung 604' },
          { value: 'fems-grid', label: 'Kontinuierlicher FEMS-NVP-Regler – exklusiver Speicher' },
        ], (v) => {
          const sf2 = _ensureStorageFarmCfg();
          sf2.storages[i].feneconControlMode = ['fems-grid', 'direct-ess'].includes(String(v || '')) ? String(v) : 'auto';
          buildStorageFarmUI();
        }));
        grid.appendChild(mkGridHelp('Speicherfarm: Automatisch wird beim Speichern/Start ein eindeutiger, kontinuierlicher Farm-Schreibpfad aufgelöst. Ein echter, schreibbarer ctrlBalancing0/SetGridActivePower-DP ist nur bei genau einem exklusiven FENECON-Schreibmaster zulässig. Fehlt er oder besitzt die Farm weitere schreibbare Speicher, verteilt EOS direkt über die ESS-Leistungs-DPs (typisch 706) mit echter AC-Aktor-Rückmeldung (typisch 604). Die PV-abhängige FEMS-/EOS-Umschaltung gilt bewusst nur für den einzelnen FENECON-Speicher, nicht für gemischte Speicherfarmen.'));
        grid.appendChild(mkNumField('FEMS API-Watchdog (s)', `sf_${idx}_feneconApiTimeoutSec`, s.feneconApiTimeoutSec ?? 60, (v) => {
          const sf2 = _ensureStorageFarmCfg();
          sf2.storages[i].feneconApiTimeoutSec = Math.max(5, Math.min(300, Number(v) || 60));
        }, '60'));
        grid.appendChild(mkDpField('Echter FEMS NVP-Ziel-DP (W)', `sf_${idx}_feneconGridSetpointId`, s.feneconGridSetpointId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconGridSetpointId = v; }, 'Nur ctrlBalancing0/SetGridActivePower · niemals 706/powerSetpointW'));
        grid.appendChild(mkDpField('FENECON ESS-Aktor-Istleistung (W)', `sf_${idx}_feneconEssActualPowerId`, s.feneconEssActualPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconEssActualPowerId = v; }, 'ess0/ActivePower · typ. 604'));
        grid.appendChild(mkDpField('FENECON NVP-Istleistung (W) – Shadow', `sf_${idx}_feneconNvpPowerId`, s.feneconNvpPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconNvpPowerId = v; }, 'read-only · nur Diagnose/Plausibilisierung'));
        grid.appendChild(mkDpField('FENECON Gesamtverbrauch (W) – Shadow', `sf_${idx}_feneconConsumptionTotalId`, s.feneconConsumptionTotalId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconConsumptionTotalId = v; }, 'read-only · nur Bilanz-Plausibilisierung'));
        grid.appendChild(mkDpField('FENECON Mindestleistung (W)', `sf_${idx}_feneconMinPowerId`, s.feneconMinPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconMinPowerId = v; }, 'optional · typ. 702'));
        grid.appendChild(mkDpField('FENECON Maximalleistung (W)', `sf_${idx}_feneconMaxPowerId`, s.feneconMaxPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconMaxPowerId = v; }, 'optional · typ. 704'));
        grid.appendChild(mkDpField('FENECON Vorgabe-Readback (W)', `sf_${idx}_feneconActualSetpointId`, s.feneconActualSetpointId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconActualSetpointId = v; }, 'optional'));
        grid.appendChild(mkDpField('FENECON interne DC-PV (W)', `sf_${idx}_feneconPvDcId`, s.feneconPvDcId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconPvDcId = v; }, 'ProductionDcActualPower · typ. 339'));
        grid.appendChild(mkDpField('FENECON externe AC-PV (W)', `sf_${idx}_feneconPvAcId`, s.feneconPvAcId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconPvAcId = v; }, 'ProductionAcActivePower · typ. 331'));
        grid.appendChild(mkDpField('FENECON gesamte PV (W)', `sf_${idx}_feneconPvTotalId`, s.feneconPvTotalId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].feneconPvTotalId = v; }, 'ProductionActivePower · typ. 327'));
      }

      grid.appendChild(mkDpField('PV-/WR-Leistung (W)', `sf_${idx}_pvPowerId`, s.pvPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].pvPowerId = v; }, 'optional · DC wird addiert, AC dient als Anlagen-PV-Fallback'));
      grid.appendChild(mkGridHelp('PV-/WR-Leistung passend zur Kopplung zuordnen. Derselbe Wechselrichter-DP wird in der Farm nur einmal gezählt. Bei vorhandener Anlagen-PV werden AC-/unbekannte Farmwerte nicht doppelt addiert; DC-/Hybrid-PV wird nur ergänzt, wenn sie noch nicht enthalten ist.'));

      // Istwerte (Messwerte)
      grid.appendChild(mkGridDivider('Istwerte (Messwerte)'));

      grid.appendChild(mkCheckField('Vorzeichen Istleistung Signed invertieren', `sf_${idx}_invSigned`, !!s.invertSignedPowerSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertSignedPowerSign = !!v; }));
      grid.appendChild(mkCheckField('Vorzeichen Ladeleistung invertieren', `sf_${idx}_invChg`, !!s.invertChargeSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertChargeSign = !!v; }));
      grid.appendChild(mkCheckField('Vorzeichen Entladeleistung invertieren', `sf_${idx}_invDchg`, !!s.invertDischargeSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertDischargeSign = !!v; }));

      grid.appendChild(mkDpField('SoC (%)', `sf_${idx}_socId`, s.socId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].socId = v; }, 'SoC‑Datenpunkt'));
      grid.appendChild(mkDpField('Istleistung Signed (W)', `sf_${idx}_signedPowerId`, s.signedPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].signedPowerId = v; }, '(-) laden / (+) entladen'));
      grid.appendChild(mkDpField('Ist Ladeleistung (W)', `sf_${idx}_chargePowerId`, s.chargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].chargePowerId = v; }, 'Messwert (optional)'));
      grid.appendChild(mkDpField('Ist Entladeleistung (W)', `sf_${idx}_dischargePowerId`, s.dischargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].dischargePowerId = v; }, 'Messwert (optional)'));

      // Sollwerte (Setpoint)
      grid.appendChild(mkGridDivider('Sollwerte (Setpoint)'));

      grid.appendChild(mkDpField('Sollwert Signed (W)', `sf_${idx}_setSignedPowerId`, s.setSignedPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].setSignedPowerId = v; }, '(-) laden / (+) entladen'));
      grid.appendChild(mkCheckField('Vorzeichen Sollwert Signed invertieren', `sf_${idx}_invSetSigned`, !!s.invertSetSignedPowerSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertSetSignedPowerSign = !!v; }));
      grid.appendChild(mkDpField('Sollwert Laden (W)', `sf_${idx}_setChargePowerId`, s.setChargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].setChargePowerId = v; }, 'nur Laden (optional)'));
      grid.appendChild(mkDpField('Sollwert Entladen (W)', `sf_${idx}_setDischargePowerId`, s.setDischargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].setDischargePowerId = v; }, 'nur Entladen (optional)'));

      // Feste Leistungsgrenzen
      grid.appendChild(mkGridDivider('Feste Leistungsgrenzen (direkte Eingabe)'));
      grid.appendChild(mkGridHelp('Diese Werte begrenzen die Farm-Verteilung pro Speicher. Leer = unbegrenzt, 0 W = diese Richtung sperren.'));
      grid.appendChild(mkNumField('Max. Beladen (W)', `sf_${idx}_maxChargeW`, s.maxChargeW, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].maxChargeW = v; }, 'leer = unbegrenzt, 0 = sperren'));
      grid.appendChild(mkNumField('Max. Entladen (W)', `sf_${idx}_maxDischargeW`, s.maxDischargeW, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].maxDischargeW = v; }, 'leer = unbegrenzt, 0 = sperren'));

      // Verfügbarkeit & Freigaben
      grid.appendChild(mkGridDivider('Verfügbarkeit & Freigaben'));
      grid.appendChild(mkGridHelp('Freigabe-DPs sind optional. Leer = freigegeben. Nur zuordnen, wenn das Speichersystem einen echten Status-DP liefert.'));
      grid.appendChild(mkDpField('Verfügbar / Freigabe', `sf_${idx}_availableId`, s.availableId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].availableId = v; }, 'true/1 = verfügbar, false/0 = gesperrt'));
      grid.appendChild(mkDpField('Störung / Fehler', `sf_${idx}_faultId`, s.faultId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].faultId = v; }, 'true/1 = Störung'));
      grid.appendChild(mkDpField('Ladefreigabe', `sf_${idx}_chargeAllowedId`, s.chargeAllowedId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].chargeAllowedId = v; }, 'true/1 = Laden erlaubt'));
      grid.appendChild(mkDpField('Entladefreigabe', `sf_${idx}_dischargeAllowedId`, s.dischargeAllowedId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].dischargeAllowedId = v; }, 'true/1 = Entladen erlaubt'));

      detail.appendChild(grid);

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'nw-config-btn nw-config-btn--ghost';
      rm.textContent = 'Ausgewählten Speicher entfernen';
      rm.style.marginTop = '8px';
      rm.addEventListener('click', () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.storages.splice(i, 1);
        _storageFarmSelectedIndex = Math.max(0, Math.min(_storageFarmSelectedIndex, sf2.storages.length - 1));
        buildStorageFarmUI();
        scheduleValidation(200);
      });
      detail.appendChild(rm);

      shell.appendChild(list);
      shell.appendChild(detail);
      els.storageFarmStorages.appendChild(shell);
    }

    if (els.storageFarmAddStorage) {
      els.storageFarmAddStorage.onclick = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.storages = Array.isArray(sf2.storages) ? sf2.storages : [];
        if (sf2.storages.length >= _maxStorageCount()) return;
        sf2.storages.push({
          enabled: true,
          name: `Speicher ${sf2.storages.length + 1}`,
          coupling: '',
          vendorProfile: 'generic',
          feneconControlMode: 'auto',
          feneconGridSetpointId: '',
          feneconEssActualPowerId: '',
          feneconNvpPowerId: '',
          feneconConsumptionTotalId: '',
          feneconMinPowerId: '',
          feneconMaxPowerId: '',
          feneconActualSetpointId: '',
          feneconPvDcId: '',
          feneconPvAcId: '',
          feneconPvTotalId: '',
          feneconPvPassthroughThresholdW: 500,
          feneconPvReleaseThresholdW: 500,
          feneconPvPassthroughDelaySec: 10,
          feneconPvReleaseDelaySec: 120,
          feneconApiTimeoutSec: 60,
          socId: '',
          signedPowerId: '',
          chargePowerId: '',
          dischargePowerId: '',
          pvPowerId: '',
          invertSignedPowerSign: false,
          invertChargeSign: false,
          invertDischargeSign: false,
          setChargePowerId: '',
          setDischargePowerId: '',
          setSignedPowerId: '',
          invertSetSignedPowerSign: false,
          maxChargeW: '',
          maxDischargeW: '',
          availableId: '',
          faultId: '',
          chargeAllowedId: '',
          dischargeAllowedId: '',
          capacityKWh: '',
          group: '',
        });
        buildStorageFarmUI();
      };
    }

    // Groups list (only in groups mode)
    if (sf.mode === 'groups' && els.storageFarmGroups) {
      if (!sf.groups || sf.groups.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'nw-config-empty';
        empty.textContent = 'Noch keine Gruppen definiert.';
        els.storageFarmGroups.appendChild(empty);
      } else {
        for (let i = 0; i < sf.groups.length; i++) {
          const g = sf.groups[i] || {};
          const card = document.createElement('div');
          card.className = 'nw-config-item';
          card.style.marginBottom = '10px';

          const left = document.createElement('div');
          left.className = 'nw-config-item__left';

          const title = document.createElement('div');
          title.className = 'nw-config-item__title';
          title.textContent = `Gruppe ${i + 1}`;

          const sub = document.createElement('div');
          sub.className = 'nw-config-item__subtitle';
          sub.textContent = `Name: ${String(g.name || '').trim() || '—'}`;
          left.appendChild(title);
          left.appendChild(sub);

          const right = document.createElement('div');
          right.className = 'nw-config-item__right';
          right.style.width = '100%';

          const grid = document.createElement('div');
          grid.className = 'nw-flow-ctrl-grid';

          grid.appendChild(mkCheckField('Aktiv', `sfgrp_${i+1}_enabled`, g.enabled !== false, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].enabled = !!v; }));
          grid.appendChild(mkTextField('Name (Schlüssel)', `sfgrp_${i+1}_name`, g.name, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].name = v; }, 'z.B. Gruppe A'));
          grid.appendChild(mkNumField('Min‑SoC (%)', `sfgrp_${i+1}_socMin`, g.socMin, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].socMin = v; }, 'optional'));
          grid.appendChild(mkNumField('Max‑SoC (%)', `sfgrp_${i+1}_socMax`, g.socMax, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].socMax = v; }, 'optional'));
          grid.appendChild(mkNumField('Priorität', `sfgrp_${i+1}_prio`, g.priority, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].priority = v; }, 'kleiner = zuerst'));

          right.appendChild(grid);

          const rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'nw-config-btn nw-config-btn--ghost';
          rm.textContent = 'Entfernen';
          rm.style.marginTop = '8px';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an rm. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          rm.addEventListener('click', () => {
            const sf2 = _ensureStorageFarmCfg();
            sf2.groups.splice(i, 1);
            buildStorageFarmUI();
          });

          right.appendChild(rm);

          card.appendChild(left);
          card.appendChild(right);
          els.storageFarmGroups.appendChild(card);
        }
      }

      if (els.storageFarmAddGroup) {
        els.storageFarmAddGroup.onclick = () => {
          const sf2 = _ensureStorageFarmCfg();
          sf2.groups = Array.isArray(sf2.groups) ? sf2.groups : [];
          if (sf2.groups.length >= 5) return;
          sf2.groups.push({
            enabled: true,
            name: `Gruppe ${String.fromCharCode(65 + sf2.groups.length)}`,
            socMin: '',
            socMax: '',
            priority: 100 + sf2.groups.length,
          });
          buildStorageFarmUI();
        };
      }
    }
  }



  // ------------------------------
  // MultiUse (Speicher) – SoC‑Zonen
  // ------------------------------
    /**
     * Code-Teil: _ensureStorageMultiUseCfg
     * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function _ensureStorageMultiUseCfg() {
    currentConfig = currentConfig || {};
    currentConfig.installerConfig = (currentConfig.installerConfig && typeof currentConfig.installerConfig === 'object') ? currentConfig.installerConfig : {};
    const ic = currentConfig.installerConfig;

    ic.storageMultiUse = (ic.storageMultiUse && typeof ic.storageMultiUse === 'object') ? ic.storageMultiUse : {};
    const mu = ic.storageMultiUse;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && typeof apps.multiuse === 'object') ? apps.multiuse : { installed: false, enabled: false };
    const appActive = !!(a.installed && a.enabled);

    // default: follow app state on first install
    if (typeof mu.enabled !== 'boolean') mu.enabled = appActive;

    if (typeof mu.reserveEnabled !== 'boolean') mu.reserveEnabled = true;
    if (typeof mu.peakEnabled !== 'boolean') mu.peakEnabled = true;
    if (typeof mu.selfEnabled !== 'boolean') mu.selfEnabled = true;

    // Backwards compatibility:
    // Older configs used only "To"-Schwellen (reserveTo/peakTo/selfTo). Diese werden in min/max-Felder überführt.
    const reserveTo = _clampInt(mu.reserveToSocPct, 0, 99, 10);
    const peakTo = _clampInt(mu.peakToSocPct, reserveTo, 100, 50);
    const selfTo = _clampInt(mu.selfToSocPct, peakTo, 100, 100);

    // Reserve (Notstrom): min (= Entlade-Untergrenze) + Ziel (Refill-Ziel)
    // Hinweis: Wenn Reserve deaktiviert ist, soll sie keine unteren Grenzen für andere Bereiche erzwingen.
    mu.reserveMinSocPct = _clampInt(mu.reserveMinSocPct, 0, 100, reserveTo);
    mu.reserveTargetSocPct = _clampInt(mu.reserveTargetSocPct, mu.reserveMinSocPct, 100, mu.reserveMinSocPct);

    const reserveBaseMin = (mu.reserveEnabled !== false) ? mu.reserveMinSocPct : 0;

    // LSK: min/max (mind. Reserve-Min – aber nur, wenn Reserve aktiv ist)
    mu.lskMinSocPct = _clampInt(mu.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
    mu.lskMaxSocPct = _clampInt(mu.lskMaxSocPct, mu.lskMinSocPct, 100, peakTo);

    // Eigenverbrauch: min/max
    // - Wenn LSK aktiv ist: mind. LSK-Max (Zonen bleiben disjunkt).
    // - Wenn LSK deaktiviert ist: mind. Reserve-Min (oder 0, wenn Reserve deaktiviert ist).
    const selfBaseMin = (mu.peakEnabled !== false) ? mu.lskMaxSocPct : reserveBaseMin;
    mu.selfMinSocPct = _clampInt(mu.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
    mu.selfMaxSocPct = _clampInt(mu.selfMaxSocPct, mu.selfMinSocPct, 100, selfTo);

    // Legacy-NVP-Felder bleiben zur Rueckwaertskompatibilitaet unangetastet,
    // werden aber weder angezeigt noch gespeichert oder von der Runtime genutzt.
    // Die aktive Speicher-/Farm-App ist alleiniger Besitzer der NVP-Abstimmung.

    // Legacy-Felder beibehalten (Anzeige/Kompatibilität), aber normalisieren
    mu.reserveToSocPct = reserveTo;
    mu.peakToSocPct = peakTo;
    mu.selfToSocPct = selfTo;

    return mu;
  }
    /**
     * Code-Teil: _renderStorageMultiUseSummary
     * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function _renderStorageMultiUseSummary(mu) {
    if (!els.muStorageSummary) return;

    const enabled = !!mu.enabled;
    const reserveOn = enabled && (mu.reserveEnabled !== false);
    const peakOn = enabled && (mu.peakEnabled !== false);
    const selfOn = enabled && (mu.selfEnabled !== false);

    const reserveMin = _clampInt(mu.reserveMinSocPct, 0, 100, 10);
    const reserveTarget = _clampInt(mu.reserveTargetSocPct, reserveMin, 100, reserveMin);
    const reserveBaseMin = reserveOn ? reserveMin : 0;

    const lskMin = _clampInt(mu.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
    const lskMax = _clampInt(mu.lskMaxSocPct, lskMin, 100, 50);

    const selfBaseMin = peakOn ? lskMax : reserveBaseMin;
    const selfMin = _clampInt(mu.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
    const selfMax = _clampInt(mu.selfMaxSocPct, selfMin, 100, 100);

    const lines = [
      `Zonen: Reserve 0–${reserveMin} %, LSK ${lskMin}–${lskMax} %, Eigenverbrauch ${selfMin}–${selfMax} %`,
      `reserveEnabled = ${reserveOn ? 'true' : 'false'}  | reserveMinSocPct = ${reserveMin}  | reserveTargetSocPct = ${reserveTarget}`,
      `lskEnabled = ${peakOn ? 'true' : 'false'}  | lskMinSocPct = ${lskMin}  | lskMaxSocPct = ${lskMax}`,
      `selfDischargeEnabled = ${selfOn ? 'true' : 'false'}  | selfMinSocPct = ${selfMin}  | selfMaxSocPct = ${selfMax}`,
      'NVP-Zielmitte/Messtoleranz: wird aus der aktiven App Speicher oder Speicherfarm übernommen',
    ];

    els.muStorageSummary.innerHTML = '';
    for (const t of lines) {
      const div = document.createElement('div');
      div.className = 'nw-config-list__row';
      div.textContent = t;
      els.muStorageSummary.appendChild(div);
    }
  }
    /**
     * Code-Teil: buildStorageMultiUseUI
     * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function buildStorageMultiUseUI() {
    if (!els.muStorageEnabled) return;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && typeof apps.multiuse === 'object') ? apps.multiuse : { installed: false, enabled: false };

    _ensureStorageMultiUseCfg();

    /**
     * Code-Teil: Arrow-Funktion `setDisabled`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setDisabled
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setDisabled = (d) => {
      if (els.muStorageEnabled) els.muStorageEnabled.disabled = d;
      if (els.muReserveEnabled) els.muReserveEnabled.disabled = d;
      if (els.muReserveMinSoc) els.muReserveMinSoc.disabled = d;
      if (els.muReserveTargetSoc) els.muReserveTargetSoc.disabled = d;
      if (els.muPeakEnabled) els.muPeakEnabled.disabled = d;
      if (els.muLskMinSoc) els.muLskMinSoc.disabled = d;
      if (els.muLskMaxSoc) els.muLskMaxSoc.disabled = d;
      if (els.muSelfEnabled) els.muSelfEnabled.disabled = d;
      if (els.muSelfMinSoc) els.muSelfMinSoc.disabled = d;
      if (els.muSelfMaxSoc) els.muSelfMaxSoc.disabled = d;
    };

    setDisabled(!a.installed);

    /**
     * Code-Teil: Arrow-Funktion `syncFromCfgToUi`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: syncFromCfgToUi
     * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const syncFromCfgToUi = () => {
      const mu2 = _ensureStorageMultiUseCfg();

      if (els.muStorageEnabled) els.muStorageEnabled.checked = !!mu2.enabled;
      if (els.muReserveEnabled) els.muReserveEnabled.checked = (mu2.reserveEnabled !== false);
      if (els.muReserveMinSoc) els.muReserveMinSoc.value = numOrEmpty(mu2.reserveMinSocPct);
      if (els.muReserveTargetSoc) els.muReserveTargetSoc.value = numOrEmpty(mu2.reserveTargetSocPct);

      if (els.muPeakEnabled) els.muPeakEnabled.checked = (mu2.peakEnabled !== false);
      if (els.muLskMinSoc) els.muLskMinSoc.value = numOrEmpty(mu2.lskMinSocPct);
      if (els.muLskMaxSoc) els.muLskMaxSoc.value = numOrEmpty(mu2.lskMaxSocPct);

      if (els.muSelfEnabled) els.muSelfEnabled.checked = (mu2.selfEnabled !== false);
      if (els.muSelfMinSoc) els.muSelfMinSoc.value = numOrEmpty(mu2.selfMinSocPct);
      if (els.muSelfMaxSoc) els.muSelfMaxSoc.value = numOrEmpty(mu2.selfMaxSocPct);

      _renderStorageMultiUseSummary(mu2);
    };

    /**
     * Code-Teil: Arrow-Funktion `syncFromUiToCfg`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: syncFromUiToCfg
     * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const syncFromUiToCfg = () => {
      const mu2 = _ensureStorageMultiUseCfg();

      mu2.enabled = !!(els.muStorageEnabled && els.muStorageEnabled.checked);
      mu2.reserveEnabled = !!(els.muReserveEnabled && els.muReserveEnabled.checked);
      mu2.peakEnabled = !!(els.muPeakEnabled && els.muPeakEnabled.checked);
      mu2.selfEnabled = !!(els.muSelfEnabled && els.muSelfEnabled.checked);

      const reserveMin = _clampInt(els.muReserveMinSoc ? els.muReserveMinSoc.value : mu2.reserveMinSocPct, 0, 100, 10);
      const reserveTarget = _clampInt(els.muReserveTargetSoc ? els.muReserveTargetSoc.value : mu2.reserveTargetSocPct, reserveMin, 100, reserveMin);

      const reserveBaseMin = mu2.reserveEnabled ? reserveMin : 0;

      // LSK darf (wenn Reserve deaktiviert ist) auch unter die bisherige Reserve-Min.
      const lskMin = _clampInt(els.muLskMinSoc ? els.muLskMinSoc.value : mu2.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
      const lskMax = _clampInt(els.muLskMaxSoc ? els.muLskMaxSoc.value : mu2.lskMaxSocPct, lskMin, 100, Math.max(lskMin, 50));

      // Eigenverbrauch-Min hängt nur dann an LSK-Max, wenn Peak/LSK aktiv ist.
      const selfBaseMin = mu2.peakEnabled ? lskMax : reserveBaseMin;
      const selfMin = _clampInt(els.muSelfMinSoc ? els.muSelfMinSoc.value : mu2.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
      const selfMax = _clampInt(els.muSelfMaxSoc ? els.muSelfMaxSoc.value : mu2.selfMaxSocPct, selfMin, 100, 100);

      mu2.reserveMinSocPct = reserveMin;
      mu2.reserveTargetSocPct = reserveTarget;
      mu2.lskMinSocPct = lskMin;
      mu2.lskMaxSocPct = lskMax;
      mu2.selfMinSocPct = selfMin;
      mu2.selfMaxSocPct = selfMax;

      // Legacy fields keep a meaningful approximation
      mu2.reserveToSocPct = reserveMin;
      mu2.peakToSocPct = lskMax;
      mu2.selfToSocPct = selfMax;

      // Push normalized values back into UI (prevents invalid ranges)
      if (els.muReserveMinSoc) els.muReserveMinSoc.value = numOrEmpty(reserveMin);
      if (els.muReserveTargetSoc) els.muReserveTargetSoc.value = numOrEmpty(reserveTarget);
      if (els.muLskMinSoc) els.muLskMinSoc.value = numOrEmpty(lskMin);
      if (els.muLskMaxSoc) els.muLskMaxSoc.value = numOrEmpty(lskMax);
      if (els.muSelfMinSoc) els.muSelfMinSoc.value = numOrEmpty(selfMin);
      if (els.muSelfMaxSoc) els.muSelfMaxSoc.value = numOrEmpty(selfMax);

      _renderStorageMultiUseSummary(mu2);
      scheduleValidation(200);
    };

    // Bind events (overwrite handlers to avoid duplicates on rebuild)
    if (els.muStorageEnabled) els.muStorageEnabled.onchange = syncFromUiToCfg;
    if (els.muReserveEnabled) els.muReserveEnabled.onchange = syncFromUiToCfg;
    if (els.muReserveMinSoc) els.muReserveMinSoc.onchange = syncFromUiToCfg;
    if (els.muReserveTargetSoc) els.muReserveTargetSoc.onchange = syncFromUiToCfg;
    if (els.muPeakEnabled) els.muPeakEnabled.onchange = syncFromUiToCfg;
    if (els.muLskMinSoc) els.muLskMinSoc.onchange = syncFromUiToCfg;
    if (els.muLskMaxSoc) els.muLskMaxSoc.onchange = syncFromUiToCfg;
    if (els.muSelfEnabled) els.muSelfEnabled.onchange = syncFromUiToCfg;
    if (els.muSelfMinSoc) els.muSelfMinSoc.onchange = syncFromUiToCfg;
    if (els.muSelfMaxSoc) els.muSelfMaxSoc.onchange = syncFromUiToCfg;

    syncFromCfgToUi();

    if (!a.installed && els.muStorageSummary) {
      const hint = document.createElement('div');
      hint.className = 'nw-help';
      hint.style.marginTop = '10px';
      hint.textContent = 'Die App „MultiUse“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.muStorageSummary.appendChild(hint);
    }
  }




  // --- EVCS / Stations (Phase 2) ---
  /**
   * Code-Teil: _clampInt
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _clampInt(v, min, max, def) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    const i = Math.round(n);
    return Math.min(max, Math.max(min, i));
  }
  /**
   * Code-Teil: _ensureSettingsConfig
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureSettingsConfig() {
    currentConfig = currentConfig || {};
    currentConfig.settingsConfig = (currentConfig.settingsConfig && typeof currentConfig.settingsConfig === 'object') ? currentConfig.settingsConfig : {};
    return currentConfig.settingsConfig;
  }
  /**
   * Code-Teil: _ensureChargingManagementConfig
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureChargingManagementConfig() {
    currentConfig = currentConfig || {};
    currentConfig.chargingManagement = (currentConfig.chargingManagement && typeof currentConfig.chargingManagement === 'object') ? currentConfig.chargingManagement : {};
    return currentConfig.chargingManagement;
  }
  /**
   * Code-Teil: _ensureEvcsList
   * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ensureEvcsList(count) {
    count = _clampInt(count, 0, _maxEvcsCount(), 0);
    const sc = _ensureSettingsConfig();
    const list = Array.isArray(sc.evcsList) ? sc.evcsList : [];
    while (list.length < count) list.push({});
    if (list.length > count) list.length = count;
    sc.evcsList = list;
    return list;
  }
  /**
   * Code-Teil: _updateEvcsField
   * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _updateEvcsField(idx, field, value) {
    const sc = _ensureSettingsConfig();
    const count = _clampInt(sc.evcsCount, 0, _maxEvcsCount(), 0);
    const list = _ensureEvcsList(count);
    const row = (list[idx - 1] && typeof list[idx - 1] === 'object') ? list[idx - 1] : {};
    row[field] = value;
    list[idx - 1] = row;
    sc.evcsList = list;
  }
  /**
   * Code-Teil: buildEvcsUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  /** Netzanteil je LP bei Nulleinspeisung; alter Feldname bleibt kompatibel. 0 = kein Netzanteil, leer = keine zusätzliche Netzgrenze. */
  function _buildEvcsBoostLimitInput(row, onChange) {
    const input = document.createElement('input');
    input.className = 'nw-config-input'; input.type = 'number';
    input.min = '0'; input.max = '2000000'; input.step = '1';
    input.placeholder = 'Leer = keine zusätzliche Netzgrenze';
    input.dataset.field = 'boostMaxPowerW';
    const raw = row && row.boostMaxPowerW;
    input.value = raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())
      ? '' : String(typeof raw !== 'boolean' && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0);
    input.addEventListener('change', () => {
      if (input.validity && !input.validity.valid) { input.reportValidity(); return; }
      const text = String(input.value).trim();
      const value = text === '' ? null : Number(text);
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 2000000)) return;
      onChange(value === null ? null : Math.floor(value));
    });
    return input;
  }

  function buildEvcsUI() {
    if (!els.evcsList || !els.evcsCount) return;
    const sc = _ensureSettingsConfig();
    const count = _clampInt(sc.evcsCount, 0, _maxEvcsCount(), 0);
    sc.evcsCount = count;

    els.evcsCount.value = String(count);
    try { els.evcsCount.max = String(_maxEvcsCount()); } catch (_e) {}
    if (els.evcsMaxPowerKw) {
      const kw = (sc.evcsMaxPowerKw !== undefined && sc.evcsMaxPowerKw !== null) ? Number(sc.evcsMaxPowerKw) : 11;
      els.evcsMaxPowerKw.value = Number.isFinite(kw) ? String(kw) : '11';
    }
    const list = _ensureEvcsList(count);
    const activeCount = list.filter((row) => row && row.enabled !== false).length;
    if (els.evcsGlobalStorageAssistCustomerAllowed) {
      els.evcsGlobalStorageAssistCustomerAllowed.checked = sc.evcsGlobalStorageAssistCustomerAllowed === true && activeCount >= 2;
      els.evcsGlobalStorageAssistCustomerAllowed.disabled = activeCount < 2;
      els.evcsGlobalStorageAssistCustomerAllowed.title = activeCount < 2
        ? 'Der globale Speicherschutz ist erst ab zwei aktiven Ladepunkten verfügbar.'
        : 'Ein gemeinsamer Kundenschalter steuert den Speicherschutz aller aktiven Ladepunkte.';
    }

    sc.stationGroups = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];

    els.evcsList.innerHTML = '';

    if (count <= 0) {
      const empty = document.createElement('div');
      empty.className = 'nw-help';
      empty.textContent = 'Keine Wallbox konfiguriert. Setze die Anzahl auf 1 oder höher, wenn eine Ladestation vorhanden ist.';
      els.evcsList.appendChild(empty);
      try { if (els.stationGroups) els.stationGroups.innerHTML = ''; } catch (_e) {}
      return;
    }

    /**
     * Code-Teil: Arrow-Funktion `mkRow`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkRow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkRow = (label, controlEl) => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      const lab = document.createElement('div');
      lab.className = 'nw-config-field-label';
      lab.textContent = label;
      const ctl = document.createElement('div');
      ctl.className = 'nw-config-field-control';
      try {
        if (controlEl && typeof controlEl.matches === 'function' && controlEl.matches('input[type="checkbox"]')) {
          controlEl.classList.add('nw-config-checkbox');
          ctl.classList.add('nw-config-field-control--checkbox');
        }
      } catch (_e) {}
      ctl.appendChild(controlEl);
      row.appendChild(lab);
      row.appendChild(ctl);
      return row;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkIo`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkIo
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkIo = (id, value, onChange) => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.gap = '6px';
      wrap.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = id;
      input.value = valueOrEmpty(value);
      input.placeholder = 'State-ID…';
      input.dataset.dpInput = '1';
      input.dataset.dpInput = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => openDpModal(id));

      wrap.appendChild(input);
      wrap.appendChild(btn);
      return wrap;
    };

    /**
     * Code-Teil: Arrow-Funktion `normKey`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: normKey
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const normKey = (k) => String(k || '').trim();

    // Determine station keys for grouping (UI only; does NOT reorder the underlying list)
    const stationKeys = [];
    const seen = new Set();

    // 1) StationGroups first (preferred order)
    for (const g of sc.stationGroups) {
      const sk = normKey(g && g.stationKey);
      if (!sk) continue;
      if (seen.has(sk)) continue;
      seen.add(sk);
      stationKeys.push(sk);
    }

    // 2) Additional station keys from Ladepunkten (order of first appearance)
    for (const row of list) {
      const sk = normKey(row && row.stationKey);
      if (!sk) continue;
      if (seen.has(sk)) continue;
      seen.add(sk);
      stationKeys.push(sk);
    }
    const hasUnassigned = list.some(r => !normKey(r && r.stationKey));
    if (hasUnassigned) stationKeys.push(''); // UI group for "unassigned"

    const groupIndexByKey = new Map();
    sc.stationGroups.forEach((g, idx) => {
      const sk = normKey(g && g.stationKey);
      if (sk) groupIndexByKey.set(sk, idx);
    });

    /**
     * Code-Teil: Arrow-Funktion `ensureGroupForKey`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: ensureGroupForKey
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const ensureGroupForKey = (stationKey) => {
      const sk = normKey(stationKey);
      if (!sk) return -1;
      if (groupIndexByKey.has(sk)) return groupIndexByKey.get(sk);
      sc.stationGroups.push({ stationKey: sk, name: '', maxPowerKw: 0 });
      const idx = sc.stationGroups.length - 1;
      groupIndexByKey.set(sk, idx);
      return idx;
    };

    /**
     * Code-Teil: Arrow-Funktion `moveStationGroup`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: moveStationGroup
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const moveStationGroup = (stationKey, dir) => {
      const sk = normKey(stationKey);
      const idx = groupIndexByKey.get(sk);
      if (idx === undefined || idx === null) return;
      const arr = sc.stationGroups;
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return;
      const tmp = arr[idx];
      arr[idx] = arr[target];
      arr[target] = tmp;
      // rebuild map
      groupIndexByKey.clear();
      arr.forEach((g, i) => {
        const k = normKey(g && g.stationKey);
        if (k) groupIndexByKey.set(k, i);
      });
      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
    };

    /**
     * Code-Teil: Arrow-Funktion `renameStationKey`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: renameStationKey
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const renameStationKey = (oldKey, newKey) => {
      const ok = normKey(oldKey);
      const nk = normKey(newKey);
      if (!ok) return;
      if (!nk || nk === ok) return;

      // Update stationGroup entry (if present)
      const gi = groupIndexByKey.get(ok);
      if (gi !== undefined && gi !== null) {
        sc.stationGroups[gi] = sc.stationGroups[gi] || {};
        sc.stationGroups[gi].stationKey = nk;
      }
      // Update ports
      for (let i = 0; i < list.length; i++) {
        const k = normKey(list[i] && list[i].stationKey);
        if (k === ok) {
          list[i] = list[i] || {};
          list[i].stationKey = nk;
        }
      }
      sc.evcsList = list;

      // Rebuild maps + UI
      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
    };

    /**
     * Code-Teil: Arrow-Funktion `addPortToStation`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: addPortToStation
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const addPortToStation = (stationKey) => {
      const sk = normKey(stationKey);
      const sc2 = _ensureSettingsConfig();
      const cur = _clampInt(sc2.evcsCount, 0, _maxEvcsCount(), 0);
      if (cur >= Math.min(20, _maxEvcsCount())) return;

      const next = cur + 1;
      sc2.evcsCount = next;
      if (els.evcsCount) els.evcsCount.value = String(next);

      const list2 = _ensureEvcsList(next);
      list2[next - 1] = Object.assign({}, list2[next - 1] || {}, { stationKey: sk, name: '', enabled: true });
      sc2.evcsList = list2;

      buildEvcsUI();
    };

    /**
     * Code-Teil: Arrow-Funktion `movePortWithinStation`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: movePortWithinStation
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const movePortWithinStation = (portIdx, stationKey, dir) => {
      const sk = normKey(stationKey);
      const a = portIdx - 1;
      if (a < 0 || a >= list.length) return;

      let b = -1;
      if (dir < 0) {
        for (let j = a - 1; j >= 0; j--) {
          if (normKey(list[j] && list[j].stationKey) === sk) { b = j; break; }
          if (!sk && !normKey(list[j] && list[j].stationKey)) { b = j; break; }
        }
      } else {
        for (let j = a + 1; j < list.length; j++) {
          if (normKey(list[j] && list[j].stationKey) === sk) { b = j; break; }
          if (!sk && !normKey(list[j] && list[j].stationKey)) { b = j; break; }
        }
      }
      if (b < 0) return;

      const tmp = list[a];
      list[a] = list[b];
      list[b] = tmp;
      sc.evcsList = list;

      buildEvcsUI();
    };

    /**
     * Code-Teil: Arrow-Funktion `createPortCard`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: createPortCard
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const createPortCard = (i, stationKey) => {
      const rowCfg = list[i - 1] || {};
      const sk = normKey(stationKey);

      const card = document.createElement('div');
      card.className = 'nw-config-card';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';

      const connNo = (rowCfg && rowCfg.connectorNo !== undefined && rowCfg.connectorNo !== null && Number.isFinite(Number(rowCfg.connectorNo)) && Number(rowCfg.connectorNo) > 0)
        ? Math.round(Number(rowCfg.connectorNo))
        : 0;

      title.textContent = connNo > 0 ? `Port ${connNo} · LP ${i}` : `Ladepunkt ${i}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'nw-config-mini-btn';
      btnUp.textContent = '↑';
      btnUp.title = 'Innerhalb der Station nach oben';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnUp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btnUp.addEventListener('click', () => movePortWithinStation(i, sk, -1));

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'nw-config-mini-btn';
      btnDown.textContent = '↓';
      btnDown.title = 'Innerhalb der Station nach unten';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btnDown.addEventListener('click', () => movePortWithinStation(i, sk, +1));

      actions.appendChild(btnUp);
      actions.appendChild(btnDown);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = (rowCfg && rowCfg.name) ? String(rowCfg.name) : '';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Name
      const nameInput = document.createElement('input');
      nameInput.className = 'nw-config-input';
      nameInput.type = 'text';
      nameInput.value = valueOrEmpty(rowCfg.name);
      nameInput.placeholder = `Name (z.B. Port ${connNo || i})`;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an nameInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      nameInput.addEventListener('input', () => {
        const v = String(nameInput.value || '').trim();
        _updateEvcsField(i, 'name', v);
        subtitle.textContent = v;
      });
      body.appendChild(mkRow('Name', nameInput));

      // Aktivierung/Regelung (Installateur)
      const enabledInp = document.createElement('input');
      enabledInp.type = 'checkbox';
      enabledInp.className = 'nw-config-checkbox';
      enabledInp.checked = (rowCfg && rowCfg.enabled !== false);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an enabledInp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      enabledInp.addEventListener('change', () => _updateEvcsField(i, 'enabled', !!enabledInp.checked));
      body.appendChild(mkRow('Aktiv (Regelung)', enabledInp));

      // Typ
      const typeSel = document.createElement('select');
      typeSel.className = 'nw-config-input';
      const tVal = String(rowCfg.chargerType || 'ac').toLowerCase();
      typeSel.innerHTML = '<option value="ac">ac</option><option value="dc">dc</option>';
      typeSel.value = (tVal === 'dc') ? 'dc' : 'ac';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an typeSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      typeSel.addEventListener('change', () => _updateEvcsField(i, 'chargerType', String(typeSel.value)));
      body.appendChild(mkRow('Typ', typeSel));

      // Station key (visible for moving between stations)
      const stationKeyInput = document.createElement('input');
      stationKeyInput.className = 'nw-config-input';
      stationKeyInput.type = 'text';
      stationKeyInput.value = valueOrEmpty(rowCfg.stationKey);
      stationKeyInput.placeholder = 'Stations-Key (optional)';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an stationKeyInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      stationKeyInput.addEventListener('input', () => {
        const v = String(stationKeyInput.value || '').trim();
        _updateEvcsField(i, 'stationKey', v);
        // If a new key is introduced, ensure it appears as Station in UI
        if (v) ensureGroupForKey(v);
        // Just rebuild UI for regrouping; does not touch config order
        buildEvcsUI();
        try { buildStationGroupsUI(); } catch (_e) {}
      });
      body.appendChild(mkRow('Ladestation (Key)', stationKeyInput));

      // Port / Ladepunkt Nr.
      const connInput = document.createElement('input');
      connInput.className = 'nw-config-input';
      connInput.type = 'number';
      connInput.min = '0';
      connInput.step = '1';
      connInput.value = numOrEmpty(rowCfg.connectorNo);
      connInput.placeholder = '0';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an connInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      connInput.addEventListener('change', () => {
        _updateEvcsField(i, 'connectorNo', _clampInt(connInput.value, 0, 99, 0));
        buildEvcsUI();
      });
      body.appendChild(mkRow('Port / Ladepunkt (Nr.)', connInput));

      // Priorität (1 = höchste)
      const prioInput = document.createElement('input');
      prioInput.className = 'nw-config-input';
      prioInput.type = 'number';
      prioInput.min = '1';
      prioInput.max = '999';
      prioInput.step = '1';
      {
        const raw = (rowCfg && rowCfg.priority !== undefined && rowCfg.priority !== null && String(rowCfg.priority).trim() !== '' && Number.isFinite(Number(rowCfg.priority)))
          ? Math.round(Number(rowCfg.priority))
          : 999;
        const clamped = _clampInt(raw, 1, 999, 999);
        prioInput.value = String(clamped);
      }
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an prioInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      prioInput.addEventListener('change', () => _updateEvcsField(i, 'priority', _clampInt(prioInput.value, 1, 999, 999)));
      body.appendChild(mkRow('Priorität (1..999)', prioInput));

      // Standard-Modus
      const modeSel = document.createElement('select');
      modeSel.className = 'nw-config-input';
      modeSel.innerHTML = '<option value="auto">auto</option><option value="pv">pv</option><option value="minpv">minpv</option><option value="boost">boost</option>';
      {
        const um = String((rowCfg && rowCfg.userMode) ? rowCfg.userMode : 'auto').toLowerCase();
        modeSel.value = (um === 'pv' || um === 'minpv' || um === 'boost') ? um : 'auto';
      }
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an modeSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      modeSel.addEventListener('change', () => _updateEvcsField(i, 'userMode', String(modeSel.value)));
      body.appendChild(mkRow('Standard-Modus', modeSel));

      // Datenpunkte
      const dpDetails = document.createElement('details');
      dpDetails.style.marginTop = '8px';
      dpDetails.open = true;
      const dpSum = document.createElement('summary');
      dpSum.textContent = 'Datenpunkte & Stellgrößen';
      dpSum.style.cursor = 'pointer';
      dpSum.style.userSelect = 'none';
      dpDetails.appendChild(dpSum);

      const dpWrap = document.createElement('div');
      dpWrap.style.marginTop = '10px';
      dpWrap.style.display = 'grid';
      dpWrap.style.gap = '10px';

      dpWrap.appendChild(mkRow('Leistung (W)', mkIo(`evcs_${i}_powerId`, rowCfg.powerId, v => _updateEvcsField(i, 'powerId', v))));
      dpWrap.appendChild(mkRow('Energiezähler (intern kWh)', mkIo(`evcs_${i}_energyTotalId`, rowCfg.energyTotalId, v => _updateEvcsField(i, 'energyTotalId', v))));
      const energyInputWh = document.createElement('input');
      energyInputWh.type = 'checkbox';
      energyInputWh.className = 'nw-config-checkbox';
      energyInputWh.checked = !!(rowCfg && rowCfg.energyTotalInputIsWh === true);
      energyInputWh.title = 'Aktivieren, wenn der kumulierte Ladeenergie-DP Wh liefert. NexoWatt teilt den Wert durch 1000 und führt ihn intern in kWh.';
      energyInputWh.addEventListener('change', () => _updateEvcsField(i, 'energyTotalInputIsWh', !!energyInputWh.checked));
      dpWrap.appendChild(mkRow('Energie-DP liefert Wh → in kWh umrechnen', energyInputWh));
      dpWrap.appendChild(mkRow('Status / CP-Zustand (lesen, optional)', mkIo(`evcs_${i}_statusId`, rowCfg.statusId, v => _updateEvcsField(i, 'statusId', v))));
      dpWrap.appendChild(mkRow('OCPP Ladezustand (lesen, automatisch)', mkIo(`evcs_${i}_chargingStateId`, rowCfg.chargingStateId, v => _updateEvcsField(i, 'chargingStateId', v))));
      dpWrap.appendChild(mkRow('Fahrzeug verbunden (lesen, optional)', mkIo(`evcs_${i}_vehicleConnectedId`, rowCfg.vehicleConnectedId, v => _updateEvcsField(i, 'vehicleConnectedId', v))));
      dpWrap.appendChild(mkRow('Ladebedarf / Ladebereit (lesen, optional)', mkIo(`evcs_${i}_chargeDemandId`, rowCfg.chargeDemandId, v => _updateEvcsField(i, 'chargeDemandId', v))));
      dpWrap.appendChild(mkRow('Heartbeat / LastSeen (lesen, optional)', mkIo(`evcs_${i}_heartbeatId`, rowCfg.heartbeatId, v => _updateEvcsField(i, 'heartbeatId', v))));
      dpWrap.appendChild(mkRow('Fahrzeug‑SoC (%) (optional)', mkIo(`evcs_${i}_vehicleSocId`, rowCfg.vehicleSocId, v => _updateEvcsField(i, 'vehicleSocId', v))));
      dpWrap.appendChild(mkRow('Fahrzeug/Ladevorgang aktiv (lesen, optional) · Legacy, keine Reservierungsquelle', mkIo(`evcs_${i}_activeId`, rowCfg.activeId, v => _updateEvcsField(i, 'activeId', v))));

      dpWrap.appendChild(mkRow('Sollstrom (A)', mkIo(`evcs_${i}_setCurrentAId`, rowCfg.setCurrentAId, v => _updateEvcsField(i, 'setCurrentAId', v))));
      dpWrap.appendChild(mkRow('Sollleistung (W)', mkIo(`evcs_${i}_setPowerWId`, rowCfg.setPowerWId, v => _updateEvcsField(i, 'setPowerWId', v))));
      dpWrap.appendChild(mkRow('Enable (write)', mkIo(`evcs_${i}_enableWriteId`, rowCfg.enableWriteId, v => _updateEvcsField(i, 'enableWriteId', v))));
      dpWrap.appendChild(mkRow('Online / verbunden (read)', mkIo(`evcs_${i}_onlineId`, rowCfg.onlineId, v => _updateEvcsField(i, 'onlineId', v))));
      dpWrap.appendChild(mkRow('Messwerte aktuell / OCPP dataFresh (read, optional)', mkIo(`evcs_${i}_dataFreshId`, rowCfg.dataFreshId, v => _updateEvcsField(i, 'dataFreshId', v))));
      dpWrap.appendChild(mkRow('AC Phasenumschaltung (write)', mkIo(`evcs_${i}_phaseSwitchId`, rowCfg.phaseSwitchId, v => _updateEvcsField(i, 'phaseSwitchId', v))));
      dpWrap.appendChild(mkRow('AC Phasenrückmeldung (read, optional)', mkIo(`evcs_${i}_phaseFeedbackId`, rowCfg.phaseFeedbackId, v => _updateEvcsField(i, 'phaseFeedbackId', v))));

      dpWrap.appendChild(mkRow('Lock (write)', mkIo(`evcs_${i}_lockWriteId`, rowCfg.lockWriteId, v => _updateEvcsField(i, 'lockWriteId', v))));
      dpWrap.appendChild(mkRow('RFID Reader', mkIo(`evcs_${i}_rfidReadId`, rowCfg.rfidReadId, v => _updateEvcsField(i, 'rfidReadId', v))));

      dpDetails.appendChild(dpWrap);
      body.appendChild(dpDetails);

      // Herstellerunabhängige Ladebedarfserkennung. Die Felder sind optional:
      // bekannte OCPP-/IEC-/ABL-Zustände werden automatisch normalisiert, bei
      // unbekannten Herstellern kann der Installer die Rohwerte frei zuordnen.
      const demandDetails = document.createElement('details');
      demandDetails.style.marginTop = '8px';
      const demandSummary = document.createElement('summary');
      demandSummary.textContent = 'Ladebedarf / Herstellerstatus (optional)';
      demandSummary.style.cursor = 'pointer';
      demandSummary.style.userSelect = 'none';
      demandDetails.appendChild(demandSummary);
      const demandWrap = document.createElement('div');
      demandWrap.style.marginTop = '10px';
      demandWrap.style.display = 'grid';
      demandWrap.style.gap = '10px';

      const mkSemanticInput = (field, placeholder) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'nw-config-input';
        input.value = valueOrEmpty(rowCfg[field]);
        input.placeholder = placeholder;
        input.title = 'Mehrere Werte mit Komma, Semikolon oder Zeilenumbruch trennen. *Text* erlaubt Teiltreffer.';
        input.addEventListener('input', () => _updateEvcsField(i, field, String(input.value || '')));
        return input;
      };

      demandWrap.appendChild(mkRow('Fahrzeug verbunden: TRUE-Werte', mkSemanticInput('vehicleConnectedTrueValues', 'z.B. true, 1, connected')));
      demandWrap.appendChild(mkRow('Fahrzeug verbunden: FALSE-Werte', mkSemanticInput('vehicleConnectedFalseValues', 'z.B. false, 0, disconnected')));
      demandWrap.appendChild(mkRow('Ladebedarf: TRUE-Werte', mkSemanticInput('chargeDemandTrueValues', 'z.B. true, 1, demand')));
      demandWrap.appendChild(mkRow('Ladebedarf: FALSE-Werte', mkSemanticInput('chargeDemandFalseValues', 'z.B. false, 0, no-demand')));
      demandWrap.appendChild(mkRow('Status: Ladebereit / lädt', mkSemanticInput('statusDemandValues', 'z.B. B2, C2, ready-to-charge')));
      demandWrap.appendChild(mkRow('Status: verbunden, kein Bedarf', mkSemanticInput('statusConnectedValues', 'z.B. B1, connected')));
      demandWrap.appendChild(mkRow('Status: nicht verbunden', mkSemanticInput('statusDisconnectedValues', 'z.B. A1, available')));
      demandWrap.appendChild(mkRow('Status: Fahrzeug pausiert / kein Bedarf', mkSemanticInput('statusNoDemandValues', 'z.B. SuspendedEV, full')));
      const demandHint = document.createElement('div');
      demandHint.className = 'nw-muted';
      demandHint.textContent = 'Priorität: reale Leistung → expliziter Ladebedarf → Fahrzeugkontakt → normalisierter Status. „Available“ allein reserviert keine Ladeleistung.';
      demandWrap.appendChild(demandHint);
      demandDetails.appendChild(demandWrap);
      body.appendChild(demandDetails);

      // Erweitert (optional, aber hilfreich für stabile Regelung)
      const details = document.createElement('details');
      details.style.marginTop = '8px';
      const summary = document.createElement('summary');
      summary.textContent = 'Erweitert';
      summary.style.cursor = 'pointer';
      summary.style.userSelect = 'none';
      details.appendChild(summary);

      const adv = document.createElement('div');
      adv.style.marginTop = '10px';
      adv.style.display = 'grid';
      adv.style.gap = '10px';

      // Steuerpräferenz
      const ctrlSel = document.createElement('select');
      ctrlSel.className = 'nw-config-input';
      ctrlSel.innerHTML = '<option value="auto">auto</option><option value="currentA">currentA</option><option value="powerW">powerW</option>';
      {
        const cp = String((rowCfg && rowCfg.controlPreference) ? rowCfg.controlPreference : 'auto').trim().toLowerCase();
        // Alte `none`-/`off`-Konfigurationen werden auf den sichtbaren Standard
        // migriert. Deaktiviert wird ein Ladepunkt ausschliesslich ueber
        // „Aktiv (Regelung)“, damit Budgetstatus und Runtime nicht auseinanderlaufen.
        if (cp === 'none' || cp === 'off') rowCfg.controlPreference = 'auto';
        ctrlSel.value = (cp === 'currenta' || cp === 'current') ? 'currentA'
          : (cp === 'powerw' || cp === 'power') ? 'powerW'
          : 'auto';
      }
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an ctrlSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      ctrlSel.addEventListener('change', () => _updateEvcsField(i, 'controlPreference', String(ctrlSel.value)));
      adv.appendChild(mkRow('Steuerung', ctrlSel));

      // Speicher/Batterie: Installer gibt nur die Kundenbedienung frei.
      // Die eigentliche Kundenwahl passiert später im LIVE-/EVCS-Frontend pro Ladepunkt.
      const storageAssistAllowedInp = document.createElement('input');
      storageAssistAllowedInp.type = 'checkbox';
      storageAssistAllowedInp.className = 'nw-config-checkbox';
      const globalStorageAssistControl = sc.evcsGlobalStorageAssistCustomerAllowed === true && activeCount >= 2;
      storageAssistAllowedInp.checked = globalStorageAssistControl || !!(rowCfg && rowCfg.storageAssistCustomerAllowed === true);
      storageAssistAllowedInp.disabled = globalStorageAssistControl;
      storageAssistAllowedInp.title = globalStorageAssistControl
        ? 'Im Multi-Lademanagement zentral für alle Ladepunkte freigegeben.'
        : 'Freigabe ausschließlich für diesen Ladepunkt.';
      storageAssistAllowedInp.addEventListener('change', () => _updateEvcsField(i, 'storageAssistCustomerAllowed', !!storageAssistAllowedInp.checked));
      adv.appendChild(mkRow(globalStorageAssistControl ? 'Speicher-Mitnutzung: global freigegeben' : 'Kunde darf Speicher-Mitnutzung bedienen', storageAssistAllowedInp));

      // Phasen
      const phasesSel = document.createElement('select');
      phasesSel.className = 'nw-config-input';
      phasesSel.innerHTML = '<option value="1">1</option><option value="3">3</option>';
      {
        const p = Number(rowCfg.phases);
        phasesSel.value = (p === 1) ? '1' : '3';
      }
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an phasesSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      phasesSel.addEventListener('change', () => _updateEvcsField(i, 'phases', _clampInt(phasesSel.value, 1, 3, 3)));
      adv.appendChild(mkRow('Netzanschluss: Phasen', phasesSel));

      const dcElectricalWrap = document.createElement('div');
      dcElectricalWrap.style.display = tVal === 'dc' ? 'grid' : 'none';
      dcElectricalWrap.style.gap = '10px';
      const dcCurrentSelect = document.createElement('select');
      dcCurrentSelect.className = 'nw-config-input';
      dcCurrentSelect.innerHTML = '<option value="">Bei Stromsteuerung auswählen</option><option value="ac-input">AC-Netzstrom am Eingang</option><option value="dc-output">DC-Ladestrom am Ausgang</option>';
      dcCurrentSelect.value = String(rowCfg.dcCurrentReference || '');
      dcCurrentSelect.addEventListener('change', () => _updateEvcsField(i, 'dcCurrentReference', dcCurrentSelect.value));
      dcElectricalWrap.appendChild(mkRow('DC-Station: Strom-Datenpunkt beschreibt', dcCurrentSelect));
      dcElectricalWrap.appendChild(mkRow('DC-Ausgangsspannung (V), nur bei DC-Ladestrom', mkIo(`evcs_${i}_dcVoltageId`, rowCfg.dcVoltageId, v => _updateEvcsField(i, 'dcVoltageId', v))));
      adv.appendChild(dcElectricalWrap);
      typeSel.addEventListener('change', () => { dcElectricalWrap.style.display = typeSel.value === 'dc' ? 'grid' : 'none'; });


      // AC 1p/3p PV-Automatik
      const phaseModeSel = document.createElement('select');
      phaseModeSel.className = 'nw-config-input';
      phaseModeSel.innerHTML = '<option value="fixed-1p">Fest 1-phasig</option><option value="fixed-3p">Fest 3-phasig</option><option value="auto-pv">Auto PV 1p/3p</option>';
      {
        const pm = String((rowCfg && rowCfg.phaseMode) ? rowCfg.phaseMode : (Number(rowCfg.phases) === 1 ? 'fixed-1p' : 'fixed-3p')).trim().toLowerCase();
        phaseModeSel.value = (pm === 'auto-pv' || pm === 'autopv' || pm === 'auto') ? 'auto-pv' : ((pm === 'fixed-1p' || pm === '1p') ? 'fixed-1p' : 'fixed-3p');
      }
      phaseModeSel.addEventListener('change', () => _updateEvcsField(i, 'phaseMode', String(phaseModeSel.value)));
      adv.appendChild(mkRow('AC-Phasenmodus', phaseModeSel));

      const stopBeforePhaseInp = document.createElement('input');
      stopBeforePhaseInp.type = 'checkbox';
      stopBeforePhaseInp.className = 'nw-config-checkbox';
      stopBeforePhaseInp.checked = !(rowCfg && rowCfg.stopBeforePhaseSwitch === false);
      stopBeforePhaseInp.addEventListener('change', () => _updateEvcsField(i, 'stopBeforePhaseSwitch', !!stopBeforePhaseInp.checked));
      adv.appendChild(mkRow('Vor Phasenwechsel stoppen', stopBeforePhaseInp));

      const mkSmallText = (field, placeholder) => {
        const input = document.createElement('input');
        input.className = 'nw-config-input';
        input.type = 'text';
        input.placeholder = placeholder || '';
        input.value = rowCfg && rowCfg[field] !== undefined && rowCfg[field] !== null ? String(rowCfg[field]) : '';
        input.addEventListener('change', () => _updateEvcsField(i, field, String(input.value || '').trim()));
        return input;
      };
      adv.appendChild(mkRow('Wert für 1p', mkSmallText('phaseSwitchValue1p', '1')));
      adv.appendChild(mkRow('Wert für 3p', mkSmallText('phaseSwitchValue3p', '3')));

      const mkNumPhase = (field, placeholder, min, step, fallback) => {
        const input = document.createElement('input');
        input.className = 'nw-config-input';
        input.type = 'number';
        input.min = String(min || 0);
        input.step = String(step || 1);
        input.placeholder = String(placeholder || '');
        input.value = (rowCfg && Number.isFinite(Number(rowCfg[field])) && Number(rowCfg[field]) > 0) ? String(Number(rowCfg[field])) : '';
        input.addEventListener('change', () => {
          const v = Number(input.value);
          _updateEvcsField(i, field, (Number.isFinite(v) && v > 0) ? v : fallback);
        });
        return input;
      };
      adv.appendChild(mkRow('1p → 3p ab stabil W', mkNumPhase('phaseSwitchUpThresholdW', '4800', 0, 1, 4800)));
      adv.appendChild(mkRow('3p → 1p unter W', mkNumPhase('phaseSwitchDownThresholdW', '3700', 0, 1, 3700)));
      adv.appendChild(mkRow('Hoch-Stabilität (s)', mkNumPhase('phaseSwitchUpStableSec', '300', 0, 1, 300)));
      adv.appendChild(mkRow('Runter-Stabilität (s)', mkNumPhase('phaseSwitchDownStableSec', '120', 0, 1, 120)));
      adv.appendChild(mkRow('Cooldown (s)', mkNumPhase('phaseSwitchCooldownSec', '900', 0, 1, 900)));
      adv.appendChild(mkRow('Wartezeit nach Wechsel (s)', mkNumPhase('phaseSwitchSettleSec', '30', 0, 1, 30)));

      // Spannung
      const vInput = document.createElement('input');
      vInput.className = 'nw-config-input';
      vInput.type = 'number';
      vInput.min = '1';
      vInput.step = '1';
      vInput.placeholder = '230';
      vInput.value = String((rowCfg && Number.isFinite(Number(rowCfg.voltageV)) && Number(rowCfg.voltageV) > 0) ? Math.round(Number(rowCfg.voltageV)) : 230);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an vInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      vInput.addEventListener('change', () => {
        const v = Number(vInput.value);
        _updateEvcsField(i, 'voltageV', (Number.isFinite(v) && v > 0) ? Math.round(v) : 230);
      });
      adv.appendChild(mkRow('Spannung (V)', vInput));

      // Grenzen / Schritte
      const minAInput = document.createElement('input');
      minAInput.className = 'nw-config-input';
      minAInput.type = 'number';
      minAInput.min = '0';
      minAInput.step = '0.1';
      minAInput.placeholder = 'Technischer Mindeststrom in A';
      minAInput.value = (rowCfg && Number(rowCfg.minCurrentA) > 0 && Number.isFinite(Number(rowCfg.minCurrentA))) ? String(Number(rowCfg.minCurrentA)) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an minAInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      minAInput.addEventListener('change', () => {
        const v = Number(minAInput.value);
        _updateEvcsField(i, 'minCurrentA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Min Strom (A)', minAInput));

      const maxAInput = document.createElement('input');
      maxAInput.className = 'nw-config-input';
      maxAInput.type = 'number';
      maxAInput.min = '0';
      maxAInput.step = '0.1';
      maxAInput.placeholder = 'Maximal zulässiger Strom in A';
      maxAInput.value = (rowCfg && Number(rowCfg.maxCurrentA) > 0 && Number.isFinite(Number(rowCfg.maxCurrentA))) ? String(Number(rowCfg.maxCurrentA)) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxAInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxAInput.addEventListener('change', () => {
        const v = Number(maxAInput.value);
        _updateEvcsField(i, 'maxCurrentA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Max Strom (A)', maxAInput));

      const minWInput = document.createElement('input');
      minWInput.className = 'nw-config-input';
      minWInput.type = 'number';
      minWInput.min = '1';
      minWInput.step = '1';
      minWInput.placeholder = 'Technische Mindestleistung in W';
      minWInput.value = Number(rowCfg.minPowerW) > 0 ? String(rowCfg.minPowerW) : '';
      minWInput.addEventListener('change', () => _updateEvcsField(i, 'minPowerW', Number(minWInput.value) || 0));
      adv.appendChild(mkRow('Min Leistung (W)', minWInput));

      const maxWInput = document.createElement('input');
      maxWInput.className = 'nw-config-input';
      maxWInput.type = 'number';
      maxWInput.min = '0';
      maxWInput.step = '1';
      maxWInput.placeholder = 'Maximal zulässige Leistung in W';
      maxWInput.value = (rowCfg && Number(rowCfg.maxPowerW) > 0 && Number.isFinite(Number(rowCfg.maxPowerW))) ? String(Math.round(Number(rowCfg.maxPowerW))) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxWInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxWInput.addEventListener('change', () => {
        const v = Number(maxWInput.value);
        _updateEvcsField(i, 'maxPowerW', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Max Leistung (W)', maxWInput));

      const stepAInput = document.createElement('input');
      stepAInput.className = 'nw-config-input';
      stepAInput.type = 'number';
      stepAInput.min = '0';
      stepAInput.step = '0.1';
      stepAInput.placeholder = '0 = Standard';
      stepAInput.value = (rowCfg && Number(rowCfg.stepA) > 0 && Number.isFinite(Number(rowCfg.stepA))) ? String(Number(rowCfg.stepA)) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an stepAInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      stepAInput.addEventListener('change', () => {
        const v = Number(stepAInput.value);
        _updateEvcsField(i, 'stepA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Step Strom (A)', stepAInput));

      const stepWInput = document.createElement('input');
      stepWInput.className = 'nw-config-input';
      stepWInput.type = 'number';
      stepWInput.min = '0';
      stepWInput.step = '1';
      stepWInput.placeholder = '0 = Standard';
      stepWInput.value = (rowCfg && Number(rowCfg.stepW) > 0 && Number.isFinite(Number(rowCfg.stepW))) ? String(Math.round(Number(rowCfg.stepW))) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an stepWInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      stepWInput.addEventListener('change', () => {
        const v = Number(stepWInput.value);
        _updateEvcsField(i, 'stepW', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Step Leistung (W)', stepWInput));

      // Boost
      const allowBoostInp = document.createElement('input');
      allowBoostInp.type = 'checkbox';
      allowBoostInp.className = 'nw-config-checkbox';
      allowBoostInp.checked = (rowCfg && rowCfg.allowBoost !== false);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an allowBoostInp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      allowBoostInp.addEventListener('change', () => _updateEvcsField(i, 'allowBoost', !!allowBoostInp.checked));
      adv.appendChild(mkRow('Boost erlauben', allowBoostInp));
      adv.appendChild(mkRow('Maximaler Netzanteil je Ladepunkt (W, Nulleinspeisung)', _buildEvcsBoostLimitInput(rowCfg, (value) => _updateEvcsField(i, 'boostMaxPowerW', value))));
      const boostLimitHint = document.createElement('div');
      boostLimitHint.className = 'nw-muted';
      boostLimitHint.textContent = 'Nur bei aktiver Nulleinspeisung: maximaler Netzanteil dieses Ladepunkts. Zugeordnete gemessene PV-Leistung kommt zusätzlich hinzu, z. B. 3700 W Netz + 5000 W PV = bis zu 8700 W. Bei freigegebener Speicher-Mitnutzung kann bestätigte Speicherleistung ebenfalls beitragen; Hausversorgung und geschützte Ladepunkte werden berücksichtigt. Min+PV und Auto-Grundbetrieb nutzen sie nur für eine fehlende Mindestleistung, reines PV-Laden nutzt keinen Speicheranteil. Leer = keine zusätzliche Netzgrenze; 0 = kein Netzanteil. Ohne ausreichende bestätigte Leistung bleibt der Ladepunkt pausiert. Technische LP-, Stations-, Phasen-, §14a- und NVP-Grenzen bleiben vorrangig. Ohne Nulleinspeisung bleibt die bisherige Regelung unverändert.';
      adv.appendChild(boostLimitHint);

      const boostTInput = document.createElement('input');
      boostTInput.className = 'nw-config-input';
      boostTInput.type = 'number';
      boostTInput.min = '0';
      boostTInput.step = '1';
      boostTInput.placeholder = '0 = Standard';
      boostTInput.value = (rowCfg && Number(rowCfg.boostTimeoutMin) > 0 && Number.isFinite(Number(rowCfg.boostTimeoutMin))) ? String(Math.round(Number(rowCfg.boostTimeoutMin))) : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an boostTInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      boostTInput.addEventListener('change', () => {
        const v = Number(boostTInput.value);
        _updateEvcsField(i, 'boostTimeoutMin', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Boost Timeout (min)', boostTInput));

      const electricalHint = document.createElement('div');
      electricalHint.className = 'nw-muted';
      electricalHint.setAttribute('role', 'status');
      const refreshElectricalHint = () => {
        const liveRow = (_ensureSettingsConfig().evcsList || [])[i - 1] || rowCfg;
        const check = window.NexoWattEvcsElectricalLimits.validateEvcsElectricalConfig(liveRow);
        electricalHint.textContent = check.valid
          ? 'Grenzwerte für die gewählte Steuerung vollständig. Stations- und Netzgrenzen bleiben zusätzlich wirksam.'
          : 'Regelung gesperrt: ' + check.errors.join(' ');
        electricalHint.style.color = check.valid ? '' : '#c2410c';
        if (!check.valid) details.open = true;
      };
      details.appendChild(adv);
      body.appendChild(electricalHint);
      body.appendChild(details);
      body.addEventListener('change', refreshElectricalHint);
      refreshElectricalHint();

      card.appendChild(header);
      card.appendChild(body);

      return card;
    };

    // Render Station cards
    for (const stationKey of stationKeys) {
      const sk = normKey(stationKey);
      const isUnassigned = !sk;

      // find ports for this station key
      const ports = [];
      for (let i = 1; i <= count; i++) {
        const rowCfg = list[i - 1] || {};
        const k = normKey(rowCfg.stationKey);
        if (isUnassigned) {
          if (!k) ports.push(i);
        } else {
          if (k === sk) ports.push(i);
        }
      }

      // show station if either ports exist OR it's explicitly configured as stationGroup
      const hasGroup = !isUnassigned && groupIndexByKey.has(sk);
      if (!ports.length && !hasGroup) continue;
      if (isUnassigned && !ports.length) continue;

      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.style.gridColumn = '1 / -1';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';

      const stationName = (!isUnassigned && hasGroup && sc.stationGroups[groupIndexByKey.get(sk)] && sc.stationGroups[groupIndexByKey.get(sk)].name)
        ? String(sc.stationGroups[groupIndexByKey.get(sk)].name || '').trim()
        : '';

      if (isUnassigned) title.textContent = 'Unzugeordnet';
      else title.textContent = stationName ? `Station ${sk} – ${stationName}` : `Station ${sk}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      // Station reorder (only for configured stationGroups)
      if (!isUnassigned && hasGroup) {
        const btnSU = document.createElement('button');
        btnSU.type = 'button';
        btnSU.className = 'nw-config-mini-btn';
        btnSU.textContent = '↑';
        btnSU.title = 'Station in der Reihenfolge nach oben';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnSU. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btnSU.addEventListener('click', () => moveStationGroup(sk, -1));

        const btnSD = document.createElement('button');
        btnSD.type = 'button';
        btnSD.className = 'nw-config-mini-btn';
        btnSD.textContent = '↓';
        btnSD.title = 'Station in der Reihenfolge nach unten';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnSD. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btnSD.addEventListener('click', () => moveStationGroup(sk, +1));

        actions.appendChild(btnSU);
        actions.appendChild(btnSD);
      }

      const btnAddPort = document.createElement('button');
      btnAddPort.type = 'button';
      btnAddPort.className = 'nw-config-btn nw-config-btn--ghost';
      btnAddPort.textContent = '+ Port';
      btnAddPort.title = 'Neuen Ladepunkt/Port hinzufügen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnAddPort. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btnAddPort.addEventListener('click', () => addPortToStation(sk));
      actions.appendChild(btnAddPort);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = isUnassigned
        ? `Ports ohne stationKey (${ports.length})`
        : `Ports in Station: ${ports.length}`;
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Station settings (only if stationKey set)
      if (!isUnassigned) {
        const gi = ensureGroupForKey(sk);

        const stationKeyInput = document.createElement('input');
        stationKeyInput.className = 'nw-config-input';
        stationKeyInput.type = 'text';
        stationKeyInput.value = sk;
        stationKeyInput.placeholder = 'stationKey';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an stationKeyInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        stationKeyInput.addEventListener('change', () => {
          const nk = normKey(stationKeyInput.value);
          renameStationKey(sk, nk);
        });
        body.appendChild(mkRow('Station Key', stationKeyInput));

        const nameInput = document.createElement('input');
        nameInput.className = 'nw-config-input';
        nameInput.type = 'text';
        nameInput.placeholder = 'Name (optional)';
        nameInput.value = valueOrEmpty(sc.stationGroups[gi] && sc.stationGroups[gi].name);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an nameInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        nameInput.addEventListener('input', () => {
          sc.stationGroups[gi] = sc.stationGroups[gi] || {};
          sc.stationGroups[gi].name = String(nameInput.value || '').trim();
          try { buildStationGroupsUI(); } catch (_e) {}
        });
        body.appendChild(mkRow('Name', nameInput));

        const maxPowerKw = document.createElement('input');
        maxPowerKw.className = 'nw-config-input';
        maxPowerKw.type = 'number';
        maxPowerKw.min = '0';
        maxPowerKw.step = '0.1';
        maxPowerKw.placeholder = '0 = kein Cap';
        maxPowerKw.value = numOrEmpty(sc.stationGroups[gi] && sc.stationGroups[gi].maxPowerKw);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxPowerKw. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        maxPowerKw.addEventListener('change', () => {
          const n = Number(maxPowerKw.value);
          sc.stationGroups[gi] = sc.stationGroups[gi] || {};
          sc.stationGroups[gi].maxPowerKw = Number.isFinite(n) ? n : 0;
          try { buildStationGroupsUI(); } catch (_e) {}
        });
        body.appendChild(mkRow('Stationslimit (kW)', maxPowerKw));
      } else {
        const info = document.createElement('div');
        info.className = 'nw-config-empty';
        info.textContent = 'Tipp: Setze bei Ports einen stationKey, um sie einer Station zuzuordnen (z.B. DC-Station mit mehreren Ports).';
        body.appendChild(info);
      }

      // Ports grid
      const portsWrap = document.createElement('div');
      portsWrap.className = 'nw-config-grid';
      portsWrap.style.marginTop = '8px';
      portsWrap.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';

      for (const idx of ports) {
        portsWrap.appendChild(createPortCard(idx, sk));
      }

      body.appendChild(portsWrap);

      card.appendChild(header);
      card.appendChild(body);
      els.evcsList.appendChild(card);
    }
  }
  /**
   * Code-Teil: buildStationGroupsUI
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildStationGroupsUI() {
    if (!els.stationGroups) return;
    const sc = _ensureSettingsConfig();
    const arr = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
    sc.stationGroups = arr;
    els.stationGroups.innerHTML = '';

    if (!arr.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Stationsgruppen angelegt.';
      els.stationGroups.appendChild(empty);
      return;
    }

    arr.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = g && g.stationKey ? String(g.stationKey) : `Gruppe ${idx + 1}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = 'stationKey / Name / maxPowerKw';

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '6px';
      right.style.alignItems = 'center';

      const stationKey = document.createElement('input');
      stationKey.className = 'nw-config-input';
      stationKey.type = 'text';
      stationKey.placeholder = 'stationKey';
      stationKey.value = valueOrEmpty(g && g.stationKey);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an stationKey. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      stationKey.addEventListener('input', () => {
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].stationKey = String(stationKey.value || '').trim();
        title.textContent = sc.stationGroups[idx].stationKey || `Gruppe ${idx + 1}`;
      });

      const name = document.createElement('input');
      name.className = 'nw-config-input';
      name.type = 'text';
      name.placeholder = 'Name (optional)';
      name.value = valueOrEmpty(g && g.name);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an name. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      name.addEventListener('input', () => {
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].name = String(name.value || '').trim();
      });

      const maxPowerKw = document.createElement('input');
      maxPowerKw.className = 'nw-config-input';
      maxPowerKw.type = 'number';
      maxPowerKw.min = '0';
      maxPowerKw.step = '0.1';
      maxPowerKw.placeholder = 'maxPowerKw';
      maxPowerKw.value = numOrEmpty(g && g.maxPowerKw);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxPowerKw. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxPowerKw.addEventListener('change', () => {
        const n = Number(maxPowerKw.value);
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].maxPowerKw = Number.isFinite(n) ? n : 0;
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        sc.stationGroups.splice(idx, 1);
        buildStationGroupsUI();
      });

      right.appendChild(stationKey);
      right.appendChild(name);
      right.appendChild(maxPowerKw);
      right.appendChild(del);

      row.appendChild(left);
      row.appendChild(right);

      els.stationGroups.appendChild(row);
    });
  }
  /**
   * Code-Teil: collectSettingsConfigFromUI
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function collectSettingsConfigFromUI() {
    const out = deepMerge({}, (currentConfig && currentConfig.settingsConfig) ? currentConfig.settingsConfig : {});
    const count = _clampInt(els.evcsCount ? els.evcsCount.value : out.evcsCount, 0, _maxEvcsCount(), 0);
    out.evcsCount = count;

    if (els.evcsMaxPowerKw) {
      const kw = Number(els.evcsMaxPowerKw.value);
      out.evcsMaxPowerKw = Number.isFinite(kw) ? kw : (Number.isFinite(Number(out.evcsMaxPowerKw)) ? Number(out.evcsMaxPowerKw) : 11);
    }
    // evcsList is maintained live via _updateEvcsField. Still ensure correct length.
    out.evcsList = _ensureEvcsList(count);
    if (els.evcsGlobalStorageAssistCustomerAllowed) {
      const activeCount = out.evcsList.filter((row) => row && row.enabled !== false).length;
      out.evcsGlobalStorageAssistCustomerAllowed = activeCount >= 2 && !!els.evcsGlobalStorageAssistCustomerAllowed.checked;
    }

    // stationGroups maintained live
    out.stationGroups = Array.isArray(_ensureSettingsConfig().stationGroups) ? _ensureSettingsConfig().stationGroups : [];
    return out;
  }
  /**
   * Code-Teil: applyConfigToUI
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyConfigToUI(cfg) {
    currentConfig = cfg || {};
    currentLicenseInfo = normalizeLicenseInfo(currentConfig.license);

    // Apps
    // 0.8.7 Hotfix: Die App-Liste hängt von der Lizenzedition ab. Beim Seitenstart
    // wurde buildAppsUI() noch mit "Keine Lizenz" gerendert; applyConfigToUI() setzte
    // danach zwar currentLicenseInfo=EOS/HEMS, baute die Liste aber nicht neu. Dadurch
    // blieb trotz gültiger EOS-Lizenz "Keine Apps verfügbar" stehen. Deshalb zuerst
    // die lizenzabhängige App-Struktur neu erzeugen, danach die gespeicherten Toggles setzen.
    try { buildAppsUI(); } catch (_eBuildApps) {}
    setAppsFromConfig(currentConfig);
    try { if (window.NexoWattEnergyOriginAppCenter) window.NexoWattEnergyOriginAppCenter.apply(currentConfig, _licenseEdition()); } catch (_eLedgerUi) {}
    // 1.0.3: Pro-only Komponenten werden unter Home nicht initialisiert. Alte, vor
    // dem Lizenzwechsel gespeicherte `installed=true`-Flags dürfen dadurch weder
    // versteckte Pro-API-Aufrufe noch einen globalen Auth-Dialog auslösen.
    try {
      if (_isAppLicensed('netOperator') && window.NexoWattNetOperatorAppCenter) {
        window.NexoWattNetOperatorAppCenter.apply(currentConfig, _licenseEdition());
      } else if (els.netOperatorMount) {
        els.netOperatorMount.innerHTML = '';
      }
    } catch (_eNetOperatorUi) {}
    try {
      if (_isAppLicensed('operatingStrategies') && window.NexoWattOperatingStrategiesAppCenter) {
        window.NexoWattOperatingStrategiesAppCenter.apply(currentConfig, _licenseEdition());
      } else if (els.operatingStrategiesMount) {
        els.operatingStrategiesMount.innerHTML = '';
      }
    } catch (_eOperatingStrategiesUi) {}

    // Plant params
    els.gridConnectionPower.value = numOrEmpty(currentConfig.installerConfig && currentConfig.installerConfig.gridConnectionPower);
    els.schedulerIntervalMs.value = numOrEmpty(currentConfig.schedulerIntervalMs);

    // TypeScript-Migration: kontrollierter Energiefluss-Schaltmodus in die UI übernehmen.
    // Diese Felder liegen im App-Center bewusst im Status-/Diagnosebereich und nicht im Kundenfrontend.
    try { applyEnergyFlowTsModeToUi(currentConfig); } catch (_e) {}

    const dps = currentConfig.datapoints || {};
    if (els.gridPointPowerId) els.gridPointPowerId.value = valueOrEmpty(dps.gridPointPower);

    // Show current NVP mapping clearly (hint line)
    if (els.gridPointPowerIdDisplay) {
      const v = String((dps.gridPointPower || '')).trim();
      els.gridPointPowerIdDisplay.textContent = v ? ('Aktuell: ' + v) : 'Aktuell: nicht gesetzt';
    }

    // Netzpunkt – Connected/Watchdog (optional, für STALE_METER Robustheit)
    if (els.gridPointConnectedId) els.gridPointConnectedId.value = valueOrEmpty(dps.gridPointConnected);
    if (els.gridPointConnectedIdDisplay) {
      const v = String((dps.gridPointConnected || '')).trim();
      // Keep hint text but prepend current value if available
      const base = els.gridPointConnectedIdDisplay.dataset.baseHint || els.gridPointConnectedIdDisplay.textContent || '';
      if (!els.gridPointConnectedIdDisplay.dataset.baseHint) els.gridPointConnectedIdDisplay.dataset.baseHint = base;
      els.gridPointConnectedIdDisplay.innerHTML = (v ? ('Aktuell: <code>' + v + '</code><br/>') : '') + (els.gridPointConnectedIdDisplay.dataset.baseHint || '');
    }

    if (els.gridPointWatchdogId) els.gridPointWatchdogId.value = valueOrEmpty(dps.gridPointWatchdog);
    if (els.gridPointWatchdogIdDisplay) {
      const v = String((dps.gridPointWatchdog || '')).trim();
      const base = els.gridPointWatchdogIdDisplay.dataset.baseHint || els.gridPointWatchdogIdDisplay.textContent || '';
      if (!els.gridPointWatchdogIdDisplay.dataset.baseHint) els.gridPointWatchdogIdDisplay.dataset.baseHint = base;
      els.gridPointWatchdogIdDisplay.innerHTML = (v ? ('Aktuell: <code>' + v + '</code><br/>') : '') + (els.gridPointWatchdogIdDisplay.dataset.baseHint || '');
    }

    // Energiefluss-Monitor (Tab: Basis + optionale Verbraucher/Erzeuger)
    if (els.dpFlow) {
      buildDpTable(
        els.dpFlow,
        FLOW_BASE_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        {
          idPrefix: 'flow_',
          afterRow: (field, _row, container) => {
            if (field && field.key === 'pvPower') {
              // Optional: rename PV main node (PV 1) for clarity
              container.appendChild(buildFlowPvNameRow());
            }
          }
        }
      );


      // Hinweis: Minimal erforderlich sind entweder separate Import/Export-Datenpunkte
      // oder ein einzelner Signed-NVP-Datenpunkt (Import + / Export -).
      try {
        const info = document.createElement('div');
        info.className = 'nw-config-empty';
        info.style.margin = '0 0 6px 0';
        info.textContent = 'Minimal erforderlich: entweder Netz Bezug + Netz Einspeisung oder der Fallback „Netz Leistung (Vorzeichen)“. PV/Verbrauch/Batterie werden automatisch abgeleitet, wenn leer (Override möglich).';
        els.dpFlow.prepend(info);
      } catch (_e) {}

      try {
        const flowGridPointInput = document.getElementById('flow_gridPointPower');
        if (flowGridPointInput) {
          flowGridPointInput.value = valueOrEmpty(dps.gridPointPower);
          if (!flowGridPointInput.dataset.syncGeneral) {
            flowGridPointInput.dataset.syncGeneral = '1';
            // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an flowGridPointInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
            flowGridPointInput.addEventListener('change', () => {
              const v = String(flowGridPointInput.value || '').trim();
              if (els.gridPointPowerId && els.gridPointPowerId.value !== v) {
                els.gridPointPowerId.value = v;
              }
              if (els.gridPointPowerIdDisplay) {
                els.gridPointPowerIdDisplay.textContent = v ? ('Aktuell: ' + v) : 'Aktuell: nicht gesetzt';
              }
            });
          }
        }
      } catch (_e) {}
    }

    // Optionale Verbraucher/Erzeuger (max. 10/10) + Namen
    buildFlowSlotsUI('consumers', FLOW_CONSUMER_SLOT_COUNT);
    buildFlowSlotsUI('producers', FLOW_PRODUCER_SLOT_COUNT);

    // Thermik (Wärmepumpe/Heizung/Klima) – nutzt Verbraucher‑Slots
    try { buildThermalUI(); } catch (_e) {}
    try { buildHeatingRodUI(); } catch (_e) {}

    // BHKW (Start/Stop, SoC-geführt)
    try { buildBhkwUI(); } catch (_e) {}

    // Generator (Notstrom/Netzparallelbetrieb, SoC-geführt)
    try { buildGeneratorUI(); } catch (_e) {}

    // §14a (Netzsteuerung)
    try { buildPara14aUI(); } catch (_e) {}

    // Direkte Tarifprovider + bestehende Tarif-DP-Zuordnung.
    try { applyTariffProviderUI(currentConfig && currentConfig.tariffProvider); } catch (_e) {}
    // Tarife
    if (els.dpTariffs) {
      buildDpTable(
        els.dpTariffs,
        TARIFF_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'tar_' }
      );
    }
    if (els.dpPvForecast) buildDpTable(els.dpPvForecast, PV_FORECAST_DP_FIELDS,
      (key) => dps[key], (key, val) => {
        currentConfig.datapoints = currentConfig.datapoints || {};
        currentConfig.datapoints[key] = val;
      }, { idPrefix: 'pvfc_' });

    // Live-Kacheln
    if (els.dpLive) {
      buildDpTable(
        els.dpLive,
        LIVE_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'live_' }
      );
    }

    // Wetter (optional)
    if (els.dpWeather) {
      buildDpTable(
        els.dpWeather,
        WEATHER_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'wth_' }
      );
    }

    // Energiefluss-Optionen (wie bisherige Instanzeinstellungen)
    const st = (currentConfig && currentConfig.settings && typeof currentConfig.settings === 'object') ? currentConfig.settings : {};
    if (els.flowSubtractEvFromBuilding) els.flowSubtractEvFromBuilding.checked = (st.flowSubtractEvFromBuilding !== undefined) ? !!st.flowSubtractEvFromBuilding : true;
    if (els.flowInvertGrid) els.flowInvertGrid.checked = !!st.flowInvertGrid;
    if (els.gridInvertGrid) els.gridInvertGrid.checked = !!st.flowInvertGrid;
    if (els.flowInvertBattery) els.flowInvertBattery.checked = !!st.flowInvertBattery;
    if (els.flowInvertPv) els.flowInvertPv.checked = !!st.flowInvertPv;
    if (els.flowInvertEv) els.flowInvertEv.checked = !!st.flowInvertEv;
    if (els.flowGridShowNet) els.flowGridShowNet.checked = (st.flowGridShowNet !== undefined) ? !!st.flowGridShowNet : true;

    // Einheit pro Leistungs-Datenpunkt (W/kW) – alle vorhandenen Toggles syncen
    try {
      document.querySelectorAll('input[data-flow-power-unit-key]').forEach((cb) => {
        const k = cb.getAttribute('data-flow-power-unit-key');
        if (!k) return;
        cb.checked = _getFlowPowerDpIsW(k);
      });
    } catch (_e) {}

    // Peak-Shaving / Lastspitzenkappung
    try { buildPeakShavingUI(); } catch (_e) {}

    // KI‑Energieberater
    try { buildAiAdvisorUI(); } catch (_e) {}

    // Storage
    currentConfig.storage = (currentConfig.storage && typeof currentConfig.storage === 'object') ? currentConfig.storage : {};
    currentConfig.storage.allowGridCharge = currentConfig.storage.allowGridCharge !== false;
    const mode = (currentConfig.storage && typeof currentConfig.storage.controlMode === 'string') ? currentConfig.storage.controlMode : 'targetPower';
    els.storageControlMode.value = (['targetPower','limits','enableFlags'].includes(mode)) ? mode : 'targetPower';
    if (els.storageAllowGridCharge) els.storageAllowGridCharge.checked = currentConfig.storage.allowGridCharge !== false;
    if (els.storageCouplingMode) {
      const couplingRaw = currentConfig.storage && typeof currentConfig.storage.coupling === 'string' ? currentConfig.storage.coupling.trim().toLowerCase() : 'ac';
      els.storageCouplingMode.value = couplingRaw === 'dc' ? 'dc' : 'ac';
    }
    updateStorageCouplingUi();

    // Optional: Kapazität (kWh) – relevant für PV‑Forecast / Tarif‑Netzladeentscheidungen
    if (els.storageCapacityKWh) {
      const cap = Number(currentConfig.storage && currentConfig.storage.capacityKWh);
      els.storageCapacityKWh.value = (Number.isFinite(cap) && cap > 0) ? String(cap) : '';
    }
    if (els.storageRatedPowerKW) {
      const ratedW = Number(currentConfig.storage && currentConfig.storage.ratedPowerW);
      els.storageRatedPowerKW.value = (Number.isFinite(ratedW) && ratedW > 0)
        ? String(Math.round((ratedW / 1000) * 10) / 10)
        : '';
    }
    updateStorageLicensePowerUi();
    const stSelf = (currentConfig.storage && typeof currentConfig.storage === 'object') ? currentConfig.storage : {};
    const stSelfSourceMarker = String(stSelf.multiUsePolicySource || '').trim().toLowerCase();
    const stSelfAppliedMarker = stSelf.multiUsePolicyApplied === true
      || stSelf.multiUsePolicyApplied === 1
      || String(stSelf.multiUsePolicyApplied || '').trim().toLowerCase() === 'true';
    const stSelfWasMultiUseMirrored = stSelfAppliedMarker
      || stSelfSourceMarker === 'installerconfig.storagemultiuse'
      || stSelfSourceMarker.includes('multiuse-applied');
    if (els.storageSelfTargetGridImportW) {
      const standaloneTargetW = stSelf.standaloneSelfTargetGridImportW !== undefined
        ? stSelf.standaloneSelfTargetGridImportW
        : (!stSelfWasMultiUseMirrored ? stSelf.selfTargetGridImportW : 50);
      els.storageSelfTargetGridImportW.value = Number.isFinite(Number(standaloneTargetW)) ? String(Math.round(Number(standaloneTargetW))) : '50';
    }
    if (els.storageSelfImportThresholdW) {
      const standaloneDeadbandW = stSelf.standaloneSelfImportThresholdW !== undefined
        ? stSelf.standaloneSelfImportThresholdW
        : (!stSelfWasMultiUseMirrored ? stSelf.selfImportThresholdW : 20);
      els.storageSelfImportThresholdW.value = Number.isFinite(Number(standaloneDeadbandW)) ? String(Math.round(Number(standaloneDeadbandW))) : '20';
    }
    if (els.storageSelfNvpSmoothingSec) els.storageSelfNvpSmoothingSec.value = Number.isFinite(Number(stSelf.selfNvpSmoothingSec)) ? String(Math.round(Number(stSelf.selfNvpSmoothingSec))) : '8';
    if (els.storageSelfNvpRawGuardW) els.storageSelfNvpRawGuardW.value = Number.isFinite(Number(stSelf.selfNvpRawGuardW)) ? String(Math.round(Number(stSelf.selfNvpRawGuardW))) : '100';
    if (els.storageBalanceFeedbackHoldSec) {
      const explicitHoldSec = Number(stSelf.balanceFeedbackHoldSec);
      const legacyHoldSec = Number(stSelf.balanceFeedbackMaxAgeMs) / 1000;
      const effectiveHoldSec = Number.isFinite(explicitHoldSec) && explicitHoldSec > 0
        ? explicitHoldSec
        : (Number.isFinite(legacyHoldSec) && legacyHoldSec > 0 ? Math.max(45, legacyHoldSec) : 45);
      els.storageBalanceFeedbackHoldSec.value = String(Math.round(effectiveHoldSec));
    }
    const stF = (currentConfig.storage && typeof currentConfig.storage === 'object') ? currentConfig.storage : {};
    const legacyFeneconModeActive = (typeof stF.feneconGridControlEnabled === 'boolean')
      ? !!stF.feneconGridControlEnabled
      : !!stF.feneconAcMode;
    const vendorProfile = normalizeStorageVendorProfile(stF.vendorProfile || (legacyFeneconModeActive ? 'fenecon-openems' : (stF.sungrowHybridEnabled ? 'sungrow-hybrid' : (stF.e3dcRscpEnabled ? 'e3dc-rscp' : 'generic'))));
    if (els.storageVendorProfile) els.storageVendorProfile.value = vendorProfile;
    updateStorageVendorProfileUi();

    const feneconModeActive = vendorProfile === 'fenecon-openems';
    const e3dcModeActive = vendorProfile === 'e3dc-rscp';
    if (els.storageFeneconControlMode) {
      const rawFeneconMode = String(stF.feneconControlMode || 'auto').trim().toLowerCase();
      els.storageFeneconControlMode.value = ['auto', 'fems-grid', 'direct-ess'].includes(rawFeneconMode) ? rawFeneconMode : 'auto';
      els.storageFeneconControlMode.disabled = !feneconModeActive;
    }
    if (els.storageFeneconAcMode) {
      els.storageFeneconAcMode.checked = feneconModeActive;
    }
    if (els.storageFeneconDayNoWrite) {
      els.storageFeneconDayNoWrite.checked = feneconModeActive
        && String(els.storageFeneconControlMode && els.storageFeneconControlMode.value || 'auto') === 'auto'
        && getStorageCoupling() === 'dc';
      els.storageFeneconDayNoWrite.disabled = true;
    }
    if (els.storageFeneconPvOnThresholdW) els.storageFeneconPvOnThresholdW.value = String(Math.max(0, Number.isFinite(Number(stF.feneconPvPassthroughThresholdW)) ? Number(stF.feneconPvPassthroughThresholdW) : 500));
    if (els.storageFeneconPvOffThresholdW) els.storageFeneconPvOffThresholdW.value = String(Math.max(0, Number.isFinite(Number(stF.feneconPvReleaseThresholdW)) ? Number(stF.feneconPvReleaseThresholdW) : 500));
    if (els.storageFeneconPvOnDelaySec) els.storageFeneconPvOnDelaySec.value = String(Math.max(0, Number.isFinite(Number(stF.feneconPvPassthroughDelaySec)) ? Number(stF.feneconPvPassthroughDelaySec) : 10));
    if (els.storageFeneconPvOffDelaySec) els.storageFeneconPvOffDelaySec.value = String(Math.max(0, Number.isFinite(Number(stF.feneconPvReleaseDelaySec)) ? Number(stF.feneconPvReleaseDelaySec) : 120));
    if (els.storageFeneconApiTimeoutSec) els.storageFeneconApiTimeoutSec.value = String(Math.max(5, Number.isFinite(Number(stF.feneconApiTimeoutSec)) ? Number(stF.feneconApiTimeoutSec) : 60));
    updateStorageVendorProfileUi();
    if (els.storageFeneconAssist) {
      els.storageFeneconAssist.checked = false;
      els.storageFeneconAssist.disabled = true;
    }
    if (els.storageE3dcRscpEnabled) {
      els.storageE3dcRscpEnabled.checked = e3dcModeActive;
    }
    if (els.storageE3dcZeroMode) {
      const zeroMode = String(stF.e3dcZeroMode || 'normal').trim().toLowerCase();
      els.storageE3dcZeroMode.value = zeroMode === 'idle' ? 'idle' : 'normal';
    }
    if (els.storageE3dcAllowGridCharge) {
      els.storageE3dcAllowGridCharge.checked = e3dcModeActive && stF.e3dcAllowGridCharge === true;
    }
    if (els.storageE3dcUsePowerLimits) {
      els.storageE3dcUsePowerLimits.checked = e3dcModeActive && stF.e3dcUsePowerLimits === true;
    }
    rebuildStorageTable();
    try { buildStorageFarmUI(); } catch (_e) {}
    try { buildStorageMultiUseUI(); } catch (_e) {}

    // EVCS / Station config
    try { buildEvcsUI(); } catch (_e) {}
    try { buildStationGroupsUI(); } catch (_e) {}

    // Ziel‑Strategie (Zeit‑Ziel Laden)
    if (els.cmGoalStrategy) {
      const cm = (currentConfig && currentConfig.chargingManagement && typeof currentConfig.chargingManagement === 'object')
        ? currentConfig.chargingManagement
        : {};
      const gs = String(cm.goalStrategy || 'standard').trim().toLowerCase();
      els.cmGoalStrategy.value = (gs === 'smart') ? 'smart' : 'standard';
    }

    // Schwellwertsteuerung / Relais
    try { buildThresholdUI(); } catch (_e) {}
    try { buildRelayUI(); } catch (_e) {}
    try { buildGridConstraintsUI(); } catch (_e) {}
  }


  // -------------------------------------------------------------------------
  // OCPP Auto-Discovery (Installer → Ladepunkte)
  // - on demand scan of ioBroker OCPP adapter states
  // - proposes mapping for EVCS list (power/status/setpoints/online)
  // -------------------------------------------------------------------------
  /**
   * Code-Teil: fetchOcppDiscovery
   * Zweck: Holt Daten über HTTP/API oder aus externen Quellen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function fetchOcppDiscovery() {
    const data = await fetchJson('/api/ocpp/discover');
    const connectors = Array.isArray(data.connectors) ? data.connectors : [];
    return { meta: data, connectors };
  }
  /**
   * Code-Teil: _applyOcppConnectorToRow
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _ocppStationIdentityFromDp(id) {
    const value = String(id || '').trim();
    let m = value.match(/^ocpp21\.(\d+)\.([^.]+)(?:\.|$)/i);
    if (m) return `${m[1]}|${m[2]}`;
    m = value.match(/^alias\.0\.nexowatt\.ocpp\.(\d+)\.([^.]+)(?:\.|$)/i);
    if (m) return `${m[1]}|${m[2]}`;
    m = value.match(/^alias\.0\.ocpp21\.(\d+)\.([^.]+)(?:\.|$)/i);
    if (m) return `${m[1]}|${m[2]}`;
    return '';
  }

  function _ocppStationIdentityFromRow(row) {
    const r = row && typeof row === 'object' ? row : {};
    for (const field of [
      'powerId', 'energyTotalId', 'statusId', 'chargingStateId', 'activeId', 'heartbeatId',
      'onlineId', 'dataFreshId', 'setPowerWId', 'enableWriteId',
      'vehicleSocId', 'rfidReadId',
    ]) {
      const identity = _ocppStationIdentityFromDp(r[field]);
      if (identity) return identity;
    }
    const stationKey = String(r.stationKey || '').trim();
    if (stationKey) {
      const instanceMatch = String(r.ocppAdapterInstance || r.adapterInstance || '').match(/(?:^|\.)ocpp21\.(\d+)(?:\.|$)/i);
      if (instanceMatch) return `${instanceMatch[1]}|${stationKey}`;
    }
    return '';
  }

  function _ocppStationIdentityFromConnector(connector) {
    const c = connector && typeof connector === 'object' ? connector : {};
    const ids = c.ids && typeof c.ids === 'object' ? c.ids : {};
    for (const field of [
      'powerId', 'energyTotalId', 'statusId', 'chargingStateId', 'activeId', 'heartbeatId',
      'onlineId', 'dataFreshId', 'setPowerWId', 'enableWriteId',
      'vehicleSocId', 'rfidReadId',
    ]) {
      const identity = _ocppStationIdentityFromDp(ids[field]);
      if (identity) return identity;
    }
    const baseIdentity = _ocppStationIdentityFromDp(c.base);
    return baseIdentity || '';
  }

  function _isEmptyEvcsMappingRow(row) {
    const r = row && typeof row === 'object' ? row : {};
    return ![
      'powerId', 'energyTotalId', 'statusId', 'chargingStateId', 'activeId', 'vehicleConnectedId',
      'chargeDemandId', 'heartbeatId', 'onlineId', 'dataFreshId', 'setCurrentAId',
      'setPowerWId', 'enableWriteId', 'vehicleSocId', 'rfidReadId',
    ].some(field => String(r[field] || '').trim());
  }

  function _isKnownLegacyNexoWattOcppMapping(field, currentId, replacementId) {
    const current = String(currentId || '').trim();
    const replacement = String(replacementId || '').trim();
    if (!current || !replacement) return false;
    const currentStation = _ocppStationIdentityFromDp(current);
    const replacementStation = _ocppStationIdentityFromDp(replacement);
    if (!currentStation || currentStation !== replacementStation) return false;
    const lower = current.toLowerCase();
    const replacementLower = replacement.toLowerCase();
    // Alias paths of the same station are always migrated to the direct native
    // OCPP21 contract. They are never retained as productive read/write paths.
    if (
      (lower.startsWith('alias.0.nexowatt.ocpp.') || lower.startsWith('alias.0.ocpp21.'))
      && replacementLower.startsWith('ocpp21.')
    ) return true;
    const legacyByField = {
      powerId: ['.metervalues.power_active_import'],
      energyTotalId: ['.metervalues.energy_active_import_register', '.metervalues.energy_active_import_register_kwh'],
      statusId: ['.connector1status'],
      chargingStateId: ['.transactions.chargingstate'],
      activeId: ['.transactions.transactionactive'],
      heartbeatId: ['.health.lastheartbeatms', '.info.lastheartbeat', '.heartbeat'],
      dataFreshId: ['.health.datafresh', '.datafresh'],
      setPowerWId: ['.control.chargelimit', '.chargelimit'],
      enableWriteId: ['.control.availability', '.availability'],
      vehicleSocId: ['.metervalues.soc'],
      rfidReadId: ['.info.rfid', '.rfid'],
    };
    if (field === 'statusId' && (/\.evse\.\d+\.connector\.\d+\.status$/i.test(current) || /\.connectors\.\d+_\d+\.status$/i.test(current))) return true;
    if (field === 'onlineId' && (
      lower.endsWith('.info.connection') || lower.endsWith('.health.online') || lower.endsWith('.connected')
      || lower.endsWith('.datafresh') || lower.endsWith('.powerfresh') || lower.endsWith('.activityfresh')
    )) return !lower.endsWith('.socketconnected');
    return (legacyByField[field] || []).some(suffix => lower.endsWith(suffix));
  }

  function _applyOcppConnectorToRow(row, c, opts) {
    const r = (row && typeof row === 'object') ? row : {};
    const ids = (c && c.ids && typeof c.ids === 'object') ? c.ids : {};
    const out = Object.assign({}, r);

    const overwrite = !!(opts && opts.overwrite);
    const onlyEmpty = !!(opts && opts.onlyEmpty);

    /**
     * Code-Teil: Arrow-Funktion `setField`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setField
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setField = (k, v) => {
      const val = (v === null || v === undefined) ? '' : String(v);
      const cur = (out[k] === null || out[k] === undefined) ? '' : String(out[k]);
      if (overwrite) {
        out[k] = val;
      } else if (onlyEmpty) {
        if (!cur.trim() || _isKnownLegacyNexoWattOcppMapping(k, cur, val)) out[k] = val;
      }
    };

    // Meta
    if (c && typeof c.stationKey === 'string') {
      if (overwrite || onlyEmpty) setField('stationKey', c.stationKey);
    }
    if (c && c.connectorNo !== undefined && c.connectorNo !== null) {
      const n = Number(c.connectorNo);
      if (Number.isFinite(n)) {
        const cur = Number(out.connectorNo);
        if (overwrite) out.connectorNo = Math.max(0, Math.round(n));
        else if (onlyEmpty && (!Number.isFinite(cur) || cur === 0)) out.connectorNo = Math.max(0, Math.round(n));
      }
    }
    if (c && typeof c.name === 'string') {
      const curName = String(out.name || '').trim();
      const isDefault = /^ladepunkt\s+\d+$/i.test(curName);
      if (overwrite || (onlyEmpty && (!curName || isDefault))) out.name = c.name;
    }

    // Mappings (fill)
    const previousEnergyId = String(out.energyTotalId || '').trim();
    for (const k of ['powerId','energyTotalId','statusId','chargingStateId','activeId','vehicleConnectedId','chargeDemandId','heartbeatId','onlineId','dataFreshId','setCurrentAId','setPowerWId','enableWriteId','vehicleSocId','rfidReadId']) {
      if (ids[k]) setField(k, ids[k]);
    }
    const energyMappingWasApplied = !!ids.energyTotalId && (
      overwrite || (onlyEmpty && !previousEnergyId)
    );
    if (energyMappingWasApplied) {
      out.energyTotalInputIsWh = c && c.energyTotalInputIsWh === true;
    }

    // Native NexoWatt OCPP21 contract metadata.
    if (c && c.telemetryProfile && (overwrite || onlyEmpty)) {
      if (overwrite || !String(out.telemetryProfile || '').trim() || String(out.telemetryProfile || '').trim().toLowerCase().includes('ocpp')) {
        out.telemetryProfile = String(c.telemetryProfile);
      }
    }
    if (c && c.controlPreference && (overwrite || onlyEmpty)) {
      if (overwrite || !String(out.controlPreference || '').trim() || String(out.controlPreference || '').trim().toLowerCase() === 'auto') {
        out.controlPreference = String(c.controlPreference);
      }
    }
    if (c && c.contractVersion) out.ocppDatapointContract = String(c.contractVersion);

    // Defaults
    if (overwrite || onlyEmpty) {
      if (out.enabled === undefined) out.enabled = true;
      if (!out.chargerType) out.chargerType = 'ac';
      if (!Number.isFinite(Number(out.minCurrentA)) || Number(out.minCurrentA) <= 0) out.minCurrentA = 6;
    }

    return out;
  }
  /**
   * Code-Teil: ocppAutoDetect
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function ocppAutoDetect() {
    try {
      setStatus('OCPP21: Suche nach nativen Ladepunkten…');
      const { connectors } = await fetchOcppDiscovery();

      if (!connectors.length) {
        setStatus('OCPP21: Keine Ladepunkte gefunden (prüfe, ob der NexoWatt-OCPP21-Adapter läuft und die Station verbunden ist).', 'error');
        return;
      }

      const sc = _ensureSettingsConfig();
      const existingList = Array.isArray(sc.evcsList) ? sc.evcsList : [];
      const hasExisting = existingList.some(r => r && (
        String(r.powerId || '').trim() ||
        String(r.setCurrentAId || '').trim() ||
        String(r.setPowerWId || '').trim() ||
        String(r.statusId || '').trim()
      ));

      if (hasExisting) {
        const ok = window.confirm('Es sind bereits Ladepunkte konfiguriert.\n\nSoll die OCPP-Erkennung die aktuelle Konfiguration überschreiben?');
        if (!ok) {
          setStatus('OCPP21: Abgebrochen.', 'ok');
          return;
        }
      }

      const count = Math.max(1, Math.min(50, connectors.length));
      sc.evcsCount = count;
      sc.evcsList = [];

      for (let i = 0; i < count; i++) {
        const c = connectors[i];
        sc.evcsList[i] = _applyOcppConnectorToRow({}, c, { overwrite: true });
      }

      // Rebuild UI
      if (els.evcsCount) els.evcsCount.value = String(count);
      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
      scheduleValidation(300);

      setStatus(`OCPP21: ${count} Ladepunkte direkt erkannt und vorbelegt. Bitte „Speichern & EMS neu starten“ klicken.`, 'ok');
    } catch (e) {
      setStatus('OCPP21: Erkennung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }
  /**
   * Code-Teil: ocppMapExisting
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function ocppMapExisting() {
    try {
      setStatus('OCPP21: Suche direkte native Datenpunkte…');
      const { connectors } = await fetchOcppDiscovery();

      if (!connectors.length) {
        setStatus('OCPP21: Keine nativen Ladepunkte gefunden.', 'error');
        return;
      }

      const sc = _ensureSettingsConfig();
      const currentCount = _clampInt(sc.evcsCount, 0, 50, 0);
      const list = _ensureEvcsList(currentCount).slice();
      const usedRows = new Set();
      let migratedCount = 0;
      let appendedCount = 0;
      let skippedCount = 0;

      for (const connector of connectors) {
        const connectorIdentity = _ocppStationIdentityFromConnector(connector);
        let rowIndex = -1;

        // 1. A previously configured OCPP21/alias row of the same station wins.
        if (connectorIdentity) {
          rowIndex = list.findIndex((row, index) => !usedRows.has(index) && _ocppStationIdentityFromRow(row) === connectorIdentity);
        }

        // 2. An explicitly stored stationKey may identify a still-empty OCPP row.
        if (rowIndex < 0 && connector && connector.stationKey) {
          rowIndex = list.findIndex((row, index) => !usedRows.has(index)
            && String(row && row.stationKey || '').trim() === String(connector.stationKey || '').trim()
            && (_isEmptyEvcsMappingRow(row) || String(row && row.telemetryProfile || '').toLowerCase().includes('ocpp')));
        }

        // 3. Reuse only a genuinely empty row. Never overwrite a Modbus/MQTT or
        // nexowatt-devices chargepoint merely because it occupies the same index.
        if (rowIndex < 0) {
          rowIndex = list.findIndex((row, index) => !usedRows.has(index) && _isEmptyEvcsMappingRow(row));
        }

        // 4. If all existing rows are occupied, append a dedicated OCPP21 row.
        if (rowIndex < 0 && list.length < 50) {
          rowIndex = list.length;
          list.push({});
          appendedCount += 1;
        }

        if (rowIndex < 0) {
          skippedCount += 1;
          continue;
        }

        const before = JSON.stringify(list[rowIndex] || {});
        list[rowIndex] = _applyOcppConnectorToRow(list[rowIndex], connector, { onlyEmpty: true });
        if (JSON.stringify(list[rowIndex] || {}) !== before) migratedCount += 1;
        usedRows.add(rowIndex);
      }

      sc.evcsCount = Math.min(50, list.length);
      sc.evcsList = list.slice(0, sc.evcsCount);
      if (els.evcsCount) els.evcsCount.value = String(sc.evcsCount);

      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
      scheduleValidation(300);
      const parts = [`${migratedCount} OCPP21-Zuordnung(en) aktualisiert`];
      if (appendedCount) parts.push(`${appendedCount} neuer Ladepunkt angelegt`);
      if (skippedCount) parts.push(`${skippedCount} Station(en) wegen Maximalzahl nicht übernommen`);
      setStatus(`OCPP21: ${parts.join(', ')}. Fremde Ladepunkte wurden nicht überschrieben. Bitte speichern.`, skippedCount ? 'error' : 'ok');
    } catch (e) {
      setStatus('OCPP21: Zuordnung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  // ------------------------------
  // Schnell‑Inbetriebnahme: Geräteadapter (nexowatt-devices)
  // ------------------------------
  /**
   * Code-Teil: _nwNormCat
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwNormCat(v) {
    return String(v || '').trim().toUpperCase();
  }
  /**
   * Code-Teil: _isNwEvcsCategory
   * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwDeviceClass(dev) {
    return String(dev && dev.deviceClass || '').trim();
  }
  function _isNwEvcsCategory(cat) {
    const c = _nwNormCat(cat);
    return (c === 'EVCS' || c === 'EVSE');
  }
  function _isNwEvcsDevice(dev) {
    const dc = _nwDeviceClass(dev);
    return dc ? dc === 'evCharger' : _isNwEvcsCategory(dev && dev.category);
  }
  function _isNwPvDevice(dev) {
    const dc = _nwDeviceClass(dev);
    return dc ? dc === 'pvInverter' : _isNwPvInverterCategory(dev && dev.category);
  }
  function _isNwHeatDevice(dev) {
    const dc = _nwDeviceClass(dev);
    return dc ? dc === 'heat' : _isNwHeatCategory(dev && dev.category);
  }
  function _isNwStorageDevice(dev) {
    const dc = _nwDeviceClass(dev);
    return ['storageSystem','battery','batteryInverter'].includes(dc);
  }
  function _isNwMeterDevice(dev) {
    const dc = _nwDeviceClass(dev);
    return dc ? dc === 'meter' : _isNwMeterCategory(dev && dev.category);
  }
  /**
   * Code-Teil: _isNwPvInverterCategory
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _isNwPvInverterCategory(cat) {
    return _nwNormCat(cat) === 'PV_INVERTER';
  }
  /**
   * Code-Teil: _isNwHeatCategory
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _isNwHeatCategory(cat) {
    return _nwNormCat(cat) === 'HEAT';
  }
  /**
   * Code-Teil: _nwGetAlias
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwGetAlias(dev, key) {
    const a = dev && dev.aliases && typeof dev.aliases === 'object' ? dev.aliases : null;
    const dp = dev && dev.dp && typeof dev.dp === 'object' ? dev.dp : null;
    const v = (dp && dp[key]) ? String(dp[key]).trim() : '';
    if (v) return v;
    const v2 = (a && a[key]) ? String(a[key]).trim() : '';
    return v2;
  }

  function _nwGetWritableAlias(dev, key) {
    const meta = dev && dev.aliasMeta && typeof dev.aliasMeta === 'object' ? dev.aliasMeta[key] : null;
    if (meta && meta.write === true) return String(meta.id || _nwGetAlias(dev, key) || '').trim();
    return '';
  }
  function _nwGetAliasUnit(dev, key) {
    const meta = dev && dev.aliasMeta && typeof dev.aliasMeta === 'object' ? dev.aliasMeta[key] : null;
    return String(meta && meta.unit ? meta.unit : '').replace(/\s+/g, '').toLowerCase();
  }
  /**
   * Code-Teil: _nwGetDpFallback
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwGetDpFallback(dev, suffix) {
    const base = String((dev && dev.baseId) || '').trim();
    if (!base || !suffix) return '';
    return base + '.' + suffix;
  }
  /**
   * Code-Teil: _applyNwDeviceToEvcsRow
   * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _applyNwDeviceToEvcsRow(row, dev, opts) {
    const onlyEmpty = !!(opts && opts.onlyEmpty);
    const out = (row && typeof row === 'object') ? { ...row } : {};

    /**
     * Code-Teil: Arrow-Funktion `setIf`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setIf
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setIf = (k, v) => {
      const val = String(v || '').trim();
      if (!val) return;
      if (onlyEmpty) {
        if (String(out[k] || '').trim()) return;
      }
      out[k] = val;
    };

    // Metadata
    setIf('name', dev && dev.name ? dev.name : '');
    // Die Zuordnung aktiviert weder Ladepunkt noch App automatisch.

    const cat = _nwNormCat(dev && dev.category);
    if (cat === 'DC_CHARGER') setIf('chargerType', 'dc');
    else setIf('chargerType', 'ac');

    // Datapoints (prefer aliases)
    setIf('powerId', _nwGetAlias(dev, 'r.power'));
    const autoEnergyId = _nwGetAlias(dev, 'r.energyTotal');
    const existingEnergyId = String(out.energyTotalId || '').trim();
    const autoEnergyCanApply = !!autoEnergyId && (!onlyEmpty || !existingEnergyId);
    if (autoEnergyCanApply) {
      out.energyTotalId = autoEnergyId;
      const unit = _nwGetAliasUnit(dev, 'r.energyTotal');
      // Alias Contract v1 normiert r.energyTotal auf Wh. Legacy-/Fremdprofile
      // koennen kWh liefern; deshalb wird der Haken aus den Objektmetadaten gesetzt.
      out.energyTotalInputIsWh = unit === 'wh';
    }
    const preferredStatusId = _nwGetAlias(dev, 'r.mode3State')
      || _nwGetAlias(dev, 'r.mode3Code')
      || _nwGetAlias(dev, 'r.evState')
      || _nwGetAlias(dev, 'r.statusText')
      || _nwGetAlias(dev, 'r.status')
      || _nwGetAlias(dev, 'r.evcsState')
      || _nwGetAlias(dev, 'r.cpState')
      || _nwGetAlias(dev, 'r.statusCode');
    const currentStatusId = String(out.statusId || '').trim();
    const deviceBaseId = String((dev && dev.baseId) || '').trim();
    const currentStatusIsLegacyCode = !!currentStatusId
      && (!deviceBaseId || currentStatusId.startsWith(`${deviceBaseId}.`))
      && /\.aliases(?:\.v1)?\.r\.(?:statusCode|statusText|evcsState|cpState)$/i.test(currentStatusId);
    if (preferredStatusId && (!onlyEmpty || !currentStatusId || currentStatusIsLegacyCode)) {
      out.statusId = preferredStatusId;
    }
    setIf('vehicleConnectedId',
      _nwGetAlias(dev, 'r.vehicleConnected')
      || _nwGetAlias(dev, 'r.plugged')
      || _nwGetAlias(dev, 'r.evConnected')
      || _nwGetAlias(dev, 'r.cpConnected'));
    const currentChargeDemandId = String(out.chargeDemandId || '').trim();
    if (
      currentChargeDemandId
      && (!deviceBaseId || currentChargeDemandId.startsWith(`${deviceBaseId}.`))
      && /(?:\.aliases(?:\.v1)?\.r\.(?:charging|active)|\.(?:transactionActive|chargingActive|chargeActive|isCharging|charging|active))$/i.test(currentChargeDemandId)
    ) {
      // `r.charging=false` is an observation before PWM/current is released, not
      // an explicit vehicle refusal. Keeping it as chargeDemand would deadlock
      // Auto/PV/Min+PV for Alfen and comparable IEC-61851 wallboxes.
      out.chargeDemandId = '';
    }
    setIf('chargeDemandId',
      _nwGetAlias(dev, 'r.chargeDemand')
      || _nwGetAlias(dev, 'r.vehicleDemand')
      || _nwGetAlias(dev, 'r.readyToCharge')
      || _nwGetAlias(dev, 'r.chargingRequested'));
    setIf('heartbeatId',
      _nwGetAlias(dev, 'r.heartbeat')
      || _nwGetAlias(dev, 'comm.heartbeat')
      || _nwGetAlias(dev, 'comm.lastSeenMs'));
    setIf('onlineId', _nwGetAlias(dev, 'r.online') || _nwGetAlias(dev, 'comm.connected'));

    // Control (optional)
    // Feldkompatibilität: ältere Geräteprofile verwenden `currentLimitA` /
    // `powerLimitW`, neuere NexoWatt-Devices-Profile dagegen häufig
    // `targetCurrentA` / `targetPowerW`. Beide Varianten beschreiben denselben
    // schreibbaren EMS-Sollwert und müssen bei der Schnell-Inbetriebnahme
    // erkannt werden, damit ein vorhandener Ladepunkt nicht als "nicht
    // steuerbar" im zentralen Budget erscheint.
    setIf('setCurrentAId',
      _nwGetWritableAlias(dev, 'ctrl.targetCurrentA')
      || _nwGetWritableAlias(dev, 'ctrl.currentLimitA')
      || _nwGetWritableAlias(dev, 'ctrl.setCurrentA')
      || (dev && dev.dp && dev.dp.ctrlCurrentLimitA));
    setIf('setPowerWId',
      _nwGetWritableAlias(dev, 'ctrl.targetPowerW')
      || _nwGetWritableAlias(dev, 'ctrl.powerLimitW')
      || _nwGetWritableAlias(dev, 'ctrl.setPowerW')
      || (dev && dev.dp && dev.dp.ctrlPowerLimitW));
    setIf('enableWriteId',
      _nwGetWritableAlias(dev, 'ctrl.run')
      || _nwGetWritableAlias(dev, 'ctrl.enable')
      || _nwGetWritableAlias(dev, 'ctrl.enabled')
      || (dev && dev.dp && dev.dp.ctrlRun));

    // Some devices expose "active" as status; we keep it optional
    // setIf('activeId', _nwGetAlias(dev, 'r.active'));

    return out;
  }
  /**
   * Code-Teil: _classifyHeatDevice
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _classifyHeatDevice(dev) {
    const name = String((dev && dev.name) || '').toLowerCase();
    const tpl = String((dev && dev.templateId) || '').toLowerCase();

    const isWp = /\bwp\b|\bhp\b|wärmepumpe|waermepumpe|heatpump/.test(name) || /waermepumpe|heatpump/.test(tpl);
    const isRod = /heizstab|heaterrod|\brod\b|acthor|askoma/.test(name) || /heizstab|heaterrod|rod|acthor|askoma/.test(tpl);

    if (isWp && !isRod) return { type: 'heatPump', icon: '♨️', thermalType: 'setpoint' };
    if (isRod && !isWp) return { type: 'heatingRod', icon: '🔥', thermalType: 'power' };

    // default: generic heat consumer
    return { type: 'custom', icon: '♨️', thermalType: 'power' };
  }
  /**
   * Code-Teil: _findFreeConsumerSlot
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _findFreeConsumerSlot(range) {
    const dps = (currentConfig && currentConfig.datapoints && typeof currentConfig.datapoints === 'object') ? currentConfig.datapoints : {};
    const from = (range && range.from) ? range.from : 1;
    const to = (range && range.to) ? range.to : FLOW_CONSUMER_SLOT_COUNT;
    for (let i = from; i <= to; i++) {
      const key = `consumer${i}Power`;
      if (!String(dps[key] || '').trim()) return i;
    }
    return 0;
  }
  /**
   * Code-Teil: _isNwMeterCategory
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _isNwMeterCategory(cat) {
    const c = _nwNormCat(cat);
    return (c === 'METER' || c === 'GRID_METER' || c === 'SMART_METER');
  }
  /**
   * Code-Teil: _isNwStorageCategory
   * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _isNwStorageCategory(cat) {
    const c = _nwNormCat(cat);
    return (c === 'ESS' || c === 'BATTERY' || c === 'BATTERY_INVERTER');
  }
  /**
   * Code-Teil: _nwDevHaystack
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwDevHaystack(dev) {
    return [
      String((dev && dev.name) || ''),
      String((dev && dev.templateId) || ''),
      String((dev && dev.devId) || ''),
      String((dev && dev.baseId) || ''),
      String((dev && dev.manufacturer) || ''),
    ].join(' ').toLowerCase();
  }
  /**
   * Code-Teil: _nwHasAlias
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwHasAlias(dev, key) {
    return !!String(_nwGetAlias(dev, key) || '').trim();
  }
  /**
   * Code-Teil: _nwScoreGridMeter
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwScoreGridMeter(dev) {
    const cat = _nwNormCat(dev && dev.category);
    const hay = _nwDevHaystack(dev);
    let score = 0;
    if (_isNwMeterDevice(dev)) score += 12;
    if (_nwHasAlias(dev, 'r.powerImport')) score += 5;
    if (_nwHasAlias(dev, 'r.powerExport')) score += 5;
    if (_nwHasAlias(dev, 'r.power')) score += 2;
    if (/gridmeter|grid meter|grid\b|netz|nvp|verknuepf|verknüpf|mains/.test(hay)) score += 9;
    if (/pvmeter|pv meter|solar|wechselrichter|inverter|wr\b/.test(hay)) score -= 8;
    if (/loadmeter|lastmeter|verbrauch|consumption|house\s*load|gebäude|gebaeude|building/.test(hay)) score -= 6;
    if (_isNwPvDevice(dev) || _isNwStorageDevice(dev)) score -= 10;
    return score;
  }
  /**
   * Code-Teil: _nwScorePvSource
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwScorePvSource(dev) {
    const cat = _nwNormCat(dev && dev.category);
    const hay = _nwDevHaystack(dev);
    let score = 0;
    if (_isNwPvDevice(dev)) score += 12;
    if (_isNwMeterDevice(dev)) score += 2;
    if (_nwHasAlias(dev, 'r.power')) score += 3;
    if (/pvmeter|pv meter|pv\b|solar|wechselrichter|inverter|wr\b/.test(hay)) score += 8;
    if (/gridmeter|grid meter|grid\b|netz|nvp|verbrauch|consumption|loadmeter|lastmeter|ess|battery|akku|speicher/.test(hay)) score -= 7;
    return score;
  }
  /**
   * Code-Teil: _nwScoreStorage
   * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwScoreStorage(dev) {
    const cat = _nwNormCat(dev && dev.category);
    const hay = _nwDevHaystack(dev);
    let score = 0;
    if (_isNwStorageDevice(dev)) score += 12;
    if (_nwHasAlias(dev, 'r.soc')) score += 5;
    if (_nwHasAlias(dev, 'r.powerCharge')) score += 3;
    if (_nwHasAlias(dev, 'r.powerDischarge')) score += 3;
    if (_nwHasAlias(dev, 'r.power')) score += 2;
    if (/ess|battery|akku|speicher|bms/.test(hay)) score += 7;
    if (/gridmeter|grid meter|grid\b|netz|pvmeter|pv meter|pv\b|solar|loadmeter|lastmeter|verbrauch|consumption/.test(hay)) score -= 6;
    return score;
  }
  /**
   * Code-Teil: _nwPickBestDevice
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwPickBestDevice(devices, scorer, opts) {
    const minScore = Number.isFinite(Number(opts && opts.minScore)) ? Number(opts.minScore) : 1;
    const minGap = Number.isFinite(Number(opts && opts.minGap)) ? Number(opts.minGap) : 0;
    const requireUnique = !!(opts && opts.requireUnique);
    const scored = (Array.isArray(devices) ? devices : [])
      .map((dev) => ({ dev, score: Number(scorer ? scorer(dev) : 0) || 0 }))
      .filter((it) => it && it.score >= minScore)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return null;
    if (requireUnique && scored.length > 1 && scored[0].score === scored[1].score) return null;
    if (scored.length > 1 && minGap > 0 && (scored[0].score - scored[1].score) < minGap) return null;
    return scored[0].dev || null;
  }
  /**
   * Code-Teil: _nwApplyFlowDpIfEmpty
   * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwApplyFlowDpIfEmpty(key, value, opts) {
    const val = String(value || '').trim();
    if (!val) return false;

    currentConfig = currentConfig && typeof currentConfig === 'object' ? currentConfig : {};
    currentConfig.datapoints = (currentConfig.datapoints && typeof currentConfig.datapoints === 'object') ? currentConfig.datapoints : {};

    const cur = String(currentConfig.datapoints[key] || '').trim();
    if (cur) return false;

    currentConfig.datapoints[key] = val;

    const inp = document.getElementById('flow_' + key);
    if (inp) {
      inp.value = val;
      try { inp.dispatchEvent(new Event('input', { bubbles: true })); } catch (_e) {}
      try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
    }

    if (opts && opts.powerIsW) {
      try { _setFlowPowerDpIsW(key, true); } catch (_e) {}
    }
    return true;
  }
  /**
   * Code-Teil: _nwApplyGeneralDpIfEmpty
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwApplyGeneralDpIfEmpty(key, value) {
    const val = String(value || '').trim();
    if (!val) return false;

    currentConfig = currentConfig && typeof currentConfig === 'object' ? currentConfig : {};
    currentConfig.datapoints = (currentConfig.datapoints && typeof currentConfig.datapoints === 'object') ? currentConfig.datapoints : {};

    const cur = String(currentConfig.datapoints[key] || '').trim();
    if (cur) return false;

    currentConfig.datapoints[key] = val;

    if (key === 'gridPointConnected' && els.gridPointConnectedId) {
      els.gridPointConnectedId.value = val;
      try { els.gridPointConnectedId.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
      if (els.gridPointConnectedIdDisplay) {
        const base = els.gridPointConnectedIdDisplay.dataset.baseHint || els.gridPointConnectedIdDisplay.textContent || '';
        if (!els.gridPointConnectedIdDisplay.dataset.baseHint) els.gridPointConnectedIdDisplay.dataset.baseHint = base;
        els.gridPointConnectedIdDisplay.innerHTML = 'Aktuell: <code>' + val + '</code><br/>' + (els.gridPointConnectedIdDisplay.dataset.baseHint || '');
      }
      return true;
    }

    if (key === 'gridPointWatchdog' && els.gridPointWatchdogId) {
      els.gridPointWatchdogId.value = val;
      try { els.gridPointWatchdogId.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
      if (els.gridPointWatchdogIdDisplay) {
        const base = els.gridPointWatchdogIdDisplay.dataset.baseHint || els.gridPointWatchdogIdDisplay.textContent || '';
        if (!els.gridPointWatchdogIdDisplay.dataset.baseHint) els.gridPointWatchdogIdDisplay.dataset.baseHint = base;
        els.gridPointWatchdogIdDisplay.innerHTML = 'Aktuell: <code>' + val + '</code><br/>' + (els.gridPointWatchdogIdDisplay.dataset.baseHint || '');
      }
      return true;
    }

    return false;
  }
  /**
   * Code-Teil: _nwAutoMapEnergyFlowFromDevices
   * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _nwAutoMapEnergyFlowFromDevices(devices) {
    const out = {
      changed: false,
      mapped: {
        grid: false,
        gridConnected: false,
        gridWatchdog: false,
        pv: false,
        storage: false,
      },
      notes: []
    };

    const list = Array.isArray(devices) ? devices : [];
    if (!list.length) return out;

    // --- Netz / NVP ---
    const gridCandidates = list.filter((dev) => _nwScoreGridMeter(dev) >= 6);
    const gridDev = _nwPickBestDevice(gridCandidates, _nwScoreGridMeter, { minScore: 6, minGap: 2 });
    if (gridDev) {
      const buyId = _nwGetAlias(gridDev, 'r.powerImport');
      const sellId = _nwGetAlias(gridDev, 'r.powerExport');
      const signedId = _nwGetAlias(gridDev, 'r.power');
      let gridMode = '';
      if (buyId && sellId) {
        if (_nwApplyFlowDpIfEmpty('gridBuyPower', buyId, { powerIsW: true })) out.changed = true;
        if (_nwApplyFlowDpIfEmpty('gridSellPower', sellId, { powerIsW: true })) out.changed = true;
        gridMode = 'Import/Export';
      } else if (signedId) {
        if (_nwApplyFlowDpIfEmpty('gridPointPower', signedId, { powerIsW: true })) out.changed = true;
        gridMode = 'Signed';
      }
      if (gridMode) {
        out.mapped.grid = true;
        const onlineId = _nwGetAlias(gridDev, 'r.online') || _nwGetAlias(gridDev, 'comm.connected');
        const hbId = _nwGetAlias(gridDev, 'r.heartbeat') || _nwGetAlias(gridDev, 'r.lastSeenMs') || _nwGetAlias(gridDev, 'r.frequency');
        if (_nwApplyGeneralDpIfEmpty('gridPointConnected', onlineId)) { out.changed = true; out.mapped.gridConnected = true; }
        if (_nwApplyGeneralDpIfEmpty('gridPointWatchdog', hbId)) { out.changed = true; out.mapped.gridWatchdog = true; }
        out.notes.push(`Netz: ${String((gridDev && gridDev.name) || (gridDev && gridDev.devId) || 'Meter').trim()} (${gridMode})`);
      }
    }

    // --- PV ---
    const pvCandidates = list.filter((dev) => _nwScorePvSource(dev) >= 7);
    if (pvCandidates.length === 1) {
      const pvDev = pvCandidates[0];
      const pvId = _nwGetAlias(pvDev, 'r.power');
      if (_nwApplyFlowDpIfEmpty('pvPower', pvId, { powerIsW: true })) out.changed = true;
      if (pvId) {
        out.mapped.pv = true;
        const fs = _ensureFlowSlots();
        fs.core = (fs.core && typeof fs.core === 'object') ? fs.core : {};
        if (!String(fs.core.pvName || '').trim()) {
          fs.core.pvName = String((pvDev && pvDev.name) || '').trim().slice(0, 24);
          const pvNameInput = document.getElementById('flow_pvName');
          if (pvNameInput) pvNameInput.value = fs.core.pvName;
        }
        out.notes.push(`PV: ${String((pvDev && pvDev.name) || (pvDev && pvDev.devId) || 'PV').trim()}`);
      }
    } else if (pvCandidates.length > 1) {
      out.notes.push(`PV: Auto-Summe (${pvCandidates.length} Quellen)`);
    }

    // --- Speicher ---
    const storageCandidates = list.filter((dev) => _nwScoreStorage(dev) >= 7);
    if (storageCandidates.length === 1) {
      const stDev = storageCandidates[0];
      const chargeId = _nwGetAlias(stDev, 'r.powerCharge');
      const dischargeId = _nwGetAlias(stDev, 'r.powerDischarge');
      const signedId = _nwGetAlias(stDev, 'r.power');
      const socId = _nwGetAlias(stDev, 'r.soc');

      let storageMapped = false;
      // Prefer the single signed battery power datapoint when it is available.
      // It is the safest source for the VIS/EMS balance (+ Entladen / - Laden).
      // Some devices expose split powerCharge/powerDischarge aliases that are
      // control/assist values rather than the real physical battery flow. Those
      // can make the house load and PV budget wrong, so use them only when no
      // signed datapoint exists.
      if (signedId) {
        if (_nwApplyFlowDpIfEmpty('batteryPower', signedId, { powerIsW: true })) out.changed = true;
        storageMapped = true;
      } else if (chargeId && dischargeId) {
        if (_nwApplyFlowDpIfEmpty('storageChargePower', chargeId, { powerIsW: true })) out.changed = true;
        if (_nwApplyFlowDpIfEmpty('storageDischargePower', dischargeId, { powerIsW: true })) out.changed = true;
        storageMapped = true;
      }
      if (socId) {
        if (_nwApplyFlowDpIfEmpty('storageSoc', socId)) out.changed = true;
        storageMapped = true;
      }
      if (storageMapped) {
        out.mapped.storage = true;
        out.notes.push(`Speicher: ${String((stDev && stDev.name) || (stDev && stDev.devId) || 'ESS').trim()}`);
      }
    } else if (storageCandidates.length > 1) {
      out.notes.push(`Speicher: Auto (${storageCandidates.length} ESS/BATTERY erkannt)`);
    }

    // EVCS und Gebäudeverbrauch bleiben bewusst auf Auto, damit Summen/Bilanz konsistent bleiben.
    if (list.some((dev) => _isNwEvcsDevice(dev))) {
      out.notes.push('EV: Auto-Summe aus Ladepunkten');
    }
    out.notes.push('Gebäude: Auto-Bilanz');

    return out;
  }
  function _nwAutoMapStorageAppFromDevices(devices) {
    const rows = (Array.isArray(devices) ? devices : []).filter(_isNwStorageDevice);
    const result = { changed: false, mapped: false, ambiguous: rows.length > 1, notes: [] };
    if (rows.length !== 1) {
      if (rows.length > 1) result.notes.push(`Speicher-App: ${rows.length} Speicher erkannt – Topologie/Farm bitte bestätigen`);
      return result;
    }
    const dev = rows[0];
    currentConfig.storage = currentConfig.storage && typeof currentConfig.storage === 'object' ? currentConfig.storage : {};
    currentConfig.storage.datapoints = currentConfig.storage.datapoints && typeof currentConfig.storage.datapoints === 'object' ? currentConfig.storage.datapoints : {};
    const storage = currentConfig.storage;
    const dps = storage.datapoints;
    const setEmpty = (key, value) => {
      const val = String(value || '').trim();
      if (!val || String(dps[key] || '').trim()) return false;
      dps[key] = val;
      result.changed = true;
      result.mapped = true;
      return true;
    };
    const identity = [dev.manufacturer, dev.model, dev.templateId, dev.name, dev.devId].map((v) => String(v || '')).join(' ');
    const isFenecon = /fenecon|openems|fems/i.test(identity);

    setEmpty('socObjectId', _nwGetAlias(dev, 'r.soc'));
    if (isFenecon) {
      // FENECON Hybrid benötigt die echte AC-seitige ESS-Aktorleistung. Der
      // Hybrid-Balance-Alias ist für Anzeige/Bilanz gedacht und wird bewusst
      // niemals als Regelungsfeedback automatisch zugeordnet.
      const essActual = _nwGetAlias(dev, 'r.essActivePower')
        || _nwGetAlias(dev, 'r.powerAc')
        || _nwGetAlias(dev, 'r.power');
      setEmpty('batteryPowerObjectId', essActual);
      setEmpty('feneconEssActualPowerObjectId', essActual);
      setEmpty('feneconNvpPowerObjectId',
        _nwGetAlias(dev, 'r.nvpPower')
        || _nwGetAlias(dev, 'r.gridPower')
        || _nwGetAlias(dev, 'r.napPower'));
      setEmpty('feneconConsumptionTotalObjectId',
        _nwGetAlias(dev, 'r.consumptionTotal')
        || _nwGetAlias(dev, 'r.loadTotal')
        || _nwGetAlias(dev, 'r.consumptionPower')
        || _nwGetAlias(dev, 'r.loadPower'));
      setEmpty('dcPvPowerObjectId', _nwGetAlias(dev, 'r.pvPowerDc'));
      setEmpty('feneconPvDcObjectId', _nwGetAlias(dev, 'r.pvPowerDc'));
      setEmpty('feneconPvAcObjectId', _nwGetAlias(dev, 'r.pvPowerAc'));
      setEmpty('feneconPvTotalObjectId', _nwGetAlias(dev, 'r.pvPowerTotal'));
      setEmpty('feneconMinPowerObjectId', _nwGetAlias(dev, 'r.minPowerSetpointW'));
      setEmpty('feneconMaxPowerObjectId', _nwGetAlias(dev, 'r.maxPowerSetpointW'));
      setEmpty('feneconActualSetpointObjectId', _nwGetAlias(dev, 'r.powerSetpointReadbackW'));
      const existingNativeGridTarget = String(dps.feneconGridSetpointObjectId || '').trim();
      const currentFeneconMode = normalizeFeneconControlMode(storage.feneconControlMode);
      const nativeContainsDirectEss = isFeneconDirectEssSetpointId(existingNativeGridTarget)
        && !isFeneconGridTargetId(existingNativeGridTarget);
      if (currentFeneconMode !== 'fems-grid' && (isFeneconGridMeasurementId(existingNativeGridTarget) || nativeContainsDirectEss)) {
        if (nativeContainsDirectEss
          && !String(dps.targetPowerObjectId || dps.targetChargePowerObjectId || dps.targetDischargePowerObjectId || '').trim()) {
          dps.targetPowerObjectId = existingNativeGridTarget;
          result.notes.push('FENECON: direkter ESS-Sollwert aus dem falschen FEMS-NVP-Feld in „Sollleistung signed“ übernommen');
        } else if (isFeneconGridMeasurementId(existingNativeGridTarget)) {
          result.notes.push('FENECON: alter Netzleistungs-Messwert aus dem FEMS-NVP-Zielfeld entfernt; direkte ESS-Regelung bleibt aktiv');
        }
        dps.feneconGridSetpointObjectId = '';
        result.changed = true;
        result.mapped = true;
      }
      const nativeGridTarget = _nwGetWritableAlias(dev, 'ctrl.gridSetpointW')
        || _nwGetWritableAlias(dev, 'ctrl.napSetpointW');
      setEmpty('feneconGridSetpointObjectId', nativeGridTarget);
      if (!String(storage.vendorProfile || '').trim() || normalizeStorageVendorProfile(storage.vendorProfile) === 'generic') {
        storage.vendorProfile = 'fenecon-openems';
        result.changed = true;
      }
      if (!String(storage.coupling || '').trim() || String(storage.coupling).toLowerCase() === 'ac') {
        storage.coupling = 'dc';
        result.changed = true;
      }
      if (!String(storage.feneconControlMode || '').trim() || ['hybrid-auto','pv-pass-through'].includes(String(storage.feneconControlMode).toLowerCase())) {
        storage.feneconControlMode = 'auto';
        result.changed = true;
      }
    } else {
      setEmpty('batteryPowerObjectId', _nwGetAlias(dev, 'r.power'));
      setEmpty('dcPvPowerObjectId', _nwGetAlias(dev, 'r.pvPower'));
    }
    setEmpty('runObjectId', _nwGetWritableAlias(dev, 'ctrl.run'));
    setEmpty('maxChargeObjectId', _nwGetWritableAlias(dev, 'ctrl.maxChargePowerW'));
    setEmpty('maxDischargeObjectId', _nwGetWritableAlias(dev, 'ctrl.maxDischargePowerW'));
    setEmpty('chargeEnableObjectId', _nwGetWritableAlias(dev, 'ctrl.chargeEnable'));
    setEmpty('dischargeEnableObjectId', _nwGetWritableAlias(dev, 'ctrl.dischargeEnable'));

    // Exactly one direct command family. A genuine native FEMS-NVP alias is a
    // separate command family and is never synthesized from powerSetpointW/706.
    const hasExistingCommand = [
      'targetPowerObjectId','targetChargePowerObjectId','targetDischargePowerObjectId',
      'e3dcSetPowerModeObjectId','e3dcSetPowerValueObjectId','feneconGridSetpointObjectId'
    ].some((key) => String(dps[key] || '').trim());
    const nativeMapped = !!String(dps.feneconGridSetpointObjectId || '').trim();
    if (!hasExistingCommand || (isFenecon && nativeMapped && !String(dps.targetPowerObjectId || dps.targetChargePowerObjectId || dps.targetDischargePowerObjectId || '').trim())) {
      const charge = _nwGetWritableAlias(dev, 'ctrl.chargePowerW');
      const discharge = _nwGetWritableAlias(dev, 'ctrl.dischargePowerW');
      const signed = _nwGetWritableAlias(dev, 'ctrl.powerSetpointW');
      // In FEMS-NVP mode the direct target is optional and retained only as an
      // explicitly visible fallback. Auto resolves the real native target first.
      if (!nativeMapped || !isFenecon) {
        if (charge && discharge) {
          if (!String(dps.targetChargePowerObjectId || '').trim()) dps.targetChargePowerObjectId = charge;
          if (!String(dps.targetDischargePowerObjectId || '').trim()) dps.targetDischargePowerObjectId = discharge;
          result.changed = true;
          result.mapped = true;
          result.notes.push('Speicher-Kommandofamilie: getrennt Laden/Entladen');
        } else if (signed && !String(dps.targetPowerObjectId || '').trim()) {
          dps.targetPowerObjectId = signed;
          result.changed = true;
          result.mapped = true;
          result.notes.push('Speicher-Kommandofamilie: signed Sollwert');
        }
      }
    }
    if (isFenecon) {
      const modeNote = String(dps.feneconGridSetpointObjectId || '').trim()
        ? 'FENECON: echter FEMS-NVP-DP erkannt; Auto verwendet kontinuierlichen FEMS-Regler'
        : 'FENECON: kein echter FEMS-NVP-DP; Auto verwendet kontinuierliche direkte ESS-Regelung';
      result.notes.push(modeNote);
    }
    if (result.mapped) result.notes.unshift(`Speicher-App: ${String(dev.name || dev.devId || 'Speicher')}`);
    return result;
  }

  /**
   * Code-Teil: nwDevicesQuickSetup
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function nwDevicesQuickSetup() {
    try {
      setStatus('Schnell‑Inbetriebnahme: Suche Geräte…');

      const data = await fetchJson('/api/nwdevices/discover');
      if (!data || data.ok !== true) throw new Error((data && data.error) ? data.error : 'discover failed');

      const devices = Array.isArray(data.devices) ? data.devices : [];
      if (!devices.length) {
        setStatus('Schnell‑Inbetriebnahme: Keine Geräte unter nexowatt-devices.* gefunden.', 'error');
        return;
      }
      const evcsDevs = devices.filter(d => _isNwEvcsDevice(d));
      const pvDevs = devices.filter(d => _isNwPvDevice(d));
      const heatDevs = devices.filter(d => _isNwHeatDevice(d));
      const meterDevs = devices.filter(d => _isNwMeterDevice(d));
      const storageDevs = devices.filter(d => _isNwStorageDevice(d));
      const solarChargers = devices.filter(d => _nwDeviceClass(d) === 'solarCharger');
      const preview = [
        `Geräteinventar: ${devices.length}`,
        `Ladepunkte: ${evcsDevs.length}`,
        `PV-Wechselrichter: ${pvDevs.length}`,
        `NVP-/Energiemesser: ${meterDevs.length}`,
        `Speicher: ${storageDevs.length}`,
        `Wärmegeräte: ${heatDevs.length}`,
        solarChargers.length ? `Solar-/DC-Laderegler (nicht EVCS): ${solarChargers.length}` : '',
        '',
        'Es werden nur leere Felder ergänzt. Apps/Geräte werden nicht aktiviert und es werden keine Hardwarebefehle geschrieben.',
        storageDevs.length > 1 ? 'Mehrere Speicher: keine automatische Einzel-Speicherwahl; Farm/Topologie bleibt manuell.' : '',
        meterDevs.length > 1 ? 'Mehrere Zähler: NVP-Zähler wird nur bei eindeutiger Bewertung gesetzt.' : '',
      ].filter(Boolean).join('\n');
      if (typeof window.confirm === 'function' && !window.confirm(preview + '\n\nZuordnungsvorschlag übernehmen?')) {
        setStatus('Schnell‑Inbetriebnahme abgebrochen – keine Konfiguration geändert.');
        return;
      }

      let changed = false;

      // --- 0) Energiefluss-Basis automatisch aus stabilen Alias-DPs füllen ---
      const flowAuto = _nwAutoMapEnergyFlowFromDevices(devices);
      if (flowAuto && flowAuto.changed) changed = true;
      const storageAuto = _nwAutoMapStorageAppFromDevices(devices);
      if (storageAuto && storageAuto.changed) changed = true;

      // --- 1) Ladepunkte (EVCS) ---
      let evcsMapped = 0;
      if (evcsDevs.length) {
        const sc = _ensureSettingsConfig();
        const curCount = _clampInt(sc.evcsCount, 0, 50, 0);
        const wantCount = _clampInt(Math.max(curCount, evcsDevs.length), 1, 50, curCount);
        if (wantCount !== curCount) {
          sc.evcsCount = wantCount;
          changed = true;
        }
        const list = _ensureEvcsList(sc);

        for (let i = 0; i < evcsDevs.length && i < list.length; i++) {
          const before = JSON.stringify(list[i] || {});
          list[i] = _applyNwDeviceToEvcsRow(list[i], evcsDevs[i], { onlyEmpty: true });
          if (JSON.stringify(list[i] || {}) !== before) {
            evcsMapped++;
            changed = true;
          }
        }
      }

      // --- 2) PV‑Regelung: Wechselrichter (0‑Einspeisung Gruppe) ---
      let pvAdded = 0;
      let pvUpdated = 0;
      if (pvDevs.length) {
        const gc = _ensureGridConstraintsCfg();
        gc.pvCurtailInvertersZero = Array.isArray(gc.pvCurtailInvertersZero) ? gc.pvCurtailInvertersZero : [];
        const list = gc.pvCurtailInvertersZero;

        /**
         * Code-Teil: Arrow-Funktion `addOrUpdate`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: addOrUpdate
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const addOrUpdate = (dev) => {
          const name = String((dev && dev.name) || '').trim() || String((dev && dev.devId) || '').trim() || 'WR';
          const feedInLimitWId = _nwGetAlias(dev, 'ctrl.feedInLimitW') || '';
          const pvLimitWId = _nwGetWritableAlias(dev, 'ctrl.powerLimitW') || '';
          const pvLimitPctId = _nwGetAlias(dev, 'ctrl.powerLimitPct') || _nwGetAlias(dev, 'ctrlPvLimitPct') || '';
          const pvPowerReadId = _nwGetAlias(dev, 'r.pvPower') || _nwGetAlias(dev, 'r.power') || _nwGetAlias(dev, 'r.activePower') || (dev && dev.dp && dev.dp.powerW ? String(dev.dp.powerW).trim() : '') || '';

          if (!feedInLimitWId && !pvLimitWId && !pvLimitPctId) return;
          const match = list.find(it => {
            if (!it || typeof it !== 'object') return false;
            if (pvLimitPctId && String(it.pvLimitPctId || '').trim() === pvLimitPctId) return true;
            if (pvLimitWId && String(it.pvLimitWId || '').trim() === pvLimitWId) return true;
            if (feedInLimitWId && String(it.feedInLimitWId || '').trim() === feedInLimitWId) return true;
            // fallback: same baseId (rare) or same name
            if (String(it.name || '').trim() && String(it.name || '').trim() === name) return true;
            return false;
          });

          if (match) {
            const before = JSON.stringify(match);
            if (!String(match.name || '').trim()) match.name = name;
            if (match.kwp === undefined || match.kwp === null) match.kwp = '';
            if (!String(match.feedInLimitWId || '').trim() && feedInLimitWId) match.feedInLimitWId = feedInLimitWId;
            if (!String(match.pvLimitWId || '').trim() && pvLimitWId) match.pvLimitWId = pvLimitWId;
            if (!String(match.pvLimitPctId || '').trim() && pvLimitPctId) match.pvLimitPctId = pvLimitPctId;
            if (!String(match.pvPowerReadId || '').trim() && pvPowerReadId) match.pvPowerReadId = pvPowerReadId;

            if (JSON.stringify(match) !== before) {
              pvUpdated++;
              changed = true;
            }
          } else {
            list.push({
              name,
              kwp: '',
              feedInLimitWId,
              pvLimitWId,
              pvLimitPctId,
              pvPowerReadId
            });
            pvAdded++;
            changed = true;
          }
        };

        pvDevs.forEach(addOrUpdate);
      }

      // --- 3) Thermik + Energiefluss‑Verbraucher‑Slots (Wärmepumpen / Heizstäbe) ---
      let heatSlotsMapped = 0;
      let heatPara14aAdded = 0;
      let heatPara14aUpdated = 0;

      if (heatDevs.length) {
        currentConfig.datapoints = (currentConfig.datapoints && typeof currentConfig.datapoints === 'object') ? currentConfig.datapoints : {};
        const dps = currentConfig.datapoints;
        const fs = _ensureFlowSlots();

        const tcfg = _ensureThermalCfg();
        const hcfg = _ensureHeatingRodCfg();
        const icfg = _ensurePara14aCfg();
        icfg.para14aConsumers = Array.isArray(icfg.para14aConsumers) ? icfg.para14aConsumers : [];

        // helper for para14a
        /**
         * Code-Teil: Arrow-Funktion `findPara14aMatch`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: findPara14aMatch
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const findPara14aMatch = (dev, setId, enableId) => {
          const name = String((dev && dev.name) || '').trim();
          const key = String((dev && dev.devId) || '').trim();
          return (icfg.para14aConsumers || []).find(r => {
            if (!r || typeof r !== 'object') return false;
            if (setId && String(r.setPowerWId || r.setWId || '').trim() === setId) return true;
            if (enableId && String(r.enableId || r.enableWriteId || '').trim() === enableId) return true;
            if (key && String(r.key || '').trim() === key) return true;
            if (name && String(r.name || '').trim() === name) return true;
            return false;
          });
        };

        for (const dev of heatDevs) {
          const powerId = _nwGetAlias(dev, 'r.power') || (dev && dev.dp && dev.dp.powerW) || _nwGetDpFallback(dev, 'aCTIVE_POWER');
          if (!String(powerId || '').trim()) continue;

          let slot = 0;
          for (let i = 1; i <= FLOW_CONSUMER_SLOT_COUNT; i++) {
            if (String(dps[`consumer${i}Power`] || '').trim() === String(powerId).trim()) {
              slot = i;
              break;
            }
          }
          if (!slot) {
            slot = _findFreeConsumerSlot({ from: 1, to: FLOW_CONSUMER_SLOT_COUNT });
          }
          if (!slot) break;

          const dpKey = `consumer${slot}Power`;
          dps[dpKey] = powerId;

          // Slot meta
          const c = _classifyHeatDevice(dev);
          const consumerType = (c.type === 'heatingRod') ? 'heatingRod' : 'heatPump';
          fs.consumers[slot - 1] = fs.consumers[slot - 1] || { name: '', icon: '', ctrl: {}, consumerType: 'generic' };
          fs.consumers[slot - 1].name = String((dev && dev.name) || '').trim() || fs.consumers[slot - 1].name;
          fs.consumers[slot - 1].icon = c.icon;
          fs.consumers[slot - 1].consumerType = consumerType;

          // Optional control aliases (will be filled automatically once your adapter provides them)
          const ctrlRun = _nwGetWritableAlias(dev, 'ctrl.run') || (dev && dev.dp && dev.dp.ctrlRun) || '';
          const ctrlLimitW = _nwGetWritableAlias(dev, 'ctrl.powerLimitW') || (dev && dev.dp && dev.dp.ctrlPowerLimitW) || '';
          if (ctrlRun) {
            fs.consumers[slot - 1].ctrl = fs.consumers[slot - 1].ctrl || {};
            if (!String(fs.consumers[slot - 1].ctrl.switchWriteId || '').trim()) fs.consumers[slot - 1].ctrl.switchWriteId = ctrlRun;
            if (!String(fs.consumers[slot - 1].ctrl.switchReadId || '').trim()) fs.consumers[slot - 1].ctrl.switchReadId = ctrlRun;
          }
          if (ctrlLimitW) {
            fs.consumers[slot - 1].ctrl = fs.consumers[slot - 1].ctrl || {};
            if (!String(fs.consumers[slot - 1].ctrl.setpointWriteId || '').trim()) fs.consumers[slot - 1].ctrl.setpointWriteId = ctrlLimitW;
            if (!String(fs.consumers[slot - 1].ctrl.setpointReadId || '').trim()) fs.consumers[slot - 1].ctrl.setpointReadId = ctrlLimitW;
            if (!String(fs.consumers[slot - 1].ctrl.setpointUnit || '').trim()) fs.consumers[slot - 1].ctrl.setpointUnit = 'W';
            if (!String(fs.consumers[slot - 1].ctrl.setpointLabel || '').trim()) fs.consumers[slot - 1].ctrl.setpointLabel = 'Sollwert (W)';
          }

          if (consumerType === 'heatingRod') {
            const hd = hcfg.devices[slot - 1] || { slot };
            if (!String(hd.name || '').trim()) hd.name = String((dev && dev.name) || '').trim();
            if (!Number.isFinite(Number(hd.maxPowerW)) || Number(hd.maxPowerW) <= 0) {
              const wired = _countHeatingRodWiredStages(slot);
              hd.maxPowerW = Math.max(2000, (wired || 3) * 2000);
            }
            if (!Number.isFinite(Number(hd.stageCount)) || Number(hd.stageCount) < 1) hd.stageCount = Math.max(1, _countHeatingRodWiredStages(slot) || 3);
            hcfg.devices[slot - 1] = _syncHeatingRodDeviceStages(hd);
          } else {
            const td = tcfg.devices[slot - 1] || { slot };
            if (!String(td.name || '').trim()) td.name = String((dev && dev.name) || '').trim();
            if (!String(td.type || '').trim()) td.type = c.thermalType;
            tcfg.devices[slot - 1] = td;
          }

          // §14a-Migrationseintrag: Die Runtime bindet aktive Thermik-/Heizstab-
          // Fachmodule seit 0.8.155 automatisch ein. Bestehende Schnellsetup-Zeilen
          // bleiben als Migrationsmarker erhalten, werden aber weder in der UI als
          // manuelle Zusatzlast gezeigt noch als zweite SteuVE gezählt.
          const setWId = ctrlLimitW;
          const enableId = ctrlRun;
          const mappedCfg = consumerType === 'heatingRod'
            ? (hcfg.devices[slot - 1] || {})
            : (tcfg.devices[slot - 1] || {});
          const mappedPowerW = Math.max(0, Math.round(Number(
            mappedCfg.maxPowerW
            ?? mappedCfg.estimatedPowerW
            ?? mappedCfg.boostPowerW
            ?? 0
          ) || 0));

          const existing = findPara14aMatch(dev, setWId, enableId);
          if (existing) {
            const before = JSON.stringify(existing);
            if (!String(existing.name || '').trim()) existing.name = String((dev && dev.name) || '').trim();
            if (!String(existing.type || '').trim()) existing.type = c.type;
            if (!String(existing.controlType || '').trim()) existing.controlType = setWId ? 'limitW' : 'onOff';
            if (!String(existing.setPowerWId || existing.setWId || '').trim() && setWId) existing.setPowerWId = setWId;
            if (!String(existing.enableId || existing.enableWriteId || '').trim() && enableId) existing.enableId = enableId;
            if (!String(existing.key || '').trim() && String((dev && dev.devId) || '').trim()) existing.key = String(dev.devId).trim();
            if (existing.enabled === undefined) existing.enabled = !!(setWId || enableId);
            existing.maxPowerW = mappedPowerW;
            existing.installedPowerW = mappedPowerW;
            existing.source = 'device-auto-mapping';
            existing.automatic = true;

            if (JSON.stringify(existing) !== before) {
              heatPara14aUpdated++;
              changed = true;
            }
          } else {
            icfg.para14aConsumers.push({
              enabled: !!(setWId || enableId),
              key: String((dev && dev.devId) || '').trim(),
              name: String((dev && dev.name) || '').trim(),
              type: c.type,
              controlType: setWId ? 'limitW' : 'onOff',
              maxPowerW: mappedPowerW,
              installedPowerW: mappedPowerW,
              priority: 100,
              groupId: '',
              source: 'device-auto-mapping',
              automatic: true,
              setPowerWId: setWId,
              enableId
            });
            heatPara14aAdded++;
            changed = true;
          }

          heatSlotsMapped++;
          changed = true;
        }
      }

      // UI refresh (targeted)
      try { buildEvcsUI(); } catch (_e) {}
      try { rebuildStorageTable(); } catch (_e) {}
      try { buildGridConstraintsUI(); } catch (_e) {}
      try { buildFlowSlotsUI('consumers', FLOW_CONSUMER_SLOT_COUNT); } catch (_e) {}
      try { buildThermalUI(); } catch (_e) {}
      try { buildHeatingRodUI(); } catch (_e) {}
      try { buildPara14aUI(); } catch (_e) {}
      scheduleValidation(250);

      const msgParts = [];
      msgParts.push(`Geräte gefunden: ${devices.length}`);
      if (evcsDevs.length) msgParts.push(`Ladepunkte: ${evcsDevs.length} (zugeordnet: ${evcsMapped})`);
      if (pvDevs.length) msgParts.push(`Wechselrichter: ${pvDevs.length} (+${pvAdded}/${pvUpdated})`);
      if (heatDevs.length) msgParts.push(`Wärmegeräte: ${heatDevs.length} (Slots: ${heatSlotsMapped}, §14a automatisch: +${heatPara14aAdded}/${heatPara14aUpdated})`);
      if (flowAuto && Array.isArray(flowAuto.notes) && flowAuto.notes.length) msgParts.push('Energiefluss: ' + flowAuto.notes.join(', '));
      if (storageAuto && Array.isArray(storageAuto.notes) && storageAuto.notes.length) msgParts.push(storageAuto.notes.join(', '));

      if (!changed) {
        setStatus('Schnell‑Inbetriebnahme: keine Änderungen (alles bereits belegt).', 'ok');
      } else {
        setStatus('Schnell‑Inbetriebnahme abgeschlossen. Bitte prüfen und speichern. • ' + msgParts.join(' • '), 'ok');
      }
    } catch (e) {
      setStatus('Schnell‑Inbetriebnahme fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }
  /**
   * Code-Teil: loadConfig
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function loadConfig() {
    setStatus('Lade Konfiguration…');
    const data = await fetchJson('/api/installer/config?t=' + Date.now(), { cache: 'no-store' });
    const cfg = (data && data.config && typeof data.config === 'object') ? data.config : {};

    // Ein erfolgreicher Konfigurationsabruf und alte States beweisen keine Edition.
    // Auch bei Ablauf, Widerruf oder fehlender Antwort wird die Anzeige gesperrt.
    cfg.license = await fetchLicenseInfoFallback();

    await hydrateStorageFarmConfigFromRuntimeState(cfg);
    applyConfigToUI(cfg);
    clearDirty();
    scheduleValidation(300);
    setStatus('Konfiguration geladen.', 'ok');
  }
  /**
   * Code-Teil: collectPatchFromUI
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  /**
   * Release Safety Gate 0.8.59.
   *
   * Verhindert, dass ein stale/fehlerhaft gerenderter App-Center-Screen
   * produktive Kernbereiche leer überschreibt. Das ist bewusst Frontend-Schutz;
   * das Backend hat zusätzlich eigene Guards für Speicherfarm-Runtime-Fallbacks.
   *
   * Wichtig:
   * - keine fachliche Regelung
   * - keine Hardwarewrites
   * - nur Schutz des Save-Payloads
   */
  function applyReleaseSafetyGateToPatch(patch) {
    const out = patch && typeof patch === 'object' ? patch : {};
    const restoreArrayIfDangerouslyEmpty = (section, key, markerName) => {
      try {
        const src = currentConfig && currentConfig[section] && typeof currentConfig[section] === 'object' ? currentConfig[section] : null;
        const dst = out[section] && typeof out[section] === 'object' ? out[section] : null;
        if (!src || !dst) return;
        const currentRows = Array.isArray(src[key]) ? src[key] : [];
        const patchRows = Array.isArray(dst[key]) ? dst[key] : null;
        const explicitDelete = dst.__allowEmpty === true || dst.__allowEmptyStorages === true || dst.__explicitDeleteAll === true;
        if (currentRows.length > 0 && patchRows && patchRows.length === 0 && !explicitDelete) {
          dst[key] = currentRows.slice();
          dst.__releaseSafetyGate = true;
          dst.__releaseSafetyGateReason = `${section}.${key} restored from currentConfig because App-Center payload was empty`;
          try { console.warn(`[NexoWatt] ReleaseSafetyGate restored ${section}.${key} (${currentRows.length}) from currentConfig.`); } catch (_e) {}
        }
      } catch (_e) {}
    };

    // Kernbereiche, die nicht durch einen Renderfehler verschwinden dürfen.
    restoreArrayIfDangerouslyEmpty('storageFarm', 'storages', 'storageFarm');
    restoreArrayIfDangerouslyEmpty('storageFarm', 'groups', 'storageFarmGroups');
    restoreArrayIfDangerouslyEmpty('chargeKiosk', 'stations', 'chargeKioskStations');
    restoreArrayIfDangerouslyEmpty('meshMicrogrid', 'nodes', 'meshMicrogridNodes');
    restoreArrayIfDangerouslyEmpty('meshMicrogrid', 'targetGroups', 'meshMicrogridTargetGroups');
    restoreArrayIfDangerouslyEmpty('meshMicrogrid', 'localBridgeMappings', 'meshMicrogridLocalBridgeMappings');
    try {
      const srcRows = currentConfig && currentConfig.energyLedger && currentConfig.energyLedger.origin && Array.isArray(currentConfig.energyLedger.origin.chargePoints)
        ? currentConfig.energyLedger.origin.chargePoints
        : [];
      const dstOrigin = out && out.energyLedger && out.energyLedger.origin && typeof out.energyLedger.origin === 'object'
        ? out.energyLedger.origin
        : null;
      if (srcRows.length > 0 && dstOrigin && Array.isArray(dstOrigin.chargePoints) && dstOrigin.chargePoints.length === 0 && dstOrigin.__explicitDeleteAll !== true) {
        dstOrigin.chargePoints = srcRows.slice();
        dstOrigin.__releaseSafetyGate = true;
        dstOrigin.__releaseSafetyGateReason = 'energyLedger.origin.chargePoints restored from currentConfig because App-Center payload was empty';
      }
    } catch (_eLedgerSafety) {}

    // Strukturmarker für Release-/Regressionstests. Wird vom Backend ignoriert,
    // hilft aber, Save-Payloads im Feld eindeutig zu diagnostizieren.
    out.__releaseSafetyGateVersion = '0.8.59';
    return out;
  }

  function collectPatchFromUI() {
    const patch = {};

    // Apps
    patch.emsApps = deepMerge({}, (currentConfig && currentConfig.emsApps) ? currentConfig.emsApps : {});
    patch.emsApps.apps = (patch.emsApps.apps && typeof patch.emsApps.apps === 'object') ? patch.emsApps.apps : {};
    for (const app of APP_CATALOG) {
      const i1 = document.getElementById(`app_${app.id}_installed`);
      const i2 = document.getElementById(`app_${app.id}_enabled`);
      if (!_isAppLicensed(app.id)) {
        patch.emsApps.apps[app.id] = { installed: false, enabled: false, licenseBlocked: true, requiredLicense: 'Pro' };
        continue;
      }
      if (!i1 && !i2) {
        const existing = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps && currentConfig.emsApps.apps[app.id]
          ? currentConfig.emsApps.apps[app.id]
          : { installed: false, enabled: false };
        patch.emsApps.apps[app.id] = deepMerge({}, existing);
        continue;
      }
      const installed = app.mandatory ? true : !!(i1 && i1.checked);
      const enabled = app.mandatory ? true : !!(i2 && i2.checked);
      patch.emsApps.apps[app.id] = { installed, enabled };
    }

    // Scheduler
    const sched = Number(els.schedulerIntervalMs.value);
    if (Number.isFinite(sched) && sched >= 250) {
      patch.schedulerIntervalMs = Math.max(250, Math.min(1000, Math.round(sched)));
    }

    // System-/Marktprofil (Installer only): Sprache bleibt systemgeführt, Land wird hier verwaltet.
    const countrySelect = document.getElementById('countryProfileCountry');
    const countryRaw = countrySelect ? String(countrySelect.value || '').trim().toUpperCase() : _nwSystemProfileCountry();
    patch.countryProfile = deepMerge({}, (currentConfig && currentConfig.countryProfile) ? currentConfig.countryProfile : {});
    patch.countryProfile.country = countryRaw === 'NL' ? 'NL' : 'DE';
    patch.countryProfile.languageMode = 'system';

    patch.energyWallet = deepMerge({}, (currentConfig && currentConfig.energyWallet) ? currentConfig.energyWallet : {});
    patch.energyWallet.enabled = true;
    patch.energyWallet.showOnLive = true;
    // Kosten-/Preisannahmen werden ab 0.8.20 nicht mehr im App-Center gespeichert.
    // Sie sind kundennahe Betreiberwerte unter settings.energyWallet* im Frontend.
    // Alte Config-Werte bleiben nur als Legacy-Fallback im EMS-Modul erhalten.


    // Niederlande P1/DSMR (Installer only): reine Datenpunkt-Verknüpfung.
    // Kosten-/Preisannahmen bleiben kundennahe Einstellungen; Export Guard bleibt separat.
    const nlp1EnabledEl = document.querySelector('[data-nlp1-field="enabled"]');
    const readNlP1 = (name) => {
      const el = document.querySelector(`[data-nlp1-field="${name}"]`);
      return el ? String(el.value || '').trim() : '';
    };
    const readNlP1Dp = (name) => {
      const el = document.querySelector(`[data-nlp1-dp="${name}"]`);
      return el ? String(el.value || '').trim() : '';
    };
    const nlp1Number = (name, fallback, min, max) => {
      const n = Number(readNlP1(name));
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, Math.round(n * 10000) / 10000));
    };
    patch.nlP1 = deepMerge({}, (currentConfig && currentConfig.nlP1) ? currentConfig.nlP1 : {});
    const nlp1AppState = patch.emsApps && patch.emsApps.apps && patch.emsApps.apps.nlP1 ? patch.emsApps.apps.nlP1 : null;
    patch.nlP1.enabled = nlp1EnabledEl ? nlp1EnabledEl.value === 'true' : !!(nlp1AppState && nlp1AppState.installed && nlp1AppState.enabled);
    patch.nlP1.staleTimeoutSec = Math.max(30, Math.min(86400, Math.round(Number(readNlP1('staleTimeoutSec')) || Number(patch.nlP1.staleTimeoutSec) || 300)));
    patch.nlP1.returnValueEurPerKwh = nlp1Number('returnValueEurPerKwh', Number(patch.nlP1.returnValueEurPerKwh) || 0.08, -5, 5);
    patch.nlP1.returnCostEurPerKwh = nlp1Number('returnCostEurPerKwh', Number(patch.nlP1.returnCostEurPerKwh) || 0, 0, 5);
    patch.nlP1.datapoints = {
      importPowerW: readNlP1Dp('importPowerW'),
      exportPowerW: readNlP1Dp('exportPowerW'),
      netPowerW: readNlP1Dp('netPowerW'),
      importEnergyKwh: readNlP1Dp('importEnergyKwh'),
      exportEnergyKwh: readNlP1Dp('exportEnergyKwh'),
      gasM3: readNlP1Dp('gasM3'),
      activeTariff: readNlP1Dp('activeTariff'),
    };

    // Energieherkunft & Ladebilanz (Home + Pro): read-only Mess- und
    // Nachweisjournal. Die eigenständige UI-Brücke sammelt ausschließlich
    // Fremd-DP-Lesebindungen und Deklarationen.
    patch.energyLedger = deepMerge({}, (currentConfig && currentConfig.energyLedger) ? currentConfig.energyLedger : {});
    const ledgerAppState = patch.emsApps && patch.emsApps.apps && patch.emsApps.apps.energyLedger ? patch.emsApps.apps.energyLedger : null;
    patch.energyLedger.enabled = !!(ledgerAppState && ledgerAppState.installed && ledgerAppState.enabled);
    patch.energyLedger.source = 'chargeKiosk.lastSessionsByLpJson';
    patch.energyLedger.recentEntryLimit = Number.isFinite(Number(patch.energyLedger.recentEntryLimit)) ? Number(patch.energyLedger.recentEntryLimit) : 200;
    patch.energyLedger.processedSessionLimit = Number.isFinite(Number(patch.energyLedger.processedSessionLimit)) ? Number(patch.energyLedger.processedSessionLimit) : 2000;
    const ledgerOriginExisting = patch.energyLedger.origin && typeof patch.energyLedger.origin === 'object' ? patch.energyLedger.origin : {};
    if (window.NexoWattEnergyOriginAppCenter) {
      patch.energyLedger.origin = window.NexoWattEnergyOriginAppCenter.collect(ledgerOriginExisting, patch.energyLedger.enabled, _licenseEdition());
    }

    // EOS Netzbetreiber-Schnittstelle: Der Reglerzugriff bleibt strikt read-only.
    // Nach vollständiger Aktivierung stellt das Modul nur einen validierten Envelope
    // bereit; der bestehende Export Guard bleibt der einzige Anlagen-Sollwertschreiber.
    const netOperatorAppState = patch.emsApps && patch.emsApps.apps && patch.emsApps.apps.netOperator ? patch.emsApps.apps.netOperator : null;
    const netOperatorEnabled = !!(netOperatorAppState && netOperatorAppState.installed && netOperatorAppState.enabled);
    patch.netOperatorInterface = window.NexoWattNetOperatorAppCenter
      ? window.NexoWattNetOperatorAppCenter.collect(
          currentConfig && currentConfig.netOperatorInterface ? currentConfig.netOperatorInterface : {},
          netOperatorEnabled,
          _licenseEdition(),
        )
      : deepMerge({}, (currentConfig && currentConfig.netOperatorInterface) ? currentConfig.netOperatorInterface : {});
    patch.enableNetOperatorInterface = netOperatorEnabled && _licenseEdition() === 'eos';

    // EOS Betriebsstrategien RC56: Ressourcen, Profile und Regeln werden zentral
    // gespeichert. Live-Anforderungen sind nur nach vollständiger globaler und
    // ressourcenbezogener Inbetriebnahme freigegeben; die Fachmodule bleiben Writer.
    const operatingStrategiesAppState = patch.emsApps && patch.emsApps.apps && patch.emsApps.apps.operatingStrategies ? patch.emsApps.apps.operatingStrategies : null;
    const operatingStrategiesEnabled = !!(operatingStrategiesAppState && operatingStrategiesAppState.installed && operatingStrategiesAppState.enabled);
    patch.operatingStrategies = window.NexoWattOperatingStrategiesAppCenter
      ? window.NexoWattOperatingStrategiesAppCenter.collect(
          currentConfig && currentConfig.operatingStrategies ? currentConfig.operatingStrategies : {},
          operatingStrategiesEnabled,
          _licenseEdition(),
        )
      : deepMerge({}, (currentConfig && currentConfig.operatingStrategies) ? currentConfig.operatingStrategies : {});
    patch.operatingStrategies.enabled = operatingStrategiesEnabled && _licenseEdition() === 'eos';

    // AppCenter steuert Installation/Aktivierung. Nicht gerenderte Bestandsfelder
    // bleiben unverändert; Master/Slave-Einstellungen speichert die zugehörige EMS-API.
    const meshAppState = patch.emsApps && patch.emsApps.apps && patch.emsApps.apps.meshMicrogrid ? patch.emsApps.apps.meshMicrogrid : null;
    const meshEnabledEl = document.getElementById('meshMicrogridEnabled');
    const meshModeEl = document.getElementById('meshMicrogridMode');
    const meshGridLimitEl = document.getElementById('meshMicrogridGridLimitW');
    const meshClusterIdEl = document.getElementById('meshMicrogridClusterId');
    const meshClusterNameEl = document.getElementById('meshMicrogridClusterName');
    const meshControlModeEl = document.getElementById('meshMicrogridControlMode');
    const meshFieldApprovedEl = document.getElementById('meshMicrogridFieldApproved');
    const meshCommandStateEl = document.getElementById('meshMicrogridCommandStateDp');
    const meshMaxCommandsEl = document.getElementById('meshMicrogridMaxCommandsPerTick');
    const meshTsEnabledEl = document.getElementById('meshMicrogridTailscaleEnabled');
    const meshTsProfileEl = document.getElementById('meshMicrogridTailscaleProfile');
    const meshTsLocalNodeEl = document.getElementById('meshMicrogridTailscaleLocalNodeId');
    const meshTsPeerUrlsEl = document.getElementById('meshMicrogridTailscalePeerUrls');
    const meshTsPeerTokenEl = document.getElementById('meshMicrogridTailscalePeerToken');
    const meshReceiverEnabledEl = document.getElementById('meshMicrogridReceiverEnabled');
    const meshReceiverAcceptEl = document.getElementById('meshMicrogridReceiverAccept');
    const meshReceiverRequireClusterEl = document.getElementById('meshMicrogridReceiverRequireCluster');
    const meshReceiverStateEl = document.getElementById('meshMicrogridReceiverStateDp');
    const meshReceiverTokenEl = document.getElementById('meshMicrogridReceiverToken');
    const meshReceiverReplayTtlEl = document.getElementById('meshMicrogridReceiverReplayTtl');
    const meshLocalBridgeEnabledEl = document.getElementById('meshMicrogridLocalBridgeEnabled');
    const meshLocalBridgeModeEl = document.getElementById('meshMicrogridLocalBridgeOutputMode');
    const meshLocalBridgeDefaultStateEl = document.getElementById('meshMicrogridLocalBridgeDefaultState');
    const meshLocalBridgeAckEnabledEl = document.getElementById('meshMicrogridLocalBridgeAckEnabled');
    const meshLocalBridgeAckRequiredEl = document.getElementById('meshMicrogridLocalBridgeAckRequired');
    const meshLocalBridgeDefaultAckStateEl = document.getElementById('meshMicrogridLocalBridgeDefaultAckState');
    const meshLocalBridgeAckTimeoutEl = document.getElementById('meshMicrogridLocalBridgeAckTimeoutSec');
    const meshLocalBridgeMappingsEl = document.getElementById('meshMicrogridLocalBridgeMappingsJson');
    const meshTargetGroupsEl = document.getElementById('meshMicrogridTargetGroupsJson');
    const meshRows = Array.from(document.querySelectorAll('[data-mesh-node-row]'));
    const readMesh = (row, field) => {
      const el = row && row.querySelector(`[data-mesh-field="${field}"]`);
      return el ? String(el.value || '').trim() : '';
    };
    const safeMeshId = (value, fallback) => String(value || fallback || 'node').trim().toLowerCase().replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || fallback || 'node';
    patch.meshMicrogrid = deepMerge({}, (currentConfig && currentConfig.meshMicrogrid) ? currentConfig.meshMicrogrid : {});
    patch.meshMicrogrid.enabled = !!(meshAppState && meshAppState.installed && meshAppState.enabled);
    if (meshModeEl) {
    patch.meshMicrogrid.mode = meshModeEl && ['off','diagnostic','local_first','grid_last'].includes(meshModeEl.value) ? meshModeEl.value : 'diagnostic';
    patch.meshMicrogrid.clusterId = safeMeshId(meshClusterIdEl ? meshClusterIdEl.value : 'cluster_01', 'cluster_01');
    patch.meshMicrogrid.clusterName = meshClusterNameEl ? String(meshClusterNameEl.value || 'Lokaler Energieverbund').trim() : 'Lokaler Energieverbund';
    patch.meshMicrogrid.gridLimitW = Math.max(0, Math.round(Number(meshGridLimitEl ? meshGridLimitEl.value : 0) || 0));
    patch.meshMicrogrid.controlMode = meshControlModeEl && ['off','diagnostic','field_test','active'].includes(meshControlModeEl.value) ? meshControlModeEl.value : 'diagnostic';
    patch.meshMicrogrid.fieldTestApproved = meshFieldApprovedEl ? meshFieldApprovedEl.value === 'true' : false;
    patch.meshMicrogrid.activeControlApproved = patch.meshMicrogrid.fieldTestApproved;
    patch.meshMicrogrid.commandStateDp = meshCommandStateEl ? String(meshCommandStateEl.value || '').trim() : '';
    patch.meshMicrogrid.maxCommandsPerTick = Math.max(1, Math.min(10, Math.round(Number(meshMaxCommandsEl ? meshMaxCommandsEl.value : 3) || 3)));
    patch.meshMicrogrid.tailscale = patch.meshMicrogrid.tailscale && typeof patch.meshMicrogrid.tailscale === 'object' ? patch.meshMicrogrid.tailscale : {};
    patch.meshMicrogrid.tailscale.enabled = meshTsEnabledEl ? meshTsEnabledEl.value === 'true' : false;
    patch.meshMicrogrid.tailscale.profile = meshTsProfileEl ? String(meshTsProfileEl.value || 'mesh-microgrid').trim() : 'mesh-microgrid';
    patch.meshMicrogrid.tailscale.localNodeId = safeMeshId(meshTsLocalNodeEl ? meshTsLocalNodeEl.value : patch.meshMicrogrid.clusterId, patch.meshMicrogrid.clusterId || 'local');
    patch.meshMicrogrid.tailscale.peerUrls = String(meshTsPeerUrlsEl ? meshTsPeerUrlsEl.value || '' : '').split(/[\n,;]+/g).map((x) => x.trim()).filter(Boolean);
    patch.meshMicrogrid.tailscale.peerToken = meshTsPeerTokenEl ? String(meshTsPeerTokenEl.value || '').trim() : '';
    patch.meshMicrogrid.receiver = patch.meshMicrogrid.receiver && typeof patch.meshMicrogrid.receiver === 'object' ? patch.meshMicrogrid.receiver : {};
    patch.meshMicrogrid.receiver.enabled = meshReceiverEnabledEl ? meshReceiverEnabledEl.value === 'true' : false;
    patch.meshMicrogrid.receiver.acceptRemoteCommands = meshReceiverAcceptEl ? meshReceiverAcceptEl.value === 'true' : false;
    patch.meshMicrogrid.receiver.requireClusterMatch = meshReceiverRequireClusterEl ? meshReceiverRequireClusterEl.value !== 'false' : true;
    patch.meshMicrogrid.receiver.localCommandStateDp = meshReceiverStateEl ? String(meshReceiverStateEl.value || '').trim() : '';
    patch.meshMicrogrid.receiver.peerToken = meshReceiverTokenEl ? String(meshReceiverTokenEl.value || '').trim() : '';
    patch.meshMicrogrid.receiver.replayTtlSec = Math.max(30, Math.min(86400, Math.round(Number(meshReceiverReplayTtlEl ? meshReceiverReplayTtlEl.value : 900) || 900)));
    patch.meshMicrogrid.localBridge = patch.meshMicrogrid.localBridge && typeof patch.meshMicrogrid.localBridge === 'object' ? patch.meshMicrogrid.localBridge : {};
    patch.meshMicrogrid.localBridge.enabled = meshLocalBridgeEnabledEl ? meshLocalBridgeEnabledEl.value === 'true' : false;
    patch.meshMicrogrid.localBridge.outputMode = meshLocalBridgeModeEl && ['global','mapped','both'].includes(meshLocalBridgeModeEl.value) ? meshLocalBridgeModeEl.value : 'global';
    patch.meshMicrogrid.localBridge.defaultCommandStateDp = meshLocalBridgeDefaultStateEl ? String(meshLocalBridgeDefaultStateEl.value || '').trim() : '';
    patch.meshMicrogrid.localBridge.ackEnabled = meshLocalBridgeAckEnabledEl ? meshLocalBridgeAckEnabledEl.value === 'true' : false;
    patch.meshMicrogrid.localBridge.ackRequired = meshLocalBridgeAckRequiredEl ? meshLocalBridgeAckRequiredEl.value === 'true' : false;
    patch.meshMicrogrid.localBridge.defaultAckStateDp = meshLocalBridgeDefaultAckStateEl ? String(meshLocalBridgeDefaultAckStateEl.value || '').trim() : '';
    patch.meshMicrogrid.localBridge.ackTimeoutSec = Math.max(5, Math.min(86400, Math.round(Number(meshLocalBridgeAckTimeoutEl ? meshLocalBridgeAckTimeoutEl.value : 120) || 120)));
    try {
      const parsedBridgeMappings = meshLocalBridgeMappingsEl && String(meshLocalBridgeMappingsEl.value || '').trim() ? JSON.parse(String(meshLocalBridgeMappingsEl.value || '[]')) : [];
      patch.meshMicrogrid.localBridge.mappings = Array.isArray(parsedBridgeMappings) ? parsedBridgeMappings : [];
    } catch (_meshBridgeJsonError) {
      patch.meshMicrogrid.localBridge.mappings = Array.isArray(patch.meshMicrogrid.localBridge.mappings) ? patch.meshMicrogrid.localBridge.mappings : [];
    }
    try {
      const parsedTargetGroups = meshTargetGroupsEl && String(meshTargetGroupsEl.value || '').trim() ? JSON.parse(String(meshTargetGroupsEl.value || '[]')) : [];
      patch.meshMicrogrid.targetGroups = Array.isArray(parsedTargetGroups) ? parsedTargetGroups : [];
    } catch (_meshTargetGroupJsonError) {
      patch.meshMicrogrid.targetGroups = Array.isArray(patch.meshMicrogrid.targetGroups) ? patch.meshMicrogrid.targetGroups : [];
    }
    const readMeshPowerLimit = (row, field) => {
      const n = Number(readMesh(row, field));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
    };
    patch.meshMicrogrid.nodes = meshRows.map((row, idx) => {
      const type = ['producer','consumer','storage','grid','chargepoint','thermal','generic'].includes(readMesh(row, 'type')) ? readMesh(row, 'type') : 'consumer';
      const role = ['producer','consumer','storage','grid'].includes(readMesh(row, 'role')) ? readMesh(row, 'role') : (type === 'producer' ? 'producer' : (type === 'storage' ? 'storage' : (type === 'grid' ? 'grid' : 'consumer')));
      return {
        id: safeMeshId(readMesh(row, 'id'), `node_${idx + 1}`),
        name: readMesh(row, 'name') || `Energie-Knoten ${idx + 1}`,
        enabled: readMesh(row, 'enabled') !== 'false',
        type,
        role,
        priority: Math.max(1, Math.min(999, Math.round(Number(readMesh(row, 'priority')) || 100))),
        powerDp: readMesh(row, 'powerDp'),
        surplusPowerDp: readMesh(row, 'surplusPowerDp'),
        demandPowerDp: readMesh(row, 'demandPowerDp'),
        socDp: readMesh(row, 'socDp'),
        gridImportPowerDp: readMesh(row, 'gridImportPowerDp'),
        gridExportPowerDp: readMesh(row, 'gridExportPowerDp'),
        minPowerW: readMeshPowerLimit(row, 'minPowerW'),
        maxPowerW: readMeshPowerLimit(row, 'maxPowerW'),
        maxImportW: readMeshPowerLimit(row, 'maxImportW'),
        maxExportW: readMeshPowerLimit(row, 'maxExportW'),
        maxChargeW: readMeshPowerLimit(row, 'maxChargeW'),
        maxDischargeW: readMeshPowerLimit(row, 'maxDischargeW'),
        maxLoadW: readMeshPowerLimit(row, 'maxLoadW'),
        maxGenerationW: readMeshPowerLimit(row, 'maxGenerationW'),
        targetGroupIds: String(readMesh(row, 'targetGroupIds') || '').split(/[\n,;]+/g).map((x) => safeMeshId(x.trim(), '')).filter(Boolean),
      };
    });

    } // Nur tatsächlich gerenderte Legacy-Bridge-Felder übernehmen.

    // EOS DC Station Display / Charge Kiosk (Installer only).
    // Das normale Nutzerfrontend bekommt keine Konfiguration; die Displayseite nutzt nur Token + zugeordnete LPs.
    const ckEnabledEl = document.getElementById('chargeKioskEnabled');
    const ckRows = Array.from(document.querySelectorAll('[data-charge-kiosk-station-row]'));
    const splitLpList = (raw) => String(raw || '').split(/[;,\s]+/g).map((x) => x.trim()).filter(Boolean).map((x) => {
      const m = x.toLowerCase().match(/^(?:lp|ladepunkt|connector|evcs)?\s*([0-9]+)$/i) || x.toLowerCase().match(/^lp([0-9]+)$/i);
      return m ? `lp${Math.max(1, Math.round(Number(m[1]) || 1))}` : x.toLowerCase().replace(/[^a-z0-9_\-]+/g, '_');
    }).filter((v, i, a) => v && a.indexOf(v) === i);
    const readCk = (row, field) => {
      const el = row && row.querySelector(`[data-ck-field="${field}"]`);
      return el ? String(el.value || '').trim() : '';
    };
    const readCkPrice = (row, field) => {
      const raw = readCk(row, field);
      const n = Number(raw);
      return Number.isFinite(n) ? Math.max(-1, Math.min(5, Math.round(n * 10000) / 10000)) : undefined;
    };
    const readCkInt = (row, field, fallback, min, max) => {
      const n = Number(readCk(row, field));
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, Math.round(n)));
    };
    patch.chargeKiosk = deepMerge({}, (currentConfig && currentConfig.chargeKiosk) ? currentConfig.chargeKiosk : {});
    patch.chargeKiosk.enabled = ckEnabledEl ? ckEnabledEl.value === 'true' : !!patch.chargeKiosk.enabled;
    patch.chargeKiosk.displayBasePath = '/display/station/';
    patch.chargeKiosk.stations = ckRows.map((row, idx) => {
      const modes = [];
      if (readCk(row, 'solar') !== 'false') modes.push('solar');
      if (readCk(row, 'fast') !== 'false') modes.push('fast');
      const stationKey = readCk(row, 'stationKey');
      const assignmentMode = readCk(row, 'assignmentMode') === 'manual' ? 'manual' : 'station';
      const manualChargepoints = splitLpList(readCk(row, 'assignedChargepoints'));
      const automaticChargepoints = stationKey ? _chargeKioskAssignedForStation(stationKey) : [];
      const out = {
        id: readCk(row, 'id') || stationKey || `dc_station_${idx + 1}`,
        name: readCk(row, 'name') || `DC Ladestation ${idx + 1}`,
        type: readCk(row, 'type') === 'ac' ? 'ac' : 'dc',
        token: readCk(row, 'token'),
        enabled: readCk(row, 'enabled') !== 'false',
        displayMode: 'station',
        stationKey,
        assignmentMode,
        assignedChargepoints: assignmentMode === 'station' ? automaticChargepoints : manualChargepoints,
        allowedModes: modes.length ? modes : ['solar', 'fast'],
        showPrice: true,
        showSolarShare: true,
        allowStartStop: readCk(row, 'allowStartStop') !== 'false',
        maintenanceMode: readCk(row, 'maintenanceMode') === 'true',
        watchdogTimeoutSec: readCkInt(row, 'watchdogTimeoutSec', 45, 15, 600),
        displayRefreshSec: readCkInt(row, 'displayRefreshSec', 3, 1, 30),
        layoutMode: ['single','dual','quad','compact','auto'].includes(readCk(row, 'layoutMode')) ? readCk(row, 'layoutMode') : 'auto',
        showLanguageSwitch: readCk(row, 'showLanguageSwitch') === 'true',
        controlBridge: ['charging-management','ems-intent','generic','readonly'].includes(readCk(row, 'controlBridge')) ? readCk(row, 'controlBridge') : 'charging-management',
        commandStateId: readCk(row, 'commandStateId'),
        // Steuerprofil bleibt herstelleroffen:
        // - chargingManagement schreibt nur in die NexoWatt-/EMS-Abstraktion.
        // - generic erzeugt zusätzlich ein JSON-Kommando für beliebige OCPP-/Modbus-/MQTT-/Herstelleradapter.
        controlProfile: readCk(row, 'controlBridge') === 'generic' ? 'dual' : 'chargingManagement',
        writeChargingManagementMirror: true,
        protocolHint: readCk(row, 'protocolHint') || 'manufacturer-open',
        languageMode: 'system',
        theme: 'nexowatt-dark-touch',
      };
      const solarPrice = readCkPrice(row, 'solarPriceEurPerKwh');
      const fastPrice = readCkPrice(row, 'fastPriceEurPerKwh');
      if (solarPrice !== undefined) out.solarPriceEurPerKwh = solarPrice;
      if (fastPrice !== undefined) out.fastPriceEurPerKwh = fastPrice;
      return out;
    });

    // Plant
    const gcp = Number(els.gridConnectionPower.value);
    patch.installerConfig = patch.installerConfig || {};
    if (Number.isFinite(gcp) && gcp >= 0) patch.installerConfig.gridConnectionPower = Math.round(gcp);


    // §14a (Netzsteuerung)
    try {
      const ic = _ensurePara14aCfg();
      patch.installerConfig.para14aMode = String(ic.para14aMode || 'ems');
      patch.installerConfig.para14aMinPerDeviceW = Math.round(Number(ic.para14aMinPerDeviceW) || 0);
      patch.installerConfig.para14aSignalMaxAgeSec = Math.max(1, Math.round(Number(ic.para14aSignalMaxAgeSec) || 30));
      patch.installerConfig.para14aStalePolicy = String(ic.para14aStalePolicy || 'local-pmin');
      patch.installerConfig.para14aLegacyDirectWritesEnabled = ic.para14aLegacyDirectWritesEnabled === true;
      patch.installerConfig.para14aActiveId = String(ic.para14aActiveId || '').trim();
      patch.installerConfig.para14aEmsSetpointWId = String(ic.para14aEmsSetpointWId || '').trim();
      patch.installerConfig.para14aConsumers = deepMerge([], Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : []);
    } catch (_e) {
      // ignore
    }

    // Datapoints (inkl. Energiefluss-Monitor)
    patch.tariffProvider = collectTariffProviderConfig();
    if (patch.tariffProvider.enabled && patch.tariffProvider.providerId !== 'manual-dp' && patch.tariffProvider.autoCoupleDatapoints) {
      _coupleTariffProviderDatapointsSync();
    }
    patch.datapoints = Object.assign({}, currentConfig.datapoints || {});

    // Migrations-/Kompatibilitäts-Glättung:
    // älteres Setup nutzte 'consumptionHeating' für Heizung. Wenn consumer1Power gesetzt ist,
    // bevorzugen wir den Slot und leeren das Legacy-Feld, damit keine doppelte Logik entsteht.
    const c1 = String(patch.datapoints.consumer1Power || '').trim();
    if (c1) patch.datapoints.consumptionHeating = '';

    // Netzpunkt (NVP): globaler Netto-Netzleistungs-DP (Import+ / Export-)
    if (els.gridPointPowerId) patch.datapoints.gridPointPower = String(els.gridPointPowerId.value || '').trim();
    if (els.gridPointConnectedId) patch.datapoints.gridPointConnected = String(els.gridPointConnectedId.value || '').trim();
    if (els.gridPointWatchdogId) patch.datapoints.gridPointWatchdog = String(els.gridPointWatchdogId.value || '').trim();

    // EVCS / Stations (stored in settingsConfig)
    try {
      patch.settingsConfig = collectSettingsConfigFromUI();
    } catch (_e) {
      patch.settingsConfig = deepMerge({}, currentConfig.settingsConfig || {});
    }

    // Lademanagement (Algorithmen / Ziel‑Strategie)
    patch.chargingManagement = deepMerge({}, currentConfig.chargingManagement || {});

    // Energiefluss-Optionen (wie bisherige Instanzeinstellungen)
    patch.settings = deepMerge({}, (currentConfig && currentConfig.settings) ? currentConfig.settings : {});
    if (els.flowSubtractEvFromBuilding) patch.settings.flowSubtractEvFromBuilding = !!els.flowSubtractEvFromBuilding.checked;
    if (els.flowInvertGrid) patch.settings.flowInvertGrid = !!els.flowInvertGrid.checked;
    if (els.flowInvertBattery) patch.settings.flowInvertBattery = !!els.flowInvertBattery.checked;
    if (els.flowInvertPv) patch.settings.flowInvertPv = !!els.flowInvertPv.checked;
    if (els.flowInvertEv) patch.settings.flowInvertEv = !!els.flowInvertEv.checked;
    if (els.flowGridShowNet) patch.settings.flowGridShowNet = !!els.flowGridShowNet.checked;

    // TypeScript-Migration: Energiefluss-Schaltmodus aus dem App-Center speichern.
    // Wichtig: Diese Config schaltet nicht blind um; das Backend prüft weiterhin Shadow-Status und Sicherheitsfreigabe.
    patch.tsMigration = collectEnergyFlowTsMigrationFromUi(currentConfig && currentConfig.tsMigration);

    // Energiefluss: Leistungseinheiten pro DP (W vs kW)
    // Checkbox aktiv = DP liefert Watt (W).
    // Checkbox aus  = DP liefert kW (1 = 1 kW).
    const flowPowerDpIsW = {};
    document.querySelectorAll('input[data-flow-power-unit-key]').forEach((cb) => {
      const k = cb.getAttribute('data-flow-power-unit-key');
      if (!k) return;
      flowPowerDpIsW[k] = !!cb.checked;
    });
    patch.settings.flowPowerDpIsW = flowPowerDpIsW;
    // Legacy global Schalter deaktivieren (wird nicht mehr genutzt)
    patch.settings.flowPowerInputIsW = null;

    // VIS-Konfiguration (z.B. Namen/Slots für den Energiefluss-Monitor)
    patch.vis = deepMerge({}, (currentConfig && currentConfig.vis) ? currentConfig.vis : {});
    try {
      const fs = _ensureFlowSlots();
      patch.vis.flowSlots = deepMerge({}, fs);
    } catch (_e) {
      // ignore
    }

    // Thermik / Heizstab (PV‑Auto für Verbraucher‑Slots)
    try { flushHeatingRodConfigFromDom(); } catch (_e) {}
    patch.thermal = deepMerge({}, currentConfig.thermal || {});
    patch.heatingRod = deepMerge({}, currentConfig.heatingRod || {});
    patch.bhkw = deepMerge({}, currentConfig.bhkw || {});
    patch.generator = deepMerge({}, currentConfig.generator || {});

    // Schwellwertsteuerung
    patch.threshold = deepMerge({}, currentConfig.threshold || {});

    // Relaissteuerung
    patch.relay = deepMerge({}, currentConfig.relay || {});

    // Grid-Constraints
    patch.gridConstraints = _normalizeGridExportControlCfg(deepMerge({}, currentConfig.gridConstraints || {}));

    // PeakShaving / Lastspitzenkappung
    patch.peakShaving = collectPeakShavingConfigFromUI(currentConfig.peakShaving || {});

    // KI‑Energieberater / KI‑Optimierung
    patch.aiAdvisor = collectAiAdvisorConfigFromUI(currentConfig.aiAdvisor || {});

    // Speicherfarm: Zielmitte/Messtoleranz gehoeren ausschliesslich zur
    // Farm-App. MultiUse uebernimmt diese Werte nur als Policy und besitzt
    // keine eigene NVP-Abstimmung. Auch wenn der Farm-Reiter beim Speichern
    // nicht aktiv ist, werden die aktuell gepufferten Werte normalisiert.
    patch.storageFarm = deepMerge({}, currentConfig.storageFarm || {});
    patch.storageFarm.allowGridCharge = !!(
      els.storageFarmAllowGridCharge
        ? els.storageFarmAllowGridCharge.checked
        : patch.storageFarm.allowGridCharge !== false
    );
    const storageFarmSingleFallbackTarget = (currentConfig.storage && currentConfig.storage.standaloneSelfTargetGridImportW !== undefined)
      ? currentConfig.storage.standaloneSelfTargetGridImportW
      : (currentConfig.storage && currentConfig.storage.selfTargetGridImportW);
    const storageFarmSingleFallbackHysteresis = (currentConfig.storage && currentConfig.storage.standaloneSelfImportThresholdW !== undefined)
      ? currentConfig.storage.standaloneSelfImportThresholdW
      : (currentConfig.storage && currentConfig.storage.selfImportThresholdW);
    patch.storageFarm.selfTargetGridImportW = _clampInt(
      els.storageFarmSelfTargetGridImportW ? els.storageFarmSelfTargetGridImportW.value : patch.storageFarm.selfTargetGridImportW,
      0, 1000000, _clampInt(storageFarmSingleFallbackTarget, 0, 1000000, 50),
    );
    patch.storageFarm.selfImportThresholdW = _clampInt(
      els.storageFarmSelfImportThresholdW ? els.storageFarmSelfImportThresholdW.value : patch.storageFarm.selfImportThresholdW,
      0, 1000000, _clampInt(storageFarmSingleFallbackHysteresis, 0, 1000000, 20),
    );

    // Storage
    patch.storage = deepMerge({}, currentConfig.storage || {});
    patch.storage.controlMode = getStorageMode();
    patch.storage.allowGridCharge = !!(
      els.storageAllowGridCharge
        ? els.storageAllowGridCharge.checked
        : patch.storage.allowGridCharge !== false
    );
    patch.storage.coupling = getStorageCoupling();
    patch.storage.vendorProfile = getStorageVendorProfile();
    patch.storage.datapoints = deepMerge({}, (currentConfig.storage && currentConfig.storage.datapoints) ? currentConfig.storage.datapoints : {});
    const storagePowerProfile = _storagePowerProfileInfo();
    const storageRatedPowerKwRaw = Number(els.storageRatedPowerKW ? els.storageRatedPowerKW.value : (Number(patch.storage.ratedPowerW) / 1000));
    if (Number.isFinite(storageRatedPowerKwRaw) && storageRatedPowerKwRaw > 0) {
      const storageRatedPowerKw = storagePowerProfile.id === 'home'
        ? Math.min(storageRatedPowerKwRaw, 50)
        : storageRatedPowerKwRaw;
      patch.storage.ratedPowerW = Math.round(storageRatedPowerKw * 1000);
    } else {
      delete patch.storage.ratedPowerW;
    }
    patch.storage.feneconGridControlEnabled = patch.storage.vendorProfile === 'fenecon-openems' && patch.storage.coupling === 'dc';
    patch.storage.feneconControlMode = (els.storageFeneconControlMode && ['auto', 'fems-grid', 'direct-ess'].includes(String(els.storageFeneconControlMode.value || '').trim().toLowerCase()))
      ? String(els.storageFeneconControlMode.value).trim().toLowerCase()
      : 'auto';
    patch.storage.sungrowHybridEnabled = patch.storage.vendorProfile === 'sungrow-hybrid';
    patch.storage.e3dcRscpEnabled = patch.storage.vendorProfile === 'e3dc-rscp';
    // FENECON-Hybrid-Automatik: PV ueber der Schaltschwelle gibt die
    // Eigenregelung an FEMS zurueck; dauerhaft niedrigere PV uebergibt nach
    // Entprellung an EOS. Fehlende/veraltete PV bleibt fail-safe bei FEMS.
    patch.storage.feneconDayNoWriteEnabled = patch.storage.vendorProfile === 'fenecon-openems'
      && patch.storage.coupling === 'dc'
      && patch.storage.feneconControlMode === 'auto';
    patch.storage.feneconAssistEnabled = false;
    patch.storage.feneconDayClockFallbackEnabled = false;
    patch.storage.feneconPvPassthroughThresholdW = _clampInt(
      els.storageFeneconPvOnThresholdW ? els.storageFeneconPvOnThresholdW.value : patch.storage.feneconPvPassthroughThresholdW,
      0, 1000000, 500,
    );
    patch.storage.feneconPvReleaseThresholdW = _clampInt(
      els.storageFeneconPvOffThresholdW ? els.storageFeneconPvOffThresholdW.value : patch.storage.feneconPvReleaseThresholdW,
      0, patch.storage.feneconPvPassthroughThresholdW, 500,
    );
    patch.storage.feneconPvPassthroughDelaySec = _clampInt(
      els.storageFeneconPvOnDelaySec ? els.storageFeneconPvOnDelaySec.value : patch.storage.feneconPvPassthroughDelaySec,
      0, 3600, 10,
    );
    patch.storage.feneconPvReleaseDelaySec = _clampInt(
      els.storageFeneconPvOffDelaySec ? els.storageFeneconPvOffDelaySec.value : patch.storage.feneconPvReleaseDelaySec,
      0, 3600, 120,
    );
    patch.storage.feneconApiTimeoutSec = _clampInt(
      els.storageFeneconApiTimeoutSec ? els.storageFeneconApiTimeoutSec.value : patch.storage.feneconApiTimeoutSec,
      5, 300, 60,
    );
    // Sungrow Hybrid ESS nutzt ab 0.8.96 fest den gemeinsamen geschlossenen
    // NVP-Regelkreis. Die alten PV-Passthrough-/0-W-Schalter werden bewusst nicht
    // mehr gespeichert, weil zyklische 0-W-Freigaben den Speicher stoppen konnten.
    delete patch.storage.sungrowPvPassthroughEnabled;
    delete patch.storage.sungrowZeroOnPvCoverage;
    delete patch.storage.sungrowDischargeOnlyOnGridImport;
    // E3/DC RSCP: SET_POWER_MODE + SET_POWER_VALUE werden nur beim Herstellerprofil
    // E3/DC sichtbar/gespeichert; die Grundlogik bleibt weiterhin reine NVP-/Budget-
    // Eigenverbrauchsoptimierung.
    patch.storage.e3dcZeroMode = (els.storageE3dcZeroMode && String(els.storageE3dcZeroMode.value).toLowerCase() === 'idle') ? 'idle' : 'normal';
    patch.storage.e3dcAllowGridCharge = !!(els.storageE3dcAllowGridCharge && els.storageE3dcAllowGridCharge.checked);
    patch.storage.e3dcUsePowerLimits = !!(els.storageE3dcUsePowerLimits && els.storageE3dcUsePowerLimits.checked);

    // Eigenverbrauchsoptimierung / NVP-Schnellregelung:
    // Die Messtoleranz dient nur gegen Zählerrauschen. Außerhalb davon wird mit
    // jeder frischen NVP-Probe direkt zur Zielmitte geregelt. Die optionale
    // Mehrsekunden-Glättung bleibt ausschließlich für Anzeige/Diagnose aktiv.
    patch.storage.selfTargetGridImportW = _clampInt(
      els.storageSelfTargetGridImportW ? els.storageSelfTargetGridImportW.value : patch.storage.standaloneSelfTargetGridImportW,
      0, 1000000, 50,
    );
    patch.storage.selfImportThresholdW = _clampInt(
      els.storageSelfImportThresholdW ? els.storageSelfImportThresholdW.value : patch.storage.standaloneSelfImportThresholdW,
      0, 1000000, 20,
    );
    // Die Speicher-Seite konfiguriert die Standalone-Eigenverbrauchsregelung.
    // MultiUse besitzt eigene Werte in installerConfig.storageMultiUse und darf
    // diese Felder beim Aktivieren/Deaktivieren nicht mehr ueberlagern.
    patch.storage.standaloneSelfTargetGridImportW = patch.storage.selfTargetGridImportW;
    patch.storage.standaloneSelfImportThresholdW = patch.storage.selfImportThresholdW;
    patch.storage.selfNvpSmoothingSec = _clampInt(
      els.storageSelfNvpSmoothingSec ? els.storageSelfNvpSmoothingSec.value : patch.storage.selfNvpSmoothingSec,
      0, 120, 8,
    );
    patch.storage.selfNvpSmoothingEnabled = patch.storage.selfNvpSmoothingSec > 0;
    patch.storage.selfNvpFastServoEnabled = true;
    patch.storage.selfNvpRawGuardW = _clampInt(
      els.storageSelfNvpRawGuardW ? els.storageSelfNvpRawGuardW.value : patch.storage.selfNvpRawGuardW,
      50, 1000000, 100,
    );
    patch.storage.balanceFeedbackHoldSec = _clampInt(
      els.storageBalanceFeedbackHoldSec ? els.storageBalanceFeedbackHoldSec.value : patch.storage.balanceFeedbackHoldSec,
      1, 300, 45,
    );
    // FENECON-Hybrid ist ein exklusives Herstellerprofil. Der native FEMS-
    // NVP-Regler ist nur bei DC/Hybrid aktiv; FENECON-AC und alle anderen
    // Hersteller bleiben auf der bisherigen direkten Leistungsregelung.
    patch.storage.feneconAcMode = patch.storage.vendorProfile === 'fenecon-openems' && patch.storage.coupling === 'dc';
    patch.storage.feneconGridControlEnabled = patch.storage.feneconAcMode;

    // Optional raw patch. Auch Raw-Patches laufen jetzt durch das Release Safety Gate,
    // damit ein Debug-/Installer-Payload nicht versehentlich produktive Kernlisten
    // leert, solange kein expliziter Löschmarker gesetzt ist.
    const raw = String(els.rawPatch.value || '').trim();
    let finalPatch = patch;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          finalPatch = deepMerge(patch, parsed);
        }
      } catch (e) {
        // ignore invalid JSON
      }
    }

    // Keep installerConfig as single source of truth for installer-only features
    finalPatch.installerConfig = deepMerge({}, (currentConfig && currentConfig.installerConfig) ? currentConfig.installerConfig : {}, finalPatch.installerConfig || {});

    return applyReleaseSafetyGateToPatch(finalPatch);
  }
  /**
   * Code-Teil: _storageFarmStorageCount
   * Zweck: Ermittelt, ob eine Speicherfarm-Konfiguration echte Speicher enthält.
   * Regression-Schutz 0.8.59: Verhindert, dass ein App-Center-Save bekannte
   * Speicherfarm-Konfigurationen versehentlich mit einer leeren Liste überschreibt.
   */
  function _storageFarmStorageCount(cfg) {
    const sf = cfg && cfg.storageFarm && typeof cfg.storageFarm === 'object' ? cfg.storageFarm : {};
    return Array.isArray(sf.storages) ? sf.storages.filter((s) => s && typeof s === 'object').length : 0;
  }

  /**
   * Code-Teil: applyAppCenterRegressionSafetyGate
   * Zweck: Letzter Schutz direkt vor dem Speichern der App-Center-Konfiguration.
   * Dieser Guard ist bewusst klein und hart: Er darf keine neue Regelung bauen,
   * sondern verhindert nur Regressionen, bei denen UI-/Hydration-Fehler kritische
   * Konfigurationen leeren würden.
   */
  function applyAppCenterRegressionSafetyGate(patch) {
    const p = patch && typeof patch === 'object' ? patch : {};
    const beforeCount = _storageFarmStorageCount(currentConfig);
    const afterCount = _storageFarmStorageCount(p);
    const storagefarmApp = p.emsApps && p.emsApps.apps && p.emsApps.apps.storagefarm ? p.emsApps.apps.storagefarm : null;
    const storagefarmExpected = beforeCount > 0 || (storagefarmApp && (storagefarmApp.installed || storagefarmApp.enabled));

    if (storagefarmExpected && beforeCount > 0 && afterCount === 0) {
      // Safety-Entscheidung: Bekannte Speicher werden nicht mit leerer UI-Liste
      // überschrieben. Falls der Reiter einmal nicht rendert, bleibt die letzte
      // bekannte Konfiguration erhalten und der Installateur verliert keine DP-
      // Zuordnungen. Das ist ein Save-Guard, keine Speicherregelung.
      p.storageFarm = deepMerge({}, (currentConfig && currentConfig.storageFarm) ? currentConfig.storageFarm : {});
      p.storageFarm.__saveGuardRestored = true;
      p.storageFarm.__saveGuardReason = 'storageFarm.storages would be emptied although existing storages are known';
    }

    const guarded = [];
    if (beforeCount > 0 && _storageFarmStorageCount(p) > 0) guarded.push('storageFarm');
    p.__appCenterRegressionSafetyGate = {
      schema: 'nexowatt.appcenter-regression-safety-gate.v1',
      ts: Date.now(),
      guarded,
      storageFarmBeforeCount: beforeCount,
      storageFarmAfterCount: _storageFarmStorageCount(p),
      storageFarmRestored: !!(p.storageFarm && p.storageFarm.__saveGuardRestored),
      note: 'Save-Guard verhindert das Leeren bekannter Kernkonfigurationen. Keine Hardwaresteuerung.',
    };
    return p;
  }


  /**
   * Code-Teil: Release-/Regression-Safety-Gate
   * Zweck: verhindert, dass ein App-Center-Release durch UI-/Tab-/Hydration-
   * Regressionen bestehende Kernkonfigurationen leer speichert.
   *
   * Hintergrund:
   * Nach mehreren Mesh-/0-Einspeise-Erweiterungen darf ein neuer Bereich niemals
   * Speicherfarm, Ladepunkte, DC-Stationen, NL/P1 oder Mesh-Konfiguration löschen,
   * nur weil der passende Reiter nicht gerendert, ein DOM-Element fehlt oder eine
   * Runtime-Hydration noch läuft. Dieses Gate arbeitet defensiv: wenn die bisherige
   * Konfiguration Daten enthält, der neue Patch aber leer wäre, werden die alten
   * Werte übernommen und im Report vermerkt. Bewusstes Löschen ganzer Kernbereiche
   * muss später über eine separate, explizite Löschfunktion erfolgen.
   */
  function _sgArray(v) { return Array.isArray(v) ? v : []; }
  function _sgObject(v) { return v && typeof v === 'object' ? v : {}; }
  function _sgNonEmptyString(v) { return String(v == null ? '' : v).trim() !== ''; }
  function _sgCountStorages(cfg) { return _sgArray(_sgObject(cfg.storageFarm).storages).length; }
  function _sgCountGroups(cfg) { return _sgArray(_sgObject(cfg.storageFarm).groups).length; }
  function _sgCountEvcs(cfg) {
    const settings = _sgObject(cfg.settings);
    return Math.max(Number(settings.evcsCount) || 0, _sgArray(settings.evcsList).length);
  }
  function _sgCountChargeKiosk(cfg) { return _sgArray(_sgObject(cfg.chargeKiosk).stations).length; }
  function _sgCountMeshNodes(cfg) { return _sgArray(_sgObject(cfg.meshMicrogrid).nodes).length; }
  function _sgCountMeshPeers(cfg) {
    const mm = _sgObject(cfg.meshMicrogrid);
    const tailscalePeers = _sgArray(_sgObject(mm.tailscale).peerUrls).length;
    const meshLinkPeers = _sgArray(_sgObject(_sgObject(mm.meshLink).peers)).length;
    return Math.max(tailscalePeers, meshLinkPeers);
  }
  function _sgCountNlP1Mappings(cfg) {
    const dps = _sgObject(_sgObject(cfg.nlP1).datapoints);
    return Object.keys(dps).filter(k => _sgNonEmptyString(dps[k])).length;
  }
  function _sgRestore(report, path, reason) {
    report.restored.push({ path, reason });
    report.changed = true;
  }
  function applyReleaseRegressionSafetyGate(patch) {
    const report = { schema: 'nexowatt.appcenter-regression-safety-gate.v1', version: '0.8.59', changed: false, restored: [], warnings: [] };
    const oldCfg = currentConfig && typeof currentConfig === 'object' ? currentConfig : {};
    const next = patch && typeof patch === 'object' ? patch : {};

    // Speicherfarm: darf nie durch einen leeren UI-Save verschwinden, wenn der
    // aktuelle Config-/Runtime-Fallback Speicher kennt.
    const oldStorages = _sgCountStorages(oldCfg);
    const newStorages = _sgCountStorages(next);
    if (oldStorages > 0 && newStorages === 0) {
      next.storageFarm = deepMerge({}, _sgObject(oldCfg.storageFarm), _sgObject(next.storageFarm));
      next.storageFarm.storages = _sgArray(_sgObject(oldCfg.storageFarm).storages).slice();
      if (_sgCountGroups(oldCfg) > 0 && _sgCountGroups(next) === 0) next.storageFarm.groups = _sgArray(_sgObject(oldCfg.storageFarm).groups).slice();
      next.storageFarm._releaseSafetyRestored = true;
      _sgRestore(report, 'storageFarm.storages', `Bestehende Speicherfarm mit ${oldStorages} Speicher(n) vor leerem Save geschützt.`);
    }

    // Ladepunkte: verhindert Verlust der LP-Liste, wenn EVCS-Tab/DOM nicht korrekt
    // gerendert wurde. Einzelne Änderungen bleiben möglich; nur kompletter Verlust
    // wird abgefangen.
    const oldEvcs = _sgCountEvcs(oldCfg);
    const newEvcs = _sgCountEvcs(next);
    if (oldEvcs > 0 && newEvcs === 0) {
      next.settings = deepMerge({}, _sgObject(oldCfg.settings), _sgObject(next.settings));
      next.settings.evcsCount = _sgObject(oldCfg.settings).evcsCount;
      next.settings.evcsList = _sgArray(_sgObject(oldCfg.settings).evcsList).slice();
      _sgRestore(report, 'settings.evcsList', `Bestehende Ladepunktliste mit ${oldEvcs} Eintrag/Einträgen vor leerem Save geschützt.`);
    }

    // DC-Station Display: Stationsseiten gehören zu Ladepunkte und dürfen bei
    // App-Center-Umbauten nicht verschwinden.
    const oldStations = _sgCountChargeKiosk(oldCfg);
    const newStations = _sgCountChargeKiosk(next);
    if (oldStations > 0 && newStations === 0) {
      next.chargeKiosk = deepMerge({}, _sgObject(oldCfg.chargeKiosk), _sgObject(next.chargeKiosk));
      next.chargeKiosk.stations = _sgArray(_sgObject(oldCfg.chargeKiosk).stations).slice();
      _sgRestore(report, 'chargeKiosk.stations', `Bestehende DC-Station-Display-Konfiguration mit ${oldStations} Station(en) vor leerem Save geschützt.`);
    }

    // NL/P1: Zuordnungen liegen im Reiter Zuordnung. Wenn dort beim Speichern
    // keine Felder gerendert wurden, dürfen vorhandene DSMR-/P1-Mappings nicht leer
    // geschrieben werden.
    const oldNlP1 = _sgCountNlP1Mappings(oldCfg);
    const newNlP1 = _sgCountNlP1Mappings(next);
    if (oldNlP1 > 0 && newNlP1 === 0) {
      next.nlP1 = deepMerge({}, _sgObject(oldCfg.nlP1), _sgObject(next.nlP1));
      next.nlP1.datapoints = deepMerge({}, _sgObject(_sgObject(oldCfg.nlP1).datapoints), _sgObject(_sgObject(next.nlP1).datapoints));
      _sgRestore(report, 'nlP1.datapoints', `Bestehende NL/P1-Zuordnung mit ${oldNlP1} Mapping(s) vor leerem Save geschützt.`);
    }

    // Mesh/Microgrid: Detailkonfiguration liegt in eigenem Reiter. Nodes/Peers
    // dürfen nicht verschwinden, nur weil ein anderes Modul gespeichert wurde.
    const oldMeshNodes = _sgCountMeshNodes(oldCfg);
    const newMeshNodes = _sgCountMeshNodes(next);
    if (oldMeshNodes > 0 && newMeshNodes === 0) {
      next.meshMicrogrid = deepMerge({}, _sgObject(oldCfg.meshMicrogrid), _sgObject(next.meshMicrogrid));
      next.meshMicrogrid.nodes = _sgArray(_sgObject(oldCfg.meshMicrogrid).nodes).slice();
      _sgRestore(report, 'meshMicrogrid.nodes', `Bestehende Mesh-Knoten mit ${oldMeshNodes} Eintrag/Einträgen vor leerem Save geschützt.`);
    }
    const oldMeshPeers = _sgCountMeshPeers(oldCfg);
    const newMeshPeers = _sgCountMeshPeers(next);
    if (oldMeshPeers > 0 && newMeshPeers === 0) {
      next.meshMicrogrid = deepMerge({}, _sgObject(oldCfg.meshMicrogrid), _sgObject(next.meshMicrogrid));
      if (_sgObject(oldCfg.meshMicrogrid).tailscale) next.meshMicrogrid.tailscale = deepMerge({}, _sgObject(_sgObject(oldCfg.meshMicrogrid).tailscale), _sgObject(_sgObject(next.meshMicrogrid).tailscale));
      if (_sgObject(oldCfg.meshMicrogrid).meshLink) next.meshMicrogrid.meshLink = deepMerge({}, _sgObject(_sgObject(oldCfg.meshMicrogrid).meshLink), _sgObject(_sgObject(next.meshMicrogrid).meshLink));
      _sgRestore(report, 'meshMicrogrid.peers', `Bestehende Mesh-Peer-Konfiguration mit ${oldMeshPeers} Peer(s) vor leerem Save geschützt.`);
    }

    if (report.changed) {
      next._releaseSafetyGate = report;
      report.warnings.push('Release-Safety-Gate hat kritische Bestandskonfigurationen vor einem leeren Save geschützt. Bitte betroffene Reiter prüfen und danach erneut speichern.');
    }
    return report;
  }

  function validateFeneconStorageConfiguration(patch) {
    const cfg = patch && typeof patch === 'object' ? patch : {};
    const normalizeId = (value) => String(value || '').trim().replace(/\s+/g, '').toLowerCase();
    const sameId = (a, b) => {
      const aa = normalizeId(a);
      const bb = normalizeId(b);
      return !!(aa && bb && aa === bb);
    };
    const isPowerBalance = (value) => {
      const id = normalizeId(value);
      return !!id && (
        /(?:^|\.)aliases(?:\.v1)?\.r\.powerbalance(?:$|\.)/.test(id)
        || /(?:^|[._/-])powerbalance(?:$|[._/-])/.test(id)
        || /batterypowerbalance/.test(id)
      );
    };
    const isDirectEssSetpoint = (value) => isFeneconDirectEssSetpointId(value);
    const isGridTarget = (value) => isFeneconGridTargetId(value);
    const isGridMeasurement = (value) => isFeneconGridMeasurementId(value);
    const validateOne = ({ name = 'Speicher', vendorProfile, coupling, mode, nativeTarget, essActual, directTargets = [], otherWritableStorageCount = 0 }) => {
      const vendor = normalizeStorageVendorProfile(vendorProfile || 'generic');
      const couplingNorm = String(coupling || '').trim().toLowerCase();
      const modeNormRaw = String(mode || 'auto').trim().toLowerCase();
      const modeNorm = ['hybrid-auto','pv-pass-through','day-fems-night-direct','fems-day-direct-night'].includes(modeNormRaw) ? 'auto' : modeNormRaw;
      const isHybrid = vendor === 'fenecon-openems' && (couplingNorm === 'dc' || couplingNorm === 'hybrid');
      if (!isHybrid) {
        if (modeNorm === 'fems-grid') throw new Error(`${name}: FEMS-NVP-Regler ist nur bei FENECON/OpenEMS DC/Hybrid zulässig.`);
        return { resolvedMode: 'direct-ess' };
      }

      const nativeId = String(nativeTarget || '').trim();
      const nativeIsMeasurement = isGridMeasurement(nativeId);
      const nativeIsDirectEss = isDirectEssSetpoint(nativeId) && !isGridTarget(nativeId);
      const migrateNativeToDirect = modeNorm !== 'fems-grid' && nativeIsDirectEss;
      const effectiveNativeId = (nativeIsMeasurement || migrateNativeToDirect) ? '' : nativeId;
      const actualId = String(essActual || '').trim();
      const directIds = directTargets.map((id) => String(id || '').trim()).filter(Boolean);
      if (migrateNativeToDirect && !directIds.length) directIds.push(nativeId);
      if (!actualId) {
        throw new Error(`${name}: Für FENECON Hybrid muss „ESS-Aktor-Istleistung“ (typisch ess0/ActivePower / 604) zugeordnet sein.`);
      }
      if (isPowerBalance(actualId)) {
        throw new Error(`${name}: „powerBalance“ enthält Hybrid-/DC-PV-Wirkung und ist kein gültiger ESS-Regler-Istwert. Bitte ess0/ActivePower / 604 bzw. aliases.v1.r.essActivePower verwenden.`);
      }
      if (nativeIsMeasurement && modeNorm === 'fems-grid') {
        throw new Error(`${name}: Als FEMS-NVP-Ziel wurde ein Netzleistungs-Messwert (z. B. aliases.r.gridPower) gewählt. Erforderlich ist ein beschreibbarer ctrlBalancing0/SetGridActivePower-DP.`);
      }
      if (effectiveNativeId && directIds.some((id) => sameId(effectiveNativeId, id))) {
        throw new Error(`${name}: FEMS-NVP-Ziel und direkter ESS-Sollwert dürfen nicht auf denselben Datenpunkt zeigen.`);
      }
      if (nativeIsDirectEss && modeNorm === 'fems-grid') {
        throw new Error(`${name}: Im expliziten FEMS-NVP-Modus ist ein echter ctrlBalancing0/SetGridActivePower-DP erforderlich. SetActivePowerEquals/706 bzw. powerSetpointW ist der direkte ESS-Sollwert und wird unter „Sollleistung signed“ zugeordnet.`);
      }
      if (directIds.some((id) => sameId(actualId, id)) || (effectiveNativeId && sameId(actualId, effectiveNativeId))) {
        throw new Error(`${name}: ESS-Aktor-Istleistung darf nicht mit einem Schreib-/Sollwert-DP identisch sein.`);
      }

      if (modeNorm === 'fems-grid') {
        if (!effectiveNativeId) throw new Error(`${name}: Für den FEMS-NVP-Regler muss ein echter ctrlBalancing0/SetGridActivePower-DP zugeordnet sein.`);
        if (otherWritableStorageCount > 0) throw new Error(`${name}: Ein FEMS-NVP-Master muss der einzige beschreibbare Speicher am NVP sein.`);
        return { resolvedMode: 'fems-grid' };
      }
      if (modeNorm === 'direct-ess') {
        if (!directIds.length) throw new Error(`${name}: Für „Direkte ESS-Leistung“ fehlt der direkte Sollwert (typisch SetActivePowerEquals / 706).`);
        return { resolvedMode: 'direct-ess' };
      }
      // Automatik: echter Grid-Target-DP gewinnt; ansonsten kontinuierlicher
      // direkter ESS-Pfad. PV/Forecast/Tageszeit schalten nicht mehr um.
      if (otherWritableStorageCount > 0) {
        if (!directIds.length) throw new Error(`${name}: In einer gemischten Farm benötigt FENECON einen direkten ESS-Sollwert.`);
        return { resolvedMode: 'direct-ess' };
      }
      if (effectiveNativeId) return { resolvedMode: 'fems-grid' };
      if (directIds.length) return { resolvedMode: 'direct-ess', ignoredGridMeasurement: nativeIsMeasurement };
      throw new Error(`${name}: Weder echter FEMS-NVP-Ziel-DP noch direkter ESS-Sollwert ist zugeordnet.`);
    };

    const storage = cfg.storage && typeof cfg.storage === 'object' ? cfg.storage : {};
    const dp = storage.datapoints && typeof storage.datapoints === 'object' ? storage.datapoints : {};
    const singleMode = normalizeFeneconControlMode(storage.feneconControlMode);
    const singleNativeId = String(dp.feneconGridSetpointObjectId || '').trim();
    const singleNativeIsDirect = isDirectEssSetpoint(singleNativeId) && !isGridTarget(singleNativeId);
    if (singleMode !== 'fems-grid' && (isGridMeasurement(singleNativeId) || singleNativeIsDirect)) {
      if (singleNativeIsDirect
        && !String(dp.targetPowerObjectId || dp.targetChargePowerObjectId || dp.targetDischargePowerObjectId || '').trim()) {
        dp.targetPowerObjectId = singleNativeId;
      }
      dp.feneconGridSetpointObjectId = '';
    }
    validateOne({
      name: 'Einzel-Speicher',
      vendorProfile: storage.vendorProfile,
      coupling: storage.coupling,
      mode: storage.feneconControlMode,
      nativeTarget: dp.feneconGridSetpointObjectId,
      essActual: dp.feneconEssActualPowerObjectId,
      directTargets: [dp.targetPowerObjectId, dp.targetChargePowerObjectId, dp.targetDischargePowerObjectId],
      otherWritableStorageCount: 0,
    });

    const sf = cfg.storageFarm && typeof cfg.storageFarm === 'object' ? cfg.storageFarm : {};
    const rows = Array.isArray(sf.storages) ? sf.storages.filter((row) => row && row.enabled !== false) : [];
    for (const row of rows) {
      const rowMode = normalizeFeneconControlMode(row.feneconControlMode);
      const rowNativeId = String(row.feneconGridSetpointId || row.feneconGridSetpointObjectId || '').trim();
      const rowNativeIsDirect = isDirectEssSetpoint(rowNativeId) && !isGridTarget(rowNativeId);
      if (rowMode !== 'fems-grid' && (isGridMeasurement(rowNativeId) || rowNativeIsDirect)) {
        if (rowNativeIsDirect
          && !String(row.setSignedPowerId || row.setChargePowerId || row.setDischargePowerId || '').trim()) {
          row.setSignedPowerId = rowNativeId;
        }
        row.feneconGridSetpointId = '';
        if (Object.prototype.hasOwnProperty.call(row, 'feneconGridSetpointObjectId')) row.feneconGridSetpointObjectId = '';
      }
    }
    const writable = rows.filter((row) => !!(
      String(row.feneconGridSetpointId || '').trim()
      || String(row.setSignedPowerId || '').trim()
      || String(row.setChargePowerId || '').trim()
      || String(row.setDischargePowerId || '').trim()
    ));
    let nativeCount = 0;
    for (let i = 0; i < writable.length; i++) {
      const row = _normalizeRecoveredStorageFarmRow(writable[i], i);
      const result = validateOne({
        name: `Speicherfarm „${row.name || `Speicher ${i + 1}`}“`,
        vendorProfile: row.vendorProfile,
        coupling: row.coupling,
        mode: row.feneconControlMode,
        nativeTarget: row.feneconGridSetpointId,
        essActual: row.feneconEssActualPowerId || row.signedPowerId,
        directTargets: [row.setSignedPowerId, row.setChargePowerId, row.setDischargePowerId],
        otherWritableStorageCount: Math.max(0, writable.length - 1),
      });
      if (result.resolvedMode === 'fems-grid') nativeCount += 1;
    }
    if (nativeCount > 1) throw new Error('Pro Netzverknüpfungspunkt darf nur ein nativer FEMS-NVP-Master konfiguriert sein.');
    if (nativeCount === 1 && writable.length > 1) {
      throw new Error('Ein FEMS-NVP-Master darf nicht zusammen mit weiteren beschreibbaren Farm-Speichern betrieben werden. Bitte in der gemischten Farm „Direkte ESS-Leistung“ wählen.');
    }
    return true;
  }

  /**
   * Übernimmt vor jedem Save alle sichtbaren DP-Eingaben in `currentConfig`.
   * Das schützt auch vor Browser-Autofill oder programmgesteuerten Änderungen,
   * die kein normales `input`-Ereignis ausgelöst haben.
   */
  function flushDpInputsToConfig() {
    const inputs = Array.from(document.querySelectorAll('[data-dp-input="1"]'));
    for (const input of inputs) {
      try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
    }
  }

  /**
   * Code-Teil: saveConfig
   * Zweck: Speichert Benutzereingaben oder Konfiguration.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function saveConfig() {
    setStatus('Speichere…');
    flushDpInputsToConfig();
    const patch = applyAppCenterRegressionSafetyGate(collectPatchFromUI());
    validateFeneconStorageConfiguration(patch);
    const evcsRows = patch.settingsConfig && patch.settingsConfig.evcsList;
    for (const [index, row] of (Array.isArray(evcsRows) ? evcsRows : []).entries()) {
      if (!row || row.enabled === false || !(row.setCurrentAId || row.setPowerWId)) continue;
      const check = window.NexoWattEvcsElectricalLimits.validateEvcsElectricalConfig(row);
      if (!check.valid) throw new Error(`Ladepunkt ${index + 1}: ${check.errors.join(' ')}`);
    }
    const safetyReport = applyReleaseRegressionSafetyGate(patch);
    if (safetyReport && safetyReport.changed) {
      setStatus('Release-Schutz hat bestehende Konfigurationen vor leerem Speichern geschützt. Bitte prüfen und erneut speichern.', 'warn');
    }
    const storageCount = _storageFarmStorageCount(patch);
    if (storageCount > _maxStorageCount()) {
      throw new Error(`Diese Lizenz erlaubt maximal ${_maxStorageCount()} Speichersysteme; konfiguriert sind ${storageCount}. Bitte die Speicherzuordnung anpassen.`);
    }
    const payload = { patch, restartEms: true };
    const data = await fetchJson('/api/installer/config', { method: 'POST', body: JSON.stringify(payload) });
    applyConfigToUI(data.config || {});
    clearDirty();
    setStatus('Gespeichert. EMS wurde neu gestartet.', 'ok');
  }

  // --- Tabs + Status polling (Phase 2) ---

  let _activeTab = 'apps';
  let _statusTimer = null;
  /**
   * Code-Teil: _showTab
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _showTab(tabId) {
    _activeTab = tabId || 'apps';
    const btns = els.tabs ? Array.from(els.tabs.querySelectorAll('.nw-tab')) : [];
    btns.forEach(b => {
      const isActive = (b.getAttribute('data-tab') === _activeTab);
      b.classList.toggle('nw-tab--active', isActive);
    });

    const panels = Array.from(document.querySelectorAll('[data-tabpanel]'));
    panels.forEach(p => {
      const id = p.getAttribute('data-tabpanel');
      p.style.display = (id === _activeTab) ? '' : 'none';
    });

    // immediate status refresh when entering the tab
    if (_activeTab === 'status') {
      refreshEmsStatus().catch(() => {});
      refreshChargingDiag().catch(() => {});
    }
  }
  /**
   * Code-Teil: initTabs
   * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function initTabs() {
    if (!els.tabs) return;
    const btns = Array.from(els.tabs.querySelectorAll('.nw-tab'));
    btns.forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab') || 'apps';
        _showTab(tabId);
      });
    });
    _showTab('apps');
  }

  // Unter-Reiter im Energiefluss-Tab (Basis/Verbraucher/Erzeuger/Optionen)
  /**
   * Code-Teil: initFlowSubtabs
   * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function initFlowSubtabs() {
    const wrap = document.getElementById('nw-flow-subtabs');
    if (!wrap) return;

    const btns = Array.from(wrap.querySelectorAll('.nw-tab'));
    const panels = Array.from(document.querySelectorAll('#nw-tabpanel-flow [data-flowpanel]'));

    /**
     * Code-Teil: Arrow-Funktion `show`
     * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: show
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const show = (id) => {
      const tid = String(id || 'base');
      btns.forEach(b => {
        b.classList.toggle('nw-tab--active', (b.getAttribute('data-flowtab') === tid));
      });
      panels.forEach(p => {
        const pid = p.getAttribute('data-flowpanel');
        p.style.display = (pid === tid) ? '' : 'none';
      });
    };

    btns.forEach(b => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      b.addEventListener('click', () => {
        show(b.getAttribute('data-flowtab') || 'base');
      });
    });

    show('base');
  }
  /**
   * Code-Teil: _fmtTs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtTs(ts) {
    try {
      const d = new Date(ts);
      if (Number.isFinite(d.getTime())) return d.toLocaleString();
    } catch (_e) {}
    return '';
  }
  /**
   * Code-Teil: renderEmsStatus
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderEmsStatus(payload) {
    if (!els.emsStatus) return;
    els.emsStatus.innerHTML = '';
    /**
     * Code-Teil: mkItem
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    const engine = payload && payload.engine ? payload.engine : {};
    const mm = payload && (payload.lastTickDiag || payload.modules || payload.diagnostics) ? (payload.lastTickDiag || payload.modules || payload.diagnostics) : null;

    els.emsStatus.appendChild(
      mkItem(
        'Engine',
        engine && engine.intervalMs ? `Tick: ${engine.intervalMs} ms` : 'Tick-Intervall unbekannt',
        (engine && engine.running) ? 'RUNNING' : 'STOPPED',
        (engine && engine.running) ? 'ok' : 'error'
      )
    );

    const initError = (engine && engine.initError) ? String(engine.initError) : '';
    if (initError) {
      els.emsStatus.appendChild(mkItem('Engine-Fehler', initError, '', 'error'));
    }

    if (!mm || !Array.isArray(mm.results)) {
      els.emsStatus.appendChild(mkItem('Module', 'Keine Diagnosedaten verfügbar.', '', ''));
      return;
    }

    const head = `Letzter Tick: ${_fmtTs(mm.ts)} | Gesamt: ${mm.totalMs} ms`;
    els.emsStatus.appendChild(mkItem('Tick', head, (mm.errors && mm.errors.length) ? `${mm.errors.length} Fehler` : 'OK', (mm.errors && mm.errors.length) ? 'error' : 'ok'));

    for (const r of mm.results) {
      const ok = !!r.ok;
      const enabled = !!r.enabled;
      const ms = (typeof r.ms === 'number' && Number.isFinite(r.ms)) ? r.ms : 0;
      const right = `${enabled ? 'on' : 'off'} | ${ms} ms` + (r.error ? `<br/><span style="opacity:.85;">${String(r.error).replace(/</g,'&lt;')}</span>` : '');
      els.emsStatus.appendChild(mkItem(r.key || 'module', '', right, ok ? 'ok' : 'error'));
    }
  }

  function _asBool(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return (v.trim().toLowerCase() === 'true' || v.trim() === '1');
    return false;
  }
  /**
   * Code-Teil: _asNum
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _asNum(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback !== undefined ? fallback : 0);
  }
  /**
   * Code-Teil: renderChargingDiag
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderChargingDiag(payload) {
    if (!els.chargingDiag) return;
    els.chargingDiag.innerHTML = '';
    /**
     * Code-Teil: mkItem
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'warn') right.style.color = '#fde68a';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    if (!payload || payload.ok !== true) {
      els.chargingDiag.appendChild(mkItem('Ladepunkte', 'Keine Daten', '—', 'warn'));
      return;
    }

    const list = Array.isArray(payload.list) ? payload.list : [];
    if (!list.length) {
      els.chargingDiag.appendChild(mkItem('Ladepunkte', 'Keine Ladepunkte konfiguriert.', '—', 'warn'));
      return;
    }

    for (const it of list) {
      const rt = it.runtime || {};
      const enabled = _asBool(rt.enabled);
      const online = _asBool(rt.online);
      const mappingOk = _asBool(rt.mappingOk);
      const meterStale = _asBool(rt.meterStale);
      const statusStale = _asBool(rt.statusStale);

      const actualW = Math.round(_asNum(rt.actualPowerW, 0));
      const targetW = Math.round(_asNum(rt.targetPowerW, 0));
      const targetA = _asNum(rt.targetCurrentA, 0);
      const reason = (rt.reason !== null && rt.reason !== undefined) ? String(rt.reason) : '';
      const applyStatus = (rt.applyStatus !== null && rt.applyStatus !== undefined) ? String(rt.applyStatus) : '';
      const effMode = (rt.effectiveMode !== null && rt.effectiveMode !== undefined) ? String(rt.effectiveMode) : '';
      const userMode = (rt.userMode !== null && rt.userMode !== undefined) ? String(rt.userMode) : '';

      let kind = 'ok';
      if (!mappingOk) kind = 'error';
      else if (meterStale || statusStale) kind = 'warn';
      else if (!enabled || !online) kind = 'warn';

      const name = it && it.name ? String(it.name) : `Ladepunkt ${it.index}`;
      const title = `${name} (lp${it.index})`;

      const flags = [];
      flags.push(enabled ? 'EN' : 'DIS');
      flags.push(online ? 'ON' : 'OFF');
      if (meterStale) flags.push('METER:ALT');
      if (statusStale) flags.push('STATUS:ALT');
      if (effMode) flags.push(`MODE:${effMode}`);
      if (userMode && userMode !== 'auto') flags.push(`USER:${userMode}`);

      const subtitle = flags.join(' · ');

      const right = `
        <div style="font-weight:600;">Ist ${actualW} W → Ziel ${targetW} W</div>
        <div style="font-size:0.75rem;opacity:.85;">A=${Number.isFinite(targetA) ? targetA.toFixed(2) : '0.00'} · ${applyStatus || '—'} · ${reason || '—'}</div>
      `;

      els.chargingDiag.appendChild(mkItem(title, subtitle, right, kind));
    }
  }
  /**
   * Code-Teil: _fmtW
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtW(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + ' kW';
    return Math.round(n) + ' W';
  }
  /**
   * Code-Teil: _fmtKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtKwh(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(n >= 10 ? 1 : 2) + ' kWh';
  }
  /**
   * Code-Teil: _fmtEurKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtEurKwh(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(4) + ' €/kWh';
  }
  /**
   * Code-Teil: _fmtIsoShort
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtIsoShort(v) {
    const s = String(v || '').trim();
    if (!s) return '—';
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s;
    return d.toLocaleString();
  }
  /**
   * Code-Teil: _fmtPct
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtPct(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return Math.round(n) + ' %';
  }
  /**
   * Code-Teil: renderStationsDiag
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderStationsDiag(payload) {
    if (!els.stationsDiag) return;
    els.stationsDiag.innerHTML = '';
    /**
     * Code-Teil: mkItem
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'warn') right.style.color = '#fde68a';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    if (!payload || payload.ok !== true) {
      els.stationsDiag.appendChild(mkItem('Stationsgruppen', 'Keine Daten', '—', 'warn'));
      return;
    }

    const stations = Array.isArray(payload.stations) ? payload.stations : [];
    if (!stations.length) {
      els.stationsDiag.appendChild(mkItem('Stationsgruppen', 'Keine Stationsgruppen vorhanden.', '—', 'warn'));
      return;
    }

    for (const st of stations) {
      const key = (st && st.stationKey) ? String(st.stationKey) : '';
      const name = (st && st.name) ? String(st.name) : '';
      const title = name ? `${key} – ${name}` : (key || 'Station');

      const capW = st && st.maxPowerW !== null && st.maxPowerW !== undefined ? Number(st.maxPowerW) : NaN;
      const usedW = st && st.usedW !== null && st.usedW !== undefined ? Number(st.usedW) : NaN;
      const remW = st && st.remainingW !== null && st.remainingW !== undefined ? Number(st.remainingW) : NaN;
      const binding = !!(st && st.binding);
      const cnt = st && st.connectorCount !== null && st.connectorCount !== undefined ? Number(st.connectorCount) : NaN;
      const connectors = (st && st.connectors) ? String(st.connectors) : '';

      const subtitle = `Cap ${_fmtW(capW)} · Used ${_fmtW(usedW)} · Remaining ${_fmtW(remW)}` + (Number.isFinite(cnt) ? ` · Ladepunkte ${Math.round(cnt)}` : '') + (connectors ? ` · [${connectors}]` : '');
      const right = `<div style="font-weight:600;">${binding ? 'BINDING' : 'OK'}</div>`;
      const kind = (binding || !Number.isFinite(capW) || capW <= 0) ? 'warn' : 'ok';
      els.stationsDiag.appendChild(mkItem(title, subtitle, right, kind));
    }
  }
  /**
   * Code-Teil: _fmtBool
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _fmtBool(v, tTrue = 'JA', tFalse = 'NEIN') {
    return v ? tTrue : tFalse;
  }
  /**
   * Code-Teil: _parseShadowJson
   *
   * Zweck:
   * Wandelt Shadow-Diagnose-States aus JSON-Strings in Objekte um.
   *
   * Zusammenhang:
   * `main.js` liefert in `/api/ems/charging/diagnostics` die Roh-States
   * aus Core-Limits, Heizstab und Energiefluss. Die Statusoberfläche darf
   * nicht abbrechen, wenn einer dieser States leer, alt oder ungültig ist.
   *
   * Wichtig:
   * Shadow-Daten sind Diagnose-only. Diese Funktion darf keine produktiven
   * Adapterwerte verändern oder zurückschreiben.
   */
  function _parseShadowJson(raw, fallback) {
    if (raw && typeof raw === 'object') return raw;
    const text = (raw === null || raw === undefined) ? '' : String(raw).trim();
    if (!text) return fallback || null;
    try {
      const parsed = JSON.parse(text);
      return (parsed && typeof parsed === 'object') ? parsed : (fallback || null);
    } catch (_e) {
      return fallback || { ok: false, parseError: true, raw: text.slice(0, 500) };
    }
  }

  /**
   * Code-Teil: _shadowDiffList
   *
   * Zweck:
   * Normalisiert unterschiedliche Shadow-JSON-Formate zu einer Anzeige-Liste.
   *
   * Zusammenhang:
   * Core-Limits, Heizstab und Energiefluss speichern ihre Shadow-Diagnose nicht
   * exakt gleich. Das App-Center braucht dennoch einheitliche Zeilen.
   *
   * Wichtig:
   * Neue Felder werden defensiv behandelt. Eine unbekannte Struktur führt nur
   * zu einer leeren Liste, nicht zu einem UI-Fehler.
   */
  function _shadowDiffList(shadow) {
    if (!shadow || typeof shadow !== 'object') return [];
    const out = [];
    const add = (label, jsVal, tsVal, diff) => {
      out.push({ label: String(label || 'Wert'), js: jsVal, ts: tsVal, diff: diff !== undefined ? diff : '' });
    };
    const readList = (arr, prefix) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((m, idx) => {
        if (!m) return;
        if (typeof m === 'string') add(m, '', '', '');
        else add(m.key || m.field || m.path || m.label || (prefix + ' ' + (idx + 1)), m.js ?? m.runtime ?? m.old, m.ts ?? m.shadow ?? m.new, m.diff ?? m.delta ?? '');
      });
    };
    readList(shadow.mismatches, 'Abweichung');
    readList(shadow.diffs, 'Diff');
    if (shadow.comparison && typeof shadow.comparison === 'object') {
      readList(shadow.comparison.mismatches, 'Abweichung');
      readList(shadow.comparison.diffs, 'Diff');
      Object.keys(shadow.comparison).forEach((key) => {
        const v = shadow.comparison[key];
        if (v && typeof v === 'object' && (v.match === false || v.ok === false || v.diff || v.delta)) {
          add(key, v.js ?? v.runtime ?? v.old, v.ts ?? v.shadow ?? v.new, v.diff ?? v.delta ?? '');
        }
      });
    }
    if (!out.length && shadow.ok === false && shadow.error) add('Fehler', '', '', String(shadow.error));
    return out;
  }

  /**
   * Code-Teil: _shadowKind
   *
   * Zweck:
   * Ermittelt die Ampelfarbe einer Shadow-Kachel.
   *
   * Zusammenhang:
   * Wird von `renderShadowDiagnostics` genutzt. Grün bedeutet nur: keine
   * sichtbare Abweichung im Shadow-JSON. Es bedeutet nicht automatisch, dass die
   * TS-Logik schon produktiv freigegeben ist.
   */
  function _shadowKind(shadow) {
    if (!shadow || typeof shadow !== 'object') return 'wait';
    if (shadow.parseError || shadow.error) return 'error';
    if (shadow.available === false) return 'wait';
    const diffs = _shadowDiffList(shadow);
    if (diffs.length) return 'warn';
    if (shadow.ok === false) return 'warn';
    return 'ok';
  }

  /**
   * Code-Teil: _shadowStatusLabel
   *
   * Zweck:
   * Übersetzt technische Diagnosezustände in verständliche Ampeltexte. Eine
   * Abweichung ist kein produktiver EMS-Fehler, sondern ein Migrationsblocker für
   * die spätere TS-Umschaltung.
   */
  function _shadowStatusLabel(kind, shadow) {
    if (kind === 'ok') return 'OK';
    if (kind === 'warn') return 'ABWEICHUNG';
    if (kind === 'error') return 'FEHLER';
    if (!shadow || typeof shadow !== 'object') return 'WARTET';
    return 'WARTET';
  }

  /**
   * Code-Teil: _shadowHumanExplanation
   *
   * Zweck:
   * Übersetzt den technischen TS-Shadow-Zustand in eine verständliche Erklärung
   * für den Installateur. Damit muss man nicht zuerst das JSON öffnen, um zu
   * verstehen, warum eine Kachel OK, ABWEICHUNG oder FEHLER anzeigt.
   *
   * Zusammenhang:
   * Wird nur im App-Center/Statusbereich genutzt. Die Funktion ändert keine
   * Energiefluss-, Heizstab- oder Core-Limits-Werte. Produktiv bleibt weiterhin
   * die im Backend gewählte Runtime.
   */
  function _shadowHumanExplanation(title, shadow, diffs) {
    const name = String(title || 'TS-Shadow');
    if (!shadow || typeof shadow !== 'object') {
      return `${name}: Noch kein Shadow-Snapshot vorhanden. Das ist meist nur ein Hinweis, dass der jeweilige EMS-Teil noch keinen Diagnose-Tick geschrieben hat.`;
    }
    if (shadow.parseError) return `${name}: Shadow-JSON konnte nicht gelesen werden. Produktiv bleibt die bestehende JavaScript-Logik.`;
    if (shadow.error) return `${name}: Der TS-Spiegel hat einen Fehler gemeldet. Produktiv bleibt die bestehende JavaScript-Logik.`;
    if (shadow.available === false) return `${name}: TypeScript-Spiegel ist nicht verfügbar. Produktiv bleibt die bestehende JavaScript-Logik.`;
    if (Array.isArray(diffs) && diffs.length) {
      return `${name}: ${diffs.length} Abweichung(en) zwischen JavaScript-Runtime und TypeScript-Spiegel. Das ist aktuell ein Blocker für eine TS-Umschaltung; produktiv bleibt JavaScript.`;
    }
    return `${name}: Keine Abweichung im aktuellen Shadow-Vergleich.`;
  }

  /**
   * Code-Teil: _formatShadowJsonForDisplay
   *
   * Zweck:
   * Formatiert Shadow-Diagnoseobjekte stabil als JSON-Text. Falls ein Objekt
   * nicht serialisierbar sein sollte, wird eine kurze Fehlermeldung angezeigt,
   * statt dass die UI abstürzt.
   */
  function _formatShadowJsonForDisplay(value) {
    try { return JSON.stringify(value || {}, null, 2); }
    catch (e) { return `JSON konnte nicht formatiert werden: ${e && e.message ? e.message : e}`; }
  }

  /**
   * Code-Teil: _shadowDecodeDisplayText
   *
   * Zweck:
   * Bereitet technische Shadow-Texte für die Lesbarkeit im App-Center auf.
   * Manche Diagnosegründe können URL-kodiert wirken, z. B. `%20` statt Leerzeichen.
   * Diese Funktion dekodiert nur für die Anzeige.
   *
   * Wichtig:
   * Es wird nichts an Runtime-Werten geändert oder zurückgeschrieben.
   */
  function _shadowDecodeDisplayText(value) {
    let text = String(value === null || value === undefined ? '' : value);
    if (/%[0-9A-Fa-f]{2}/.test(text)) {
      try { text = decodeURIComponent(text); } catch (_e) {}
    }
    return text;
  }

  /**
   * Code-Teil: _shadowEscape
   *
   * Zweck:
   * Escaped Shadow-Diagnosetexte für HTML und nutzt vorher die Anzeige-Dekodierung.
   *
   * Zusammenhang:
   * Ersetzt in diesem Diagnosebereich den Browser-Global `escape()`, weil dieser
   * Leerzeichen in `%20` umwandeln kann und damit unlesbare Hinweise erzeugt.
   */
  function _shadowEscape(value) {
    return _shadowDecodeDisplayText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  /**
   * Code-Teil: _openShadowJsonDialog
   *
   * Zweck:
   * Öffnet die Shadow-JSON-Details in einem eigenen Dialog statt in einem
   * <details>-Element innerhalb der automatisch aktualisierten Diagnose-Karte.
   *
   * Warum:
   * Die Statusseite rendert sich regelmäßig neu. Ein <details>-Element kann dabei
   * sofort wieder zuklappen. Der Dialog hängt außerhalb des Diagnose-Renders und
   * bleibt deshalb offen, bis der Nutzer ihn selbst schließt.
   */
  function _openShadowJsonDialog(title, payload) {
    const existing = document.getElementById('nwShadowJsonDialogBackdrop');
    if (existing) existing.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'nwShadowJsonDialogBackdrop';
    backdrop.className = 'nw-shadow-json-dialog-backdrop';
    const jsonText = _formatShadowJsonForDisplay(payload);
    backdrop.innerHTML = `
      <div class="nw-shadow-json-dialog" role="dialog" aria-modal="true" aria-label="${_shadowEscape(title || 'Shadow JSON')}">
        <div class="nw-shadow-json-dialog__head">
          <div>
            <div class="nw-shadow-json-dialog__eyebrow">TypeScript Shadow-Diagnose</div>
            <h3>${_shadowEscape(title || 'JSON')}</h3>
          </div>
          <button type="button" class="nw-config-btn nw-config-btn--ghost" data-shadow-json-close>Schließen</button>
        </div>
        <textarea class="nw-shadow-json-dialog__text" spellcheck="false" readonly>${_shadowEscape(jsonText)}</textarea>
        <div class="nw-shadow-json-dialog__foot">
          <button type="button" class="nw-config-btn nw-config-btn--ghost" data-shadow-json-copy>JSON kopieren</button>
          <small class="nw-muted">Nur Diagnose. Diese Anzeige verändert keine EMS-Werte.</small>
        </div>
      </div>`;
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-shadow-json-close]')) close();
      const copyBtn = e.target.closest('[data-shadow-json-copy]');
      if (copyBtn) {
        try {
          navigator.clipboard && navigator.clipboard.writeText(jsonText);
          copyBtn.textContent = 'Kopiert';
          setTimeout(() => { try { copyBtn.textContent = 'JSON kopieren'; } catch (_e) {} }, 1200);
        } catch (_e) {}
      }
    });
    document.body.appendChild(backdrop);
    const text = backdrop.querySelector('textarea');
    if (text) { try { text.focus(); text.setSelectionRange(0, 0); } catch (_e) {} }
  }


  /**
   * Code-Teil: _normalizeEnergyFlowTsModeUi
   *
   * Zweck:
   * Normalisiert den im App-Center gewählten Energiefluss-TS-Modus auf die drei
   * erlaubten Werte `js`, `shadow` und `ts`.
   *
   * Zusammenhang:
   * Diese UI-Funktion muss exakt zur Backend-Normalisierung in main.js passen.
   * Falsche Werte werden ab 0.7.101 bewusst auf `ts` zurückgesetzt. TS ist der
   * Standard-Kandidat, bleibt aber durch Backend-Gates abgesichert und fällt bei
   * Blockern automatisch auf JavaScript zurück.
   */
  function _normalizeEnergyFlowTsModeUi(value) {
    const v = String(value || '').trim().toLowerCase();
    return ['js', 'shadow', 'ts'].includes(v) ? v : 'ts';
  }

  /**
   * Code-Teil: applyEnergyFlowTsModeToUi
   *
   * Zweck:
   * Schreibt die gespeicherte `tsMigration`-Konfiguration in die App-Center-Felder.
   *
   * Zusammenhang:
   * Wird beim Laden der Installer-Konfiguration aufgerufen. Dadurch sieht der
   * Installateur sofort, ob Energiefluss aktuell im JS-, Shadow- oder TS-Kandidatenmodus
   * steht und ob die zusätzliche produktive Freigabe gesetzt ist.
   */
  function applyEnergyFlowTsModeToUi(cfg) {
    const tm = (cfg && cfg.tsMigration && typeof cfg.tsMigration === 'object') ? cfg.tsMigration : {};
    const mode = _normalizeEnergyFlowTsModeUi(tm.energyFlowMode || 'ts');
    if (els.energyFlowTsMode) els.energyFlowTsMode.value = mode;
    if (els.energyFlowTsProductionAllowed) els.energyFlowTsProductionAllowed.checked = (tm.energyFlowProductionAllowed !== false);
    if (els.energyFlowTsWarmupTicks) els.energyFlowTsWarmupTicks.value = String(Math.max(1, Math.min(30, Math.round(Number(tm.energyFlowCandidateWarmupTicks) || 3))));
    if (els.energyFlowTsAutoFallback) els.energyFlowTsAutoFallback.checked = tm.energyFlowCandidateAutoFallback !== false;
    if (els.energyFlowTsRequireStablePlant) els.energyFlowTsRequireStablePlant.checked = tm.energyFlowRequireStablePlantEvaluation !== false;
    if (els.energyFlowTsPlantMinSamples) els.energyFlowTsPlantMinSamples.value = String(Math.max(1, Math.min(120, Math.round(Number(tm.energyFlowPlantMinSamples) || 5))));
    if (els.energyFlowTsPlantMinOk) els.energyFlowTsPlantMinOk.value = String(Math.max(1, Math.min(120, Math.round(Number(tm.energyFlowPlantMinConsecutiveOk) || 5))));
    renderEnergyFlowTsModeStatus(null);
  }

  /**
   * Code-Teil: collectEnergyFlowTsMigrationFromUi
   *
   * Zweck:
   * Sammelt den kontrollierten Energiefluss-TS-Schaltmodus aus dem App-Center.
   *
   * Wichtig:
   * Diese Werte sind nur eine Konfiguration. Das Backend prüft zusätzlich Shadow-Status
   * und Sicherheitsfreigabe, bevor TS-Werte überhaupt produktiv genutzt werden dürften.
   */
  function collectEnergyFlowTsMigrationFromUi(base) {
    const out = deepMerge({}, (base && typeof base === 'object') ? base : {});
    if (els.energyFlowTsMode) out.energyFlowMode = _normalizeEnergyFlowTsModeUi(els.energyFlowTsMode.value || out.energyFlowMode);
    else out.energyFlowMode = _normalizeEnergyFlowTsModeUi(out.energyFlowMode || 'ts');
    if (els.energyFlowTsProductionAllowed) out.energyFlowProductionAllowed = !!els.energyFlowTsProductionAllowed.checked;
    else out.energyFlowProductionAllowed = out.energyFlowProductionAllowed !== false;
    const warmup = Math.round(Number(els.energyFlowTsWarmupTicks ? els.energyFlowTsWarmupTicks.value : out.energyFlowCandidateWarmupTicks));
    out.energyFlowCandidateWarmupTicks = Number.isFinite(warmup) ? Math.max(1, Math.min(30, warmup)) : 3;
    if (els.energyFlowTsAutoFallback) out.energyFlowCandidateAutoFallback = !(els.energyFlowTsAutoFallback.checked === false);
    else out.energyFlowCandidateAutoFallback = out.energyFlowCandidateAutoFallback !== false;
    if (els.energyFlowTsRequireStablePlant) out.energyFlowRequireStablePlantEvaluation = !(els.energyFlowTsRequireStablePlant.checked === false);
    else out.energyFlowRequireStablePlantEvaluation = out.energyFlowRequireStablePlantEvaluation !== false;
    const plantSamples = Math.round(Number(els.energyFlowTsPlantMinSamples ? els.energyFlowTsPlantMinSamples.value : out.energyFlowPlantMinSamples));
    out.energyFlowPlantMinSamples = Number.isFinite(plantSamples) ? Math.max(1, Math.min(120, plantSamples)) : 5;
    const plantOk = Math.round(Number(els.energyFlowTsPlantMinOk ? els.energyFlowTsPlantMinOk.value : out.energyFlowPlantMinConsecutiveOk));
    out.energyFlowPlantMinConsecutiveOk = Number.isFinite(plantOk) ? Math.max(1, Math.min(120, plantOk)) : 5;
    return out;
  }

  /**
   * Code-Teil: renderEnergyFlowTsModeStatus
   *
   * Zweck:
   * Zeigt die effektive Backend-Entscheidung für den Energiefluss-TS-Modus im
   * App-Center an. Dadurch sieht man, ob die UI-Konfiguration wirklich wirksam wäre
   * oder ob Shadow-Blocker / fehlende Sicherheitsfreigabe TS verhindern.
   */
  function renderEnergyFlowTsModeStatus(readiness) {
    if (!els.energyFlowTsModeStatus) return;
    const tm = (currentConfig && currentConfig.tsMigration && typeof currentConfig.tsMigration === 'object') ? currentConfig.tsMigration : {};
    const plan = readiness && readiness.energyFlowEffectivePlan ? readiness.energyFlowEffectivePlan : null;
    const selectedMode = _normalizeEnergyFlowTsModeUi(els.energyFlowTsMode ? els.energyFlowTsMode.value : (tm.energyFlowMode || 'ts'));
    const productionAllowed = !!(els.energyFlowTsProductionAllowed && els.energyFlowTsProductionAllowed.checked);
    const warmupWanted = Math.max(1, Math.min(30, Math.round(Number(els.energyFlowTsWarmupTicks ? els.energyFlowTsWarmupTicks.value : (tm.energyFlowCandidateWarmupTicks || 3)) || 3)));
    const autoFallback = !(els.energyFlowTsAutoFallback && els.energyFlowTsAutoFallback.checked === false);
    const effectiveSource = plan && plan.source ? String(plan.source) : 'noch keine Diagnose';
    const wouldUseTs = plan && typeof plan.wouldUseTs === 'boolean' ? (plan.wouldUseTs ? 'ja' : 'nein') : '--';
    const switchState = readiness && readiness.energyFlowSwitchState ? readiness.energyFlowSwitchState : (plan && plan.switchState ? plan.switchState : null);
    const runtimeSource = readiness && readiness.energyFlowRuntimeSource ? String(readiness.energyFlowRuntimeSource) : '';
    const liveTestState = readiness && readiness.energyFlowTsLiveTestState ? String(readiness.energyFlowTsLiveTestState) : '';
    const warmupStatus = switchState && Number.isFinite(Number(switchState.okTicks))
      ? `${Number(switchState.okTicks)}/${Number(switchState.warmupTicks || warmupWanted)}`
      : `0/${warmupWanted}`;
    const candidateStable = switchState && switchState.candidateStable === true ? 'stabil' : 'nicht stabil';
    const blocked = plan && Array.isArray(plan.blockedReasons) && plan.blockedReasons.length ? plan.blockedReasons.map(_decodeShadowDisplayText).join(' · ') : '';
    const safety = plan && plan.candidateSafety && typeof plan.candidateSafety === 'object' ? plan.candidateSafety : null;
    const candidateLine = safety
      ? `<b>Kandidatenprüfung:</b> ${safety.ok ? 'OK' : 'blockiert'}${Array.isArray(safety.warnings) && safety.warnings.length ? ' · Hinweis: ' + _shadowEscape(safety.warnings.join(' · ')) : ''}`
      : `<b>Kandidatenprüfung:</b> Warmup ${_shadowEscape(warmupStatus)} · ${_shadowEscape(candidateStable)}`;
    const plant = (plan && plan.plantEvaluation) || (switchState && switchState.plantEvaluation) || null;
    const plantLine = plant
      ? `<b>Anlagen-Auswertung:</b> ${plant.ok ? 'stabil' : 'blockiert'} · Samples ${Number(plant.sampleCount || 0)}/${Number(plant.minSamples || 5)} · OK-Folge ${Number(plant.consecutiveOk || 0)}/${Number(plant.minConsecutiveOk || 5)}`
      : `<b>Anlagen-Auswertung:</b> noch keine Daten`;
    els.energyFlowTsModeStatus.innerHTML = [
      `<b>Gewählt:</b> ${escape(_decodeShadowDisplayText(selectedMode))} · <b>Freigabe:</b> ${productionAllowed ? 'aktiv' : 'aus'} · <b>Auto-Fallback:</b> ${autoFallback ? 'aktiv' : 'aus'}`,
      `<b>Warmup:</b> ${escape(_decodeShadowDisplayText(warmupStatus))} · <b>Effektive Quelle:</b> ${escape(_decodeShadowDisplayText(effectiveSource))} · <b>TS würde genutzt:</b> ${escape(_decodeShadowDisplayText(wouldUseTs))}`,
      `<b>Live-Test:</b> ${escape(_decodeShadowDisplayText(liveTestState || 'noch keine Daten'))} · <b>Veröffentlichte Quelle:</b> ${escape(_decodeShadowDisplayText(runtimeSource || 'noch keine Daten'))}`,
      candidateLine,
      plantLine,
      blocked ? `<b>Blockiert durch:</b> ${_shadowEscape(blocked)}` : '<b>Status:</b> Noch keine Blocker oder noch keine Shadow-Diagnose geladen.',
    ].join('<br/>');
  }


  /**
   * Code-Teil: _renderShadowPlantEvaluationCard
   *
   * Zweck:
   * Zeigt die Auswertung echter Anlagen-Samples im App-Center. Ein einzelner
   * Shadow-Snapshot kann zufällig OK sein; diese Karte zeigt deshalb Anzahl der
   * Samples, OK-Quote und aufeinanderfolgende OK-Ticks.
   *
   * Zusammenhang:
   * Die Daten kommen aus `control.tsShadowPlantEvaluation` der Diagnose-API. Die
   * Anzeige ist reine Migrationshilfe und schreibt keine Konfiguration.
   */
  function _renderShadowPlantEvaluationCard(evaluation) {
    if (!evaluation || typeof evaluation !== 'object') return null;
    const escape = _shadowEscape;
    const status = String(evaluation.status || 'waiting');
    const kind = status === 'stable' ? 'ok' : (status === 'blocked' || status === 'error' ? 'warn' : 'wait');
    const label = status === 'stable' ? 'STABIL' : (status === 'blocked' ? 'BLOCKIERT' : (status === 'error' ? 'FEHLER' : 'SAMMELT'));
    const lines = [
      ['Samples', String(evaluation.sampleCount || 0)],
      ['OK-Quote', `${Number(evaluation.okRatioPct || 0).toFixed(1)} %`],
      ['OK in Folge', String(evaluation.consecutiveOk || 0)],
      ['Blocker gesamt', String(evaluation.blockerCount || 0)],
      ['Abweichungen gesamt', String(evaluation.mismatchCount || 0)],
      ['Genügend Samples', evaluation.enoughSamples ? 'JA' : 'NEIN'],
    ];
    const recent = Array.isArray(evaluation.recentSamples) ? evaluation.recentSamples.slice(-5) : [];
    const recentText = recent.map((s) => {
      const d = s && s.ts ? new Date(Number(s.ts)) : null;
      const t = d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}` : '—';
      return `${t} · ${s && s.ok ? 'OK' : 'Blockiert'} · Mismatches ${s && s.mismatchCount !== undefined ? s.mismatchCount : 0}`;
    }).join('\n');
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-shadow-readiness-card nw-shadow-plant-evaluation-card';
    card.innerHTML = `
      <div class="nw-config-card__header">
        <div class="nw-config-card__header-top">
          <div class="nw-config-card__title">Reale Anlagen-Auswertung</div>
          <div class="nw-shadow-badge nw-shadow-badge--${kind}">${label}</div>
        </div>
        <div class="nw-config-card__subtitle">Rolling-Auswertung der letzten Shadow-Samples dieser echten Anlage</div>
      </div>
      <div class="nw-config-card__body">
        <div class="nw-shadow-readiness-grid">
          ${lines.map(([a,b]) => `<div class="nw-config-row nw-shadow-diff-row"><div class="nw-config-row__primary">${escape(a)}</div><div class="nw-config-row__status">${escape(b)}</div></div>`).join('')}
        </div>
        <div class="nw-config-help" style="margin-top:8px;opacity:.82;line-height:1.35;">${escape(evaluation.nextAction || 'Samples weiter beobachten.')}</div>
        ${recentText ? `<details class="nw-shadow-json-details"><summary>Letzte Samples anzeigen</summary><pre>${escape(recentText)}</pre></details>` : ''}
        <button type="button" class="nw-config-btn nw-config-btn--ghost nw-shadow-json-button" data-shadow-plant-json>JSON dauerhaft öffnen</button>
      </div>
    `;
    const btn = card.querySelector('[data-shadow-plant-json]');
    if (btn) btn.addEventListener('click', () => _openShadowJsonDialog('Reale Anlagen-Auswertung', evaluation));
    return card;
  }

  /**
   * Code-Teil: _renderHeatingRodTsRuntimeEvaluationCard
   *
   * Zweck:
   * Zeigt, ob der Heizstab auf echter Anlage stabil über TypeScript läuft oder ob
   * JavaScript-Fallbacks auftreten.
   *
   * Zusammenhang:
   * Die Daten kommen aus `heatingRod.summary.tsRuntimeEvaluationJson`. Diese Karte ist
   * reine Diagnose und löst keine Heizstab-Schaltung aus.
   */
  function _renderHeatingRodTsRuntimeEvaluationCard(evaluation) {
    if (!evaluation || typeof evaluation !== 'object') return null;
    const escape = _shadowEscape;
    const stable = evaluation.stable === true;
    const fallbackCount = Number(evaluation.fallbackCount || 0);
    const normalSource = evaluation.normalSource && typeof evaluation.normalSource === 'object' ? evaluation.normalSource : null;
    const legacyRef = evaluation.legacyReference && typeof evaluation.legacyReference === 'object' ? evaluation.legacyReference : null;
    const legacyCleanup = evaluation.legacyCleanup && typeof evaluation.legacyCleanup === 'object' ? evaluation.legacyCleanup : (normalSource && normalSource.legacyCleanup && typeof normalSource.legacyCleanup === 'object' ? normalSource.legacyCleanup : null);
    const legacyRemoval = evaluation.legacyRemovalPlan && typeof evaluation.legacyRemovalPlan === 'object' ? evaluation.legacyRemovalPlan : (normalSource && normalSource.legacyRemovalPlan && typeof normalSource.legacyRemovalPlan === 'object' ? normalSource.legacyRemovalPlan : null);
    const legacyDebugBridge = evaluation.legacyDebugBridge && typeof evaluation.legacyDebugBridge === 'object' ? evaluation.legacyDebugBridge : (legacyRemoval && legacyRemoval.legacyDebugBridge && typeof legacyRemoval.legacyDebugBridge === 'object' ? legacyRemoval.legacyDebugBridge : (normalSource && normalSource.legacyDebugBridge && typeof normalSource.legacyDebugBridge === 'object' ? normalSource.legacyDebugBridge : null));
    const legacyPruned = evaluation.legacyPruned && typeof evaluation.legacyPruned === 'object' ? evaluation.legacyPruned : (legacyDebugBridge && legacyDebugBridge.legacyPruned && typeof legacyDebugBridge.legacyPruned === 'object' ? legacyDebugBridge.legacyPruned : (normalSource && normalSource.legacyPruned && typeof normalSource.legacyPruned === 'object' ? normalSource.legacyPruned : null));
    const legacyRemovalCandidate = evaluation.legacyRemovalCandidate && typeof evaluation.legacyRemovalCandidate === 'object' ? evaluation.legacyRemovalCandidate : (legacyPruned && legacyPruned.legacyRemovalCandidate && typeof legacyPruned.legacyRemovalCandidate === 'object' ? legacyPruned.legacyRemovalCandidate : (normalSource && normalSource.legacyRemovalCandidate && typeof normalSource.legacyRemovalCandidate === 'object' ? normalSource.legacyRemovalCandidate : null));
    const legacyFinalCleanup = evaluation.legacyFinalCleanup && typeof evaluation.legacyFinalCleanup === 'object' ? evaluation.legacyFinalCleanup : (legacyRemovalCandidate && legacyRemovalCandidate.legacyFinalCleanup && typeof legacyRemovalCandidate.legacyFinalCleanup === 'object' ? legacyRemovalCandidate.legacyFinalCleanup : (normalSource && normalSource.legacyFinalCleanup && typeof normalSource.legacyFinalCleanup === 'object' ? normalSource.legacyFinalCleanup : null));
    const legacyNormalDiagnostics = evaluation.legacyNormalDiagnostics && typeof evaluation.legacyNormalDiagnostics === 'object' ? evaluation.legacyNormalDiagnostics : (legacyRemovalCandidate && legacyRemovalCandidate.legacyNormalDiagnostics && typeof legacyRemovalCandidate.legacyNormalDiagnostics === 'object' ? legacyRemovalCandidate.legacyNormalDiagnostics : (normalSource && normalSource.legacyNormalDiagnostics && typeof normalSource.legacyNormalDiagnostics === 'object' ? normalSource.legacyNormalDiagnostics : null));
    const normalReady = !!(normalSource && normalSource.ready);
    const kind = normalReady ? 'ok' : (stable ? 'ok' : (fallbackCount > 0 ? 'warn' : 'wait'));
    const title = normalReady ? 'TS NORMAL' : (stable ? 'TS STABIL' : (fallbackCount > 0 ? 'FALLBACK PRÜFEN' : 'SAMMELT'));
    const rows = [
      ['Status', String(evaluation.status || 'waiting')],
      ['Samples', String(Number(evaluation.sampleCount || 0))],
      ['OK in Folge', String(Number(evaluation.consecutiveOk || 0))],
      ['TS aktiv', String(Number(evaluation.activeCount || 0))],
      ['JS-Fallback', String(fallbackCount)],
      ['JS-Fallback-Modus', normalSource ? String(normalSource.jsFallbackMode || (normalReady ? 'hard-blockers-only' : 'normal-safety-fallback')) : String(evaluation.jsFallbackMode || 'wartet')],
      ['JS-Pfad Rolle', normalSource ? String(normalSource.legacyJsPathRole || (normalReady ? 'emergency-fallback-only' : 'safety-reference')) : String(evaluation.legacyJsPathRole || 'wartet')],
      ['JS-Referenz', legacyRef ? String(legacyRef.jsReferenceDecisionMode || legacyRef.legacyJsDecisionMode || 'diagnose') : (normalSource ? String(normalSource.jsReferenceDecisionMode || normalSource.jsReferenceMode || (normalReady ? 'diagnostic-only' : 'blocking-reference')) : String(evaluation.jsReferenceDecisionMode || 'wartet'))],
      ['JS-Referenz Cleanup', legacyCleanup ? String(legacyCleanup.legacyJsReferenceCleanupStage || legacyCleanup.cleanupStage || 'wartet') : 'wartet'],
      ['JS-Entfernung', legacyRemoval ? String(legacyRemoval.removalStage || legacyRemoval.status || 'wartet') : 'wartet'],
      ['JS-Debug-Brücke', legacyDebugBridge ? String(legacyDebugBridge.status || legacyDebugBridge.cleanupStage || 'wartet') : 'wartet'],
      ['JS-Debug Rolle', legacyDebugBridge ? String(legacyDebugBridge.legacyJsPathRole || 'wartet') : 'wartet'],
      ['JS-Entscheidungseinfluss', legacyDebugBridge ? String(legacyDebugBridge.decisionImpact || 'wartet') : (legacyRef ? String(legacyRef.decisionImpact || 'wartet') : 'wartet')],
      ['JS-Debug-Nutzlast', legacyDebugBridge ? String(legacyDebugBridge.bridgePayloadMode || legacyDebugBridge.diagnosticPayloadMode || 'wartet') : 'wartet'],
      // Kompatibilitätsmarker für Migrationstests: JS-Pruning / JS-Details entfernt.
      ['JS-Referenzdetails', legacyPruned ? String(legacyPruned.status || legacyPruned.cleanupStage || 'wartet') : 'wartet'],
      ['JS-Details reduziert', legacyPruned ? ((legacyPruned.fullReferencePayloadRemoved || legacyPruned.duplicateReferenceDetailsRemoved) ? 'ja' : 'nein') : 'wartet'],
      ['JS-Diagnosedaten', legacyPruned ? String(legacyPruned.diagnosticPayloadMode || 'wartet') : (legacyRef ? String(legacyRef.diagnosticPayloadMode || 'voll') : 'wartet')],
      ['JS-Cleanup-Kandidat', legacyPruned ? (legacyPruned.ready ? 'pruned' : 'noch nicht') : (legacyDebugBridge ? (legacyDebugBridge.ready ? 'debug-only' : 'noch nicht') : (legacyCleanup ? (legacyCleanup.cleanupRemovalCandidate ? 'ja' : 'nein') : 'wartet'))],
      ['JS-Entfernungskandidat', legacyRemovalCandidate ? (legacyRemovalCandidate.ready ? 'bereit' : String(legacyRemovalCandidate.status || 'wartet')) : 'wartet'],
      ['JS-Entfernungsphase', legacyRemovalCandidate ? String(legacyRemovalCandidate.cleanupStage || legacyRemovalCandidate.status || 'wartet') : 'wartet'],
      ['JS-Final-Cleanup', legacyFinalCleanup ? String(legacyFinalCleanup.status || 'wartet') : 'wartet'],
      ['JS-Normaldiagnose', legacyFinalCleanup ? String(legacyFinalCleanup.normalDiagnosticsPayload || 'wartet') : 'wartet'],
      ['JS-Normaldiagnose Status', legacyNormalDiagnostics ? String(legacyNormalDiagnostics.status || legacyNormalDiagnostics.cleanupStage || 'wartet') : 'wartet'],
      ['JS-Normaldiagnose entfernt', legacyNormalDiagnostics ? (legacyNormalDiagnostics.normalDiagnosticsRemoved ? 'ja' : 'nein') : 'wartet'],
      ['Harte Fallbacks', String(Number(evaluation.hardFallbackCount || 0))],
      ['Mismatches', String(Number(evaluation.mismatchCount || 0))],
      ['OK-Quote', `${Number(evaluation.okRatioPct || 0)} %`],
      ['TS-Normalpfad', normalSource ? (normalReady ? 'aktiv vorbereitet' : String(normalSource.status || 'sammelt')) : 'wartet'],
      ['TS-Normal Ticks', normalSource ? `${Number(normalSource.consecutiveTsTicks || 0)}/${Number(normalSource.minTsTicks || 8)}` : '--'],
    ];
    const reasons = Array.isArray(evaluation.fallbackReasons) ? evaluation.fallbackReasons.filter(Boolean).join(' · ') : '';
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-shadow-readiness-card nw-heatingrod-ts-runtime-card';
    card.innerHTML = `
      <div class="nw-config-card__header">
        <div class="nw-config-card__header-top">
          <div class="nw-config-card__title">Heizstab TS‑Runtime-Auswertung</div>
          <div class="nw-shadow-badge nw-shadow-badge--${kind}">${escape(title)}</div>
        </div>
        <div class="nw-config-card__subtitle">Echte Adapter-Ticks: TS aktiv, TS Normalpfad oder JS-Notfallback?</div>
      </div>
      <div class="nw-config-card__body">
        <div class="nw-shadow-readiness-grid">
          ${rows.map(([a,b]) => `<div class="nw-config-row nw-shadow-diff-row"><div class="nw-config-row__primary">${escape(a)}</div><div class="nw-config-row__status">${escape(b)}</div></div>`).join('')}
        </div>
        ${reasons ? `<div class="nw-config-help" style="margin-top:8px;line-height:1.35;">Fallback-Gründe: ${escape(reasons)}</div>` : ''}
        <div class="nw-config-help" style="margin-top:8px;opacity:.82;line-height:1.35;">${escape(String(evaluation.nextAction || 'Heizstab-TS beobachten.'))}</div>
        <button type="button" class="nw-config-btn nw-config-btn--ghost nw-shadow-json-button">JSON dauerhaft öffnen</button>
      </div>
    `;
    const btn = card.querySelector('button.nw-shadow-json-button');
    if (btn) btn.addEventListener('click', () => _openShadowJsonDialog('Heizstab TS-Runtime-Auswertung', evaluation));
    return card;
  }

  /**
   * Code-Teil: _renderShadowReadinessCard
   *
   * Zweck:
   * Zeigt eine zusammengefasste Umschaltbereitschaft für TypeScript an. Der
   * Installer sieht dadurch sofort, ob Energiefluss/Core-Limits/Heizstab bereits
   * sauber im Shadow-Vergleich laufen oder ob Blocker vorhanden sind.
   *
   * Zusammenhang:
   * Die Werte kommen aus `control.tsShadowReadiness`, das vom Backend aus den
   * Shadow-JSONs gebildet wird. Diese Anzeige ist nur Diagnose und schaltet keine
   * Runtime von JS auf TS um.
   */
  /**
   * Code-Teil: _renderEnergyFlowTsActiveTestCard
   *
   * Zweck:
   * Zeigt den kontrollierten Energiefluss-TS-Aktivtest im App-Center an. Der Installer
   * sieht dadurch, ob TS wirklich produktiv genutzt wurde oder ob die Sicherheitsgates
   * korrekt auf JS zurückgefallen sind.
   *
   * Zusammenhang:
   * Die Daten kommen aus `control.energyFlowTsActiveTest` der Diagnose-API. Diese Karte
   * ist nur Beobachtung und schaltet selbst nichts um.
   */
  function _renderEnergyFlowTsActiveTestCard(activeTest, fixedSource) {
    if (!activeTest || typeof activeTest !== 'object') return null;
    const escape = _shadowEscape;
    const status = String(activeTest.status || 'collecting');
    const latest = activeTest.latest && typeof activeTest.latest === 'object' ? activeTest.latest : null;
    const lastSource = latest ? String(latest.publishedSource || '') : '';
    const kind = status === 'ts-active' ? 'ok' : (status === 'fallback-js' ? 'warn' : 'wait');
    const label = lastSource === 'ts-normal'
      ? 'TS NORMAL'
      : (status === 'ts-active' ? 'TS AKTIV' : (status === 'fallback-js' ? 'JS FALLBACK' : 'SAMMELT'));
    const fixed = fixedSource && typeof fixedSource === 'object' ? fixedSource : (latest && latest.fixedSourceState ? latest.fixedSourceState : null);
    const lines = [
      ['Samples', String(activeTest.sampleCount || 0)],
      ['TS genutzt', `${Number(activeTest.tsCount || 0)}× (${Number(activeTest.tsRatioPct || 0).toFixed(1)} %)`],
      ['JS/Fallback', String(activeTest.jsCount || 0)],
      ['TS in Folge', String(activeTest.consecutiveTs || 0)],
      ['JS in Folge', String(activeTest.consecutiveJs || 0)],
      ['TS-Normalquelle', fixed ? (fixed.ready ? 'aktiv vorbereitet' : String(fixed.status || 'sammelt')) : 'wartet'],
      ['TS-Fixed Ticks', fixed ? `${Number(fixed.consecutiveTsTicks || 0)}/${Number(fixed.minTsTicks || 12)}` : '--'],
      ['Letzte Quelle', latest ? String(latest.publishedSource || '--') : '--'],
      ['Letzter Grund', latest ? _decodeShadowDisplayText(String(latest.reason || '--')) : '--'],
    ];
    const recent = Array.isArray(activeTest.recentSamples) ? activeTest.recentSamples.slice(-6) : [];
    const recentText = recent.map((s) => {
      const d = s && s.ts ? new Date(Number(s.ts)) : null;
      const t = d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}` : '—';
      return `${t} · ${s && s.useTs ? 'TS' : 'JS'} · ${_decodeShadowDisplayText(String(s && s.reason || ''))}`;
    }).join('\n');
    const blockers = latest && Array.isArray(latest.blockers) ? latest.blockers.map(_decodeShadowDisplayText) : [];
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-shadow-diagnostic-card nw-shadow-active-test-card';
    card.innerHTML = `
      <div class="nw-config-card__header">
        <div class="nw-config-card__header-top">
          <div class="nw-config-card__title">Energiefluss TS‑Aktivtest</div>
          <div class="nw-shadow-badge nw-shadow-badge--${kind}">${label}</div>
        </div>
        <div class="nw-config-card__subtitle">Beobachtung, ob TypeScript bereits Normalquelle ist oder JS nur noch als Notfallback greift</div>
      </div>
      <div class="nw-config-card__body">
        <div class="nw-shadow-readiness-grid">
          ${lines.map(([a,b]) => `<div class="nw-config-row nw-shadow-diff-row"><div class="nw-config-row__primary">${escape(a)}</div><div class="nw-config-row__status">${escape(b)}</div></div>`).join('')}
        </div>
        ${blockers.length ? `<details class="nw-shadow-json-details" open><summary>Letzte Blocker</summary><pre>${escape(blockers.join('\n'))}</pre></details>` : ''}
        ${recentText ? `<details class="nw-shadow-json-details"><summary>Letzte Aktivtest-Samples</summary><pre>${escape(recentText)}</pre></details>` : ''}
        <div class="nw-config-help" style="margin-top:8px;opacity:.82;line-height:1.35;">${escape((fixed && fixed.nextAction) || activeTest.nextAction || 'Aktivtest weiter beobachten.')}</div>
        <button type="button" class="nw-config-btn nw-config-btn--ghost nw-shadow-json-button" data-shadow-active-test-json>JSON dauerhaft öffnen</button>
      </div>
    `;
    const btn = card.querySelector('[data-shadow-active-test-json]');
    if (btn) btn.addEventListener('click', () => _openShadowJsonDialog('Energiefluss TS‑Aktivtest', activeTest));
    return card;
  }

  function _renderShadowReadinessCard(readiness) {
    if (!readiness || typeof readiness !== 'object') return null;
    const escape = _shadowEscape;
    const card = document.createElement('div');
    card.className = 'nw-config-card nw-shadow-diagnostic-card nw-shadow-readiness-card';
    const overall = !!readiness.overallReady;
    const kind = overall ? 'ok' : 'warn';
    const plan = readiness.energyFlowEffectivePlan && typeof readiness.energyFlowEffectivePlan === 'object' ? readiness.energyFlowEffectivePlan : null;
    /**
     * Code-Teil: candidateSafety vor der Anzeige berechnen
     *
     * Zweck:
     * Die Umschaltbereitschaftskarte nutzt den Kandidatenstatus in der Werteübersicht
     * und in den Detailhinweisen. Der Wert muss daher vor `items` berechnet werden,
     * damit im Browser kein ReferenceError durch eine zu spät deklarierte Konstante entsteht.
     *
     * Zusammenhang:
     * Dieser Fehler wäre nur in der App-Center-UI sichtbar gewesen, nicht im Node-Syntaxcheck.
     * Genau deshalb bleibt dieser Kommentar als Hinweis für spätere TypeScript/DOM-Migrationen.
     */
    const candidateSafety = readiness.energyFlowCandidateSafety && typeof readiness.energyFlowCandidateSafety === 'object' ? readiness.energyFlowCandidateSafety : (plan && plan.candidateSafety ? plan.candidateSafety : null);
    const items = [
      ['Energiefluss', readiness.readyForEnergyFlowSwitch ? 'bereit' : 'nicht bereit'],
      ['Energiefluss-Modus', readiness.energyFlowMode || (plan && plan.mode) || 'ts'],
      ['Energiefluss-Quelle', plan ? (plan.source || 'js-runtime') : 'js-runtime'],
      ['TS-Kandidat', candidateSafety ? (candidateSafety.ok ? 'OK' : 'blockiert') : '--'],
      ['Core‑Limits', readiness.readyForCoreLimitsSwitch ? 'bereit' : 'nicht bereit'],
      ['Heizstab', readiness.readyForHeatingRodSwitch ? 'bereit' : 'nicht bereit'],
    ];
    const blockers = Array.isArray(readiness.blockers) ? readiness.blockers.map(_decodeShadowDisplayText) : [];
    const warnings = Array.isArray(readiness.warnings) ? readiness.warnings.map(_decodeShadowDisplayText) : [];
    const candidateLines = candidateSafety
      ? [].concat(
          candidateSafety.ok ? ['Kandidatenprüfung: OK'] : ['Kandidatenprüfung: blockiert'],
          Array.isArray(candidateSafety.blockers) ? candidateSafety.blockers.map((x) => 'Blocker: ' + x) : [],
          Array.isArray(candidateSafety.warnings) ? candidateSafety.warnings.map((x) => 'Hinweis: ' + x) : []
        )
      : [];
    card.innerHTML = `
      <div class="nw-config-card__header">
        <div class="nw-config-card__header-top">
          <div class="nw-config-card__title">TS‑Umschaltbereitschaft</div>
          <div class="nw-shadow-badge nw-shadow-badge--${kind}">${overall ? 'BEREIT' : 'PRÜFEN'}</div>
        </div>
        <div class="nw-config-card__subtitle">Zusammenfassung aus Core‑Limits, Heizstab und Energiefluss Shadow‑Vergleich</div>
      </div>
      <div class="nw-config-card__body">
        <div class="nw-shadow-readiness-grid">
          ${items.map(([label, value]) => `<div class="nw-config-row nw-shadow-diff-row"><div class="nw-config-row__primary">${escape(label)}</div><div class="nw-config-row__status">${escape(value)}</div></div>`).join('')}
        </div>
        ${(blockers.length || warnings.length || candidateLines.length) ? `<details class="nw-shadow-json-details" open><summary>Blocker / Hinweise / Kandidatenprüfung</summary><pre>${escape([].concat(blockers, warnings, candidateLines).join('\n') || 'Keine Blocker')}</pre></details>` : ''}
        <div class="nw-config-help" style="margin-top:8px;opacity:.82;line-height:1.35;">${escape(readiness.nextAction || 'Diagnose auswerten, bevor produktiv auf TypeScript umgeschaltet wird.')}</div>
      </div>
    `;
    return card;
  }

  /**
   * Code-Teil: renderShadowDiagnostics
   *
   * Zweck:
   * Zeigt Core-Limits-, Heizstab- und Energiefluss-Shadow-Vergleiche als
   * lesbare App-Center-Karten an.
   *
   * Zusammenhang:
   * Diese Anzeige ist die Freigabehilfe für die TypeScript-Migration. Erst wenn
   * reale Anlagen hier stabil keine relevanten Abweichungen zeigen, darf später
   * ein TS-Resolver produktiv übernommen werden.
   *
   * Wichtig:
   * Diese Funktion ist reine UI/Diagnose. Sie schreibt keine States und schaltet
   * keine Verbraucher.
   */
  function renderShadowDiagnostics(payload) {
    if (!els.shadowDiagnostics) return;
    _rememberOpenShadowDetails();
    els.shadowDiagnostics.innerHTML = '';
    const ctrl = (payload && payload.control && typeof payload.control === 'object') ? payload.control : {};
    const coreShadow = _parseShadowJson(ctrl.emsBudgetTsShadowJson, null);
    const heatingShadowRaw = _parseShadowJson(ctrl.heatingRodTsShadowJson, null);
    const heatingDebug = _parseShadowJson(ctrl.heatingRodDebugJson, null);
    const heatingShadow = heatingShadowRaw || (heatingDebug && heatingDebug.tsShadow ? heatingDebug.tsShadow : null);
    const flowInputs = _parseShadowJson(ctrl.energyFlowInputsJson, null);
    const flowShadow = flowInputs && flowInputs.tsShadow ? flowInputs.tsShadow : null;
    const chargingControlPrep = _parseShadowJson(ctrl.tsControlProductiveJson, _parseShadowJson(ctrl.tsControlProductivePrepJson, _parseShadowJson(ctrl.tsControlShadowJson, null)));
    const chargingAllocationProductive = _parseShadowJson(ctrl.tsAllocationProductiveJson, _parseShadowJson(ctrl.tsAllocationProductivePrepJson, _parseShadowJson(ctrl.tsAllocationShadowJson, null)));
    const chargingAllocationNormalSource = _parseShadowJson(ctrl.tsAllocationNormalSourceJson, chargingAllocationProductive);
    const chargingWritePlanProductive = _parseShadowJson(ctrl.tsWritePlanProductiveJson, _parseShadowJson(ctrl.tsWritePlanProductivePrepJson, _parseShadowJson(ctrl.tsWritePlanShadowJson, null)));
    const chargingLegacyDecision = _parseShadowJson(ctrl.tsLegacyDecisionTreeJson, null);
    const chargingNormalSourceLockdown = _parseShadowJson(ctrl.tsNormalSourceLockdownJson, _parseShadowJson(ctrl.tsNormalSourceJson, chargingLegacyDecision && chargingLegacyDecision.normalSourceLockdown ? chargingLegacyDecision.normalSourceLockdown : null));
    const chargingEvcsJsRemoval = _parseShadowJson(ctrl.tsEvcsJsRemovalJson, null);
    const chargingAdapterRuntimeHandover = _parseShadowJson(ctrl.tsAdapterRuntimeHandoverJson, chargingEvcsJsRemoval);
    const chargingBudgetPrep = _parseShadowJson(ctrl.tsBudgetJson, null);

    /**
     * Code-Teil: Energiefluss-TS-Livetestdaten in die Readiness übernehmen
     *
     * Zweck:
     * Die Runtime schreibt ab 0.7.86 eigene Diagnose-States für Quelle und Liveteststatus.
     * Diese Werte werden hier in die bereits vorhandene Readiness-Struktur gelegt, damit
     * die App-Center-Karte ohne Roh-JSON sofort zeigt, ob TS wirklich produktiv genutzt wird.
     */
    const readiness = (ctrl.tsShadowReadiness && typeof ctrl.tsShadowReadiness === 'object') ? Object.assign({}, ctrl.tsShadowReadiness) : null;
    if (readiness) {
      readiness.energyFlowRuntimeSource = ctrl.energyFlowSource || (flowInputs && flowInputs.energyFlowSource) || '';
      readiness.energyFlowTsLiveTestState = ctrl.energyFlowTsLiveTestState || '';
      readiness.energyFlowTsSwitch = _parseShadowJson(ctrl.energyFlowTsSwitchJson, flowInputs && flowInputs.tsSwitch ? flowInputs.tsSwitch : null);
      readiness.energyFlowTsCandidate = _parseShadowJson(ctrl.energyFlowTsCandidateJson, flowInputs && flowInputs.tsCandidate ? flowInputs.tsCandidate : null);
      if (readiness.energyFlowTsSwitch && typeof readiness.energyFlowTsSwitch === 'object') readiness.energyFlowSwitchState = readiness.energyFlowTsSwitch;
    }

    const readinessCard = _renderShadowReadinessCard(readiness);
    if (readinessCard) els.shadowDiagnostics.appendChild(readinessCard);
    const heatingRuntimeEvaluation = _parseShadowJson(ctrl.heatingRodTsRuntimeEvaluationJson, null);
    const heatingRuntimeCard = _renderHeatingRodTsRuntimeEvaluationCard(heatingRuntimeEvaluation);
    if (heatingRuntimeCard) els.shadowDiagnostics.appendChild(heatingRuntimeCard);
    const plantEvaluationCard = _renderShadowPlantEvaluationCard(ctrl.tsShadowPlantEvaluation || ctrl.tsShadowRealPlantEvaluation);
    if (plantEvaluationCard) els.shadowDiagnostics.appendChild(plantEvaluationCard);
    const fixedSourceState = _parseShadowJson(ctrl.energyFlowTsFixedSourceJson, ctrl.energyFlowTsFixedSourceState || (flowInputs && flowInputs.tsFixedSource ? flowInputs.tsFixedSource : null));
    const activeTestCard = _renderEnergyFlowTsActiveTestCard(ctrl.energyFlowTsActiveTest, fixedSourceState);
    if (activeTestCard) els.shadowDiagnostics.appendChild(activeTestCard);
    try { renderEnergyFlowTsModeStatus(ctrl.tsShadowReadiness); } catch (_e) {}

    const hint = document.createElement('div');
    hint.className = 'nw-config-help nw-shadow-diagnostics-hint';
    hint.textContent = 'Hinweis: Eine Shadow-Abweichung bedeutet nicht automatisch einen Produktfehler. Bei produktiv übernommenen Bereichen ist TypeScript die Entscheidungsquelle; JavaScript bleibt dort Executor/Fallback. NexoWatt EOS führt technisch weiterhin generierte JavaScript-Artefakte aus; fachliche Normalpfade werden über die TS-Freigaben abgebaut.';
    els.shadowDiagnostics.appendChild(hint);

    const cards = [
      { title: 'TS‑Shadow: Core‑Limits', subtitle: 'PV‑Budget, Netzbudget, Speicherreserve, Restbudget', shadow: coreShadow },
      { title: 'TS‑Shadow: Heizstab', subtitle: 'Zielstufe, Zielleistung, Budgetgrund, Speicherreserve', shadow: heatingShadow },
      { title: 'TS‑Shadow: Energiefluss', subtitle: 'Speicher, Netz, PV, Gebäude-Verbrauch', shadow: flowShadow },
      { title: 'TS‑Produktiv: EVCS Control', subtitle: 'Control‑Status, Budget, Sichtbarkeit, Gates – ohne Setpoint‑Schreiben', shadow: chargingControlPrep },
      // Kompatibilitätsmarker für ältere Checks: TS‑Prep: EVCS Allocation / TS‑Shadow: EVCS Write‑Plan
      { title: 'TS‑Produktiv: EVCS Allocation', subtitle: 'Wallbox‑Zielverteilung produktiv über TS; JS bleibt Fallback/Executor', shadow: chargingAllocationProductive },
      { title: 'TS‑Normalquelle: EVCS Allocation', subtitle: 'TS ist Normalquelle; JS‑Vergleich nur Diagnose, JS nur harter Fallback/Executor', shadow: chargingAllocationNormalSource },
      { title: 'TS‑Produktiv: EVCS Write‑Plan', subtitle: 'Setpoint‑Schreibplan produktiv; EOS‑Executor bleibt JavaScript', shadow: chargingWritePlanProductive },
      { title: 'TS‑Cleanup: EVCS JS Executor/Fallback', subtitle: 'Alter JS‑Entscheidungsbaum ist nur noch Executor/Fallback statt Normalquelle', shadow: chargingLegacyDecision },
      { title: 'TS‑Härtung: EVCS Safety‑Handover', subtitle: 'Stale‑Meter‑Stopps und Peak‑Rampdown laufen als TS‑0‑Setpoint‑Vertrag', shadow: chargingLegacyDecision },
      { title: 'TS‑Lockdown: EVCS Normalquelle', subtitle: 'JS‑Allocation ist aus dem Normalpfad entfernt; nur Executor und harte Fallbacks bleiben', shadow: chargingNormalSourceLockdown },
      { title: 'TS‑Finale: EVCS JS‑Abbau bereit', subtitle: 'TypeScript besitzt Control, Budget, Allocation und Write‑Plan; JS bleibt Runtime‑Grenze/Executor', shadow: chargingEvcsJsRemoval },
      { title: 'TS‑Runtime: Adapter Handover', subtitle: 'Adapter ist auf TS‑Quelle vorbereitet; NexoWatt EOS führt weiter generierte JavaScript‑Artefakte aus', shadow: chargingAdapterRuntimeHandover },
      { title: 'TS‑Produktiv: EVCS Budget‑Caps', subtitle: 'Grid‑/Phasen‑/§14a‑Caps mit JS‑Fallback', shadow: chargingBudgetPrep },
    ];

    const escape = _shadowEscape;
    cards.forEach((item) => {
      const kind = _shadowKind(item.shadow);
      const diffs = _shadowDiffList(item.shadow);
      const source = item.shadow && item.shadow.source ? String(item.shadow.source) : (item.shadow ? 'ts-shadow' : 'kein Snapshot');
      const card = document.createElement('div');
      card.className = 'nw-config-card nw-shadow-diagnostic-card';
      const bodyLines = [];
      bodyLines.push({ label: 'Status', value: item.shadow ? (diffs.length ? `${diffs.length} Abweichung(en)` : 'Keine Abweichung') : 'Noch keine Daten' });
      bodyLines.push({ label: 'Quelle', value: source });
      diffs.slice(0, 5).forEach((d) => {
        bodyLines.push({ label: d.label, value: `JS ${d.js ?? '—'} · TS ${d.ts ?? '—'}${d.diff !== '' ? ' · Δ ' + d.diff : ''}` });
      });
      if (diffs.length > 5) bodyLines.push({ label: 'Weitere', value: `${diffs.length - 5} Abweichung(en) im JSON` });
      card.innerHTML = `
        <div class="nw-config-card__header">
          <div class="nw-config-card__header-top">
            <div class="nw-config-card__title">${escape(item.title)}</div>
            <div class="nw-shadow-badge nw-shadow-badge--${kind}">${escape(_shadowStatusLabel(kind, item.shadow))}</div>
          </div>
          <div class="nw-config-card__subtitle">${escape(item.subtitle)}</div>
        </div>
        <div class="nw-config-card__body"></div>
      `;
      const body = card.querySelector('.nw-config-card__body');
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gap = '6px';
      bodyLines.forEach((line) => {
        const row = document.createElement('div');
        row.className = 'nw-config-row nw-shadow-diff-row';
        row.style.gridTemplateColumns = 'minmax(0, 1fr) minmax(120px, auto)';
        row.innerHTML = `<div class="nw-config-row__primary" style="font-size:.82rem;">${escape(_decodeShadowDisplayText(line.label))}</div><div class="nw-config-row__status" style="font-size:.82rem;">${escape(_decodeShadowDisplayText(line.value))}</div>`;
        grid.appendChild(row);
      });
      body.appendChild(grid);
      const explain = document.createElement('div');
      explain.className = 'nw-config-empty nw-shadow-explanation';
      explain.textContent = _shadowHumanExplanation(item.title, item.shadow, diffs);
      body.appendChild(explain);

      const jsonButton = document.createElement('button');
      jsonButton.type = 'button';
      jsonButton.className = 'nw-config-btn nw-config-btn--ghost nw-shadow-json-button';
      jsonButton.textContent = 'JSON dauerhaft öffnen';
      jsonButton.addEventListener('click', () => _openShadowJsonDialog(item.title, item.shadow || {}));
      body.appendChild(jsonButton);
      els.shadowDiagnostics.appendChild(card);
    });
  }

  /**
   * Code-Teil: renderChargingBudget
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderChargingBudget(payload) {
    if (!els.chargingBudget) return;
    els.chargingBudget.innerHTML = '';

    if (!payload || payload.ok !== true) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Budget-Daten verfügbar.';
      els.chargingBudget.appendChild(empty);
      return;
    }

    const ctrl = (payload && payload.control && typeof payload.control === 'object') ? payload.control : null;
    const sum = (payload && payload.summary && typeof payload.summary === 'object') ? payload.summary : null;

    if (!ctrl) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Budget/Gate-State noch nicht verfügbar (EMS-Core noch kein Tick oder Datenpunkt fehlt).';
      els.chargingBudget.appendChild(empty);
      return;
    }

    /**
     * Code-Teil: mkCard
     * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
     * Zusammenhang: Gehört zu Installer/App-Center (Admin-Konfiguration, EMS-Apps, DP-Zuordnung und Installer-Funktionen) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen müssen mit main.js/native Config und EMS-Modulen synchron bleiben, sonst speichern Installerwerte falsch. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    const mkCard = (titleText, lines, statusKind = '') => {
      const card = document.createElement('div');
      card.className = 'nw-config-card';

      const h = document.createElement('div');
      h.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const t = document.createElement('div');
      t.className = 'nw-config-card__title';
      t.textContent = titleText;

      const badge = document.createElement('div');
      badge.style.fontSize = '0.75rem';
      badge.style.fontWeight = '600';
      badge.style.opacity = '0.95';
      if (statusKind === 'ok') badge.style.color = '#6ee7b7';
      if (statusKind === 'warn') badge.style.color = '#fbbf24';
      if (statusKind === 'error') badge.style.color = '#fca5a5';
      badge.textContent = statusKind ? statusKind.toUpperCase() : '';

      top.appendChild(t);
      top.appendChild(badge);
      h.appendChild(top);

      const b = document.createElement('div');
      b.className = 'nw-config-card__body';

      const ul = document.createElement('div');
      ul.style.display = 'grid';
      ul.style.gap = '6px';

      (lines || []).forEach(line => {
        const row = document.createElement('div');
        row.className = 'nw-config-row';
        row.style.gridTemplateColumns = 'minmax(0, 1fr) auto';

        const l = document.createElement('div');
        l.className = 'nw-config-row__primary';
        l.style.fontSize = '0.82rem';
        l.textContent = line.label;

        const r = document.createElement('div');
        r.className = 'nw-config-row__status';
        r.style.fontSize = '0.82rem';
        r.textContent = line.value;

        row.appendChild(l);
        row.appendChild(r);
        ul.appendChild(row);
      });

      b.appendChild(ul);
      card.appendChild(h);
      card.appendChild(b);
      return card;
    };
    /**
     * Code-Teil: n
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const n = (x) => (x === null || x === undefined) ? null : Number(x);
    /**
     * Code-Teil: b
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const b = (x) => !!x;

    const budgetW = n(ctrl.budgetW);
    const usedW = n(ctrl.usedW);
    const remW = n(ctrl.remainingW);

    // Tariff context (visible at a glance)
    const dynTariffOn = b(ctrl.dynamicTariff);
    const tariffMode = n(ctrl.tariffMode);
    const tariffTxt = dynTariffOn
      ? ((tariffMode === 2) ? 'Automatik' : 'Manuell')
      : 'Aus';

    const budgetKind = (Number.isFinite(budgetW) && Number.isFinite(usedW) && usedW > budgetW + 1) ? 'warn' : 'ok';

    // Central EMS Budget & Gates. This is the app-independent background coordinator;
    // the charging-management cards below remain visible as EVCS-specific diagnostics.
    const centralPvW = n(ctrl.emsBudgetPvW);
    const centralPvRawW = n(ctrl.emsBudgetPvRawW);
    const centralRemainingPvW = n(ctrl.emsBudgetRemainingPvW);
    const centralTotalW = n(ctrl.emsBudgetTotalW);
    const centralRemainingTotalW = n(ctrl.emsBudgetRemainingTotalW);
    const centralActive = b(ctrl.emsBudgetActive) || Number.isFinite(centralPvW) || Number.isFinite(centralRemainingPvW);

    // Gate A – Netz
    const gridBind = b(ctrl.gridCapBinding);
    const gridSoftFactor = n(ctrl.gridSoftRampFactor);
    const gateANetzCard = mkCard('Gate A – Netz', [
      { label: 'Status', value: gridBind ? 'begrenzt reale Ladeanforderung' : 'überwacht – kein Eingriff' },
      { label: 'Netzlimit (cfg)', value: _fmtW(n(ctrl.gridImportLimitW)) },
      { label: 'Netzlimit (eff / Hard)', value: _fmtW(n(ctrl.gridImportLimitEffW)) },
      { label: 'Soft-Schwelle (90 %)', value: _fmtW(n(ctrl.gridImportPlanningW)) },
      { label: 'NVP-Quelle', value: String(ctrl.gridMeasurementSource || '--') },
      { label: 'Netz signed', value: _fmtW(n(ctrl.gridImportW)) },
      { label: 'Hard-Headroom signed', value: _fmtW(n(ctrl.gridHardHeadroomRawW)) },
      { label: 'Soft-Rampenfaktor', value: Number.isFinite(gridSoftFactor) ? `${Math.round(Number(gridSoftFactor) * 100)} %` : '--' },
      { label: 'Offline-Reserve', value: _fmtW(n(ctrl.gridOfflineReserveW)) },
      { label: 'EVCS Ist für Netz-Gate', value: _fmtW(n(ctrl.gridEvcsActualForCapW)) },
      { label: 'EVCS Anforderung', value: _fmtW(n(ctrl.gridDemandRequestedW)) },
      { label: 'EVCS zulässig', value: _fmtW(n(ctrl.gridAllowedDemandW)) },
      { label: 'EVCS Cap (NVP / Importgrenze)', value: _fmtW(n(ctrl.gridCapEvcsW)) },
      { label: 'Tatsächlich reduziert', value: _fmtW(n(ctrl.gridReductionW)) },
      { label: 'Binding', value: _fmtBool(gridBind, 'JA', 'NEIN') },
    ], gridBind ? 'warn' : 'ok');

    // Gate A – Phasen
    const phaseBind = b(ctrl.phaseCapBinding);
    const gateAPhasenCard = mkCard('Gate A – Phasen', [
      { label: 'Max Phase (cfg)', value: (n(ctrl.gridMaxPhaseA) != null) ? (Number(n(ctrl.gridMaxPhaseA)).toFixed(1) + ' A') : '--' },
      { label: 'Worst Phase', value: (n(ctrl.gridWorstPhaseA) != null) ? (Number(n(ctrl.gridWorstPhaseA)).toFixed(1) + ' A') : '--' },
      { label: 'EVCS Cap (Phasen)', value: _fmtW(n(ctrl.gridPhaseCapEvcsW)) },
      { label: 'Binding', value: _fmtBool(phaseBind, 'JA', 'NEIN') },
    ], phaseBind ? 'warn' : 'ok');

    // Gate A2 – §14a
    const p14aActive = b(ctrl.para14aActive);
    const p14aBind = b(ctrl.para14aBinding);
    const gateA2Card = mkCard('Gate A2 – §14a', [
      { label: 'Aktiv', value: _fmtBool(p14aActive, 'JA', 'NEIN') },
      { label: 'Mode', value: String(ctrl.para14aMode || '') },
      { label: 'Cap', value: _fmtW(n(ctrl.para14aCapEvcsW)) },
      { label: 'Binding', value: _fmtBool(p14aBind, 'JA', 'NEIN') },
    ], p14aActive ? (p14aBind ? 'warn' : 'ok') : '');

    // Gate B – PV
    const pvKind = b(ctrl.pvAvailable) ? 'ok' : 'warn';
    const pvLines = [
      { label: 'PV verfügbar', value: _fmtBool(b(ctrl.pvAvailable), 'JA', 'NEIN') },
      { label: 'PV Cap raw', value: _fmtW(n(ctrl.pvCapRawW)) },
      { label: 'PV Cap effektiv', value: _fmtW(n(ctrl.pvCapEffectiveW)) },
    ];

    // Debug only (Installer): show PV surplus without EVCS consumption.
    // Helps to verify sign conventions & smoothing for PV-only charging.
    try {
      const as = (window.NW_AUTH && window.NW_AUTH.getState) ? window.NW_AUTH.getState() : null;
      const isInstaller = as ? !!as.isInstaller : true;
      if (isInstaller) {
        pvLines.push({ label: 'PV Überschuss (ohne EV) – Instant', value: _fmtW(n(ctrl.pvSurplusNoEvRawW)) });
        pvLines.push({ label: 'PV Überschuss (ohne EV) – Ø 5 min', value: _fmtW(n(ctrl.pvSurplusNoEvAvg5mW)) });
      }
    } catch (_e) {}

    const gateBPvCard = mkCard('Gate B – PV', pvLines, pvKind);

    // Gate C – Speicher
    const sa = b(ctrl.storageAssistActive);
    const gateCSpeicherCard = mkCard('Gate C – Speicher', [
      { label: 'Assist aktiv', value: _fmtBool(sa, 'JA', 'NEIN') },
      { label: 'Assist (W)', value: _fmtW(n(ctrl.storageAssistW)) },
      { label: 'SoC (%)', value: (n(ctrl.storageAssistSoCPct) != null) ? (Number(n(ctrl.storageAssistSoCPct)).toFixed(1) + ' %') : '--' },
    ], sa ? 'ok' : '');

    let gateDForecastCard = null;
    let gateETariffCard = null;
    let priorityCard = null;

    if (centralActive) {
      const fcValid = b(ctrl.emsForecastValid);
      const fcUsable = b(ctrl.emsForecastUsable);
      const fcKind = fcUsable ? 'ok' : (fcValid ? 'warn' : 'warn');
      const fcAge = n(ctrl.emsForecastAgeMs);
      gateDForecastCard = mkCard('Gate D – PV Forecast', [
        { label: 'Forecast gültig', value: _fmtBool(fcValid, 'JA', 'NEIN') },
        { label: 'Für Apps nutzbar', value: _fmtBool(fcUsable, 'JA', 'NEIN') },
        { label: 'Confidence', value: _fmtPct(n(ctrl.emsForecastConfidencePct)) },
        { label: 'Alter', value: Number.isFinite(fcAge) ? _fmtAge(fcAge) : '—' },
        { label: 'PV Prognose jetzt', value: _fmtW(n(ctrl.emsForecastNowW)) },
        { label: 'Ø nächste 1h', value: _fmtW(n(ctrl.emsForecastAvgNext1hW)) },
        { label: 'Ø nächste 3h', value: _fmtW(n(ctrl.emsForecastAvgNext3hW)) },
        { label: 'Peak nächste 6h', value: _fmtW(n(ctrl.emsForecastPeakNext6hW)) },
        { label: 'Energie nächste 6h', value: _fmtKwh(n(ctrl.emsForecastKwhNext6h)) },
        { label: 'Energie nächste 24h', value: _fmtKwh(n(ctrl.emsForecastKwhNext24h)) },
        { label: 'Status', value: String(ctrl.emsForecastStatus || '') },
      ], fcKind);

      const tariffNeg = b(ctrl.emsTariffNegativeActive);
      const tariffPref = b(ctrl.emsTariffGridImportPreferred);
      const tariffKind = tariffPref ? 'ok' : (b(ctrl.emsTariffActive) ? '' : 'warn');
      gateETariffCard = mkCard('Gate E – Tarif / Negativpreis', [
        { label: 'Tarif aktiv', value: _fmtBool(b(ctrl.emsTariffActive), 'JA', 'NEIN') },
        { label: 'Status', value: String(ctrl.emsTariffStatus || ctrl.emsTariffState || '') },
        { label: 'Aktueller Preis', value: _fmtEurKwh(n(ctrl.emsTariffCurrentPriceEurKwh)) },
        { label: 'Negativpreis aktiv', value: _fmtBool(tariffNeg, 'JA', 'NEIN') },
        { label: 'Netzbezug bevorzugt', value: _fmtBool(tariffPref, 'JA', 'NEIN') },
        { label: 'Speicher Netzladen', value: _fmtBool(b(ctrl.emsTariffStorageGridChargeAllowed), 'JA', 'NEIN') },
        { label: 'EVCS Netzladen', value: _fmtBool(b(ctrl.emsTariffEvcsGridChargeAllowed), 'JA', 'NEIN') },
        { label: 'Speicher Entladen', value: _fmtBool(b(ctrl.emsTariffDischargeAllowed), 'JA', 'NEIN') },
        { label: 'PV-Abregelung empfohlen', value: _fmtBool(b(ctrl.emsTariffPvCurtailRecommended), 'JA', 'NEIN') },
        { label: 'Min. negativ im Forecast', value: _fmtEurKwh(n(ctrl.emsTariffNegativeMinPriceEurKwh)) },
        { label: 'Nächstes Negativfenster', value: `${_fmtIsoShort(ctrl.emsTariffNextNegativeFrom)} → ${_fmtIsoShort(ctrl.emsTariffNextNegativeTo)}` },
      ], tariffKind);

      try {
        const consumers = JSON.parse(String(ctrl.emsBudgetConsumersJson || '[]'));
        const lines = Array.isArray(consumers) ? consumers
          .filter((c) => c && typeof c === 'object')
          .map((c) => {
            const reserveW = n(c.usedW ?? c.reserveW ?? c.requestedW);
            const pvReserveW = n(c.pvUsedW ?? c.pvReserveW ?? (c.pvOnly ? reserveW : 0));
            // 0.8.64: In der Prioritäten-Kachel darf 'Ist' nicht aus Reserve/Setpoint
            // rekonstruiert werden. Wenn kein echter Istwert kommt, bleibt Ist = 0;
            // Reserve und PV-Reserve werden separat angezeigt.
            const actualW = n(c.actualW ?? c.actualPowerW ?? c.measuredW ?? 0);
            return Object.assign({}, c, { reserveW, pvReserveW, actualW });
          })
          // Nur echte aktive/relevante Reservierungen als Zeile anzeigen.
          // Die Kachel selbst bleibt trotzdem sichtbar, damit das Grid nicht springt.
          .filter((c) => Math.max(Math.abs(c.actualW), Math.abs(c.reserveW), Math.abs(c.pvReserveW)) >= 5)
          .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999))
          .slice(0, 6)
          .map((c) => ({
            label: `${Number(c.priority || 999)} · ${String(c.label || c.key || c.app || '')}`,
            value: `Ist ${_fmtW(c.actualW)} · Res ${_fmtW(c.reserveW)} / PV ${_fmtW(c.pvReserveW)}`
          })) : [];

        priorityCard = mkCard('Prioritäten / Reservierungen',
          lines.length ? lines : [
            { label: 'Aktive Reservierungen', value: 'keine' },
            { label: 'Flex genutzt', value: _fmtW(n(ctrl.emsBudgetFlexUsedW)) },
          ],
          lines.length ? '' : 'ok'
        );
      } catch (_e) {
        priorityCard = mkCard('Prioritäten / Reservierungen', [
          { label: 'Status', value: 'warte auf Snapshot' },
          { label: 'Flex genutzt', value: _fmtW(n(ctrl.emsBudgetFlexUsedW)) },
        ], 'warn');
      }
    }

    // First show the central overview, then the gates in alphabetic/functional order.
    if (centralActive) {
      const centralBinding = String(ctrl.emsBudgetBinding || '').toLowerCase();
      const centralMonitoringOnly = ['grid-monitor', 'import-monitor', 'grid-import-monitor', 'export-monitor', 'grid-export-monitor'].includes(centralBinding);
      const cKind = /nvp_|grid-hard|grid-soft|peak|14a/.test(centralBinding) ? 'warn' : 'ok';
      const centralBindingLabel = centralMonitoringOnly ? 'Status' : 'Binding';
      const centralBindingValue = centralBinding === 'grid-monitor' || centralBinding === 'import-monitor' || centralBinding === 'grid-import-monitor'
        ? 'NVP-Bezug überwacht – kein Eingriff'
        : (centralBinding === 'export-monitor' || centralBinding === 'grid-export-monitor'
          ? 'Einspeisung überwacht – Eingriff nur am Exportlimit'
          : String(ctrl.emsBudgetBinding || ''));
      els.chargingBudget.appendChild(mkCard('Zentrales EMS-Budget', [
        { label: 'Mode', value: String(ctrl.emsBudgetMode || 'central-background') },
        { label: 'PV Budget raw', value: _fmtW(centralPvRawW) },
        { label: 'PV Budget effektiv', value: _fmtW(centralPvW) },
        { label: 'PV Rest nach Priorität', value: _fmtW(centralRemainingPvW) },
        { label: 'Gesamtbudget', value: _fmtW(centralTotalW) },
        { label: 'Rest Gesamt', value: _fmtW(centralRemainingTotalW) },
        { label: centralBindingLabel, value: centralBindingValue },
      ], cKind));

      els.chargingBudget.appendChild(mkCard('Zentrale Messbasis', [
        { label: 'Netz signed', value: _fmtW(n(ctrl.emsBudgetGridW)) },
        { label: 'Einspeisung', value: _fmtW(n(ctrl.emsBudgetGridExportW)) },
        { label: 'PV Erzeugung', value: _fmtW(n(ctrl.emsBudgetPvPowerW)) },
        { label: 'Speicher lädt', value: _fmtW(n(ctrl.emsBudgetStorageChargeW)) },
        { label: 'Speicher entlädt', value: _fmtW(n(ctrl.emsBudgetStorageDischargeW)) },
        { label: 'Flexible Lasten', value: _fmtW(n(ctrl.emsBudgetFlexUsedW)) },
      ], ''));
    }

    [
      gateANetzCard,
      gateAPhasenCard,
      gateA2Card,
      gateBPvCard,
      gateCSpeicherCard,
      gateDForecastCard,
      gateETariffCard,
      priorityCard,
    ].forEach((card) => {
      if (card) els.chargingBudget.appendChild(card);
    });

    els.chargingBudget.appendChild(mkCard('Ladebudget EVCS', [
      { label: 'Tarif', value: tariffTxt },
      { label: 'Mode', value: String(ctrl.budgetMode || '') },
      { label: 'Ladepunkte steuerbar', value: String(Math.max(0, Math.round(n(ctrl.infrastructureWallboxCount) || 0))) },
      { label: 'Portsumme installiert', value: _fmtW(n(ctrl.infrastructureRawCapacityW)) },
      { label: 'Infrastruktur wirksam', value: _fmtW(n(ctrl.infrastructureCapacityW)) },
      { label: 'Optionaler Hard-Cap', value: _fmtW(n(ctrl.infrastructureHardCapW)) },
      { label: 'Budget nach allen Gates', value: _fmtW(budgetW) },
      { label: 'Mindestversorgung gesamt', value: _fmtW(n(ctrl.minimumServiceRequiredW)) },
      { label: 'Alle Minima gehalten', value: _fmtBool(b(ctrl.minimumServicePreserved), 'JA', 'NEIN') },
      { label: 'Ist', value: _fmtW(n(ctrl.actualW ?? usedW)) },
      { label: 'Reserviert', value: _fmtW(n(ctrl.reserveW ?? usedW)) },
      { label: 'Remaining', value: _fmtW(remW) },
      { label: 'Status', value: String(ctrl.status || '') },
    ], budgetKind));

    // Kompakte EMS-Überwachung: Im Status-Reiter erscheinen nur die für
    // Feldbetrieb und Fehlersuche wesentlichen Punkte. Die ausführlichen JSON-
    // Diagnosen bleiben weiterhin in den internen States verfügbar.
    const stageA = payload && payload.stageA && typeof payload.stageA === 'object' ? payload.stageA : null;
    if (stageA) {
      const storageOverride = stageA.storageOverride || {};
      const nvp = stageA.nvp || {};
      const arbiter = stageA.actuatorArbiter || stageA.shadowArbiter || {};
      const arbiterMode = String(arbiter.mode || 'shadow').toLowerCase();
      const arbiterLabel = arbiterMode === 'enforce-safety' ? 'SCHUTZ AKTIV' : 'NUR BEOBACHTEN';
      const stageKind = stageA.status === 'error' ? 'error' : (stageA.status === 'warn' ? 'warn' : 'ok');
      const monitorRows = [
        { label: 'EMS-Diagnose', value: String(stageA.status || 'wartet').toUpperCase() },
        { label: 'NVP', value: `${String(nvp.status || (nvp.coherent ? 'ok' : 'prüfen')).toUpperCase()} · ${String(nvp.source || nvp.mode || 'missing')}` },
        { label: 'Messwertalter', value: nvp.signedAgeMs == null && nvp.importAgeMs == null && nvp.exportAgeMs == null
          ? '—'
          : _fmtAge(Math.min(...[nvp.signedAgeMs, nvp.importAgeMs, nvp.exportAgeMs].filter((value) => Number.isFinite(Number(value))).map(Number))) },
        { label: 'Aktor-Arbiter', value: arbiterLabel },
        { label: 'Aktor-Konflikte', value: String(Number(stageA.activeActuatorConflictCount ?? stageA.concurrentControlPathsCount ?? 0)) },
        { label: 'Speicherquelle', value: String(storageOverride.resolvedSource || storageOverride.mode || 'automatisch') },
      ];
      if (Number(arbiter.blockedWriteCount ?? 0) > 0) {
        monitorRows.push({ label: 'Blockierte Writes', value: String(Number(arbiter.blockedWriteCount ?? 0)) });
      }
      if (Number(stageA.measurementIssueCount || 0) > 0) {
        monitorRows.push({ label: 'Messwert-Hinweise', value: String(Number(stageA.measurementIssueCount || 0)) });
      }
      els.chargingBudget.appendChild(mkCard('EMS Überwachung', monitorRows, stageKind));
    }

    // Summary (optional)
    if (sum) {
      els.chargingBudget.appendChild(mkCard('Summary', [
        { label: 'EVCS Ist', value: _fmtW(n(ctrl.actualW ?? ctrl.gridEvcsActualForCapW ?? sum.totalPowerW ?? 0)) },
        { label: 'EVCS Reserviert', value: _fmtW(n(sum.totalReservedPowerW ?? ctrl.reserveW ?? 0)) },
        { label: 'EVCS Soll', value: _fmtW(n(sum.totalTargetPowerW ?? ctrl.usedW ?? 0)) },
        { label: 'Ist-Quelle', value: 'frischer Messwert / Grid-Gate' },
        { label: 'Online Ports', value: (sum.onlineWallboxes != null) ? String(sum.onlineWallboxes) : '--' },
      ], ''));
    }
  }
  /**
   * Code-Teil: refreshChargingDiag
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshChargingDiag() {
    if (_activeTab !== 'status') return;
    const data = await fetchJson('/api/ems/charging/diagnostics');
    renderChargingBudget(data || {});
    // TS-Migrationsdiagnosen bleiben intern über die API verfügbar, werden ab 0.8.3 aber nicht mehr sichtbar im App-Center gerendert.
    renderChargingDiag(data || {});
    renderStationsDiag(data || {});
  }
  /**
   * Code-Teil: refreshEmsStatus
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshEmsStatus() {
    if (_activeTab !== 'status') return;
    const data = await fetchJson('/api/ems/status');
    renderEmsStatus(data || {});
    try { window.NexoWattNvpDiagnostics?.render(data || {}); } catch (_e) {}
  }
  /**
   * Code-Teil: startStatusPolling
   * Zweck: Startet Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function startStatusPolling() {
    if (_statusTimer) {
      try { clearInterval(_statusTimer); } catch (_e) {}
      _statusTimer = null;
    }
    _statusTimer = setInterval(() => {
      if (_activeTab !== 'status') return;
      refreshEmsStatus().catch(() => {});
      refreshChargingDiag().catch(() => {});
    }, 2000);
  }

  // --- DP Modal ---
  /**
   * Code-Teil: openDpModal
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function openDpModal(targetInputId) {
    dpTargetInputId = targetInputId;

    // Beim Ändern einer bereits zugeordneten ID direkt wieder den aktuellen
    // Objektordner öffnen. Das spart besonders bei tiefen Hersteller-/Geräte-
    // Strukturen den wiederholten Weg ab der ioBroker-Wurzel.
    const currentInput = targetInputId ? document.getElementById(targetInputId) : null;
    const currentId = currentInput && typeof currentInput.value === 'string'
      ? currentInput.value.trim()
      : '';
    const currentParts = currentId.split('.').map((part) => part.trim()).filter(Boolean);
    treePrefix = currentParts.length > 1 ? currentParts.slice(0, -1).join('.') : '';

    if (els.dpSearch) els.dpSearch.value = '';
    if (els.dpResults) els.dpResults.innerHTML = '';
    if (els.dpTree) els.dpTree.innerHTML = '';
    if (els.dpBreadcrumb) els.dpBreadcrumb.innerHTML = '';
    if (els.dpModal) {
      els.dpModal.setAttribute('aria-hidden', 'false');
      els.dpModal.classList.remove('hidden');
    }
    refreshTree().catch(() => {});
  }
  /**
   * Code-Teil: closeDpModal
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function closeDpModal() {
    if (els.dpModal) {
      els.dpModal.setAttribute('aria-hidden', 'true');
      els.dpModal.classList.add('hidden');
    }
    dpTargetInputId = null;
  }
  /**
   * Code-Teil: setDpTargetValue
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setDpTargetValue(id) {
    if (!dpTargetInputId) return;
    const inp = document.getElementById(dpTargetInputId);
    if (!inp) return;
    inp.value = id;
    inp.dispatchEvent(new Event('change'));
    closeDpModal();
  }
  /**
   * Code-Teil: renderBreadcrumb
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderBreadcrumb() {
    if (!els.dpBreadcrumb) return;
    els.dpBreadcrumb.innerHTML = '';

    const parts = (treePrefix || '').split('.').filter(Boolean);
    /**
     * Code-Teil: mkCrumb
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkCrumb = (label, prefix, clickable) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-dp-crumb' + (clickable ? '' : ' nw-dp-crumb--active');
      b.textContent = label;
      if (!clickable) {
        b.disabled = true;
        return b;
      }
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      b.addEventListener('click', () => {
        treePrefix = prefix;
        refreshTree().catch(() => {});
      });
      return b;
    };
    /**
     * Code-Teil: sep
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const sep = () => {
      const s = document.createElement('span');
      s.className = 'nw-dp-sep';
      s.textContent = '›';
      return s;
    };

    // Start
    els.dpBreadcrumb.appendChild(mkCrumb('Start', '', parts.length > 0));

    // Segments
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      acc = acc ? (acc + '.' + p) : p;
      els.dpBreadcrumb.appendChild(sep());
      els.dpBreadcrumb.appendChild(mkCrumb(p, acc, i < parts.length - 1));
    }
  }
  /**
   * Code-Teil: mkDpResultRow
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function mkDpResultRow(primary, meta, onClick) {
    const row = document.createElement('div');
    row.className = 'nw-dp-result';
    const id = document.createElement('div');
    id.className = 'nw-dp-result__id';
    id.textContent = primary;
    const m = document.createElement('div');
    m.className = 'nw-dp-result__meta';
    m.textContent = meta || '';
    row.appendChild(id);
    row.appendChild(m);
    if (typeof onClick === 'function') {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }
    return row;
  }
  /**
   * Code-Teil: refreshTree
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshTree() {
    const data = await fetchJson('/api/object/tree?prefix=' + encodeURIComponent(treePrefix || ''));
    const children = Array.isArray(data.children) ? data.children : [];

    renderBreadcrumb();
    if (els.dpTree) els.dpTree.innerHTML = '';
    if (els.dpUpBtn) els.dpUpBtn.disabled = !treePrefix;
    if (els.dpRootBtn) els.dpRootBtn.disabled = !treePrefix;

    // Back entry (one level up)
    if (treePrefix && els.dpTree) {
      els.dpTree.appendChild(mkDpResultRow('..', 'Eine Ebene zurück', () => {
        upOne();
        refreshTree().catch(() => {});
      }));
    }

    if (!children.length) {
      if (els.dpTree) {
        const empty = document.createElement('div');
        empty.className = 'nw-config-empty';
        empty.textContent = 'Keine Einträge.';
        els.dpTree.appendChild(empty);
      }
      return;
    }

    for (const ch of children) {
      // Folder-like entry
      if (ch && ch.hasChildren) {
        const meta = ch.name ? ('Ordner • ' + ch.name) : 'Ordner';
        if (els.dpTree) {
          els.dpTree.appendChild(mkDpResultRow(String(ch.id || ch.label || ''), meta, () => {
            treePrefix = String(ch.id || '');
            refreshTree().catch(() => {});
          }));
        }
        continue;
      }

      // State-like entry
      if (ch && ch.isState) {
        const metaBits = [];
        if (ch.name) metaBits.push(String(ch.name));
        if (ch.role) metaBits.push(String(ch.role));
        if (ch.unit) metaBits.push(String(ch.unit));
        const meta = metaBits.join(' • ');
        if (els.dpTree) {
          els.dpTree.appendChild(mkDpResultRow(String(ch.id || ''), meta, () => setDpTargetValue(String(ch.id || ''))));
        }
        continue;
      }

      // Fallback
      if (els.dpTree) {
        els.dpTree.appendChild(mkDpResultRow(String(ch && (ch.id || ch.label) || ''), '', null));
      }
    }
  }
  /**
   * Code-Teil: doSearch
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function doSearch() {
    const q = String(els.dpSearch.value || '').trim();
    if (!q) {
      els.dpResults.innerHTML = '';
      return;
    }

    els.dpResults.innerHTML = '';
    const data = await fetchJson('/api/smarthome/dpsearch?q=' + encodeURIComponent(q) + '&limit=500');
    const results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Treffer.';
      els.dpResults.appendChild(empty);
      return;
    }

    for (const r of results) {
      const metaBits = [];
      if (r.name) metaBits.push(String(r.name));
      if (r.role) metaBits.push(String(r.role));
      if (r.unit) metaBits.push(String(r.unit));
      const meta = metaBits.join(' • ');
      els.dpResults.appendChild(mkDpResultRow(String(r.id || ''), meta, () => setDpTargetValue(String(r.id || ''))));
    }
  }
  /**
   * Code-Teil: upOne
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function upOne() {
    if (!treePrefix) {
      treePrefix = '';
      return;
    }
    const parts = treePrefix.split('.').filter(Boolean);
    parts.pop();
    treePrefix = parts.join('.');
  }


  /**
   * Code-Teil: getInstallerAdminUrl
   * Zweck: Baut die Rücksprung-URL vom per Adapter-Port geöffneten App-Center zurück
   * in den ioBroker-/NexoWatt-EOS-Admin-Tab. Der App-Center-Server läuft typischerweise
   * auf dem Adapter-Port (z. B. 8188), während der Installer-Tab im Admin-Port läuft
   * (typisch 8081). Ein statischer Link auf `/adapter/nexowatt-ui/tab.html` wäre im
   * Adapter-Port falsch und führt zu „Datei /tab.html konnte nicht abgerufen werden“.
   *
   * Priorität:
   * 1. explizite Query (`adminUrl`, `nwAdminUrl`) für Sonderinstallationen,
   * 2. expliziter Query-Port (`adminPort`, `nwAdminPort`),
   * 3. Referrer aus dem ioBroker-Admin,
   * 4. Default-Fallback auf gleichen Host mit Admin-Port 8081.
   *
   * Wartung: Dieser Helper ist bewusst nur Navigation. Er ändert keine Konfiguration
   * und gehört deshalb in die App-Center-Frontend-Logik, nicht in EMS-Module.
   */
  function getInstallerAdminUrl() {
    const adminHash = '#tab-nexowatt-ui-0';
    const win = window || {};
    const loc = win.location || {};
    let params = null;

    try {
      params = new URLSearchParams(loc.search || '');
    } catch (_e) {
      params = null;
    }

    const explicitUrl = params ? (params.get('adminUrl') || params.get('nwAdminUrl')) : '';
    if (explicitUrl) {
      try {
        return new URL(explicitUrl, loc.href || undefined).toString();
      } catch (_e) {
        return String(explicitUrl);
      }
    }

    const protocol = loc.protocol || 'http:';
    const hostname = loc.hostname || 'localhost';
    const explicitPort = params ? (params.get('adminPort') || params.get('nwAdminPort')) : '';
    if (explicitPort && /^\d{2,5}$/.test(String(explicitPort))) {
      return `${protocol}//${hostname}:${String(explicitPort)}/${adminHash}`;
    }

    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref) {
        if (ref.hash && ref.hash.indexOf('tab-nexowatt-ui-') >= 0) {
          return `${ref.origin}/${ref.hash}`;
        }
        const refLooksLikeAdmin =
          ref.pathname.includes('/adapter/nexowatt-ui/tab.html') ||
          ref.pathname.includes('/admin/') ||
          (ref.port && ref.port !== loc.port);
        if (refLooksLikeAdmin) {
          return `${ref.origin}/${adminHash}`;
        }
      }
    } catch (_e) {
      // Referrer ist optional; falls er fehlt oder vom Browser gekürzt wurde, nutzen wir unten den Fallback.
    }

    const currentPort = String(loc.port || '');
    const adminPort = currentPort && currentPort !== '8081' ? '8081' : (currentPort || '8081');
    return `${protocol}//${hostname}:${adminPort}/${adminHash}`;
  }

  /**
   * Code-Teil: initInstallerBackLink
   * Zweck: Verbindet den Button „Zurück zum Installer“ mit dem echten Admin-Tab
   * `/#tab-nexowatt-ui-0`. Dadurch bleibt der Rückweg auch dann korrekt, wenn das
   * App-Center über den Adapter-Port geöffnet wurde. Die Navigation wird explizit
   * über `window.top` versucht, damit sie auch aus eingebetteten Admin-/Tab-Kontexten
   * sauber ausbricht.
   */
  function initInstallerBackLink() {
    const link = els.backInstaller;
    if (!link) return;
    const target = getInstallerAdminUrl();
    link.setAttribute('href', target);
    link.setAttribute('title', 'Zurück zum NexoWatt-Installer im Admin-Tab');
    try { link.dataset.target = target; } catch (_e) {}

    if (link.dataset.bound === '1') return;
    link.dataset.bound = '1';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      try {
        window.top.location.href = target;
      } catch (_e) {
        window.location.href = target;
      }
    });
  }

  // --- Wire up ---

  buildAppsUI();

  // Tabs + live status
  try { initTabs(); } catch (_e) {}
  try { initFlowSubtabs(); } catch (_e) {}
  try { startStatusPolling(); } catch (_e) {}

  if (els.storageControlMode) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.storageControlMode. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.storageControlMode.addEventListener('change', () => {
      // Only rebuild required fields; keep currentConfig.storage.controlMode updated
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.controlMode = getStorageMode();
      rebuildStorageTable();
    });
  }

  if (els.storageAllowGridCharge) {
    els.storageAllowGridCharge.addEventListener('change', () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.allowGridCharge = els.storageAllowGridCharge.checked === true;
      scheduleValidation(200);
    });
  }

  if (els.storageCouplingMode) {
    /**
     * Code-Teil: _updateStorageCoupling
     * Zweck: Speichert den AC/DC-Speichertyp direkt in currentConfig und baut die
     * sichtbare DP-Liste neu auf.
     * Zusammenhang: Bei DC-/Hybrid-Speichern wird der PV-Erzeugungs-DP sichtbar;
     * bei AC-Speichern bleibt die Einzel-Speicher-Konfiguration schlank.
     */
    const _updateStorageCoupling = () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.coupling = getStorageCoupling();
      updateStorageCouplingUi();
      rebuildStorageTable();
      scheduleValidation(200);
    };
    els.storageCouplingMode.addEventListener('change', _updateStorageCoupling);
    els.storageCouplingMode.addEventListener('input', _updateStorageCoupling);
  }

  if (els.storageCapacityKWh) {
    /**
     * Code-Teil: _update
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const _update = () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      const n = Number(els.storageCapacityKWh.value);
      if (Number.isFinite(n) && n > 0) {
        currentConfig.storage.capacityKWh = n;
      } else {
        delete currentConfig.storage.capacityKWh;
      }
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.storageCapacityKWh. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.storageCapacityKWh.addEventListener('change', _update);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an els.storageCapacityKWh. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.storageCapacityKWh.addEventListener('input', _update);
  }

  if (els.storageRatedPowerKW) {
    /**
     * Code-Teil: _updateStorageRatedPower
     * Zweck: Speichert den lizenzabhängigen Skalierungsanker der Speicherleistung.
     * Zusammenhang: Home wird auf 50 kW begrenzt; Pro bleibt frei skalierbar.
     * Der Wert ist kein Hardware-Sollwert und ersetzt keine Geräte-/Safety-Grenze.
     */
    const _updateStorageRatedPower = () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      const profile = _storagePowerProfileInfo();
      const rawKw = Number(els.storageRatedPowerKW.value);
      if (Number.isFinite(rawKw) && rawKw > 0) {
        const effectiveKw = profile.id === 'home' ? Math.min(rawKw, 50) : rawKw;
        const roundedKw = Math.round(effectiveKw * 10) / 10;
        currentConfig.storage.ratedPowerW = Math.round(roundedKw * 1000);
        if (Math.abs(rawKw - roundedKw) > 0.0001) els.storageRatedPowerKW.value = String(roundedKw);
      } else {
        delete currentConfig.storage.ratedPowerW;
      }
      updateStorageLicensePowerUi();
      scheduleValidation(200);
    };
    els.storageRatedPowerKW.addEventListener('change', _updateStorageRatedPower);
    els.storageRatedPowerKW.addEventListener('input', _updateStorageRatedPower);
  }

  {
    /**
     * Code-Teil: _updateStorageSelfNvpControl
     * Zweck: Synchronisiert Zielband und Filterparameter der Einzel-Speicher-
     * Eigenverbrauchsoptimierung direkt in currentConfig.
     * Zusammenhang: Die Runtime regelt weiterhin auf NVP, nutzt aber einen
     * geglaetteten Fuehrungswert mit RAW-Schutz, damit Speicher nicht sichtbar
     * zwischen Bezug und Einspeisung pendeln.
     */
    const _updateStorageSelfNvpControl = () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.selfTargetGridImportW = _clampInt(
        els.storageSelfTargetGridImportW ? els.storageSelfTargetGridImportW.value : currentConfig.storage.standaloneSelfTargetGridImportW,
        0, 1000000, 50,
      );
      currentConfig.storage.selfImportThresholdW = _clampInt(
        els.storageSelfImportThresholdW ? els.storageSelfImportThresholdW.value : currentConfig.storage.standaloneSelfImportThresholdW,
        0, 1000000, 20,
      );
      currentConfig.storage.standaloneSelfTargetGridImportW = currentConfig.storage.selfTargetGridImportW;
      currentConfig.storage.standaloneSelfImportThresholdW = currentConfig.storage.selfImportThresholdW;
      currentConfig.storage.selfNvpSmoothingSec = _clampInt(
        els.storageSelfNvpSmoothingSec ? els.storageSelfNvpSmoothingSec.value : currentConfig.storage.selfNvpSmoothingSec,
        0, 120, 8,
      );
      currentConfig.storage.selfNvpSmoothingEnabled = currentConfig.storage.selfNvpSmoothingSec > 0;
      currentConfig.storage.selfNvpFastServoEnabled = true;
      currentConfig.storage.selfNvpRawGuardW = _clampInt(
        els.storageSelfNvpRawGuardW ? els.storageSelfNvpRawGuardW.value : currentConfig.storage.selfNvpRawGuardW,
        50, 1000000, 100,
      );
      currentConfig.storage.balanceFeedbackHoldSec = _clampInt(
        els.storageBalanceFeedbackHoldSec ? els.storageBalanceFeedbackHoldSec.value : currentConfig.storage.balanceFeedbackHoldSec,
        1, 300, 45,
      );
      scheduleValidation(200);
    };
    [
      els.storageSelfTargetGridImportW,
      els.storageSelfImportThresholdW,
      els.storageSelfNvpSmoothingSec,
      els.storageSelfNvpRawGuardW,
      els.storageBalanceFeedbackHoldSec,
    ].filter(Boolean).forEach((el) => {
      el.addEventListener('change', _updateStorageSelfNvpControl);
      el.addEventListener('input', _updateStorageSelfNvpControl);
    });
  }

  {
    /**
     * Code-Teil: _updateStorageVendorProfile
     * Zweck: Synchronisiert Herstellerprofil-Optionen direkt in currentConfig.
     * Zusammenhang: FENECON/OpenEMS Hybrid wechselt im Automatikmodus PV-abhaengig und entprellt zwischen FEMS-Eigenregelung und EOS-Schreibpfad; Sungrow Hybrid nutzt
     * fest den gemeinsamen NVP-Regelkreis ohne alte PV-Deckungs-0-W-Sonderzweige.
     * TypeScript: DOM-Checkboxen spaeter als HTMLInputElement typisieren.
     */
    const _updateStorageVendorProfile = () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      const profile = getStorageVendorProfile();
      currentConfig.storage.vendorProfile = profile;
      currentConfig.storage.feneconGridControlEnabled = profile === 'fenecon-openems' && getStorageCoupling() === 'dc';
      currentConfig.storage.feneconAcMode = currentConfig.storage.feneconGridControlEnabled;
      if (els.storageFeneconControlMode) {
        const rawMode = String(els.storageFeneconControlMode.value || currentConfig.storage.feneconControlMode || 'auto').trim().toLowerCase();
        currentConfig.storage.feneconControlMode = ['fems-grid', 'direct-ess'].includes(rawMode) ? rawMode : 'auto';
      }
      currentConfig.storage.sungrowHybridEnabled = profile === 'sungrow-hybrid';
      currentConfig.storage.e3dcRscpEnabled = profile === 'e3dc-rscp';

      if (els.storageFeneconAcMode) els.storageFeneconAcMode.checked = profile === 'fenecon-openems';
      if (els.storageFeneconDayNoWrite) {
        const autoHybrid = profile === 'fenecon-openems'
          && getStorageCoupling() === 'dc'
          && currentConfig.storage.feneconControlMode === 'auto';
        els.storageFeneconDayNoWrite.checked = autoHybrid;
        els.storageFeneconDayNoWrite.disabled = true;
        currentConfig.storage.feneconDayNoWriteEnabled = autoHybrid;
      }
      if (els.storageFeneconAssist) {
        els.storageFeneconAssist.checked = false;
        els.storageFeneconAssist.disabled = true;
        currentConfig.storage.feneconAssistEnabled = false;
      }
      if (els.storageFeneconPvOnThresholdW) currentConfig.storage.feneconPvPassthroughThresholdW = _clampInt(els.storageFeneconPvOnThresholdW.value, 0, 1000000, 500);
      if (els.storageFeneconPvOffThresholdW) currentConfig.storage.feneconPvReleaseThresholdW = _clampInt(els.storageFeneconPvOffThresholdW.value, 0, currentConfig.storage.feneconPvPassthroughThresholdW ?? 500, 500);
      if (els.storageFeneconPvOnDelaySec) currentConfig.storage.feneconPvPassthroughDelaySec = _clampInt(els.storageFeneconPvOnDelaySec.value, 0, 3600, 10);
      if (els.storageFeneconPvOffDelaySec) currentConfig.storage.feneconPvReleaseDelaySec = _clampInt(els.storageFeneconPvOffDelaySec.value, 0, 3600, 120);
      if (els.storageFeneconApiTimeoutSec) currentConfig.storage.feneconApiTimeoutSec = _clampInt(els.storageFeneconApiTimeoutSec.value, 5, 300, 60);


      if (els.storageE3dcRscpEnabled) {
        els.storageE3dcRscpEnabled.checked = profile === 'e3dc-rscp';
      }
      if (els.storageE3dcZeroMode) {
        const zeroMode = String(els.storageE3dcZeroMode.value || currentConfig.storage.e3dcZeroMode || 'normal').trim().toLowerCase();
        els.storageE3dcZeroMode.value = zeroMode === 'idle' ? 'idle' : 'normal';
        currentConfig.storage.e3dcZeroMode = els.storageE3dcZeroMode.value;
      }
      if (els.storageE3dcAllowGridCharge) {
        currentConfig.storage.e3dcAllowGridCharge = !!els.storageE3dcAllowGridCharge.checked;
      }
      if (els.storageE3dcUsePowerLimits) {
        currentConfig.storage.e3dcUsePowerLimits = !!els.storageE3dcUsePowerLimits.checked;
      }
      updateStorageVendorProfileUi();
      rebuildStorageTable();
      scheduleValidation(200);
    };

    if (els.storageVendorProfile) {
      els.storageVendorProfile.addEventListener('change', _updateStorageVendorProfile);
      els.storageVendorProfile.addEventListener('input', _updateStorageVendorProfile);
    }
    [
      els.storageFeneconControlMode,
      els.storageFeneconAcMode,
      els.storageFeneconDayNoWrite,
      els.storageFeneconPvOnThresholdW,
      els.storageFeneconPvOffThresholdW,
      els.storageFeneconPvOnDelaySec,
      els.storageFeneconPvOffDelaySec,
      els.storageFeneconApiTimeoutSec,
      els.storageFeneconAssist,
      els.storageE3dcRscpEnabled,
      els.storageE3dcZeroMode,
      els.storageE3dcAllowGridCharge,
      els.storageE3dcUsePowerLimits,
    ]
      .filter(Boolean)
      .forEach((el) => {
        el.addEventListener('change', _updateStorageVendorProfile);
        el.addEventListener('input', _updateStorageVendorProfile);
      });
  }


  // Peak-Shaving / HLZF UI wiring
  if (els.psStrategyMode) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.psStrategyMode. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psStrategyMode.addEventListener('change', () => {
      try { _psUpdateAtypicalFieldState(); } catch (_e) {}
    });
  }
  if (els.psAtypicalVoltageLevel) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.psAtypicalVoltageLevel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psAtypicalVoltageLevel.addEventListener('change', () => {
      if (els.psAtypicalThresholdPercent && !String(els.psAtypicalThresholdPercent.value || '').trim()) {
        els.psAtypicalThresholdPercent.value = String(_psThresholdForVoltage(els.psAtypicalVoltageLevel.value));
      }
    });
  }
  if (els.psAtypicalApplyVoltageThreshold) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.psAtypicalApplyVoltageThreshold. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psAtypicalApplyVoltageThreshold.addEventListener('click', () => {
      if (els.psAtypicalThresholdPercent) {
        els.psAtypicalThresholdPercent.value = String(_psThresholdForVoltage(els.psAtypicalVoltageLevel ? els.psAtypicalVoltageLevel.value : 'MS'));
      }
      try { _psUpdateAtypicalReviewPreview(); } catch (_e) {}
    });
  }

  [
    'psAtypicalThresholdPercent',
    'psAtypicalMinShiftW',
    'psAtypicalReviewAuditIntervalMinutes',
    'psAtypicalReviewPAbsActualW',
    'psAtypicalReviewPHlzfMaxW',
    'psAtypicalReviewPowerPriceEurPerKwYear',
    'psAtypicalReviewEnergyPriceEurPerKwh',
    'psAtypicalReviewAnnualEnergyKwh',
    'psAtypicalReviewSavingsBagatelleEur',
    'psAtypicalReviewGeneralGridFeeEur',
    'psAtypicalReviewMaxReductionPercent',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { try { _psUpdateAtypicalReviewPreview(); } catch (_e) {} });
  });

  if (els.psAtypicalReviewRefresh) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.psAtypicalReviewRefresh. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psAtypicalReviewRefresh.addEventListener('click', () => { _psRefreshAtypicalReviewExportStatus().catch(() => {}); });
  }
  ['psAtypicalReviewExportFrom', 'psAtypicalReviewExportTo'].forEach((key) => {
    if (els[key]) {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els[key]. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      els[key].addEventListener('change', () => _psRefreshAtypicalReviewExportStatus());
    }
  });

  if (els.psAtypicalReviewExportCsv) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.psAtypicalReviewExportCsv. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psAtypicalReviewExportCsv.addEventListener('click', () => _psOpenAtypicalReviewExport('csv'));
  }
  if (els.psAtypicalReviewExportPdf) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.psAtypicalReviewExportPdf. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psAtypicalReviewExportPdf.addEventListener('click', () => _psOpenAtypicalReviewExport('pdf'));
  }

  if (els.psAtypicalAddWindow) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.psAtypicalAddWindow. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.psAtypicalAddWindow.addEventListener('click', () => {
      const ps = _psGetPeakCfg();
      ps.atypical.highLoadWindows = _psCollectWindowRows();
      ps.atypical.highLoadWindows.push(_psDefaultWindow());
      buildAtypicalWindowsUI();
      _psUpdateAtypicalFieldState();
    });
  }
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e) => {
    const t = e && e.target ? e.target : null;
    const btn = t && t.closest ? t.closest('[data-ps-window-delete]') : null;
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-ps-window-delete'));
    if (!Number.isFinite(idx)) return;
    const ps = _psGetPeakCfg();
    const rows = _psCollectWindowRows();
    rows.splice(idx, 1);
    ps.atypical.highLoadWindows = rows;
    buildAtypicalWindowsUI();
    _psUpdateAtypicalFieldState();
  }, true);

  // Browse buttons (event delegation) – works for dynamically created fields too
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e) => {
    const t = e && e.target ? e.target : null;
    const btn = t && t.closest ? t.closest('[data-browse]') : null;
    if (!btn) return;
    const id = btn.getAttribute('data-browse');
    if (id) openDpModal(id);
  });

  // Mark standalone datapoint inputs for validation

  if (els.gridPointPowerId) {
    els.gridPointPowerId.dataset.dpInput = '1';
    // Keep currentConfig.datapoints.gridPointPower in sync (so save works even without reload)
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.gridPointPowerId. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.gridPointPowerId.addEventListener('change', () => {
      currentConfig = currentConfig || {};
      currentConfig.datapoints = currentConfig.datapoints || {};
      const v = String(els.gridPointPowerId.value || '').trim();
      currentConfig.datapoints.gridPointPower = v;

      if (els.gridPointPowerIdDisplay) {
        els.gridPointPowerIdDisplay.textContent = v ? ('Aktuell: ' + v) : 'Aktuell: nicht gesetzt';
      }
      const flowGridPointInput = document.getElementById('flow_gridPointPower');
      if (flowGridPointInput && flowGridPointInput.value !== v) {
        flowGridPointInput.value = v;
        try { flowGridPointInput.dispatchEvent(new Event('input', { bubbles: true })); } catch (_e) {}
      }

      scheduleValidation(200);
    });
  }

  if (els.gridPointConnectedId) {
    els.gridPointConnectedId.dataset.dpInput = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.gridPointConnectedId. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.gridPointConnectedId.addEventListener('change', () => {
      currentConfig = currentConfig || {};
      currentConfig.datapoints = currentConfig.datapoints || {};
      const v = String(els.gridPointConnectedId.value || '').trim();
      currentConfig.datapoints.gridPointConnected = v;

      if (els.gridPointConnectedIdDisplay) {
        const base = els.gridPointConnectedIdDisplay.dataset.baseHint || els.gridPointConnectedIdDisplay.textContent || '';
        if (!els.gridPointConnectedIdDisplay.dataset.baseHint) els.gridPointConnectedIdDisplay.dataset.baseHint = base;
        els.gridPointConnectedIdDisplay.innerHTML = (v ? ('Aktuell: <code>' + v + '</code><br/>') : '') + (els.gridPointConnectedIdDisplay.dataset.baseHint || '');
      }

      scheduleValidation(200);
    });
  }

  if (els.gridPointWatchdogId) {
    els.gridPointWatchdogId.dataset.dpInput = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.gridPointWatchdogId. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.gridPointWatchdogId.addEventListener('change', () => {
      currentConfig = currentConfig || {};
      currentConfig.datapoints = currentConfig.datapoints || {};
      const v = String(els.gridPointWatchdogId.value || '').trim();
      currentConfig.datapoints.gridPointWatchdog = v;

      if (els.gridPointWatchdogIdDisplay) {
        const base = els.gridPointWatchdogIdDisplay.dataset.baseHint || els.gridPointWatchdogIdDisplay.textContent || '';
        if (!els.gridPointWatchdogIdDisplay.dataset.baseHint) els.gridPointWatchdogIdDisplay.dataset.baseHint = base;
        els.gridPointWatchdogIdDisplay.innerHTML = (v ? ('Aktuell: <code>' + v + '</code><br/>') : '') + (els.gridPointWatchdogIdDisplay.dataset.baseHint || '');
      }

      scheduleValidation(200);
    });
  }


  // §14a: standalone inputs
  if (els.para14aMode) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.para14aMode. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.para14aMode.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      const v = String(els.para14aMode.value || 'ems').trim().toLowerCase();
      ic.para14aMode = (v === 'direct') ? 'direct' : 'ems';
    });
  }

  if (els.para14aMinPerDeviceW) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.para14aMinPerDeviceW. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.para14aMinPerDeviceW.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      const n = Number(els.para14aMinPerDeviceW.value);
      ic.para14aMinPerDeviceW = Number.isFinite(n) ? Math.max(4200, Math.round(n)) : 4200;
      els.para14aMinPerDeviceW.value = String(ic.para14aMinPerDeviceW);
    });
  }

  if (els.para14aSignalMaxAgeSec) {
    els.para14aSignalMaxAgeSec.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      const value = Number(els.para14aSignalMaxAgeSec.value);
      ic.para14aSignalMaxAgeSec = Number.isFinite(value) ? Math.max(1, Math.min(300, Math.round(value))) : 30;
    });
  }
  if (els.para14aStalePolicy) {
    els.para14aStalePolicy.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      const value = String(els.para14aStalePolicy.value || 'local-pmin');
      ic.para14aStalePolicy = ['local-pmin', 'hold-active', 'force-active'].includes(value) ? value : 'local-pmin';
    });
  }
  if (els.para14aLegacyDirectWritesEnabled) {
    els.para14aLegacyDirectWritesEnabled.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aLegacyDirectWritesEnabled = els.para14aLegacyDirectWritesEnabled.checked === true;
    });
  }

  if (els.para14aActiveId) {
    els.para14aActiveId.dataset.dpInput = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.para14aActiveId. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.para14aActiveId.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aActiveId = String(els.para14aActiveId.value || '').trim();
      scheduleValidation(200);
    });
  }

  if (els.para14aEmsSetpointWId) {
    els.para14aEmsSetpointWId.dataset.dpInput = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.para14aEmsSetpointWId. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.para14aEmsSetpointWId.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aEmsSetpointWId = String(els.para14aEmsSetpointWId.value || '').trim();
      scheduleValidation(200);
    });
  }

  if (els.addPara14aConsumer) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.addPara14aConsumer. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.addPara14aConsumer.addEventListener('click', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aConsumers = Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : [];
      ic.para14aConsumers.push({
        key: '',
        enabled: true,
        name: '',
        type: 'custom',
        controlType: 'limitW',
        maxPowerW: 0,
        installedPowerW: 0,
        priority: 0,
        groupId: '',
        source: 'manual',
        automatic: false,
        setPowerWId: '',
        enableId: ''
      });
      rebuildPara14aConsumersUI();
      scheduleValidation(200);
    });
  }


  // EVCS top-level inputs
  if (els.evcsCount) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.evcsCount. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.evcsCount.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      sc.evcsCount = _clampInt(els.evcsCount.value, 0, _maxEvcsCount(), 0);
      buildEvcsUI();
    });
  }
  if (els.evcsMaxPowerKw) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.evcsMaxPowerKw. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.evcsMaxPowerKw.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      const kw = Number(els.evcsMaxPowerKw.value);
      sc.evcsMaxPowerKw = Number.isFinite(kw) ? kw : (Number.isFinite(Number(sc.evcsMaxPowerKw)) ? Number(sc.evcsMaxPowerKw) : 11);
    });
  }

  if (els.evcsGlobalStorageAssistCustomerAllowed) {
    els.evcsGlobalStorageAssistCustomerAllowed.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      const count = _clampInt(sc.evcsCount, 0, _maxEvcsCount(), 0);
      const activeCount = _ensureEvcsList(count).filter((row) => row && row.enabled !== false).length;
      sc.evcsGlobalStorageAssistCustomerAllowed = activeCount >= 2 && !!els.evcsGlobalStorageAssistCustomerAllowed.checked;
      buildEvcsUI();
    });
  }

  if (els.cmGoalStrategy) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.cmGoalStrategy. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.cmGoalStrategy.addEventListener('change', () => {
      const cm = _ensureChargingManagementConfig();
      const v = String(els.cmGoalStrategy.value || 'standard').trim().toLowerCase();
      cm.goalStrategy = (v === 'smart') ? 'smart' : 'standard';
    });
  }
  if (els.addStationGroup) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.addStationGroup. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.addStationGroup.addEventListener('click', () => {
      const sc = _ensureSettingsConfig();
      sc.stationGroups = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
      sc.stationGroups.push({ stationKey: '', name: '', maxPowerKw: 0 });
      buildStationGroupsUI();
    });
  }

  
  const tariffProviderTestButton = document.getElementById('tariffProviderTest');
  if (tariffProviderTestButton) tariffProviderTestButton.addEventListener('click', () => testTariffProviderConnection());
  const tariffProviderCoupleButton = document.getElementById('tariffProviderCouple');
  if (tariffProviderCoupleButton) tariffProviderCoupleButton.addEventListener('click', () => coupleTariffProviderDatapoints(true));
  const tariffProviderSelect = document.getElementById('tariffProviderId');
  if (tariffProviderSelect) tariffProviderSelect.addEventListener('change', () => {
    const enabled = _tpStr('tariffProviderEnabled', 'false') === 'true';
    if (enabled && tariffProviderSelect.value !== 'manual-dp' && _tpBool('tariffProviderAutoCouple', true)) coupleTariffProviderDatapoints(false);
  });
  const tariffProviderEnabledSelect = document.getElementById('tariffProviderEnabled');
  if (tariffProviderEnabledSelect) tariffProviderEnabledSelect.addEventListener('change', () => {
    if (tariffProviderEnabledSelect.value === 'true' && _tpStr('tariffProviderId', 'manual-dp') !== 'manual-dp' && _tpBool('tariffProviderAutoCouple', true)) coupleTariffProviderDatapoints(false);
  });

  if (els.nwDevicesQuickSetup) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.nwDevicesQuickSetup. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.nwDevicesQuickSetup.addEventListener('click', () => {
      nwDevicesQuickSetup().catch(e => setStatus('Schnell‑Inbetriebnahme fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

if (els.ocppAutoDetect) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.ocppAutoDetect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.ocppAutoDetect.addEventListener('click', () => {
      ocppAutoDetect().catch(e => setStatus('OCPP21: Erkennung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.ocppMapExisting) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.ocppMapExisting. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.ocppMapExisting.addEventListener('click', () => {
      ocppMapExisting().catch(e => setStatus('OCPP21: Zuordnung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.energyFlowTsMode) els.energyFlowTsMode.addEventListener('change', () => renderEnergyFlowTsModeStatus(null));
  if (els.energyFlowTsProductionAllowed) els.energyFlowTsProductionAllowed.addEventListener('change', () => renderEnergyFlowTsModeStatus(null));
  if (els.energyFlowTsWarmupTicks) els.energyFlowTsWarmupTicks.addEventListener('input', () => renderEnergyFlowTsModeStatus(null));
  if (els.energyFlowTsAutoFallback) els.energyFlowTsAutoFallback.addEventListener('change', () => renderEnergyFlowTsModeStatus(null));

  if (els.save) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.save. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.save.addEventListener('click', () => {
      saveConfig().catch(e => setStatus('Speichern fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.reload) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.reload. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.reload.addEventListener('click', () => {
      loadConfig().catch(e => setStatus('Laden fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
  backupRefreshInfo().catch(() => {});

    });
  }

  if (els.validate) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.validate. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.validate.addEventListener('click', () => {
      runValidation(true).catch(e => setStatus('Validierung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }


  // --- Backup / Export / Import (Installer config) ---
  /**
   * Code-Teil: backupRefreshInfo
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function backupRefreshInfo() {
    if (!els.backupInfo) return;
    try {
      const data = await fetchJson('/api/installer/backup/userdata');
      if (!data.exists) {
        els.backupInfo.innerHTML = '<div class="nw-config-empty">Kein Backup in 0_userdata.0 gefunden (wird beim nächsten „Speichern“ automatisch erstellt).</div>';
        return;
      }

      const meta = data.meta || {};
      const createdAt = meta.createdAt ? String(meta.createdAt) : '';
      const ver = meta.adapterVersion ? String(meta.adapterVersion) : '';
      const bytes = meta.bytes ? String(meta.bytes) : '';

      els.backupInfo.innerHTML = `
        <div class="nw-config-card__row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
          <span class="nw-config-badge nw-config-badge--ok">Backup vorhanden</span>
          <span style="opacity:.85;">Erstellt: <b>${createdAt || '—'}</b></span>
          <span style="opacity:.85;">Adapter: <b>${ver || '—'}</b></span>
          <span style="opacity:.85;">Größe: <b>${bytes || '—'} bytes</b></span>
        </div>
      `;
    } catch (e) {
      els.backupInfo.innerHTML = '<div class="nw-config-empty">Backup-Status konnte nicht geladen werden.</div>';
    }
  }
  /**
   * Code-Teil: backupExport
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function backupExport() {
    try {
      setBackupStatus('Export wird erstellt…', '');
      const data = await fetchJson('/api/installer/backup/export');
      const backup = data && data.backup ? data.backup : null;
      if (!backup) throw new Error('no backup payload');

      const ts = new Date();
      const stamp = ts.toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
      const fn = `nexowatt-ui-backup-${stamp}.json`;

      downloadJsonFile(fn, backup);
      setBackupStatus('Export erstellt: ' + fn, 'ok');
      await backupRefreshInfo();
    } catch (e) {
      setBackupStatus('Export fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }
  /**
   * Code-Teil: backupDoImportFromObj
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function backupDoImportFromObj(obj) {
    const payload = { backup: obj, restartEms: true, mode: 'replace' };
    await fetchJson('/api/installer/backup/import', { method: 'POST', body: JSON.stringify(payload) });
    setBackupStatus('Import erfolgreich. Konfiguration wurde übernommen (EMS neu gestartet).', 'ok');
    await loadConfig();
    await backupRefreshInfo();
  }
  /**
   * Code-Teil: backupImportFromFile
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function backupImportFromFile(file) {
    try {
      if (!file) return;
      setBackupStatus('Import wird geprüft…', '');
      const raw = await readFileAsText(file);
      const obj = JSON.parse(raw);
      await backupDoImportFromObj(obj);
    } catch (e) {
      setBackupStatus('Import fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    } finally {
      try { if (els.backupFile) els.backupFile.value = ''; } catch (_e) {}
    }
  }
  /**
   * Code-Teil: backupRestoreFromUserdata
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Installer/App-Center: Konfiguration und DP-Zuordnung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function backupRestoreFromUserdata() {
    try {
      setBackupStatus('Lese Backup aus 0_userdata…', '');
      const data = await fetchJson('/api/installer/backup/userdata');
      if (!data.exists || !data.backup) {
        setBackupStatus('Kein Backup in 0_userdata gefunden.', 'error');
        return;
      }

      const ok = window.confirm('Backup aus 0_userdata wiederherstellen?\n\nAchtung: aktuelle Konfiguration wird überschrieben.');
      if (!ok) {
        setBackupStatus('Abgebrochen.', '');
        return;
      }

      await backupDoImportFromObj(data.backup);
    } catch (e) {
      setBackupStatus('Wiederherstellung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }


  // Backup actions
  if (els.backupExport) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.backupExport. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.backupExport.addEventListener('click', () => {
      backupExport().catch(() => {});
    });
  }

  if (els.backupImport) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.backupImport. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.backupImport.addEventListener('click', () => {
      try { if (els.backupFile) els.backupFile.click(); } catch (_e) {}
    });
  }

  if (els.backupFile) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an els.backupFile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.backupFile.addEventListener('change', () => {
      const f = els.backupFile.files && els.backupFile.files[0];
      backupImportFromFile(f).catch(() => {});
    });
  }

  if (els.backupRestore) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.backupRestore. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.backupRestore.addEventListener('click', () => {
      backupRestoreFromUserdata().catch(() => {});
    });
  }

  if (els.refreshChargingDiag) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.refreshChargingDiag. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.refreshChargingDiag.addEventListener('click', () => {
      refreshChargingDiag().catch(() => {});
    });
  }

  if (els.refreshNvpCoordinator) {
    els.refreshNvpCoordinator.addEventListener('click', () => {
      refreshEmsStatus().catch(() => {});
    });
  }

  if (els.refreshChargingBudget) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.refreshChargingBudget. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.refreshChargingBudget.addEventListener('click', () => {
      // Uses the same diagnostics endpoint
      refreshChargingDiag().catch(() => {});
    });
  }

  if (els.refreshShadowDiagnostics) {
    // Ereignis-Kommentar: Aktualisiert nur die sichtbaren Shadow-Diagnosekarten. Die Werte kommen aus derselben Diagnose-API.
    els.refreshShadowDiagnostics.addEventListener('click', () => {
      refreshChargingDiag().catch(() => {});
    });
  }

  if (els.refreshStationsDiag) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.refreshStationsDiag. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.refreshStationsDiag.addEventListener('click', () => {
      // Uses the same diagnostics endpoint; keeps both sections in sync.
      refreshChargingDiag().catch(() => {});
    });
  }

  // -------------------------------------------------------------------------
  // Toggle-Buttons (Aus/An, Nein/Ja) steuern versteckte Checkbox-Inputs
  // -------------------------------------------------------------------------
  window.nwSyncToggleButtons = function (inputId) {
    try {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      const grp = document.querySelector(`.nw-toggle[data-toggle-for="${CSS.escape(inputId)}"]`);
      if (!grp) return;
      const desired = !!inp.checked;
      const bs = Array.from(grp.querySelectorAll('button[data-value]'));
      bs.forEach(b => {
        const v = String(b.getAttribute('data-value') || '').trim().toLowerCase();
        const isTrue = (v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja');
        b.classList.toggle('active', desired ? isTrue : !isTrue);
        b.disabled = !!inp.disabled;
      });
    } catch (_e) {}
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e) => {
    const btn = e && e.target && e.target.closest ? e.target.closest('.nw-toggle button[data-value]') : null;
    if (!btn) return;
    const grp = btn.closest('.nw-toggle');
    const targetId = grp ? grp.getAttribute('data-toggle-for') : null;
    if (!targetId) return;

    const inp = document.getElementById(targetId);
    if (!inp || inp.disabled) return;

    const raw = String(btn.getAttribute('data-value') || '').trim().toLowerCase();
    const desired = (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'ja');

    if (!!inp.checked !== desired) {
      inp.checked = desired;
      try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
    }

    try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(targetId); } catch (_e) {}
  }, true);


  try {
    if (window.NexoWattEnergyOriginAppCenter) {
      window.NexoWattEnergyOriginAppCenter.setup({ getEdition: _licenseEdition, setStatus });
    }
  } catch (_eLedgerSetup) {}

  try {
    if (window.NexoWattNetOperatorAppCenter) {
      window.NexoWattNetOperatorAppCenter.setup({ getEdition: _licenseEdition, setStatus });
    }
  } catch (_eNetOperatorSetup) {}

  try {
    if (window.NexoWattOperatingStrategiesAppCenter) {
      window.NexoWattOperatingStrategiesAppCenter.setup({ getEdition: _licenseEdition, setStatus });
    }
  } catch (_eOperatingStrategiesSetup) {}

  // Modal
  if (els.dpClose) els.dpClose.addEventListener('click', closeDpModal);
  if (els.dpModal) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an els.dpModal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.dpModal.addEventListener('click', (e) => {
      if (e.target === els.dpModal) closeDpModal();
    });
  }
  if (els.dpSearchBtn) els.dpSearchBtn.addEventListener('click', () => doSearch().catch(() => {}));
  if (els.dpSearch) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an els.dpSearch. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    els.dpSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch().catch(() => {});
    });
  }
  if (els.dpRootBtn) els.dpRootBtn.addEventListener('click', () => { treePrefix = ''; refreshTree().catch(() => {}); });
  if (els.dpUpBtn) els.dpUpBtn.addEventListener('click', () => { upOne(); refreshTree().catch(() => {}); });

  /**
   * App-Center hart gegen unberechtigte Einsicht schützen.
   * Hintergrund: Das App-Center enthält technische Zuordnung, Netzlimits und
   * Modulkonfiguration. Es darf nicht ausreichen, nachträglich einzelne Buttons
   * zu sperren. Ohne Admin-/Installer-Rolle wird kein Config-Load gestartet und
   * der Seiteninhalt bleibt durch auth.ts ersetzt/gesperrt.
   */
  async function requireAppCenterAccessBeforeLoad() {
    try {
      if (window.NW_AUTH && typeof window.NW_AUTH.requireCapability === 'function') {
        return await window.NW_AUTH.requireCapability('appcenter.open', {
          pageName: 'App-Center',
          requiredRole: 'Admin oder Installer',
        });
      }
      const r = await fetch('/api/session/me?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
      const j = r && r.ok ? await r.json() : null;
      const caps = j && Array.isArray(j.capabilities) ? j.capabilities : [];
      return !!(j && j.authed && (caps.includes('*') || caps.includes('appcenter.open')));
    } catch (_e) {
      return false;
    }
  }

  function updateAdminOnlyActions() {
    const access = window.NW_AUTH && window.NW_AUTH.getState ? window.NW_AUTH.getState() : null;
    const allowed = !!(access && access.authed && access.role === 'admin');
    const mailLink = document.getElementById('nwMailAdminLink');
    if (mailLink) {
      mailLink.hidden = !allowed;
      mailLink.style.display = allowed ? '' : 'none';
    }
  }
  window.addEventListener('nw-auth-login', updateAdminOnlyActions);
  window.addEventListener('nw-auth-logout', updateAdminOnlyActions);

  // Initial load: erst nach Rollenprüfung. Dadurch kann „Abbrechen“ im Login
  // nicht mehr die App-Center-Werte im Hintergrund sichtbar machen.
  setupInstallerBackButton();
  requireAppCenterAccessBeforeLoad().then((allowed) => {
    updateAdminOnlyActions();
    if (!allowed) {
      try { setStatus('App-Center gesperrt: Anmeldung als Admin oder Installer erforderlich.', 'error'); } catch (_e) {}
      return;
    }
    loadConfig().catch(e => setStatus('Laden fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    backupRefreshInfo().catch(() => {});

    // 0.8.7: Wenn die Lizenz in einem anderen Admin-Tab aktiviert wird, soll das bereits offene
    // App-Center automatisch von "Keine Lizenz" auf EOS/Home umschalten und die Apps wieder anzeigen.
    window.addEventListener('focus', () => { refreshLicenseForAppCenter('focus').catch(() => {}); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshLicenseForAppCenter('visible').catch(() => {});
    });
    // Auch eine aktive Lizenz wird erneuert: Downgrade und Widerruf dürfen
    // nicht erst beim nächsten Fokuswechsel sichtbar werden.
    window.setInterval(() => { refreshLicenseForAppCenter('poll').catch(() => {}); }, 5000);
  }).catch(() => {
    try { setStatus('App-Center gesperrt: Anmeldung als Admin oder Installer erforderlich.', 'error'); } catch (_e) {}
  });

})();
