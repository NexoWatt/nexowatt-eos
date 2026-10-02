// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bindet die Einrichtung der Energieherkunfts-Bilanz an den App-Center-Bereich an.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/energy-origin-appcenter.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/energy-origin-appcenter.js
 *
 * Gekapselte AppCenter-UI für „Energieherkunft & Ladebilanz“.
 * Das Modul sammelt ausschließlich Konfiguration und DP-Zuordnungen. Es führt
 * keine Bilanzrechnung und keine Hardwaresteuerung im Browser aus.
 */
(function () {
  'use strict';

  const ids: Record<string, string> = {
    enabled: 'ledgerOriginEnabled', siteId: 'ledgerSiteId', siteName: 'ledgerSiteName', country: 'ledgerCountry', allocationMethod: 'ledgerAllocationMethod', evidenceMode: 'ledgerEvidenceMode', staleSeconds: 'ledgerStaleSeconds',
    gridImportDp: 'ledgerGridImportDp', gridImportUnit: 'ledgerGridImportUnit', gridExportDp: 'ledgerGridExportDp', gridExportUnit: 'ledgerGridExportUnit', pvDp: 'ledgerPvDp', pvUnit: 'ledgerPvUnit', otherRenewableDp: 'ledgerOtherRenewableDp', otherRenewableUnit: 'ledgerOtherRenewableUnit', buildingDp: 'ledgerBuildingDp', buildingUnit: 'ledgerBuildingUnit', storageChargeDp: 'ledgerStorageChargeDp', storageChargeUnit: 'ledgerStorageChargeUnit', storageDischargeDp: 'ledgerStorageDischargeDp', storageDischargeUnit: 'ledgerStorageDischargeUnit',
    storageChargeEfficiency: 'ledgerStorageChargeEfficiency', storageDischargeEfficiency: 'ledgerStorageDischargeEfficiency', storageInitialKwh: 'ledgerStorageInitialKwh', storageInitialPvPct: 'ledgerStorageInitialPvPct', storageExclusiveRenewable: 'ledgerStorageExclusiveRenewable',
    chargePoints: 'ledgerChargePoints', addChargePoint: 'ledgerAddChargePoint',
    sameGridConnection: 'ledgerSameGridConnection', meteringCompliance: 'ledgerMeteringCompliance', publicCharging: 'ledgerPublicCharging', sameWoz: 'ledgerSameWoz', directLine: 'ledgerDirectLine', noSubsidy: 'ledgerNoSubsidy', integratedMid: 'ledgerIntegratedMid', operatorType: 'ledgerOperatorType', nlGridRenewableShare: 'ledgerNlGridRenewableShare',
  };
  const el = (key: string): HTMLElement | null => document.getElementById(ids[key] || key);
  const htmlEscape = (value: any) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const safeId = (value: any, fallback: any = 'lp') => String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || fallback;
  const maxChargePoints = (edition: any) => String(edition || '').toLowerCase() === 'hems' || String(edition || '').toLowerCase() === 'home' ? 3 : 500;
  const setValue = (key: string, value: any): void => { const node = el(key) as HTMLInputElement | HTMLSelectElement | null; if (node) node.value = value === undefined || value === null ? '' : String(value); };
  const setChecked = (key: string, value: any): void => { const node = el(key) as HTMLInputElement | null; if (node) node.checked = value === true; };
  const readValue = (key: string, fallback: any = ''): string => { const node = el(key) as HTMLInputElement | HTMLSelectElement | null; return node ? String(node.value || '').trim() : String(fallback || ''); };
  const readNumber = (key: any, fallback: any, min: any, max: any) => {
    const n = Number(readValue(key));
    const value = Number.isFinite(n) ? n : Number(fallback);
    return Math.max(min, Math.min(max, value));
  };
  const checked = (key: string): boolean => { const node = el(key) as HTMLInputElement | null; return node ? node.checked : false; };

  function buildChargePoints(rows: any, edition: any) {
    const container = el('chargePoints');
    if (!container) return;
    const list = Array.isArray(rows) ? rows.slice(0, maxChargePoints(edition)) : [];
    container.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Noch kein Ladepunktzähler zugeordnet. Für eine ladepunktbezogene Bilanz mindestens einen kumulierten Energiezähler hinzufügen.';
      container.appendChild(empty);
    }
    list.forEach((cp: any, index: any) => {
      const id = safeId(cp && (cp.id || cp.key || cp.lp), `lp${index + 1}`);
      const row = document.createElement('div');
      row.className = 'nw-config-card nw-config-card--subtle';
      row.setAttribute('data-ledger-cp-row', '1');
      row.innerHTML = `
        <div class="nw-config-card__header">
          <div><div class="nw-config-card__title">Ladepunkt ${index + 1}</div><div class="nw-config-card__subtitle">Kumulierte, dem Connector eindeutig zugeordnete Ladeenergie.</div></div>
          <button type="button" class="nw-btn nw-btn--small" data-ledger-remove-cp="1">Entfernen</button>
        </div>
        <div class="nw-config-grid">
          <label class="nw-field"><span>ID</span><input data-ledger-cp-field="id" type="text" value="${htmlEscape(id)}" /></label>
          <label class="nw-field"><span>Bezeichnung</span><input data-ledger-cp-field="label" type="text" value="${htmlEscape(cp && cp.label || id)}" /></label>
          <label class="nw-field"><span>Station-ID</span><input data-ledger-cp-field="stationId" type="text" value="${htmlEscape(cp && (cp.stationId || cp.stationKey) || 'station_1')}" /></label>
          <label class="nw-field"><span>Connector</span><input data-ledger-cp-field="connectorNo" type="number" min="1" step="1" value="${Math.max(1, Number(cp && cp.connectorNo || index + 1))}" /></label>
          <label class="nw-field"><span>Ladeenergie-Zähler</span><input id="ledgerCpEnergy_${index}" data-ledger-cp-field="energyMeterKwhId" class="nw-config-dp-input" data-dp-input="1" type="text" value="${htmlEscape(cp && cp.energyMeterKwhId || '')}" /><button class="nw-btn nw-btn--small" type="button" data-browse="ledgerCpEnergy_${index}">DP wählen</button></label>
          <label class="nw-field"><span>Einheit</span><select data-ledger-cp-field="unit"><option value="Wh"${cp && cp.unit === 'Wh' ? ' selected' : ''}>Wh</option><option value="kWh"${!cp || !cp.unit || cp.unit === 'kWh' ? ' selected' : ''}>kWh</option><option value="MWh"${cp && cp.unit === 'MWh' ? ' selected' : ''}>MWh</option></select></label>
          <label class="nw-field"><span>Zähler-Seriennummer</span><input data-ledger-cp-field="meterSerial" type="text" value="${htmlEscape(cp && cp.meterSerial || '')}" /></label>
          <label class="nw-field"><span>Zählerklasse</span><select data-ledger-cp-field="meterClass"><option value="none">nicht erklärt</option><option value="eichrecht"${cp && cp.meterClass === 'eichrecht' ? ' selected' : ''}>Eichrecht / MessEG</option><option value="mid"${cp && cp.meterClass === 'mid' ? ' selected' : ''}>MID</option><option value="ocmf"${cp && cp.meterClass === 'ocmf' ? ' selected' : ''}>OCMF-signiert</option></select></label>
          <label class="nw-field nw-field--switch"><span>Messkonformität erklärt</span><input data-ledger-cp-field="meteringComplianceDeclared" type="checkbox"${cp && cp.meteringComplianceDeclared ? ' checked' : ''} /></label>
          <label class="nw-field nw-field--switch"><span>Integrierter Zähler</span><input data-ledger-cp-field="meterIntegrated" type="checkbox"${cp && cp.meterIntegrated ? ' checked' : ''} /></label>
          <label class="nw-field nw-field--switch"><span>Öffentlich zugänglich</span><input data-ledger-cp-field="publiclyAccessible" type="checkbox"${cp && cp.publiclyAccessible ? ' checked' : ''} /></label>
          <label class="nw-field"><span>Public Key / Messschlüssel</span><input data-ledger-cp-field="publicKey" type="text" value="${htmlEscape(cp && cp.publicKey || '')}" /></label>
        </div>`;
      const remove = row.querySelector('[data-ledger-remove-cp]');
      if (remove) remove.addEventListener('click', () => row.remove());
      container.appendChild(row);
    });
  }

  function collectChargePoints(edition: any): any[] {
    const rows = Array.from(document.querySelectorAll('[data-ledger-cp-row]'));
    return rows.slice(0, maxChargePoints(edition)).map((row: any, index: any) => {
      const get = (name: any) => row.querySelector(`[data-ledger-cp-field="${name}"]`);
      const value = (name: any) => { const node = get(name); return node ? String(node.value || '').trim() : ''; };
      const isChecked = (name: any) => { const node = get(name); return !!(node && node.checked); };
      return {
        id: safeId(value('id'), `lp${index + 1}`),
        label: value('label') || `Ladepunkt ${index + 1}`,
        stationId: safeId(value('stationId'), 'station_1'),
        connectorNo: Math.max(1, Math.round(Number(value('connectorNo')) || index + 1)),
        enabled: true,
        energyMeterKwhId: value('energyMeterKwhId'),
        unit: ['Wh', 'kWh', 'MWh'].includes(value('unit')) ? value('unit') : 'kWh',
        meterSerial: value('meterSerial'),
        meterClass: value('meterClass') || 'none',
        meteringComplianceDeclared: isChecked('meteringComplianceDeclared'),
        meterIntegrated: isChecked('meterIntegrated'),
        publiclyAccessible: isChecked('publiclyAccessible'),
        publicKey: value('publicKey'),
      };
    }).filter((row: any) => row.energyMeterKwhId || row.label || row.id);
  }

  function apply(config: any, edition: any) {
    const ledger = config && config.energyLedger && typeof config.energyLedger === 'object' ? config.energyLedger : {};
    const origin = ledger.origin && typeof ledger.origin === 'object' ? ledger.origin : {};
    const dp = origin.dataPoints && typeof origin.dataPoints === 'object' ? origin.dataPoints : {};
    const units = origin.units && typeof origin.units === 'object' ? origin.units : {};
    const storage = origin.storage && typeof origin.storage === 'object' ? origin.storage : {};
    const evidence = origin.evidence && typeof origin.evidence === 'object' ? origin.evidence : {};
    setChecked('enabled', origin.enabled === true);
    setValue('siteId', origin.siteId || 'site_1'); setValue('siteName', origin.siteName || 'Standort 1'); setValue('country', origin.country || 'AUTO');
    setValue('allocationMethod', origin.allocationMethod || 'proportional'); setValue('evidenceMode', origin.evidenceMode || 'operational'); setValue('staleSeconds', Number(origin.staleSeconds) || 300);
    setValue('gridImportDp', dp.gridImportEnergyKwh || ''); setValue('gridImportUnit', units.gridImportEnergyKwh || 'kWh');
    setValue('gridExportDp', dp.gridExportEnergyKwh || ''); setValue('gridExportUnit', units.gridExportEnergyKwh || 'kWh');
    setValue('pvDp', dp.pvGenerationEnergyKwh || ''); setValue('pvUnit', units.pvGenerationEnergyKwh || 'kWh');
    setValue('otherRenewableDp', dp.otherRenewableEnergyKwh || ''); setValue('otherRenewableUnit', units.otherRenewableEnergyKwh || 'kWh');
    setValue('buildingDp', dp.buildingEnergyKwh || ''); setValue('buildingUnit', units.buildingEnergyKwh || 'kWh');
    setValue('storageChargeDp', dp.storageChargeEnergyKwh || ''); setValue('storageChargeUnit', units.storageChargeEnergyKwh || 'kWh');
    setValue('storageDischargeDp', dp.storageDischargeEnergyKwh || ''); setValue('storageDischargeUnit', units.storageDischargeEnergyKwh || 'kWh');
    setValue('storageChargeEfficiency', storage.chargeEfficiencyPct ?? 95); setValue('storageDischargeEfficiency', storage.dischargeEfficiencyPct ?? 95);
    setValue('storageInitialKwh', storage.initialInventoryKwh ?? 0); setValue('storageInitialPvPct', storage.initialPvSharePct ?? 0); setChecked('storageExclusiveRenewable', storage.exclusiveRenewableChargingDeclared === true);
    setChecked('sameGridConnection', evidence.sameGridConnectionDeclared === true); setChecked('meteringCompliance', evidence.meteringComplianceDeclared === true); setChecked('publicCharging', evidence.publicChargingDeclared === true);
    setChecked('sameWoz', evidence.sameWozObjectDeclared === true); setChecked('directLine', evidence.directLineDeclared === true); setChecked('noSubsidy', evidence.noOperatingSubsidyDeclared === true); setChecked('integratedMid', evidence.integratedMidMeterDeclared === true);
    setValue('operatorType', evidence.operatorType || 'business'); setValue('nlGridRenewableShare', evidence.nlGridRenewableSharePct ?? 50.5);
    buildChargePoints(Array.isArray(origin.chargePoints) ? origin.chargePoints : [], edition);
  }

  function collect(existingOrigin: any, appEnabled: any, edition: any) {
    const existing = existingOrigin && typeof existingOrigin === 'object' ? existingOrigin : {};
    const country = readValue('country', 'AUTO').toUpperCase();
    const allocation = readValue('allocationMethod', 'proportional');
    const evidenceMode = readValue('evidenceMode', 'operational');
    return {
      ...existing,
      enabled: !!(appEnabled && checked('enabled')),
      siteId: safeId(readValue('siteId', 'site_1'), 'site_1'),
      siteName: readValue('siteName', 'Standort 1') || 'Standort 1',
      country: ['AUTO', 'DE', 'NL'].includes(country) ? country : 'AUTO',
      intervalMinutes: 15,
      staleSeconds: Math.round(readNumber('staleSeconds', 300, 30, 86400)),
      recentIntervalLimit: Number.isFinite(Number(existing.recentIntervalLimit)) ? Number(existing.recentIntervalLimit) : 672,
      allocationMethod: ['proportional', 'direct-load-first', 'conservative-evcs-last'].includes(allocation) ? allocation : 'proportional',
      evidenceMode: ['operational', 'formal'].includes(evidenceMode) ? evidenceMode : 'operational',
      dataPoints: {
        gridImportEnergyKwh: readValue('gridImportDp'), gridExportEnergyKwh: readValue('gridExportDp'), pvGenerationEnergyKwh: readValue('pvDp'), otherRenewableEnergyKwh: readValue('otherRenewableDp'), buildingEnergyKwh: readValue('buildingDp'), storageChargeEnergyKwh: readValue('storageChargeDp'), storageDischargeEnergyKwh: readValue('storageDischargeDp'),
      },
      units: {
        gridImportEnergyKwh: readValue('gridImportUnit', 'kWh') || 'kWh', gridExportEnergyKwh: readValue('gridExportUnit', 'kWh') || 'kWh', pvGenerationEnergyKwh: readValue('pvUnit', 'kWh') || 'kWh', otherRenewableEnergyKwh: readValue('otherRenewableUnit', 'kWh') || 'kWh', buildingEnergyKwh: readValue('buildingUnit', 'kWh') || 'kWh', storageChargeEnergyKwh: readValue('storageChargeUnit', 'kWh') || 'kWh', storageDischargeEnergyKwh: readValue('storageDischargeUnit', 'kWh') || 'kWh',
      },
      storage: {
        enabled: true,
        chargeEfficiencyPct: readNumber('storageChargeEfficiency', 95, 50, 100), dischargeEfficiencyPct: readNumber('storageDischargeEfficiency', 95, 50, 100), exclusiveRenewableChargingDeclared: checked('storageExclusiveRenewable'), initialInventoryKwh: readNumber('storageInitialKwh', 0, 0, 1000000000), initialPvSharePct: readNumber('storageInitialPvPct', 0, 0, 100), inventoryMethod: 'pro-rata',
      },
      evidence: {
        sameGridConnectionDeclared: checked('sameGridConnection'), meteringComplianceDeclared: checked('meteringCompliance'), publicChargingDeclared: checked('publicCharging'), sameWozObjectDeclared: checked('sameWoz'), directLineDeclared: checked('directLine'), noOperatingSubsidyDeclared: checked('noSubsidy'), integratedMidMeterDeclared: checked('integratedMid'), operatorType: readValue('operatorType', 'business') === 'private' ? 'private' : 'business', nlGridRenewableSharePct: readNumber('nlGridRenewableShare', 50.5, 0, 100),
      },
      chargePoints: collectChargePoints(edition),
      meters: Array.isArray(existing.meters) ? existing.meters : [],
    };
  }

  function setup(options: any) {
    const getEdition = options && typeof options.getEdition === 'function' ? options.getEdition : () => 'none';
    const setStatus = options && typeof options.setStatus === 'function' ? options.setStatus : () => {};
    const add = el('addChargePoint');
    if (add && !add.dataset.ledgerBound) {
      add.dataset.ledgerBound = '1';
      add.addEventListener('click', () => {
        const edition = getEdition();
        const existing: any[] = collectChargePoints(edition);
        const max = maxChargePoints(edition);
        if (existing.length >= max) { setStatus(`Lizenzgrenze erreicht: ${max} Ladepunkte.`, 'warn'); return; }
        existing.push({ id: `lp${existing.length + 1}`, label: `Ladepunkt ${existing.length + 1}`, stationId: 'station_1', connectorNo: existing.length + 1, unit: 'kWh' });
        buildChargePoints(existing, edition);
      });
    }
  }

  (window as any).NexoWattEnergyOriginAppCenter = { setup, apply, collect, collectChargePoints, buildChargePoints, maxChargePoints };
})();
