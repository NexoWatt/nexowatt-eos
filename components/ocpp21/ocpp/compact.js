'use strict';

const crypto = require('node:crypto');

/**
 * Canonical EOS-facing datapoints.
 *
 * OCPP describes energy flowing into the EV as "Import". In NexoWatt EOS the
 * operational datapoint is deliberately called powerW/currentA so installers
 * do not have to translate the protocol direction mentally.
 */
const MEASUREMENT_DEFINITIONS = Object.freeze({
  'Power.Active.Import': { key: 'powerW', name: { en: 'Charging power', de: 'Aktuelle Ladeleistung' }, role: 'value.power', unit: 'W' },
  'Power.Active.Export': { key: 'powerExportW', name: { en: 'Vehicle export power', de: 'Rückspeiseleistung des Fahrzeugs' }, role: 'value.power', unit: 'W' },
  'Power.Active.Net': { key: 'netPowerW', name: { en: 'Net active power', de: 'Aktive Nettoleistung' }, role: 'value.power', unit: 'W' },
  'Power.Active.Residual': { key: 'residualPowerW', name: { en: 'Residual active power', de: 'Verbleibende Wirkleistung' }, role: 'value.power', unit: 'W' },
  'Power.Active.Setpoint': { key: 'powerSetpointW', name: { en: 'Active power setpoint', de: 'Wirkleistungs-Sollwert' }, role: 'value.power', unit: 'W' },
  'Power.Import.Minimum': { key: 'minimumImportPowerW', name: { en: 'Minimum import power', de: 'Minimale Ladeleistung' }, role: 'value.power', unit: 'W' },
  'Power.Import.Offered': { key: 'offeredImportPowerW', name: { en: 'Offered import power', de: 'Angebotene Ladeleistung' }, role: 'value.power', unit: 'W' },
  'Power.Export.Minimum': { key: 'minimumExportPowerW', name: { en: 'Minimum export power', de: 'Minimale Rückspeiseleistung' }, role: 'value.power', unit: 'W' },
  'Power.Export.Offered': { key: 'offeredExportPowerW', name: { en: 'Offered export power', de: 'Angebotene Rückspeiseleistung' }, role: 'value.power', unit: 'W' },
  'Power.Offered': { key: 'offeredPowerW', name: { en: 'Offered charging power', de: 'Angebotene Ladeleistung' }, role: 'value.power', unit: 'W' },
  'Power.Apparent.Import': { key: 'apparentPowerVA', name: { en: 'Apparent charging power', de: 'Scheinleistung beim Laden' }, role: 'value.power', unit: 'VA' },
  'Power.Apparent.Export': { key: 'apparentPowerExportVA', name: { en: 'Apparent export power', de: 'Scheinleistung bei Rückspeisung' }, role: 'value.power', unit: 'VA' },
  'Power.Apparent.Net': { key: 'apparentPowerNetVA', name: { en: 'Net apparent power', de: 'Scheinleistung netto' }, role: 'value.power', unit: 'VA' },
  'Power.Reactive.Import': { key: 'reactivePowerVar', name: { en: 'Reactive charging power', de: 'Blindleistung beim Laden' }, role: 'value.power', unit: 'var' },
  'Power.Reactive.Export': { key: 'reactivePowerExportVar', name: { en: 'Reactive export power', de: 'Blindleistung bei Rückspeisung' }, role: 'value.power', unit: 'var' },
  'Power.Reactive.Net': { key: 'reactivePowerNetVar', name: { en: 'Net reactive power', de: 'Blindleistung netto' }, role: 'value.power', unit: 'var' },
  'Power.Factor': { key: 'powerFactor', name: { en: 'Power factor', de: 'Leistungsfaktor' }, role: 'value', unit: '' },

  'Current.Import': { key: 'currentA', name: { en: 'Charging current', de: 'Aktueller Ladestrom' }, role: 'value.current', unit: 'A' },
  'Current.Export': { key: 'currentExportA', name: { en: 'Vehicle export current', de: 'Rückspeisestrom des Fahrzeugs' }, role: 'value.current', unit: 'A' },
  'Current.Offered': { key: 'offeredCurrentA', name: { en: 'Offered charging current', de: 'Angebotener Ladestrom' }, role: 'value.current', unit: 'A' },
  'Current.Import.Minimum': { key: 'minimumImportCurrentA', name: { en: 'Minimum import current', de: 'Minimaler Ladestrom' }, role: 'value.current', unit: 'A' },
  'Current.Import.Offered': { key: 'offeredImportCurrentA', name: { en: 'Offered import current', de: 'Angebotener Ladestrom' }, role: 'value.current', unit: 'A' },
  'Current.Export.Minimum': { key: 'minimumExportCurrentA', name: { en: 'Minimum export current', de: 'Minimaler Rückspeisestrom' }, role: 'value.current', unit: 'A' },
  'Current.Export.Offered': { key: 'offeredExportCurrentA', name: { en: 'Offered export current', de: 'Angebotener Rückspeisestrom' }, role: 'value.current', unit: 'A' },

  'Energy.Active.Import.Register': { key: 'energyWh', kwhKey: 'energyKWh', name: { en: 'Charged energy total', de: 'Geladene Energie gesamt' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Export.Register': { key: 'energyExportWh', kwhKey: 'energyExportKWh', name: { en: 'Exported energy total', de: 'Rückgespeiste Energie gesamt' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Import.Interval': { key: 'energyIntervalWh', kwhKey: 'energyIntervalKWh', name: { en: 'Charged energy interval', de: 'Geladene Energie im Intervall' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Export.Interval': { key: 'energyExportIntervalWh', kwhKey: 'energyExportIntervalKWh', name: { en: 'Exported energy interval', de: 'Rückgespeiste Energie im Intervall' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Net': { key: 'netEnergyWh', kwhKey: 'netEnergyKWh', name: { en: 'Net active energy', de: 'Aktive Nettoenergie' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Import.CableLoss': { key: 'cableLossEnergyWh', kwhKey: 'cableLossEnergyKWh', name: { en: 'Cable-loss energy', de: 'Kabelverlustenergie' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Import.LocalGeneration.Register': { key: 'localGenerationEnergyWh', kwhKey: 'localGenerationEnergyKWh', name: { en: 'Local generation energy', de: 'Lokal erzeugte Energie' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Active.Setpoint.Interval': { key: 'energySetpointWh', kwhKey: 'energySetpointKWh', name: { en: 'Energy setpoint interval', de: 'Energie-Sollwert im Intervall' }, role: 'value.energy', unit: 'Wh' },
  'Energy.Apparent.Import': { key: 'apparentEnergyVAh', name: { en: 'Apparent energy import', de: 'Bezogene Scheinenergie' }, role: 'value.energy', unit: 'VAh' },
  'Energy.Apparent.Export': { key: 'apparentEnergyExportVAh', name: { en: 'Apparent energy export', de: 'Abgegebene Scheinenergie' }, role: 'value.energy', unit: 'VAh' },
  'Energy.Apparent.Net': { key: 'apparentEnergyNetVAh', name: { en: 'Net apparent energy', de: 'Scheinenergie netto' }, role: 'value.energy', unit: 'VAh' },
  'Energy.Reactive.Import.Register': { key: 'reactiveEnergyVarh', name: { en: 'Reactive energy import total', de: 'Bezogene Blindenergie gesamt' }, role: 'value.energy', unit: 'varh' },
  'Energy.Reactive.Export.Register': { key: 'reactiveEnergyExportVarh', name: { en: 'Reactive energy export total', de: 'Abgegebene Blindenergie gesamt' }, role: 'value.energy', unit: 'varh' },
  'Energy.Reactive.Import.Interval': { key: 'reactiveEnergyIntervalVarh', name: { en: 'Reactive energy import interval', de: 'Bezogene Blindenergie im Intervall' }, role: 'value.energy', unit: 'varh' },
  'Energy.Reactive.Export.Interval': { key: 'reactiveEnergyExportIntervalVarh', name: { en: 'Reactive energy export interval', de: 'Abgegebene Blindenergie im Intervall' }, role: 'value.energy', unit: 'varh' },
  'Energy.Reactive.Net': { key: 'reactiveEnergyNetVarh', name: { en: 'Net reactive energy', de: 'Blindenergie netto' }, role: 'value.energy', unit: 'varh' },

  'EnergyRequest.Bulk': { key: 'bulkEnergyRequestWh', kwhKey: 'bulkEnergyRequestKWh', name: { en: 'Bulk energy request', de: 'Energiebedarf bis Bulk-SoC' }, role: 'value.energy', unit: 'Wh' },
  'EnergyRequest.Maximum': { key: 'maximumEnergyRequestWh', kwhKey: 'maximumEnergyRequestKWh', name: { en: 'Maximum energy request', de: 'Maximaler Energiebedarf' }, role: 'value.energy', unit: 'Wh' },
  'EnergyRequest.Maximum.V2X': { key: 'maximumV2xEnergyRequestWh', kwhKey: 'maximumV2xEnergyRequestKWh', name: { en: 'Maximum V2X energy request', de: 'Maximaler V2X-Energiebedarf' }, role: 'value.energy', unit: 'Wh' },
  'EnergyRequest.Minimum': { key: 'minimumEnergyRequestWh', kwhKey: 'minimumEnergyRequestKWh', name: { en: 'Minimum energy request', de: 'Minimaler Energiebedarf' }, role: 'value.energy', unit: 'Wh' },
  'EnergyRequest.Minimum.V2X': { key: 'minimumV2xEnergyRequestWh', kwhKey: 'minimumV2xEnergyRequestKWh', name: { en: 'Minimum V2X energy request', de: 'Minimaler V2X-Energiebedarf' }, role: 'value.energy', unit: 'Wh' },
  'EnergyRequest.Target': { key: 'targetEnergyRequestWh', kwhKey: 'targetEnergyRequestKWh', name: { en: 'Target energy request', de: 'Ziel-Energiebedarf' }, role: 'value.energy', unit: 'Wh' },

  Voltage: { key: 'voltageV', name: { en: 'Voltage', de: 'Spannung' }, role: 'value.voltage', unit: 'V' },
  'Voltage.Maximum': { key: 'maximumVoltageV', name: { en: 'Maximum voltage', de: 'Maximale Spannung' }, role: 'value.voltage', unit: 'V' },
  'Voltage.Minimum': { key: 'minimumVoltageV', name: { en: 'Minimum voltage', de: 'Minimale Spannung' }, role: 'value.voltage', unit: 'V' },
  Frequency: { key: 'frequencyHz', name: { en: 'Grid frequency', de: 'Netzfrequenz' }, role: 'value.frequency', unit: 'Hz' },
  Temperature: { key: 'temperatureC', name: { en: 'Temperature', de: 'Temperatur' }, role: 'value.temperature', unit: '°C' },
  RPM: { key: 'fanRpm', name: { en: 'Rotational speed', de: 'Drehzahl' }, role: 'value', unit: 'rpm' },
  SoC: { key: 'socPercent', name: { en: 'Vehicle state of charge', de: 'Fahrzeug-Ladezustand' }, role: 'value.battery', unit: '%' },

  'Display.BatteryEnergyCapacity': { key: 'displayBatteryCapacityWh', kwhKey: 'displayBatteryCapacityKWh', name: { en: 'Displayed battery capacity', de: 'Angezeigte Batteriekapazität' }, role: 'value.energy', unit: 'Wh' },
  'Display.ChargingComplete': { key: 'chargingComplete', name: { en: 'Charging complete', de: 'Ladung abgeschlossen' }, role: 'indicator', unit: '' },
  'Display.InletHot': { key: 'inletHot', name: { en: 'Charging inlet hot', de: 'Ladeanschluss heiß' }, role: 'indicator.alarm', unit: '' },
  'Display.PresentSOC': { key: 'displaySocPercent', name: { en: 'Displayed state of charge', de: 'Angezeigter Ladezustand' }, role: 'value.battery', unit: '%' },
  'Display.TargetSOC': { key: 'displayTargetSocPercent', name: { en: 'Displayed target state of charge', de: 'Angezeigter Ziel-Ladezustand' }, role: 'value.battery', unit: '%' },
  'Display.MaximumSOC': { key: 'displayMaximumSocPercent', name: { en: 'Displayed maximum state of charge', de: 'Angezeigter maximaler Ladezustand' }, role: 'value.battery', unit: '%' },
  'Display.MinimumSOC': { key: 'displayMinimumSocPercent', name: { en: 'Displayed minimum state of charge', de: 'Angezeigter minimaler Ladezustand' }, role: 'value.battery', unit: '%' },
  'Display.RemainingTimeToMaximumSOC': { key: 'remainingTimeToMaximumSocSec', name: { en: 'Time to maximum state of charge', de: 'Restzeit bis maximaler Ladezustand' }, role: 'value.interval', unit: 's' },
  'Display.RemainingTimeToMinimumSOC': { key: 'remainingTimeToMinimumSocSec', name: { en: 'Time to minimum state of charge', de: 'Restzeit bis minimaler Ladezustand' }, role: 'value.interval', unit: 's' },
  'Display.RemainingTimeToTargetSOC': { key: 'remainingTimeToTargetSocSec', name: { en: 'Time to target state of charge', de: 'Restzeit bis Ziel-Ladezustand' }, role: 'value.interval', unit: 's' },
});

const MEASURAND_ALIASES = Object.freeze({
  activepowerimport: 'Power.Active.Import',
  activepowerinport: 'Power.Active.Import',
  importactivepower: 'Power.Active.Import',
  powerimportactive: 'Power.Active.Import',
  activepowerexport: 'Power.Active.Export',
  exportactivepower: 'Power.Active.Export',
  currentimport: 'Current.Import',
  importcurrent: 'Current.Import',
  currentexport: 'Current.Export',
  exportcurrent: 'Current.Export',
  activeenergyimportregister: 'Energy.Active.Import.Register',
  energyactiveimporttotal: 'Energy.Active.Import.Register',
  activeenergyexportregister: 'Energy.Active.Export.Register',
  energyactiveexporttotal: 'Energy.Active.Export.Register',
  stateofcharge: 'SoC',
  batterysoc: 'SoC',
});

const LEGACY_AGGREGATE_TO_COMPACT = Object.freeze({
  Power_Active_Import: 'powerW',
  Power_Active_Export: 'powerExportW',
  Power_Active_Net: 'netPowerW',
  Power_Apparent_Import: 'apparentPowerVA',
  Power_Apparent_Export: 'apparentPowerExportVA',
  Power_Apparent_Net: 'apparentPowerNetVA',
  Power_Reactive_Import: 'reactivePowerVar',
  Power_Reactive_Export: 'reactivePowerExportVar',
  Power_Reactive_Net: 'reactivePowerNetVar',
  Power_Factor: 'powerFactor',
  Power_Offered: 'offeredPowerW',
  Current_Import: 'currentA',
  Current_Export: 'currentExportA',
  Current_Offered: 'offeredCurrentA',
  Energy_Active_Import_Register: 'energyWh',
  Energy_Active_Import_Register_kWh: 'energyKWh',
  Energy_Active_Export_Register: 'energyExportWh',
  Energy_Active_Export_Register_kWh: 'energyExportKWh',
  Energy_Active_Import_Interval: 'energyIntervalWh',
  Energy_Active_Import_Interval_kWh: 'energyIntervalKWh',
  Energy_Active_Export_Interval: 'energyExportIntervalWh',
  Energy_Active_Export_Interval_kWh: 'energyExportIntervalKWh',
  Energy_Active_Net: 'netEnergyWh',
  Energy_Active_Net_kWh: 'netEnergyKWh',
  Energy_Apparent_Import: 'apparentEnergyVAh',
  Energy_Apparent_Export: 'apparentEnergyExportVAh',
  Energy_Apparent_Net: 'apparentEnergyNetVAh',
  Energy_Reactive_Import_Register: 'reactiveEnergyVarh',
  Energy_Reactive_Export_Register: 'reactiveEnergyExportVarh',
  Energy_Reactive_Import_Interval: 'reactiveEnergyIntervalVarh',
  Energy_Reactive_Export_Interval: 'reactiveEnergyExportIntervalVarh',
  Energy_Reactive_Net: 'reactiveEnergyNetVarh',
  Voltage: 'voltageV',
  Frequency: 'frequencyHz',
  Temperature: 'temperatureC',
  RPM: 'fanRpm',
  SoC: 'socPercent',
});

const CANONICAL_BY_NORMALIZED = new Map(
  Object.keys(MEASUREMENT_DEFINITIONS).map((key) => [key.replace(/[^a-z0-9]+/gi, '').toLowerCase(), key]),
);

function sanitizeFlatKey(value) {
  return String(value || 'reading')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'reading';
}

function canonicalMeasurand(measurand) {
  const raw = String(measurand || '').trim();
  if (!raw) return '';
  if (MEASUREMENT_DEFINITIONS[raw]) return raw;
  const normalized = raw.replace(/[^a-z0-9]+/gi, '').toLowerCase();
  return MEASURAND_ALIASES[normalized] || CANONICAL_BY_NORMALIZED.get(normalized) || raw;
}

function canonicalPhase(phase) {
  const raw = String(phase || '').trim().toUpperCase().replace(/[_\s]+/g, '-');
  if (!raw) return '';
  if (/^L1(?:-?N)?$/.test(raw) || /^N-?L1$/.test(raw)) return 'L1';
  if (/^L2(?:-?N)?$/.test(raw) || /^N-?L2$/.test(raw)) return 'L2';
  if (/^L3(?:-?N)?$/.test(raw) || /^N-?L3$/.test(raw)) return 'L3';
  const lineToLine = raw.match(/^L([123])-?L([123])$/);
  if (lineToLine) return `L${lineToLine[1]}L${lineToLine[2]}`;
  return sanitizeFlatKey(raw).replace(/-/g, '');
}

function measurementDefinition(measurand, phase) {
  const canonical = canonicalMeasurand(measurand);
  const base = MEASUREMENT_DEFINITIONS[canonical];
  const phaseKey = canonicalPhase(phase);
  if (!base) {
    const suffix = phaseKey ? `_${phaseKey}` : '';
    return {
      key: `extra_${sanitizeFlatKey(canonical || measurand || 'reading')}${suffix}`,
      name: { en: String(canonical || measurand || 'Reading'), de: String(canonical || measurand || 'Messwert') },
      role: 'value',
      unit: undefined,
      measurand: canonical || String(measurand || ''),
      extra: true,
    };
  }
  if (!phaseKey) return { ...base, measurand: canonical };
  return {
    ...base,
    measurand: canonical,
    key: `${base.key}${phaseKey}`,
    kwhKey: base.kwhKey ? `${base.kwhKey}${phaseKey}` : undefined,
    name: {
      en: `${typeof base.name === 'object' ? base.name.en : base.name} ${phaseKey}`,
      de: `${typeof base.name === 'object' ? base.name.de : base.name} ${phaseKey}`,
    },
  };
}

function canonicalUnitForMeasurand(measurand) {
  const canonical = canonicalMeasurand(measurand);
  const definition = MEASUREMENT_DEFINITIONS[canonical];
  if (definition && definition.unit !== undefined) return definition.unit;
  if (/^Power\./.test(canonical)) return canonical === 'Power.Factor' ? '' : 'W';
  if (/^Current\./.test(canonical)) return 'A';
  if (/^(?:Energy\.|EnergyRequest\.)/.test(canonical)) return 'Wh';
  if (/^Voltage(?:\.|$)/.test(canonical)) return 'V';
  if (canonical === 'Frequency') return 'Hz';
  if (canonical === 'Temperature') return '°C';
  if (canonical === 'RPM') return 'rpm';
  if (canonical === 'SoC' || /SOC$/i.test(canonical)) return '%';
  return undefined;
}

function aggregatePhaseValues(measurand, values) {
  const numeric = Array.from(values || []).map(Number).filter(Number.isFinite);
  if (!numeric.length) return undefined;
  const canonical = canonicalMeasurand(measurand);
  // A three-phase current datapoint describes the limiting phase current, not
  // the arithmetic sum (3 × 16 A must remain 16 A for load management).
  if (/^Current\./.test(canonical)) {
    return numeric.reduce((selected, value) => Math.abs(value) > Math.abs(selected) ? value : selected, numeric[0]);
  }
  return numeric.reduce((sum, value) => sum + value, 0);
}

function compactKeyFromLegacyAggregate(key) {
  const direct = LEGACY_AGGREGATE_TO_COMPACT[String(key || '')];
  if (direct) return direct;
  const match = String(key || '').match(/^(.*)_(L[123](?:N|L[123])?)$/);
  if (match) {
    const base = LEGACY_AGGREGATE_TO_COMPACT[match[1]];
    if (base) return `${base}${canonicalPhase(match[2])}`;
  }
  return `extra_${sanitizeFlatKey(key)}`;
}

function measurementCommon(key, unit, options = {}) {
  const definition = Object.values(MEASUREMENT_DEFINITIONS).find((item) => item.key === key || item.kwhKey === key);
  let role = options.role || (definition && definition.role) || 'value';
  if (/power/i.test(key)) role = 'value.power';
  else if (/current/i.test(key)) role = 'value.current';
  else if (/voltage/i.test(key)) role = 'value.voltage';
  else if (/energy/i.test(key)) role = 'value.energy';
  else if (/soc/i.test(key)) role = 'value.battery';
  else if (/frequency/i.test(key)) role = 'value.frequency';
  else if (/temperature/i.test(key)) role = 'value.temperature';
  const name = options.name || (definition && definition.name) || key;
  return {
    name,
    type: 'number',
    role,
    read: true,
    write: false,
    unit: unit || options.unit || (definition && (definition.key === key ? definition.unit : 'kWh')) || undefined,
  };
}

function deterministicInt(identity, salt) {
  const hash = crypto.createHash('sha256').update(`${identity}|${salt}`).digest();
  const value = hash.readUInt32BE(0) & 0x7fffffff;
  return Math.max(1, value);
}

function deterministicChargingProfileIds(identity, functionKey = 'eos-charge-limit', scope = 'station') {
  const fn = sanitizeFlatKey(functionKey || 'eos-charge-limit');
  const target = sanitizeFlatKey(scope || 'station');
  return {
    chargingProfileId: deterministicInt(identity, `charging-profile:${fn}:${target}`),
    scheduleId: deterministicInt(identity, `charging-schedule:${fn}:${target}`),
  };
}

function minimumLimit(unit, phases, minimumCurrentA = 6, nominalVoltageV = 230) {
  const current = Math.max(1, Number(minimumCurrentA) || 6);
  if (String(unit).toUpperCase() === 'A') return current;
  return Math.round(current * Math.max(1, Math.min(3, Number(phases) || 1)) * Math.max(100, Number(nominalVoltageV) || 230));
}

function normalizeChargingLimit(requested, unit, phases, config = {}, previous) {
  const requestedNumber = Number(requested);
  const requestedLimit = Number.isFinite(requestedNumber) ? Math.max(0, requestedNumber) : 0;
  const rateUnit = String(unit || 'W').toUpperCase() === 'A' ? 'A' : 'W';
  const numberPhases = Math.max(1, Math.min(3, Math.round(Number(phases) || 3)));
  const min = minimumLimit(rateUnit, numberPhases, config.minimumChargingCurrentA, config.nominalVoltageV);
  const zeroBehavior = String(config.zeroLimitBehavior || 'keepLast');

  if (requestedLimit <= 0) {
    if (zeroBehavior === 'clearProfile') {
      return { requestedLimit, effectiveLimit: 0, rateUnit, phases: numberPhases, action: 'clear', reason: 'zero-clears-profile' };
    }
    if (zeroBehavior === 'sendZero') {
      return { requestedLimit, effectiveLimit: 0, rateUnit, phases: numberPhases, action: 'set', reason: 'explicit-zero-profile' };
    }
    const effectiveLimit = previous && Number.isFinite(Number(previous.effectiveLimit)) ? Number(previous.effectiveLimit) : undefined;
    return { requestedLimit, effectiveLimit, rateUnit, phases: numberPhases, action: 'hold', reason: 'zero-held-to-prevent-unintended-interruption' };
  }

  if (requestedLimit < min) {
    return { requestedLimit, effectiveLimit: min, rateUnit, phases: numberPhases, action: 'set', reason: `clamped-to-minimum-${min}${rateUnit}` };
  }
  return { requestedLimit, effectiveLimit: requestedLimit, rateUnit, phases: numberPhases, action: 'set', reason: 'accepted' };
}

function chargingLimitChanged(previous, next, config = {}) {
  if (!previous) return true;
  if (!next || previous.action !== next.action || previous.rateUnit !== next.rateUnit || previous.phases !== next.phases) return true;
  if (next.action !== 'set') return previous.requestedLimit !== next.requestedLimit;
  const deadband = next.rateUnit === 'A'
    ? Math.max(0, Number(config.smartChargingDeadbandA) || 0.2)
    : Math.max(0, Number(config.smartChargingDeadbandW) || 100);
  return Math.abs(Number(previous.effectiveLimit) - Number(next.effectiveLimit)) >= deadband;
}

module.exports = {
  MEASUREMENT_DEFINITIONS,
  LEGACY_AGGREGATE_TO_COMPACT,
  sanitizeFlatKey,
  canonicalMeasurand,
  canonicalPhase,
  canonicalUnitForMeasurand,
  aggregatePhaseValues,
  measurementDefinition,
  compactKeyFromLegacyAggregate,
  measurementCommon,
  deterministicInt,
  deterministicChargingProfileIds,
  minimumLimit,
  normalizeChargingLimit,
  chargingLimitChanged,
};
