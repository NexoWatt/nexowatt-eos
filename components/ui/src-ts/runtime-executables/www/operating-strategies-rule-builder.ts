// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Übersetzt die Eingaben des Strategie-Regelbauers in die gespeicherte Regelstruktur.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/operating-strategies-rule-builder.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * NexoWatt EOS Betriebsstrategien – modularer Regelbaukasten und Trockenlauf.
 *
 * RC54 speichert und bewertet Muss-/Soll-/Kann-Regeln ausschließlich im Browser-
 * Simulationsmodus. Das Modul enthält absichtlich keinen Hardware-Schreibpfad und
 * übernimmt weder bestehende Lade-, Speicher- noch Verbraucherregler.
 */
(function () {
  'use strict';

  type AnyRecord = Record<string, any>;

  const BUILDER_VERSION = '0.8.178';
  const MAX_RULES = 200;
  const MAX_CONDITIONS = 20;
  const ROOT_ID = 'nwOperatingStrategiesRoot';
  const REQUIREMENT_ORDER: AnyRecord = { must: 0, should: 1, can: 2 };
  const RULE_TYPES = ['thermalPause', 'targetSoc', 'targetEnergy', 'switchState', 'targetPower'];
  const REQUIREMENTS = ['must', 'should', 'can'];
  const PROFILE_SCOPES = ['active', 'all'];
  const SCHEDULE_MODES = ['continuous', 'dailyTime', 'timeWindow'];
  const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const OPERATORS = ['lt', 'lte', 'gt', 'gte', 'eq', 'neq'];
  const SYSTEM_METRICS = [
    'outsideTemperatureC',
    'pvForecastKWh',
    'pvSurplusW',
    'gridPowerW',
    'electricityPriceCtKWh',
    'weekend',
    'cheapTariff',
  ];
  const RESOURCE_METRICS = [
    'socPct',
    'temperatureC',
    'powerW',
    'energyKWh',
    'online',
    'alarm',
    'active',
    'fresh',
    'offDurationMin',
    'runDurationMin',
    'state',
  ];
  const BOOLEAN_METRICS = new Set(['weekend', 'cheapTariff', 'online', 'alarm', 'active', 'fresh']);
  const STRING_METRICS = new Set(['state']);

  let lastSimulationResult: AnyRecord | null = null;

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
  const nullableNumber = (value: any, min: number, max: number): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : null;
  };
  const integer = (value: any, fallback: number, min: number, max: number): number => Math.round(number(value, fallback, min, max));
  const safeId = (value: any, fallback: string): string => {
    const raw = text(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return raw || fallback;
  };
  const localDateTimeValue = (value: Date = new Date()): string => {
    const pad = (part: number): string => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
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

  function requirementLabel(value: string): string {
    if (value === 'must') return 'MUSS';
    if (value === 'should') return 'SOLL';
    return 'KANN';
  }

  function requirementTone(value: string): string {
    if (value === 'must') return 'must';
    if (value === 'should') return 'should';
    return 'can';
  }

  function ruleTypeLabel(value: string): string {
    const labels: AnyRecord = {
      thermalPause: 'Thermische Pause',
      targetSoc: 'SoC-Ziel',
      targetEnergy: 'Energieziel',
      switchState: 'Ein-/Aus-Anforderung',
      targetPower: 'Leistungsziel',
      nightReserve: 'Nachtenergie-Reserve',
    };
    return labels[value] || value;
  }

  function metricLabel(value: string): string {
    const labels: AnyRecord = {
      outsideTemperatureC: 'Außentemperatur',
      pvForecastKWh: 'PV-Prognose',
      pvSurplusW: 'PV-Überschuss',
      gridPowerW: 'Netzleistung',
      electricityPriceCtKWh: 'Strompreis',
      weekend: 'Wochenende',
      cheapTariff: 'Günstiger Tarif',
      socPct: 'SoC',
      temperatureC: 'Temperatur',
      powerW: 'Leistung',
      energyKWh: 'Energie',
      online: 'Online',
      alarm: 'Alarm',
      active: 'Aktiv',
      fresh: 'Messwert aktuell',
      offDurationMin: 'Abschaltdauer',
      runDurationMin: 'Laufzeit',
      state: 'Zustand',
    };
    return labels[value] || value;
  }

  function metricUnit(value: string): string {
    const units: AnyRecord = {
      outsideTemperatureC: '°C',
      pvForecastKWh: 'kWh',
      pvSurplusW: 'W',
      gridPowerW: 'W',
      electricityPriceCtKWh: 'ct/kWh',
      socPct: '%',
      temperatureC: '°C',
      powerW: 'W',
      energyKWh: 'kWh',
      offDurationMin: 'min',
      runDurationMin: 'min',
    };
    return units[value] || '';
  }

  function operatorLabel(value: string): string {
    const labels: AnyRecord = { lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=', neq: '≠' };
    return labels[value] || value;
  }

  function defaultSchedule(ruleType = ''): AnyRecord {
    return {
      mode: ruleType === 'thermalPause' ? 'dailyTime' : 'continuous',
      atTime: ruleType === 'thermalPause' ? '19:00' : '00:00',
      windowMinutes: ruleType === 'thermalPause' ? 30 : 15,
      startTime: '19:00',
      endTime: '07:00',
      weekdays: WEEKDAYS.slice(),
    };
  }

  function normalizeSchedule(input: any, ruleType = ''): AnyRecord {
    const source = record(input);
    const defaults = defaultSchedule(ruleType);
    const mode = SCHEDULE_MODES.includes(text(source.mode)) ? text(source.mode) : defaults.mode;
    const atTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(source.atTime)) ? text(source.atTime) : defaults.atTime;
    const startTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(source.startTime)) ? text(source.startTime) : defaults.startTime;
    const endTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(source.endTime)) ? text(source.endTime) : defaults.endTime;
    const requestedWeekdays = Array.isArray(source.weekdays) ? source.weekdays.map((entry: any) => text(entry)).filter((entry: string) => WEEKDAYS.includes(entry)) : [];
    return {
      mode,
      atTime,
      windowMinutes: integer(source.windowMinutes, defaults.windowMinutes, 1, 1440),
      startTime,
      endTime,
      weekdays: requestedWeekdays.length ? Array.from(new Set(requestedWeekdays)) : WEEKDAYS.slice(),
    };
  }

  function defaultCondition(index = 0): AnyRecord {
    return {
      id: `condition-${Date.now()}-${index + 1}`,
      enabled: true,
      sourceRef: 'system',
      metric: 'outsideTemperatureC',
      operator: 'lt',
      value: 7,
    };
  }

  function normalizeCondition(input: any, index: number): AnyRecord {
    const source = record(input);
    const sourceRef = text(source.sourceRef, 'system');
    const allowedMetrics = sourceRef === 'system' ? SYSTEM_METRICS : RESOURCE_METRICS;
    const requestedMetric = text(source.metric);
    const metric: string = allowedMetrics.includes(requestedMetric) ? requestedMetric : (allowedMetrics[0] || 'outsideTemperatureC');
    const operator = OPERATORS.includes(text(source.operator)) ? text(source.operator) : 'eq';
    let value: any;
    if (BOOLEAN_METRICS.has(metric)) value = source.value === true || String(source.value).toLowerCase() === 'true';
    else if (STRING_METRICS.has(metric)) value = text(source.value);
    else value = number(source.value, 0, -1000000000, 1000000000);
    return {
      id: safeId(source.id, `condition-${index + 1}`),
      enabled: source.enabled !== false,
      sourceRef,
      metric,
      operator: BOOLEAN_METRICS.has(metric) || STRING_METRICS.has(metric)
        ? (operator === 'neq' ? 'neq' : 'eq')
        : operator,
      value,
    };
  }

  function defaultRule(type = 'targetSoc', index = 0): AnyRecord {
    const ruleType = RULE_TYPES.includes(type) ? type : 'targetSoc';
    const base: AnyRecord = {
      id: `rule-${Date.now()}-${index + 1}`,
      name: `Neue Regel ${index + 1}`,
      enabled: true,
      requirement: 'should',
      priority: 50,
      profileScope: 'active',
      targetResourceId: '',
      ruleType,
      schedule: defaultSchedule(ruleType),
      target: {
        value: 70,
        unit: '%',
        state: 'on',
        dueTime: '12:00',
        dueDay: 'next-day',
        energySourcePolicy: 'pv-preferred',
      },
      safety: {
        maxOffDurationMin: 480,
        minRunDurationMin: 5,
        minStopDurationMin: 5,
        maxTemperatureC: 7,
        minTemperatureC: -50,
        hysteresisC: 1,
        requireFresh: true,
        requireOnline: true,
        blockOnAlarm: true,
      },
      conditions: [],
      simulationOnly: true,
      executionEnabled: false,
    };
    if (ruleType === 'thermalPause') {
      base.name = 'Thermischen Verbraucher pausieren';
      base.requirement = 'should';
      base.priority = 80;
      base.target.state = 'pause';
      base.conditions = [defaultCondition(0)];
    } else if (ruleType === 'targetSoc') {
      base.name = 'SoC-Ziel erreichen';
      base.target.value = 70;
      base.target.unit = '%';
    } else if (ruleType === 'targetEnergy') {
      base.name = 'Energieziel erreichen';
      base.target.value = 10;
      base.target.unit = 'kWh';
    } else if (ruleType === 'switchState') {
      base.name = 'Verbraucher schalten';
      base.target.state = 'on';
      base.target.unit = 'state';
    } else if (ruleType === 'targetPower') {
      base.name = 'Leistungsziel vorgeben';
      base.target.value = 2000;
      base.target.unit = 'W';
    }
    return base;
  }

  function normalizeRule(input: any, index: number, profileIds: string[] = []): AnyRecord {
    const source = record(input);
    const ruleType = RULE_TYPES.includes(text(source.ruleType)) ? text(source.ruleType) : 'targetSoc';
    const requirement = REQUIREMENTS.includes(text(source.requirement)) ? text(source.requirement) : 'should';
    const targetRaw = record(source.target);
    const safetyRaw = record(source.safety);
    const profileScopeRaw = text(source.profileScope, 'active');
    const profileScope = PROFILE_SCOPES.includes(profileScopeRaw) || profileIds.includes(profileScopeRaw.replace(/^profile:/, ''))
      ? profileScopeRaw
      : 'active';
    const defaultTarget = defaultRule(ruleType, index).target;
    const targetValueMax = ruleType === 'targetSoc' ? 100 : 1000000000;
    const targetValueMin = ruleType === 'targetSoc' ? 0 : 0;
    const targetState = ['on', 'off', 'pause', 'release'].includes(text(targetRaw.state)) ? text(targetRaw.state) : defaultTarget.state;
    const dueTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(targetRaw.dueTime)) ? text(targetRaw.dueTime) : defaultTarget.dueTime;
    const dueDay = ['today', 'next-day'].includes(text(targetRaw.dueDay)) ? text(targetRaw.dueDay) : 'next-day';
    const sourcePolicies = ['pv-only', 'pv-preferred', 'cheap-grid', 'grid-allowed'];
    const conditions = withUniqueIds(list(source.conditions).slice(0, MAX_CONDITIONS).map(normalizeCondition), 'condition');
    return {
      id: safeId(source.id, `rule-${index + 1}`),
      templateKey: text(source.templateKey),
      name: text(source.name, `Regel ${index + 1}`),
      enabled: source.enabled !== false,
      requirement,
      priority: integer(source.priority, 50, 1, 100),
      profileScope,
      targetResourceId: text(source.targetResourceId),
      ruleType,
      schedule: normalizeSchedule(source.schedule, ruleType),
      target: {
        value: number(targetRaw.value, defaultTarget.value, targetValueMin, targetValueMax),
        unit: ruleType === 'targetSoc' ? '%' : (ruleType === 'targetEnergy' ? 'kWh' : (ruleType === 'targetPower' ? 'W' : 'state')),
        state: targetState,
        dueTime,
        dueDay,
        energySourcePolicy: sourcePolicies.includes(text(targetRaw.energySourcePolicy)) ? text(targetRaw.energySourcePolicy) : 'pv-preferred',
      },
      safety: {
        maxOffDurationMin: integer(safetyRaw.maxOffDurationMin, 480, 1, 10080),
        minRunDurationMin: integer(safetyRaw.minRunDurationMin, 5, 0, 1440),
        minStopDurationMin: integer(safetyRaw.minStopDurationMin, 5, 0, 1440),
        maxTemperatureC: number(safetyRaw.maxTemperatureC, 7, -100, 200),
        minTemperatureC: number(safetyRaw.minTemperatureC, -50, -100, 200),
        hysteresisC: number(safetyRaw.hysteresisC, 1, 0, 50),
        requireFresh: safetyRaw.requireFresh !== false,
        requireOnline: safetyRaw.requireOnline !== false,
        blockOnAlarm: safetyRaw.blockOnAlarm !== false,
      },
      conditions,
      simulationOnly: true,
      executionEnabled: false,
    };
  }

  function normalizeRules(input: any, profileIds: string[] = []): AnyRecord[] {
    return withUniqueIds(list(input).slice(0, MAX_RULES).map((entry, index) => normalizeRule(entry, index, profileIds)), 'rule');
  }

  function defaultSimulation(activeProfileId = ''): AnyRecord {
    return {
      activeProfileId,
      nowLocal: localDateTimeValue(),
      outsideTemperatureC: 5,
      pvForecastKWh: 20,
      pvSurplusW: 0,
      gridPowerW: 0,
      electricityPriceCtKWh: 30,
      weekend: false,
      cheapTariff: false,
      resourceStates: {},
    };
  }

  function normalizeResourceState(input: any): AnyRecord {
    const source = record(input);
    return {
      socPct: nullableNumber(source.socPct, 0, 100),
      temperatureC: nullableNumber(source.temperatureC, -100, 200),
      powerW: nullableNumber(source.powerW, -1000000000, 1000000000),
      energyKWh: nullableNumber(source.energyKWh, -1000000, 1000000),
      capacityKWh: nullableNumber(source.capacityKWh, 0, 1000000),
      online: source.online !== false,
      alarm: source.alarm === true,
      active: source.active === true,
      fresh: source.fresh !== false,
      offDurationMin: number(source.offDurationMin, 0, 0, 1000000),
      runDurationMin: number(source.runDurationMin, 0, 0, 1000000),
      state: text(source.state, 'idle'),
    };
  }

  function normalizeSimulation(input: any, activeProfileId = ''): AnyRecord {
    const source = record(input);
    const resourceStatesRaw = record(source.resourceStates);
    const resourceStates: AnyRecord = {};
    Object.keys(resourceStatesRaw).slice(0, 250).forEach((key) => {
      const id = text(key);
      if (id) resourceStates[id] = normalizeResourceState(resourceStatesRaw[key]);
    });
    return {
      activeProfileId: text(source.activeProfileId, activeProfileId),
      nowLocal: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text(source.nowLocal)) ? text(source.nowLocal) : localDateTimeValue(),
      outsideTemperatureC: number(source.outsideTemperatureC, 5, -100, 100),
      pvForecastKWh: number(source.pvForecastKWh, 20, 0, 1000000),
      pvSurplusW: number(source.pvSurplusW, 0, -1000000000, 1000000000),
      gridPowerW: number(source.gridPowerW, 0, -1000000000, 1000000000),
      electricityPriceCtKWh: number(source.electricityPriceCtKWh, 30, -10000, 10000),
      weekend: source.weekend === true,
      cheapTariff: source.cheapTariff === true,
      resourceStates,
    };
  }

  function normalizeCatalog(input: any): AnyRecord[] {
    const seen = new Set<string>();
    const out: AnyRecord[] = [];
    list(input).forEach((entry, index) => {
      const sourceId = text(entry.sourceId || entry.id);
      if (!sourceId || seen.has(sourceId)) return;
      seen.add(sourceId);
      out.push({
        ...clone(entry),
        sourceId,
        name: text(entry.name, `Ressource ${index + 1}`),
        resourceType: text(entry.resourceType, 'consumer'),
        resourceSubtype: text(entry.resourceSubtype),
        controlType: text(entry.controlType),
        usableCapacityKWh: nullableNumber(entry.usableCapacityKWh ?? entry.capacityKWh, 0, 1000000),
        efficiencyPct: number(entry.efficiencyPct, 92, 1, 100),
        minPowerW: nullableNumber(entry.minPowerW, 0, 1000000000),
        maxPowerW: nullableNumber(entry.maxPowerW, 0, 1000000000),
        strategyEnabled: entry.strategyEnabled === true,
      });
    });
    return out;
  }

  function ensureSimulationStates(simulationInput: any, resourcesInput: any): AnyRecord {
    const resources = normalizeCatalog(resourcesInput);
    const simulation = normalizeSimulation(simulationInput);
    resources.forEach((resource) => {
      const existing = record(simulation.resourceStates[resource.sourceId]);
      simulation.resourceStates[resource.sourceId] = normalizeResourceState({
        ...existing,
        capacityKWh: existing.capacityKWh ?? resource.usableCapacityKWh,
      });
    });
    return simulation;
  }

  function resourceName(resources: AnyRecord[], id: string): string {
    return resources.find((entry) => entry.sourceId === id)?.name || id || 'nicht zugeordnet';
  }

  function templateCondition(sourceRef: string, metric: string, operator: string, value: any, index: number): AnyRecord {
    return normalizeCondition({ id: `condition-${Date.now()}-${index}`, sourceRef, metric, operator, value }, index);
  }

  function createCustomerExampleRules(resourcesInput: any, existingRulesInput: any = []): AnyRecord[] {
    const resources = normalizeCatalog(resourcesInput);
    const existing = normalizeRules(existingRulesInput);
    const existingTemplateKeys = new Set(existing.map((entry) => text(entry.templateKey)).filter(Boolean));
    const storage = resources.find((entry) => entry.resourceType === 'storage');
    const charging = resources.find((entry) => entry.resourceType === 'chargingPoint');
    const thermal = resources.find((entry) => entry.resourceSubtype === 'cooling')
      || resources.find((entry) => entry.resourceType === 'thermal' && entry.resourceSubtype !== 'heatingRod')
      || resources.find((entry) => entry.resourceType === 'thermal');
    const heatingRod = resources.find((entry) => entry.resourceSubtype === 'heatingRod')
      || resources.find((entry) => /heatingrod|heizstab/i.test(`${entry.sourceId} ${entry.name}`));
    const generated: AnyRecord[] = [];

    const push = (templateKey: string, rule: AnyRecord): void => {
      if (existingTemplateKeys.has(templateKey)) return;
      generated.push(normalizeRule({ ...rule, templateKey }, existing.length + generated.length));
    };

    push('customer-cooling-night-pause', {
      id: 'customer-cooling-night-pause',
      name: 'Kühlhaus: sichere Nachtpause',
      requirement: 'should',
      priority: 90,
      profileScope: 'active',
      targetResourceId: thermal?.sourceId || '',
      ruleType: 'thermalPause',
      schedule: { mode: 'dailyTime', atTime: '19:00', windowMinutes: 30, weekdays: WEEKDAYS.slice() },
      target: { state: 'pause' },
      safety: { maxOffDurationMin: 600, minRunDurationMin: 5, minStopDurationMin: 5, maxTemperatureC: 7, minTemperatureC: -50, hysteresisC: 1, requireFresh: true, requireOnline: true, blockOnAlarm: true },
      conditions: [
        templateCondition(storage?.sourceId || 'missing:storage', 'socPct', 'lt', 70, 0),
        templateCondition('system', 'outsideTemperatureC', 'lt', 7, 1),
        templateCondition('system', 'pvForecastKWh', 'gte', 10, 2),
      ],
    });

    push('customer-vehicle-70-by-noon', {
      id: 'customer-vehicle-70-by-noon',
      name: 'Fahrzeug: 70 % bis 12:00 Uhr',
      requirement: 'must',
      priority: 100,
      profileScope: 'active',
      targetResourceId: charging?.sourceId || '',
      ruleType: 'targetSoc',
      target: { value: 70, dueTime: '12:00', dueDay: 'next-day', energySourcePolicy: 'pv-preferred' },
    });

    push('customer-storage-80', {
      id: 'customer-storage-80',
      name: 'Speicher: Tagesziel 80 %',
      requirement: 'should',
      priority: 80,
      profileScope: 'active',
      targetResourceId: storage?.sourceId || '',
      ruleType: 'targetSoc',
      target: { value: 80, dueTime: '18:00', dueDay: 'today', energySourcePolicy: 'pv-preferred' },
    });

    push('customer-vehicle-100-weekend', {
      id: 'customer-vehicle-100-weekend',
      name: 'Fahrzeug: optional auf 100 %',
      requirement: 'can',
      priority: 60,
      profileScope: 'active',
      targetResourceId: charging?.sourceId || '',
      ruleType: 'targetSoc',
      target: { value: 100, dueTime: '18:00', dueDay: 'next-day', energySourcePolicy: 'pv-only' },
      conditions: [
        templateCondition(storage?.sourceId || 'missing:storage', 'socPct', 'gte', 95, 0),
        templateCondition('system', 'weekend', 'eq', true, 1),
      ],
    });

    push('customer-heating-rod-surplus', {
      id: 'customer-heating-rod-surplus',
      name: 'Heizstab: verbleibenden Überschuss nutzen',
      requirement: 'can',
      priority: 40,
      profileScope: 'active',
      targetResourceId: heatingRod?.sourceId || '',
      ruleType: 'switchState',
      target: { state: 'on' },
      conditions: [
        templateCondition(storage?.sourceId || 'missing:storage', 'socPct', 'gte', 95, 0),
        templateCondition(charging?.sourceId || 'missing:charging-point', 'socPct', 'gte', 100, 1),
        templateCondition('system', 'pvSurplusW', 'gte', 2000, 2),
      ],
    });

    return normalizeRules([...existing, ...generated]);
  }

  function profileMatches(rule: AnyRecord, activeProfileId: string): boolean {
    if (rule.profileScope === 'all' || rule.profileScope === 'active') return true;
    return rule.profileScope === `profile:${activeProfileId}` || rule.profileScope === activeProfileId;
  }

  function metricValue(condition: AnyRecord, simulation: AnyRecord): { available: boolean; value: any } {
    if (condition.sourceRef === 'system') {
      if (!Object.prototype.hasOwnProperty.call(simulation, condition.metric)) return { available: false, value: undefined };
      return { available: simulation[condition.metric] !== null && simulation[condition.metric] !== undefined, value: simulation[condition.metric] };
    }
    const state = record(record(simulation.resourceStates)[condition.sourceRef]);
    if (!Object.prototype.hasOwnProperty.call(state, condition.metric)) return { available: false, value: undefined };
    return { available: state[condition.metric] !== null && state[condition.metric] !== undefined, value: state[condition.metric] };
  }

  function compare(actual: any, operator: string, expected: any): boolean {
    if (operator === 'eq') return String(actual) === String(expected);
    if (operator === 'neq') return String(actual) !== String(expected);
    const left = Number(actual);
    const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (operator === 'lt') return left < right;
    if (operator === 'lte') return left <= right;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    return false;
  }

  function conditionDescription(condition: AnyRecord, resources: AnyRecord[]): string {
    const source = condition.sourceRef === 'system' ? 'System' : resourceName(resources, condition.sourceRef);
    const unit = metricUnit(condition.metric);
    const value = BOOLEAN_METRICS.has(condition.metric) ? (condition.value ? 'Ja' : 'Nein') : `${condition.value}${unit ? ` ${unit}` : ''}`;
    return `${source}: ${metricLabel(condition.metric)} ${operatorLabel(condition.operator)} ${value}`;
  }

  function minutesUntilDeadline(nowLocal: string, dueTime: string, dueDay: string): number | null {
    const now = new Date(nowLocal);
    if (Number.isNaN(now.getTime())) return null;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(dueTime);
    if (!match) return null;
    const due = new Date(now.getTime());
    due.setSeconds(0, 0);
    due.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (dueDay === 'next-day') due.setDate(due.getDate() + 1);
    else if (due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
    return Math.max(0, Math.round((due.getTime() - now.getTime()) / 60000));
  }

  function timeMinutes(value: any, fallback = 0): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text(value));
    if (!match) return fallback;
    return Math.max(0, Math.min(1439, Number(match[1]) * 60 + Number(match[2])));
  }

  function isInTimeWindow(current: number, start: number, end: number): boolean {
    if (start === end) return true;
    return start < end ? current >= start && current < end : current >= start || current < end;
  }

  function currentWeekday(nowLocal: string): string {
    const value = new Date(nowLocal);
    if (Number.isNaN(value.getTime())) return '';
    const sundayFirst = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return sundayFirst[value.getDay()] || '';
  }

  function scheduleEvaluation(ruleInput: any, nowLocal: string): AnyRecord {
    const rule = record(ruleInput);
    const schedule = normalizeSchedule(rule.schedule, text(rule.ruleType));
    const now = new Date(nowLocal);
    if (Number.isNaN(now.getTime())) return { active: false, reason: 'Simulationszeit ist ungültig.' };
    const weekday = currentWeekday(nowLocal);
    if (weekday && !schedule.weekdays.includes(weekday)) return { active: false, reason: 'Der aktuelle Wochentag ist nicht freigegeben.' };
    const current = now.getHours() * 60 + now.getMinutes();
    if (schedule.mode === 'continuous') return { active: true, reason: 'Kontinuierliche Bewertung.' };
    if (schedule.mode === 'dailyTime') {
      const start = timeMinutes(schedule.atTime);
      const end = (start + schedule.windowMinutes) % 1440;
      return isInTimeWindow(current, start, end)
        ? { active: true, reason: `Tägliches Prüffenster ${schedule.atTime} + ${schedule.windowMinutes} min.` }
        : { active: false, reason: `Außerhalb des täglichen Prüffensters ${schedule.atTime} + ${schedule.windowMinutes} min.` };
    }
    const start = timeMinutes(schedule.startTime);
    const end = timeMinutes(schedule.endTime);
    return isInTimeWindow(current, start, end)
      ? { active: true, reason: `Aktiv im Zeitfenster ${schedule.startTime}–${schedule.endTime}.` }
      : { active: false, reason: `Außerhalb des Zeitfensters ${schedule.startTime}–${schedule.endTime}.` };
  }

  function minutesUntilLocalTime(nowLocal: string, targetTime: string): number | null {
    const now = new Date(nowLocal);
    if (Number.isNaN(now.getTime())) return null;
    const target = timeMinutes(targetTime, -1);
    if (target < 0) return null;
    const current = now.getHours() * 60 + now.getMinutes();
    const delta = (target - current + 1440) % 1440;
    return delta === 0 ? 1440 : delta;
  }

  function evaluateNightReserve(configInput: any, resourcesInput: any, simulationInput: any): AnyRecord | null {
    const config = record(configInput);
    const resources = normalizeCatalog(resourcesInput);
    const simulation = normalizeSimulation(simulationInput, text(config.activeProfileId));
    const profiles = list(config.profiles);
    const profile = profiles.find((entry) => text(entry.id) === simulation.activeProfileId) || profiles.find((entry) => entry.enabled !== false);
    if (!profile || profile.enabled === false) return null;
    const reserve = record(profile.nightReserve);
    if (reserve.enabled === false) return null;
    const explicitStorageId = text(reserve.storageResourceId);
    const storage = resources.find((entry) => entry.sourceId === explicitStorageId)
      || resources.find((entry) => entry.resourceType === 'storage' && entry.strategyEnabled === true)
      || resources.find((entry) => entry.resourceType === 'storage');
    const storageId = text(storage?.sourceId, explicitStorageId);
    const base: AnyRecord = {
      ruleId: `night-reserve-${text(profile.id, 'profile')}`,
      name: `Nachtenergie-Reserve · ${text(profile.name, 'Profil')}`,
      requirement: 'must',
      priority: 95,
      targetResourceId: storageId,
      targetResourceName: storage ? storage.name : (storageId || 'nicht zugeordnet'),
      ruleType: 'nightReserve',
      status: 'inactive',
      selected: false,
      headline: '',
      details: '',
      reasons: [],
      simulationOnly: true,
      action: 'none',
      requestedPowerW: null,
    };
    if (!storageId || !storage) return { ...base, status: 'blocked', headline: 'Speicher für Nachtreserve fehlt', reasons: ['Im aktiven Profil ist kein vorhandener Speicher zugeordnet.'] };
    if (storage.strategyEnabled !== true) return { ...base, status: 'blocked', headline: 'Speicher nicht für Strategien freigegeben', reasons: ['Die Ressource muss unter „Vorhandene EOS-Ressourcen“ ausdrücklich vorgemerkt werden.'] };
    const state = normalizeResourceState(record(simulation.resourceStates)[storageId]);
    if (state.online === false) return { ...base, status: 'blocked', headline: 'Speicher offline', reasons: ['Die Nachtreserve wird ohne Online-Status nicht geplant.'] };
    if (state.fresh === false) return { ...base, status: 'blocked', headline: 'Speicher-SoC veraltet', reasons: ['Die Nachtreserve wird mit veralteten SoC-Werten nicht geplant.'] };
    if (state.alarm === true) return { ...base, status: 'blocked', headline: 'Speicherstörung aktiv', reasons: ['Die Nachtreserve darf keine bestehende Speicher-Sicherheitslogik übersteuern.'] };
    if (state.socPct === null) return { ...base, status: 'blocked', headline: 'Speicher-SoC fehlt', reasons: ['Für die Nachtreserve ist ein gültiger SoC erforderlich.'] };

    const targetSoc = number(reserve.targetSocPct, 40, 0, 100);
    const absoluteMin = Math.min(targetSoc, number(reserve.absoluteMinSocPct, 10, 0, 100));
    const startTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(reserve.startTime)) ? text(reserve.startTime) : '18:00';
    const endTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(reserve.endTime)) ? text(reserve.endTime) : '07:00';
    const now = new Date(simulation.nowLocal);
    if (Number.isNaN(now.getTime())) return { ...base, status: 'blocked', headline: 'Simulationszeit ungültig', reasons: ['Nachtphase konnte nicht bestimmt werden.'] };
    const current = now.getHours() * 60 + now.getMinutes();
    const isNight = isInTimeWindow(current, timeMinutes(startTime), timeMinutes(endTime));

    if (isNight) {
      if (state.socPct <= absoluteMin) {
        return {
          ...base,
          status: 'safety',
          action: 'block-discharge-below-floor',
          headline: 'Absolute Speicheruntergrenze schützen',
          details: `SoC ${state.socPct.toFixed(1)} % liegt an/unter ${absoluteMin.toFixed(1)} %.`,
          reasons: ['Die für die Nacht freigegebene Energie ist verbraucht; weitere Entladung wäre nicht zulässig.'],
        };
      }
      return {
        ...base,
        status: 'completed',
        action: 'release-for-night-load',
        headline: 'Nachtenergie für den Grundverbrauch freigegeben',
        details: `Aktuell ${state.socPct.toFixed(1)} %; absolute Untergrenze ${absoluteMin.toFixed(1)} %.`,
        reasons: ['Der Ziel-SoC ist keine nächtliche Sperrgrenze, sondern die vorher zurückgehaltene Energiemenge.'],
      };
    }

    if (state.socPct >= targetSoc) {
      return {
        ...base,
        status: 'completed',
        action: 'protect-reserve',
        headline: 'Nachtenergie-Reserve gesichert',
        details: `Aktuell ${state.socPct.toFixed(1)} %, Ziel zum Nachtbeginn ${targetSoc.toFixed(1)} %.`,
        reasons: ['Nachrangige flexible Verbraucher dürfen die Reserve bis zum Nachtbeginn nicht unterschreiten.'],
      };
    }

    const capacityKWh = state.capacityKWh ?? storage.usableCapacityKWh;
    const efficiency = Math.max(0.01, number(storage.efficiencyPct, 92, 1, 100) / 100);
    const missingPct = targetSoc - state.socPct;
    const needKWh = capacityKWh !== null && capacityKWh !== undefined ? (capacityKWh * missingPct / 100) / efficiency : null;
    const minutes = minutesUntilLocalTime(simulation.nowLocal, startTime);
    const requestedPowerW = needKWh !== null && minutes !== null && minutes > 0 ? Math.round((needKWh / (minutes / 60)) * 1000) : null;
    return {
      ...base,
      status: 'request',
      action: 'build-and-protect-reserve',
      requestedPowerW,
      headline: `Nachtenergie-Reserve auf ${targetSoc.toFixed(0)} % aufbauen`,
      details: `Aktuell ${state.socPct.toFixed(1)} %, fehlen ${missingPct.toFixed(1)} %-Punkte.${needKWh !== null ? ` Ca. ${needKWh.toFixed(1)} kWh.` : ''}${minutes !== null ? ` Noch ${minutes} min bis ${startTime}.` : ''}`,
      reasons: ['MUSS-Ziel vor nachrangigen Fahrzeug-, Heizstab- und Komfortanforderungen.'],
    };
  }

  function validateRule(ruleInput: any, resourcesInput: any, activeProfileId = ''): AnyRecord {
    const resources = normalizeCatalog(resourcesInput);
    const rule = normalizeRule(ruleInput, 0, activeProfileId ? [activeProfileId] : []);
    const target = resources.find((entry) => entry.sourceId === rule.targetResourceId);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!rule.targetResourceId) errors.push('Zielressource fehlt.');
    else if (!target) errors.push('Zielressource ist nicht mehr vorhanden.');
    else if (target.strategyEnabled !== true) errors.push('Zielressource ist nicht ausdrücklich für Betriebsstrategien vorgemerkt.');
    if (rule.ruleType === 'targetSoc' && target && !['storage', 'chargingPoint'].includes(target.resourceType)) {
      errors.push('Ein SoC-Ziel benötigt einen Speicher oder Ladepunkt.');
    }
    if (rule.ruleType === 'thermalPause' && target && !['thermal', 'consumer'].includes(target.resourceType)) {
      warnings.push('Die gewählte Ressource ist nicht als thermischer oder allgemeiner Verbraucher gekennzeichnet.');
    }
    if (rule.ruleType === 'targetPower' && target && !target.controlType && !target.writes) {
      warnings.push('Für das spätere Leistungsziel ist noch kein Stellpfad erkennbar.');
    }
    if (rule.ruleType === 'switchState' && target && !target.controlType && !target.writes) {
      warnings.push('Für die spätere Schaltanforderung ist noch kein Stellpfad erkennbar.');
    }
    rule.conditions.forEach((condition: AnyRecord, index: number) => {
      if (condition.sourceRef !== 'system' && !resources.some((entry) => entry.sourceId === condition.sourceRef)) {
        errors.push(`Bedingung ${index + 1}: Quellressource fehlt.`);
      }
    });
    if (rule.ruleType === 'thermalPause' && rule.safety.maxTemperatureC <= rule.safety.minTemperatureC) {
      errors.push('Maximaltemperatur muss über der Minimaltemperatur liegen.');
    }
    if (!rule.conditions.length && rule.requirement === 'can') warnings.push('Optionale Regel besitzt keine Freigabebedingung.');
    return { valid: errors.length === 0, errors, warnings };
  }

  function evaluateRule(ruleInput: any, config: AnyRecord, resources: AnyRecord[], simulation: AnyRecord): AnyRecord {
    const profileIds = list(config.profiles).map((profile) => text(profile.id));
    const rule = normalizeRule(ruleInput, 0, profileIds);
    const base: AnyRecord = {
      ruleId: rule.id,
      name: rule.name,
      requirement: rule.requirement,
      priority: rule.priority,
      targetResourceId: rule.targetResourceId,
      targetResourceName: resourceName(resources, rule.targetResourceId),
      ruleType: rule.ruleType,
      status: 'inactive',
      selected: false,
      headline: '',
      details: '',
      reasons: [],
      simulationOnly: true,
      action: 'none',
      requestedPowerW: null,
    };
    if (!rule.enabled) return { ...base, headline: 'Regel deaktiviert', reasons: ['Regel ist deaktiviert.'] };
    if (!profileMatches(rule, simulation.activeProfileId)) return { ...base, headline: 'Profil nicht aktiv', reasons: ['Regel gilt nicht für das simulierte Profil.'] };
    const validation = validateRule(rule, resources, simulation.activeProfileId);
    if (!validation.valid) return { ...base, status: 'blocked', headline: 'Konfiguration unvollständig', reasons: validation.errors };

    const targetResource = resources.find((entry) => entry.sourceId === rule.targetResourceId) || {};
    const targetState = normalizeResourceState(record(simulation.resourceStates)[rule.targetResourceId]);

    if (rule.safety.requireOnline && targetState.online === false) {
      return { ...base, status: rule.ruleType === 'thermalPause' ? 'safety' : 'blocked', action: rule.ruleType === 'thermalPause' ? 'release' : 'none', headline: rule.ruleType === 'thermalPause' ? 'Sicher freigeben / nicht pausieren' : 'Ressource offline', reasons: ['Online-Status ist nicht erfüllt.'] };
    }
    if (rule.safety.blockOnAlarm && targetState.alarm === true) {
      return { ...base, status: rule.ruleType === 'thermalPause' ? 'safety' : 'blocked', action: rule.ruleType === 'thermalPause' ? 'release' : 'none', headline: rule.ruleType === 'thermalPause' ? 'Sicher freigeben / nicht pausieren' : 'Durch Alarm gesperrt', details: 'Alarmstatus aktiv.', reasons: ['Alarmstatus der Zielressource ist aktiv.'] };
    }
    if (rule.safety.requireFresh && targetState.fresh === false) {
      return { ...base, status: rule.ruleType === 'thermalPause' ? 'safety' : 'blocked', action: rule.ruleType === 'thermalPause' ? 'release' : 'none', headline: rule.ruleType === 'thermalPause' ? 'Sicher freigeben / nicht pausieren' : 'Messwerte veraltet', details: 'Messwertqualität ist nicht ausreichend.', reasons: ['Messwerte der Zielressource sind als veraltet markiert.'] };
    }

    if (rule.ruleType === 'thermalPause') {
      if (targetState.temperatureC === null) {
        return { ...base, status: 'safety', action: 'release', headline: 'Sicher freigeben / nicht pausieren', details: 'Temperaturwert fehlt.', reasons: ['Ohne gültige Temperatur ist keine Abschaltung zulässig.'] };
      }
      if (targetState.temperatureC >= rule.safety.maxTemperatureC) {
        return { ...base, status: 'safety', action: 'release', headline: 'Wiedereinschalten / Freigabe halten', details: `${targetState.temperatureC.toFixed(1)} °C erreicht die Grenze ${rule.safety.maxTemperatureC.toFixed(1)} °C.`, reasons: ['Temperatur-Sicherheitsgrenze erreicht.'] };
      }
      if (targetState.offDurationMin >= rule.safety.maxOffDurationMin) {
        return { ...base, status: 'safety', action: 'release', headline: 'Wiedereinschalten / Freigabe halten', details: `${Math.round(targetState.offDurationMin)} min Abschaltdauer erreicht die Grenze ${rule.safety.maxOffDurationMin} min.`, reasons: ['Maximale Abschaltdauer erreicht.'] };
      }
      const alreadyPaused = targetState.active === false || /pause|off|blocked/i.test(targetState.state);
      if (!alreadyPaused && targetState.runDurationMin < rule.safety.minRunDurationMin) {
        return { ...base, status: 'inactive', headline: 'Mindestlaufzeit noch aktiv', details: `${Math.round(targetState.runDurationMin)} von ${rule.safety.minRunDurationMin} min erreicht.`, reasons: ['Der Verdichter/Verbraucher wird nicht zu früh erneut pausiert.'] };
      }
      if (!alreadyPaused && targetState.temperatureC > rule.safety.maxTemperatureC - rule.safety.hysteresisC) {
        return { ...base, status: 'inactive', headline: 'Temperaturreserve für neue Pause zu klein', details: `Für eine neue Pause muss die Temperatur höchstens ${(rule.safety.maxTemperatureC - rule.safety.hysteresisC).toFixed(1)} °C betragen.`, reasons: ['Hysterese verhindert häufiges Ein-/Ausschalten.'] };
      }
    }

    const schedule = scheduleEvaluation(rule, simulation.nowLocal);
    if (!schedule.active) return { ...base, status: 'inactive', headline: 'Zeitplan nicht aktiv', details: schedule.reason, reasons: [schedule.reason] };

    const failedConditions: string[] = [];
    const missingConditions: string[] = [];
    rule.conditions.filter((condition: AnyRecord) => condition.enabled !== false).forEach((condition: AnyRecord) => {
      const actual = metricValue(condition, simulation);
      const description = conditionDescription(condition, resources);
      if (!actual.available) missingConditions.push(`${description}: Messwert fehlt.`);
      else if (!compare(actual.value, condition.operator, condition.value)) failedConditions.push(`${description} nicht erfüllt (Ist: ${String(actual.value)}).`);
    });
    if (missingConditions.length) return { ...base, status: 'blocked', headline: 'Bedingungsmesswert fehlt', reasons: missingConditions };
    if (failedConditions.length) return { ...base, status: 'inactive', headline: 'Bedingungen nicht erfüllt', reasons: failedConditions };

    if (rule.ruleType === 'thermalPause') {
      const remaining = Math.max(0, rule.safety.maxOffDurationMin - targetState.offDurationMin);
      return {
        ...base,
        status: 'request',
        action: 'pause',
        headline: 'Pause ist im Trockenlauf zulässig',
        details: `Maximal noch ${Math.round(remaining)} min; Wiedereinschalten spätestens bei ${rule.safety.maxTemperatureC.toFixed(1)} °C.`,
        reasons: rule.conditions.map((condition: AnyRecord) => conditionDescription(condition, resources)),
      };
    }

    if (rule.ruleType === 'targetSoc') {
      if (targetState.socPct === null) return { ...base, status: 'blocked', headline: 'SoC fehlt', reasons: ['Für das SoC-Ziel ist kein Simulationswert vorhanden.'] };
      const targetSoc = rule.target.value;
      if (targetState.socPct >= targetSoc) {
        return { ...base, status: 'completed', headline: `SoC-Ziel ${targetSoc.toFixed(0)} % erreicht`, details: `Aktuell ${targetState.socPct.toFixed(1)} %.`, reasons: [] };
      }
      const gapPct = targetSoc - targetState.socPct;
      const capacityKWh = targetState.capacityKWh ?? targetResource.usableCapacityKWh;
      const efficiency = Math.max(0.01, number(targetResource.efficiencyPct, 92, 1, 100) / 100);
      const needKWh = capacityKWh !== null && capacityKWh !== undefined ? (capacityKWh * gapPct / 100) / efficiency : null;
      const minutes = minutesUntilDeadline(simulation.nowLocal, rule.target.dueTime, rule.target.dueDay);
      const averageKw = needKWh !== null && minutes !== null && minutes > 0 ? needKWh / (minutes / 60) : null;
      const detailParts = [`Aktuell ${targetState.socPct.toFixed(1)} %, fehlen ${gapPct.toFixed(1)} %-Punkte.`];
      if (needKWh !== null) detailParts.push(`Energiebedarf ca. ${needKWh.toFixed(1)} kWh.`);
      if (averageKw !== null) detailParts.push(`Erforderlicher Mittelwert ca. ${averageKw.toFixed(1)} kW.`);
      if (minutes !== null) detailParts.push(`Restzeit ${Math.round(minutes)} min.`);
      detailParts.push(`Energiequelle: ${rule.target.energySourcePolicy}.`);
      let requestedPowerW = averageKw !== null ? Math.round(averageKw * 1000) : null;
      if (requestedPowerW !== null && targetResource.minPowerW !== null && targetResource.minPowerW !== undefined) requestedPowerW = Math.max(requestedPowerW, Number(targetResource.minPowerW));
      if (requestedPowerW !== null && targetResource.maxPowerW !== null && targetResource.maxPowerW !== undefined && Number(targetResource.maxPowerW) > 0) requestedPowerW = Math.min(requestedPowerW, Number(targetResource.maxPowerW));
      return { ...base, status: 'request', action: 'charge-to-soc', requestedPowerW, headline: `SoC-Ziel ${targetSoc.toFixed(0)} % bis ${rule.target.dueTime}`, details: detailParts.join(' '), reasons: [] };
    }

    if (rule.ruleType === 'targetEnergy') {
      if (targetState.energyKWh === null) return { ...base, status: 'blocked', headline: 'Energiezähler fehlt', reasons: ['Für das Energieziel ist kein Simulationswert vorhanden.'] };
      const gap = Math.max(0, rule.target.value - targetState.energyKWh);
      if (gap <= 0) return { ...base, status: 'completed', headline: `Energieziel ${rule.target.value.toFixed(1)} kWh erreicht`, details: `Aktuell ${targetState.energyKWh.toFixed(1)} kWh.`, reasons: [] };
      const minutes = minutesUntilDeadline(simulation.nowLocal, rule.target.dueTime, rule.target.dueDay);
      const averageKw = minutes !== null && minutes > 0 ? gap / (minutes / 60) : null;
      let requestedPowerW = averageKw !== null ? Math.round(averageKw * 1000) : null;
      if (requestedPowerW !== null && targetResource.maxPowerW !== null && targetResource.maxPowerW !== undefined && Number(targetResource.maxPowerW) > 0) requestedPowerW = Math.min(requestedPowerW, Number(targetResource.maxPowerW));
      return { ...base, status: 'request', action: 'deliver-energy', requestedPowerW, headline: `Noch ${gap.toFixed(1)} kWh bis ${rule.target.dueTime}`, details: averageKw !== null ? `Erforderlicher Mittelwert ca. ${averageKw.toFixed(1)} kW.` : 'Zielzeit konnte nicht berechnet werden.', reasons: [] };
    }

    if (rule.ruleType === 'switchState') {
      const stateLabel = rule.target.state === 'off' ? 'Ausschalten' : (rule.target.state === 'release' ? 'Freigeben' : 'Einschalten');
      return { ...base, status: 'request', action: rule.target.state, requestedPowerW: rule.target.state === 'on' && targetResource.maxPowerW ? Number(targetResource.maxPowerW) : null, headline: `${stateLabel} anfordern`, details: 'Nur simulierte Zielanforderung; kein Datenpunkt wird beschrieben.', reasons: [] };
    }

    return { ...base, status: 'request', action: 'target-power', requestedPowerW: Math.round(rule.target.value), headline: `${Math.round(rule.target.value)} W anfordern`, details: 'Nur simuliertes Leistungsziel; bestehende Regler und Begrenzungen würden später weiterhin nachgelagert prüfen.', reasons: [] };
  }

  function simulate(configInput: any, resourcesInput: any, simulationInput?: any): AnyRecord {
    const config = record(configInput);
    const resources = normalizeCatalog(resourcesInput);
    const profileIds = list(config.profiles).map((profile) => text(profile.id));
    const rules = normalizeRules(config.rules, profileIds);
    const simulation = ensureSimulationStates(simulationInput || config.simulation, resources);
    if (!simulation.activeProfileId) simulation.activeProfileId = text(config.activeProfileId, profileIds[0] || '');
    const decisions = rules.map((rule) => evaluateRule(rule, config, resources, simulation));
    const nightReserveDecision = evaluateNightReserve(config, resources, simulation);
    if (nightReserveDecision) decisions.push(nightReserveDecision);

    const candidateIndexes = decisions
      .map((decision, index) => ({ decision, index }))
      .filter((entry) => ['request', 'safety'].includes(entry.decision.status))
      .sort((a, b) => {
        const safetyA = a.decision.status === 'safety' ? -1 : 0;
        const safetyB = b.decision.status === 'safety' ? -1 : 0;
        if (safetyA !== safetyB) return safetyA - safetyB;
        const requirementDiff = (REQUIREMENT_ORDER[a.decision.requirement] ?? 9) - (REQUIREMENT_ORDER[b.decision.requirement] ?? 9);
        if (requirementDiff) return requirementDiff;
        return Number(b.decision.priority || 0) - Number(a.decision.priority || 0);
      });
    const selectedTargets = new Set<string>();
    candidateIndexes.forEach(({ decision, index }) => {
      const currentDecision = decisions[index];
      if (!currentDecision) return;
      const target = text(decision.targetResourceId, `rule:${decision.ruleId}`);
      if (!selectedTargets.has(target)) {
        selectedTargets.add(target);
        currentDecision.selected = true;
      } else if (currentDecision.status === 'request') {
        currentDecision.status = 'shadowed';
        currentDecision.headline = 'Durch höher priorisierte Regel zurückgestellt';
      }
    });

    const sorted = decisions.slice().sort((a, b) => {
      const statusRank: AnyRecord = { safety: 0, request: 1, shadowed: 2, blocked: 3, inactive: 4, completed: 5 };
      const statusDiff = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      if (statusDiff) return statusDiff;
      const requirementDiff = (REQUIREMENT_ORDER[a.requirement] ?? 9) - (REQUIREMENT_ORDER[b.requirement] ?? 9);
      if (requirementDiff) return requirementDiff;
      return Number(b.priority || 0) - Number(a.priority || 0);
    });
    const summary = sorted.reduce((acc: AnyRecord, entry: AnyRecord) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    return {
      generatedAt: new Date().toISOString(),
      builderVersion: BUILDER_VERSION,
      simulationOnly: true,
      hardwareWrites: 0,
      activeProfileId: simulation.activeProfileId,
      decisions: sorted,
      selectedRequests: sorted.filter((entry) => entry.selected === true),
      summary,
    };
  }

  function catalogOptions(resources: AnyRecord[], selected: string, includeSystem = false): string {
    const options: string[] = [];
    if (includeSystem) options.push(`<option value="system"${selected === 'system' ? ' selected' : ''}>System / Wetter / Prognose</option>`);
    const knownIds = new Set(resources.map((resource) => text(resource.sourceId)).filter(Boolean));
    if (selected && selected !== 'system' && !knownIds.has(selected)) {
      options.push(`<option value="${esc(selected)}" selected>⚠ Zuordnung fehlt (${esc(selected)})</option>`);
    }
    resources.forEach((resource) => {
      const participation = resource.strategyEnabled === true ? '✓ vorgemerkt' : '⚠ nicht vorgemerkt';
      options.push(`<option value="${esc(resource.sourceId)}"${selected === resource.sourceId ? ' selected' : ''}>${esc(resource.name)} · ${esc(resource.resourceType)} · ${participation}</option>`);
    });
    return options.join('');
  }

  function profileOptions(profiles: AnyRecord[], selected: string): string {
    const options = [
      `<option value="active"${selected === 'active' ? ' selected' : ''}>Aktives Profil</option>`,
      `<option value="all"${selected === 'all' ? ' selected' : ''}>Alle Profile</option>`,
    ];
    profiles.forEach((profile) => options.push(`<option value="profile:${esc(profile.id)}"${selected === `profile:${profile.id}` || selected === profile.id ? ' selected' : ''}>Nur ${esc(profile.name)}</option>`));
    return options.join('');
  }

  function metricOptions(sourceRef: string, selected: string): string {
    const metrics = sourceRef === 'system' ? SYSTEM_METRICS : RESOURCE_METRICS;
    return metrics.map((metric) => `<option value="${esc(metric)}"${selected === metric ? ' selected' : ''}>${esc(metricLabel(metric))}${metricUnit(metric) ? ` (${esc(metricUnit(metric))})` : ''}</option>`).join('');
  }

  function operatorOptions(metric: string, selected: string): string {
    const allowed = BOOLEAN_METRICS.has(metric) || STRING_METRICS.has(metric) ? ['eq', 'neq'] : OPERATORS;
    return allowed.map((operator) => `<option value="${esc(operator)}"${selected === operator ? ' selected' : ''}>${esc(operatorLabel(operator))}</option>`).join('');
  }

  function conditionValueField(ruleIndex: number, conditionIndex: number, condition: AnyRecord): string {
    if (BOOLEAN_METRICS.has(condition.metric)) {
      return `<select data-os-condition-rule="${ruleIndex}" data-os-condition-index="${conditionIndex}" data-os-condition-field="value"><option value="true"${condition.value === true ? ' selected' : ''}>Ja</option><option value="false"${condition.value !== true ? ' selected' : ''}>Nein</option></select>`;
    }
    const type = STRING_METRICS.has(condition.metric) ? 'text' : 'number';
    return `<input type="${type}" value="${esc(condition.value)}" data-os-condition-rule="${ruleIndex}" data-os-condition-index="${conditionIndex}" data-os-condition-field="value">`;
  }

  function conditionsHtml(rule: AnyRecord, ruleIndex: number, resources: AnyRecord[]): string {
    if (!rule.conditions.length) return '<div class="nw-os-rule-empty">Keine Bedingungen: Die Regel ist grundsätzlich freigegeben, solange Sicherheitsgrenzen nicht blockieren.</div>';
    return rule.conditions.map((condition: AnyRecord, conditionIndex: number) => `
      <div class="nw-os-condition">
        <label class="nw-field nw-field--switch"><span>Aktiv</span><input type="checkbox" data-os-condition-rule="${ruleIndex}" data-os-condition-index="${conditionIndex}" data-os-condition-field="enabled" ${condition.enabled !== false ? 'checked' : ''}></label>
        <label class="nw-field"><span>Quelle</span><select data-os-condition-rule="${ruleIndex}" data-os-condition-index="${conditionIndex}" data-os-condition-field="sourceRef">${catalogOptions(resources, condition.sourceRef, true)}</select></label>
        <label class="nw-field"><span>Messgröße</span><select data-os-condition-rule="${ruleIndex}" data-os-condition-index="${conditionIndex}" data-os-condition-field="metric">${metricOptions(condition.sourceRef, condition.metric)}</select></label>
        <label class="nw-field"><span>Vergleich</span><select data-os-condition-rule="${ruleIndex}" data-os-condition-index="${conditionIndex}" data-os-condition-field="operator">${operatorOptions(condition.metric, condition.operator)}</select></label>
        <label class="nw-field"><span>Wert</span>${conditionValueField(ruleIndex, conditionIndex, condition)}${metricUnit(condition.metric) ? `<small>${esc(metricUnit(condition.metric))}</small>` : ''}</label>
        <button type="button" class="nw-btn nw-btn--small" data-os-delete-condition="${ruleIndex}:${conditionIndex}">Bedingung löschen</button>
      </div>`).join('');
  }

  function scheduleFieldsHtml(rule: AnyRecord, index: number): string {
    const schedule = normalizeSchedule(rule.schedule, rule.ruleType);
    const weekdayLabels: AnyRecord = { mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So' };
    const modeFields = schedule.mode === 'dailyTime'
      ? `<label class="nw-field"><span>Tägliche Prüfzeit</span><input type="time" value="${esc(schedule.atTime)}" data-os-rule-index="${index}" data-os-rule-schedule-field="atTime"></label><label class="nw-field"><span>Prüffenster</span><input type="number" min="1" max="1440" value="${esc(schedule.windowMinutes)}" data-os-rule-index="${index}" data-os-rule-schedule-field="windowMinutes"><small>min nach Prüfzeit</small></label>`
      : (schedule.mode === 'timeWindow'
        ? `<label class="nw-field"><span>Zeitfenster von</span><input type="time" value="${esc(schedule.startTime)}" data-os-rule-index="${index}" data-os-rule-schedule-field="startTime"></label><label class="nw-field"><span>Zeitfenster bis</span><input type="time" value="${esc(schedule.endTime)}" data-os-rule-index="${index}" data-os-rule-schedule-field="endTime"></label>`
        : '<div class="nw-os-schedule-note">Die Regel wird fortlaufend bewertet, solange Profil, Messwertqualität und Bedingungen passen.</div>');
    return `
      <div class="nw-os-schedule">
        <div class="nw-os-section-label">Zeitplan</div>
        <div class="nw-config-grid">
          <label class="nw-field"><span>Bewertung</span><select data-os-rule-index="${index}" data-os-rule-schedule-field="mode"><option value="continuous"${schedule.mode === 'continuous' ? ' selected' : ''}>Fortlaufend</option><option value="dailyTime"${schedule.mode === 'dailyTime' ? ' selected' : ''}>Tägliche Prüfzeit</option><option value="timeWindow"${schedule.mode === 'timeWindow' ? ' selected' : ''}>Zeitfenster</option></select></label>
          ${modeFields}
        </div>
        <div class="nw-os-weekdays"><span>Wochentage</span>${WEEKDAYS.map((day) => `<label><input type="checkbox" data-os-rule-weekday-index="${index}" data-os-rule-weekday="${day}" ${schedule.weekdays.includes(day) ? 'checked' : ''}>${weekdayLabels[day]}</label>`).join('')}</div>
      </div>`;
  }

  function targetFieldsHtml(rule: AnyRecord, index: number): string {
    if (rule.ruleType === 'thermalPause') {
      return `
        <label class="nw-field"><span>Maximale Abschaltdauer</span><input type="number" min="1" max="10080" value="${esc(rule.safety.maxOffDurationMin)}" data-os-rule-index="${index}" data-os-rule-safety-field="maxOffDurationMin"><small>min</small></label>
        <label class="nw-field"><span>Mindestlaufzeit vor Pause</span><input type="number" min="0" max="1440" value="${esc(rule.safety.minRunDurationMin)}" data-os-rule-index="${index}" data-os-rule-safety-field="minRunDurationMin"><small>min</small></label>
        <label class="nw-field"><span>Mindeststillstandszeit</span><input type="number" min="0" max="1440" value="${esc(rule.safety.minStopDurationMin)}" data-os-rule-index="${index}" data-os-rule-safety-field="minStopDurationMin"><small>min</small></label>
        <label class="nw-field"><span>Wiedereinschalten spätestens bei</span><input type="number" step="0.1" min="-100" max="200" value="${esc(rule.safety.maxTemperatureC)}" data-os-rule-index="${index}" data-os-rule-safety-field="maxTemperatureC"><small>°C</small></label>
        <label class="nw-field"><span>Temperatur-Hysterese</span><input type="number" step="0.1" min="0" max="50" value="${esc(rule.safety.hysteresisC)}" data-os-rule-index="${index}" data-os-rule-safety-field="hysteresisC"><small>K</small></label>
        <label class="nw-field nw-field--switch"><span>Bei veraltetem Wert sicher freigeben</span><input type="checkbox" data-os-rule-index="${index}" data-os-rule-safety-field="requireFresh" ${rule.safety.requireFresh !== false ? 'checked' : ''}></label>
        <label class="nw-field nw-field--switch"><span>Online-Status erforderlich</span><input type="checkbox" data-os-rule-index="${index}" data-os-rule-safety-field="requireOnline" ${rule.safety.requireOnline !== false ? 'checked' : ''}></label>
        <label class="nw-field nw-field--switch"><span>Bei Alarm blockieren/freigeben</span><input type="checkbox" data-os-rule-index="${index}" data-os-rule-safety-field="blockOnAlarm" ${rule.safety.blockOnAlarm !== false ? 'checked' : ''}></label>`;
    }
    if (rule.ruleType === 'targetSoc' || rule.ruleType === 'targetEnergy') {
      return `
        <label class="nw-field"><span>${rule.ruleType === 'targetSoc' ? 'Ziel-SoC' : 'Zielenergie'}</span><input type="number" step="0.1" min="0" max="${rule.ruleType === 'targetSoc' ? '100' : '1000000'}" value="${esc(rule.target.value)}" data-os-rule-index="${index}" data-os-rule-target-field="value"><small>${rule.ruleType === 'targetSoc' ? '%' : 'kWh'}</small></label>
        <label class="nw-field"><span>Zielzeit</span><input type="time" value="${esc(rule.target.dueTime)}" data-os-rule-index="${index}" data-os-rule-target-field="dueTime"></label>
        <label class="nw-field"><span>Zieltag</span><select data-os-rule-index="${index}" data-os-rule-target-field="dueDay"><option value="today"${rule.target.dueDay === 'today' ? ' selected' : ''}>Heute / nächster erreichbarer Zeitpunkt</option><option value="next-day"${rule.target.dueDay === 'next-day' ? ' selected' : ''}>Nächster Tag</option></select></label>
        <label class="nw-field"><span>Energiequelle</span><select data-os-rule-index="${index}" data-os-rule-target-field="energySourcePolicy"><option value="pv-only"${rule.target.energySourcePolicy === 'pv-only' ? ' selected' : ''}>Nur PV</option><option value="pv-preferred"${rule.target.energySourcePolicy === 'pv-preferred' ? ' selected' : ''}>PV bevorzugt</option><option value="cheap-grid"${rule.target.energySourcePolicy === 'cheap-grid' ? ' selected' : ''}>Nur günstiger Netzstrom ergänzend</option><option value="grid-allowed"${rule.target.energySourcePolicy === 'grid-allowed' ? ' selected' : ''}>Netzstrom erlaubt</option></select></label>`;
    }
    if (rule.ruleType === 'switchState') {
      return `<label class="nw-field"><span>Anforderung</span><select data-os-rule-index="${index}" data-os-rule-target-field="state"><option value="on"${rule.target.state === 'on' ? ' selected' : ''}>Einschalten / Freigeben</option><option value="off"${rule.target.state === 'off' ? ' selected' : ''}>Ausschalten / Sperren</option><option value="release"${rule.target.state === 'release' ? ' selected' : ''}>Regelung freigeben</option></select></label>`;
    }
    return `<label class="nw-field"><span>Leistungsziel</span><input type="number" step="1" min="0" max="1000000000" value="${esc(rule.target.value)}" data-os-rule-index="${index}" data-os-rule-target-field="value"><small>W</small></label>`;
  }

  function ruleCardHtml(rule: AnyRecord, index: number, profiles: AnyRecord[], resources: AnyRecord[], liveEnabled = false): string {
    const validation = validateRule(rule, resources, text(profiles[0]?.id));
    const stateBadge = validation.valid
      ? '<span class="nw-os-rule-badge nw-os-rule-badge--ready">Konfiguration plausibel</span>'
      : `<span class="nw-os-rule-badge nw-os-rule-badge--error">${validation.errors.length} Fehler</span>`;
    const warningBadge = validation.warnings.length ? `<span class="nw-os-rule-badge nw-os-rule-badge--warn">${validation.warnings.length} Hinweis${validation.warnings.length === 1 ? '' : 'e'}</span>` : '';
    return `
      <div class="nw-os-rule" data-os-rule-card="${index}">
        <div class="nw-os-rule__header">
          <div>
            <div class="nw-os-rule__title">${esc(rule.name)}</div>
            <div class="nw-os-rule__subtitle">${esc(ruleTypeLabel(rule.ruleType))} · ${esc(resourceName(resources, rule.targetResourceId))}</div>
            <div class="nw-os-rule-badges"><span class="nw-os-rule-badge nw-os-rule-badge--${requirementTone(rule.requirement)}">${requirementLabel(rule.requirement)}</span>${stateBadge}${warningBadge}<span class="nw-os-rule-badge nw-os-rule-badge--${liveEnabled ? 'ready' : 'locked'}">${liveEnabled ? 'Live-Anforderung möglich' : 'Nur Simulation'}</span></div>
          </div>
          <button type="button" class="nw-btn nw-btn--small" data-os-delete-rule="${index}">Regel löschen</button>
        </div>
        <div class="nw-config-grid">
          <label class="nw-field nw-field--switch"><span>Regel verwenden</span><input type="checkbox" data-os-rule-index="${index}" data-os-rule-field="enabled" ${rule.enabled !== false ? 'checked' : ''}></label>
          <label class="nw-field"><span>Name</span><input type="text" value="${esc(rule.name)}" data-os-rule-index="${index}" data-os-rule-field="name"></label>
          <label class="nw-field"><span>Klasse</span><select data-os-rule-index="${index}" data-os-rule-field="requirement"><option value="must"${rule.requirement === 'must' ? ' selected' : ''}>MUSS · Schutz/Pflichtziel</option><option value="should"${rule.requirement === 'should' ? ' selected' : ''}>SOLL · Optimierungsziel</option><option value="can"${rule.requirement === 'can' ? ' selected' : ''}>KANN · Überschuss/Komfort</option></select></label>
          <label class="nw-field"><span>Priorität innerhalb der Klasse</span><input type="number" min="1" max="100" value="${esc(rule.priority)}" data-os-rule-index="${index}" data-os-rule-field="priority"><small>100 = zuerst</small></label>
          <label class="nw-field"><span>Profil</span><select data-os-rule-index="${index}" data-os-rule-field="profileScope">${profileOptions(profiles, rule.profileScope)}</select></label>
          <label class="nw-field"><span>Regelbaustein</span><select data-os-rule-index="${index}" data-os-rule-field="ruleType"><option value="thermalPause"${rule.ruleType === 'thermalPause' ? ' selected' : ''}>Thermische Pause</option><option value="targetSoc"${rule.ruleType === 'targetSoc' ? ' selected' : ''}>SoC-Ziel</option><option value="targetEnergy"${rule.ruleType === 'targetEnergy' ? ' selected' : ''}>Energieziel</option><option value="switchState"${rule.ruleType === 'switchState' ? ' selected' : ''}>Ein-/Aus-Anforderung</option><option value="targetPower"${rule.ruleType === 'targetPower' ? ' selected' : ''}>Leistungsziel</option></select></label>
          <label class="nw-field"><span>Zielressource</span><select data-os-rule-index="${index}" data-os-rule-field="targetResourceId"><option value="">Bitte zuordnen …</option>${catalogOptions(resources, rule.targetResourceId)}</select></label>
          ${targetFieldsHtml(rule, index)}
        </div>
        ${scheduleFieldsHtml(rule, index)}
        <div class="nw-os-rule__conditions-header"><strong>Bedingungen</strong><button type="button" class="nw-btn nw-btn--small" data-os-add-condition="${index}">Bedingung hinzufügen</button></div>
        <div class="nw-os-rule__conditions">${conditionsHtml(rule, index, resources)}</div>
        ${validation.errors.length || validation.warnings.length ? `<div class="nw-os-rule-validation">${validation.errors.map((entry: string) => `<div class="nw-os-rule-validation__error">${esc(entry)}</div>`).join('')}${validation.warnings.map((entry: string) => `<div class="nw-os-rule-validation__warn">${esc(entry)}</div>`).join('')}</div>` : ''}
      </div>`;
  }

  function cascadeHtml(rules: AnyRecord[], resources: AnyRecord[]): string {
    const enabled = rules.filter((rule) => rule.enabled !== false).slice().sort((a, b) => {
      const requirementDiff = (REQUIREMENT_ORDER[a.requirement] ?? 9) - (REQUIREMENT_ORDER[b.requirement] ?? 9);
      if (requirementDiff) return requirementDiff;
      return Number(b.priority || 0) - Number(a.priority || 0);
    });
    if (!enabled.length) return '<div class="nw-os-rule-empty">Noch keine aktiven Regeln. Die Prioritätskaskade entsteht automatisch aus Klasse und Priorität.</div>';
    return enabled.map((rule, index) => `<div class="nw-os-cascade__row"><span class="nw-os-cascade__position">${index + 1}</span><span class="nw-os-rule-badge nw-os-rule-badge--${requirementTone(rule.requirement)}">${requirementLabel(rule.requirement)}</span><strong>${esc(rule.name)}</strong><span>${esc(resourceName(resources, rule.targetResourceId))}</span><span>Priorität ${esc(rule.priority)}</span></div>`).join('');
  }

  function simulationResourceHtml(resource: AnyRecord, index: number, state: AnyRecord): string {
    return `
      <div class="nw-os-sim-resource">
        <div class="nw-os-sim-resource__title">${esc(resource.name)}<small>${esc(resource.resourceType)}${resource.resourceSubtype ? ` · ${esc(resource.resourceSubtype)}` : ''}</small></div>
        <div class="nw-os-sim-grid">
          <label class="nw-field"><span>SoC</span><input type="number" step="0.1" min="0" max="100" value="${esc(state.socPct ?? '')}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="socPct"><small>%</small></label>
          <label class="nw-field"><span>Temperatur</span><input type="number" step="0.1" min="-100" max="200" value="${esc(state.temperatureC ?? '')}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="temperatureC"><small>°C</small></label>
          <label class="nw-field"><span>Leistung</span><input type="number" step="1" value="${esc(state.powerW ?? '')}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="powerW"><small>W</small></label>
          <label class="nw-field"><span>Energie</span><input type="number" step="0.1" value="${esc(state.energyKWh ?? '')}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="energyKWh"><small>kWh</small></label>
          <label class="nw-field"><span>Nutzbare Kapazität</span><input type="number" step="0.1" min="0" value="${esc(state.capacityKWh ?? resource.usableCapacityKWh ?? '')}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="capacityKWh"><small>kWh</small></label>
          <label class="nw-field"><span>Abschaltdauer</span><input type="number" step="1" min="0" value="${esc(state.offDurationMin)}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="offDurationMin"><small>min</small></label>
          <label class="nw-field"><span>Laufzeit</span><input type="number" step="1" min="0" value="${esc(state.runDurationMin)}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="runDurationMin"><small>min</small></label>
          <label class="nw-field"><span>Zustand</span><input type="text" value="${esc(state.state)}" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="state"></label>
          <label class="nw-field nw-field--switch"><span>Online</span><input type="checkbox" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="online" ${state.online !== false ? 'checked' : ''}></label>
          <label class="nw-field nw-field--switch"><span>Messwerte aktuell</span><input type="checkbox" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="fresh" ${state.fresh !== false ? 'checked' : ''}></label>
          <label class="nw-field nw-field--switch"><span>Alarm</span><input type="checkbox" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="alarm" ${state.alarm === true ? 'checked' : ''}></label>
          <label class="nw-field nw-field--switch"><span>Aktiv</span><input type="checkbox" data-os-sim-resource="${esc(resource.sourceId)}" data-os-sim-resource-field="active" ${state.active === true ? 'checked' : ''}></label>
        </div>
      </div>`;
  }

  function decisionTone(status: string): string {
    const tones: AnyRecord = { safety: 'safety', request: 'request', shadowed: 'shadowed', blocked: 'blocked', inactive: 'inactive', completed: 'completed' };
    return tones[status] || 'inactive';
  }

  function decisionStatusLabel(status: string): string {
    const labels: AnyRecord = { safety: 'SICHERHEIT', request: 'ANFORDERUNG', shadowed: 'ZURÜCKGESTELLT', blocked: 'BLOCKIERT', inactive: 'INAKTIV', completed: 'ERREICHT' };
    return labels[status] || status;
  }

  function simulationResultHtml(result: AnyRecord | null): string {
    if (!result) return '<div class="nw-os-rule-empty">Noch kein Trockenlauf berechnet. Die Simulation arbeitet ausschließlich mit den unten eingetragenen Testwerten und führt keine Datenpunkt-Schreibvorgänge aus.</div>';
    const decisions = list(result.decisions);
    return `
      <div class="nw-os-sim-summary"><strong>Trockenlauf ausgewertet</strong><span>Profil: ${esc(result.activeProfileId)}</span><span>${decisions.length} Entscheidungen</span><span>${list(result.selectedRequests).length} ausgewählte Anforderungen</span><span>Hardware-Schreibvorgänge: 0</span></div>
      <div class="nw-os-decisions">${decisions.map((decision) => `
        <div class="nw-os-decision nw-os-decision--${decisionTone(decision.status)}">
          <div class="nw-os-decision__header"><span class="nw-os-rule-badge nw-os-rule-badge--${requirementTone(decision.requirement)}">${requirementLabel(decision.requirement)}</span><span class="nw-os-decision__status">${decisionStatusLabel(decision.status)}</span>${decision.selected ? '<span class="nw-os-rule-badge nw-os-rule-badge--ready">in Kaskade ausgewählt</span>' : ''}</div>
          <strong>${esc(decision.name)}</strong>
          <div class="nw-os-decision__target">${esc(decision.targetResourceName)} · ${esc(ruleTypeLabel(decision.ruleType))} · Priorität ${esc(decision.priority)}</div>
          <div class="nw-os-decision__headline">${esc(decision.headline)}</div>
          ${decision.requestedPowerW !== null && decision.requestedPowerW !== undefined ? `<div class="nw-os-decision__details">Simulierte Zielanforderung: ${esc(Math.round(decision.requestedPowerW))} W · Aktion: ${esc(decision.action || '—')}</div>` : ''}
          ${decision.details ? `<div class="nw-os-decision__details">${esc(decision.details)}</div>` : ''}
          ${Array.isArray(decision.reasons) && decision.reasons.length ? `<ul>${decision.reasons.map((reason: any) => `<li>${esc(reason)}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}</div>`;
  }

  function styles(): string {
    return `<style>
      #${ROOT_ID} .nw-os-rule-toolbar{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
      #${ROOT_ID} .nw-os-rule-toolbar .nw-field{min-width:220px}
      #${ROOT_ID} .nw-os-rule{border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:14px;margin-top:12px;background:rgba(255,255,255,.025)}
      #${ROOT_ID} .nw-os-rule__header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
      #${ROOT_ID} .nw-os-rule__title{font-size:1.02rem;font-weight:750}
      #${ROOT_ID} .nw-os-rule__subtitle{opacity:.72;margin-top:4px}
      #${ROOT_ID} .nw-os-rule-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
      #${ROOT_ID} .nw-os-rule-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:.76rem;border:1px solid rgba(255,255,255,.15)}
      #${ROOT_ID} .nw-os-rule-badge--must{border-color:rgba(239,83,80,.55);background:rgba(239,83,80,.12)}
      #${ROOT_ID} .nw-os-rule-badge--should{border-color:rgba(255,183,77,.55);background:rgba(255,183,77,.12)}
      #${ROOT_ID} .nw-os-rule-badge--can{border-color:rgba(100,181,246,.55);background:rgba(100,181,246,.12)}
      #${ROOT_ID} .nw-os-rule-badge--ready{border-color:rgba(119,185,0,.55);background:rgba(119,185,0,.12)}
      #${ROOT_ID} .nw-os-rule-badge--warn{border-color:rgba(255,183,77,.5);background:rgba(255,183,77,.08)}
      #${ROOT_ID} .nw-os-rule-badge--error{border-color:rgba(239,83,80,.58);background:rgba(239,83,80,.10)}
      #${ROOT_ID} .nw-os-rule-badge--locked{border-color:rgba(100,181,246,.35);background:rgba(100,181,246,.07);opacity:.82}
      #${ROOT_ID} .nw-os-rule__conditions-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;margin-bottom:9px}
      #${ROOT_ID} .nw-os-schedule{margin-top:13px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.018)}
      #${ROOT_ID} .nw-os-schedule .nw-os-section-label{margin-top:0}
      #${ROOT_ID} .nw-os-schedule-note{align-self:end;padding:10px;opacity:.72}
      #${ROOT_ID} .nw-os-weekdays{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px}
      #${ROOT_ID} .nw-os-weekdays>span{font-weight:650;margin-right:3px}
      #${ROOT_ID} .nw-os-weekdays label{display:inline-flex;gap:5px;align-items:center;padding:5px 7px;border:1px solid rgba(255,255,255,.1);border-radius:7px}
      #${ROOT_ID} .nw-os-condition{display:grid;grid-template-columns:minmax(90px,.55fr) minmax(220px,1.3fr) minmax(180px,1fr) minmax(90px,.6fr) minmax(150px,.8fr) auto;gap:8px;align-items:end;padding:9px 0;border-top:1px solid rgba(255,255,255,.08)}
      #${ROOT_ID} .nw-os-condition:first-child{border-top:0}
      #${ROOT_ID} .nw-os-rule-empty{padding:12px;border:1px dashed rgba(255,255,255,.18);border-radius:10px;opacity:.72;line-height:1.45}
      #${ROOT_ID} .nw-os-rule-validation{margin-top:10px;display:grid;gap:5px}
      #${ROOT_ID} .nw-os-rule-validation__error{color:#ff9a98}
      #${ROOT_ID} .nw-os-rule-validation__warn{color:#ffd28c}
      #${ROOT_ID} .nw-os-cascade{display:grid;gap:7px}
      #${ROOT_ID} .nw-os-cascade__row{display:grid;grid-template-columns:34px auto minmax(220px,1fr) minmax(180px,.8fr) auto;gap:9px;align-items:center;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.022)}
      #${ROOT_ID} .nw-os-cascade__position{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.08);font-weight:700}
      #${ROOT_ID} .nw-os-sim-system{margin-bottom:14px}
      #${ROOT_ID} .nw-os-sim-resources{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:10px}
      #${ROOT_ID} .nw-os-sim-resource{border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:11px;background:rgba(255,255,255,.02)}
      #${ROOT_ID} .nw-os-sim-resource__title{font-weight:700;margin-bottom:9px}
      #${ROOT_ID} .nw-os-sim-resource__title small{display:block;opacity:.65;font-weight:400;margin-top:2px}
      #${ROOT_ID} .nw-os-sim-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #${ROOT_ID} .nw-os-sim-summary{display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:10px;border-radius:10px;border:1px solid rgba(119,185,0,.35);background:rgba(119,185,0,.08);margin-bottom:10px}
      #${ROOT_ID} .nw-os-decisions{display:grid;gap:9px}
      #${ROOT_ID} .nw-os-decision{border:1px solid rgba(255,255,255,.1);border-left-width:4px;border-radius:10px;padding:11px;background:rgba(255,255,255,.025)}
      #${ROOT_ID} .nw-os-decision--safety{border-left-color:#ef5350}
      #${ROOT_ID} .nw-os-decision--request{border-left-color:#76b900}
      #${ROOT_ID} .nw-os-decision--shadowed{border-left-color:#64b5f6;opacity:.82}
      #${ROOT_ID} .nw-os-decision--blocked{border-left-color:#ffb74d}
      #${ROOT_ID} .nw-os-decision--inactive{border-left-color:#888;opacity:.72}
      #${ROOT_ID} .nw-os-decision--completed{border-left-color:#66bb6a;opacity:.82}
      #${ROOT_ID} .nw-os-decision__header{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:7px}
      #${ROOT_ID} .nw-os-decision__status{font-size:.75rem;letter-spacing:.05em;opacity:.75}
      #${ROOT_ID} .nw-os-decision__target{opacity:.66;font-size:.86rem;margin-top:2px}
      #${ROOT_ID} .nw-os-decision__headline{font-weight:650;margin-top:7px}
      #${ROOT_ID} .nw-os-decision__details{opacity:.82;line-height:1.4;margin-top:4px}
      #${ROOT_ID} .nw-os-decision ul{margin:7px 0 0 18px;padding:0;opacity:.78}
      @media(max-width:1180px){#${ROOT_ID} .nw-os-condition{grid-template-columns:repeat(2,minmax(0,1fr))}#${ROOT_ID} .nw-os-cascade__row{grid-template-columns:34px auto 1fr}#${ROOT_ID} .nw-os-cascade__row span:last-child{grid-column:3}}
      @media(max-width:700px){#${ROOT_ID} .nw-os-condition,#${ROOT_ID} .nw-os-sim-grid{grid-template-columns:1fr}#${ROOT_ID} .nw-os-sim-resources{grid-template-columns:1fr}#${ROOT_ID} .nw-os-cascade__row{grid-template-columns:34px 1fr}#${ROOT_ID} .nw-os-cascade__row>*:nth-child(n+3){grid-column:1 / -1}}
    </style>`;
  }

  function render(configInput: any, resourcesInput: any): string {
    const config = record(configInput);
    const resources = normalizeCatalog(resourcesInput);
    const profiles = list(config.profiles);
    const profileIds = profiles.map((profile) => text(profile.id));
    const rules = normalizeRules(config.rules, profileIds);
    const autoControl = record(config.autoControl);
    const liveEnabled = config.enabled === true
      && text(config.mode) === 'active'
      && config.commissioningConfirmed === true
      && config.controlTakeoverEnabled === true
      && config.writeExecutionEnabled === true
      && autoControl.enabled !== false
      && text(autoControl.stage) === 'active';
    const simulation = ensureSimulationStates(config.simulation, resources);
    if (!simulation.activeProfileId) simulation.activeProfileId = text(config.activeProfileId, profileIds[0] || '');
    const profileSelect = profiles.map((profile) => `<option value="${esc(profile.id)}"${simulation.activeProfileId === profile.id ? ' selected' : ''}>${esc(profile.name)}</option>`).join('');
    return `${styles()}
      <div class="nw-os-section">
        <div class="nw-os-section__header">
          <div><div class="nw-os-section__title">Regelbausteine und Prioritätskaskade</div><div class="nw-os-section__subtitle">MUSS schützt Sicherheit und Pflichtziele, SOLL optimiert den Betrieb, KANN nutzt verbleibenden Überschuss. ${liveEnabled ? 'Freigegebene Regeln liefern kurzlebige Anforderungen an die vorhandenen EOS-Fachmodule.' : 'Im aktuellen Betriebszustand werden die Bausteine nur simuliert.'}</div></div>
          <div class="nw-os-rule-toolbar"><label class="nw-field"><span>Neuer Baustein</span><select id="osNewRuleType"><option value="thermalPause">Thermische Pause</option><option value="targetSoc" selected>SoC-Ziel</option><option value="targetEnergy">Energieziel</option><option value="switchState">Ein-/Aus-Anforderung</option><option value="targetPower">Leistungsziel</option></select></label><button id="osAddRule" type="button" class="nw-btn nw-btn--primary">Regel hinzufügen</button><button id="osAddCustomerExample" type="button" class="nw-btn">Kundenbeispiel vorbereiten</button></div>
        </div>
        <div class="nw-os-lock-note">${liveEnabled ? '<strong>Live-Anforderungen sind freigegeben.</strong> Die Strategy Engine schreibt trotzdem keinen Geräte-Datenpunkt direkt; Lade-, Speicher-, Thermik- und Heizstabmodule bleiben Single Writer.' : '<strong>Beobachtungs-/Simulationsbetrieb.</strong> Es werden keine aktiven Anforderungen an Geräte erzeugt.'}</div>
        <div id="osRules">${rules.length ? rules.map((rule, index) => ruleCardHtml(rule, index, profiles, resources, liveEnabled)).join('') : '<div class="nw-os-rule-empty">Noch keine Regel angelegt.</div>'}</div>
        <div class="nw-os-section-label">Berechnete Prioritätskaskade</div>
        <div class="nw-os-cascade">${cascadeHtml(rules, resources)}</div>
      </div>

      <div class="nw-os-section">
        <div class="nw-os-section__header">
          <div><div class="nw-os-section__title">Trockenlauf / Simulation</div><div class="nw-os-section__subtitle">Manuelle Testwerte prüfen dieselbe Prioritätslogik unabhängig vom Live-Betrieb. Die Simulation selbst schreibt niemals Gerätewerte.</div></div>
          <div class="nw-os-rule-toolbar"><button id="osLoadDemoScenario" type="button" class="nw-btn">Beispielwerte laden</button><button id="osRunSimulation" type="button" class="nw-btn nw-btn--primary">Simulation berechnen</button></div>
        </div>
        <div id="osSimulationResult">${simulationResultHtml(lastSimulationResult)}</div>
        <div class="nw-os-section-label">System- und Prognosewerte</div>
        <div class="nw-config-grid nw-os-sim-system">
          <label class="nw-field"><span>Simulationszeit</span><input type="datetime-local" value="${esc(simulation.nowLocal)}" data-os-simulation-field="nowLocal"></label>
          <label class="nw-field"><span>Simuliertes Profil</span><select data-os-simulation-field="activeProfileId">${profileSelect}</select></label>
          <label class="nw-field"><span>Außentemperatur</span><input type="number" step="0.1" value="${esc(simulation.outsideTemperatureC)}" data-os-simulation-field="outsideTemperatureC"><small>°C</small></label>
          <label class="nw-field"><span>PV-Prognose</span><input type="number" step="0.1" min="0" value="${esc(simulation.pvForecastKWh)}" data-os-simulation-field="pvForecastKWh"><small>kWh</small></label>
          <label class="nw-field"><span>PV-Überschuss</span><input type="number" step="1" value="${esc(simulation.pvSurplusW)}" data-os-simulation-field="pvSurplusW"><small>W</small></label>
          <label class="nw-field"><span>Netzleistung</span><input type="number" step="1" value="${esc(simulation.gridPowerW)}" data-os-simulation-field="gridPowerW"><small>W (+ Bezug)</small></label>
          <label class="nw-field"><span>Strompreis</span><input type="number" step="0.1" value="${esc(simulation.electricityPriceCtKWh)}" data-os-simulation-field="electricityPriceCtKWh"><small>ct/kWh</small></label>
          <label class="nw-field nw-field--switch"><span>Wochenende</span><input type="checkbox" data-os-simulation-field="weekend" ${simulation.weekend ? 'checked' : ''}></label>
          <label class="nw-field nw-field--switch"><span>Günstiger Tarif</span><input type="checkbox" data-os-simulation-field="cheapTariff" ${simulation.cheapTariff ? 'checked' : ''}></label>
        </div>
        <div class="nw-os-section-label">Ressourcen-Testwerte</div>
        <div class="nw-os-sim-resources">${resources.length ? resources.map((resource, index) => simulationResourceHtml(resource, index, simulation.resourceStates[resource.sourceId])).join('') : '<div class="nw-os-rule-empty">Noch keine Ressourcen verfügbar.</div>'}</div>
      </div>`;
  }

  function syncRulesFromDom(configInput: any): AnyRecord {
    const config = clone(record(configInput));
    const profileIds = list(config.profiles).map((profile) => text(profile.id));
    const rules = normalizeRules(config.rules, profileIds).map((entry) => clone(entry));
    document.querySelectorAll<HTMLElement>('[data-os-rule-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-rule-index'), -1, -1, MAX_RULES);
      const field = text(node.getAttribute('data-os-rule-field'));
      if (index < 0 || !rules[index] || !field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') rules[index][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) rules[index][field] = node.value;
    });
    document.querySelectorAll<HTMLElement>('[data-os-rule-target-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-rule-index'), -1, -1, MAX_RULES);
      const field = text(node.getAttribute('data-os-rule-target-field'));
      if (index < 0 || !rules[index] || !field) return;
      rules[index].target = record(rules[index].target);
      if (node instanceof HTMLInputElement && node.type === 'checkbox') rules[index].target[field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) rules[index].target[field] = node.value;
    });
    document.querySelectorAll<HTMLElement>('[data-os-rule-safety-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-rule-index'), -1, -1, MAX_RULES);
      const field = text(node.getAttribute('data-os-rule-safety-field'));
      if (index < 0 || !rules[index] || !field) return;
      rules[index].safety = record(rules[index].safety);
      if (node instanceof HTMLInputElement && node.type === 'checkbox') rules[index].safety[field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) rules[index].safety[field] = node.value;
    });
    document.querySelectorAll<HTMLElement>('[data-os-rule-schedule-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-rule-index'), -1, -1, MAX_RULES);
      const field = text(node.getAttribute('data-os-rule-schedule-field'));
      if (index < 0 || !rules[index] || !field) return;
      rules[index].schedule = record(rules[index].schedule);
      if (node instanceof HTMLInputElement && node.type === 'checkbox') rules[index].schedule[field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) rules[index].schedule[field] = node.value;
    });
    rules.forEach((rule) => { rule.schedule = record(rule.schedule); rule.schedule.weekdays = []; });
    document.querySelectorAll<HTMLInputElement>('[data-os-rule-weekday]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-rule-weekday-index'), -1, -1, MAX_RULES);
      const day = text(node.getAttribute('data-os-rule-weekday'));
      if (index < 0 || !rules[index] || !WEEKDAYS.includes(day) || !node.checked) return;
      rules[index].schedule.weekdays.push(day);
    });
    document.querySelectorAll<HTMLElement>('[data-os-condition-field]').forEach((node) => {
      const ruleIndex = integer(node.getAttribute('data-os-condition-rule'), -1, -1, MAX_RULES);
      const conditionIndex = integer(node.getAttribute('data-os-condition-index'), -1, -1, MAX_CONDITIONS);
      const field = text(node.getAttribute('data-os-condition-field'));
      if (ruleIndex < 0 || conditionIndex < 0 || !rules[ruleIndex] || !rules[ruleIndex].conditions[conditionIndex] || !field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') rules[ruleIndex].conditions[conditionIndex][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) rules[ruleIndex].conditions[conditionIndex][field] = node.value;
    });
    config.rules = normalizeRules(rules, profileIds);
    return config;
  }

  function syncSimulationFromDom(configInput: any, resourcesInput: any): AnyRecord {
    const config = clone(record(configInput));
    const resources = normalizeCatalog(resourcesInput);
    const simulation = ensureSimulationStates(config.simulation, resources);
    document.querySelectorAll<HTMLElement>('[data-os-simulation-field]').forEach((node) => {
      const field = text(node.getAttribute('data-os-simulation-field'));
      if (!field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') simulation[field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) simulation[field] = node.value;
    });
    document.querySelectorAll<HTMLElement>('[data-os-sim-resource-field]').forEach((node) => {
      const sourceId = text(node.getAttribute('data-os-sim-resource'));
      const field = text(node.getAttribute('data-os-sim-resource-field'));
      if (!sourceId || !field) return;
      simulation.resourceStates[sourceId] = record(simulation.resourceStates[sourceId]);
      if (node instanceof HTMLInputElement && node.type === 'checkbox') simulation.resourceStates[sourceId][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) simulation.resourceStates[sourceId][field] = node.value;
    });
    config.simulation = normalizeSimulation(simulation, text(config.activeProfileId));
    return config;
  }

  function syncFromDom(configInput: any, resourcesInput: any): AnyRecord {
    let config = syncRulesFromDom(configInput);
    config = syncSimulationFromDom(config, resourcesInput);
    return config;
  }

  function demoSimulation(configInput: any, resourcesInput: any): AnyRecord {
    const config = clone(record(configInput));
    const resources = normalizeCatalog(resourcesInput);
    const simulation = ensureSimulationStates(config.simulation, resources);
    const date = new Date();
    date.setHours(19, 0, 0, 0);
    simulation.nowLocal = localDateTimeValue(date);
    simulation.outsideTemperatureC = 5;
    simulation.pvForecastKWh = 30;
    simulation.pvSurplusW = 3000;
    simulation.gridPowerW = 0;
    simulation.weekend = true;
    simulation.cheapTariff = false;
    resources.forEach((resource) => {
      const state = normalizeResourceState(simulation.resourceStates[resource.sourceId]);
      if (resource.resourceType === 'storage') {
        state.socPct = 65;
        state.capacityKWh = state.capacityKWh ?? resource.usableCapacityKWh ?? 30;
      } else if (resource.resourceType === 'chargingPoint') {
        state.socPct = 40;
        state.capacityKWh = state.capacityKWh ?? resource.usableCapacityKWh ?? 70;
      } else if (resource.resourceType === 'thermal' || resource.resourceSubtype === 'cooling') {
        state.temperatureC = 3;
        state.offDurationMin = 0;
        state.runDurationMin = 120;
        state.active = true;
        state.state = 'running';
      }
      state.online = true;
      state.fresh = true;
      state.alarm = false;
      simulation.resourceStates[resource.sourceId] = state;
    });
    config.simulation = simulation;
    return config;
  }

  function bindEvents(options: AnyRecord = {}): void {
    const getConfig = typeof options.getConfig === 'function' ? options.getConfig : () => ({});
    const updateConfig = typeof options.updateConfig === 'function' ? options.updateConfig : () => {};
    const getResources = typeof options.getResources === 'function' ? options.getResources : () => [];
    const syncAll = typeof options.syncAll === 'function' ? options.syncAll : () => {};
    const rerender = typeof options.rerender === 'function' ? options.rerender : () => {};
    const setStatus = typeof options.setStatus === 'function' ? options.setStatus : () => {};

    const addRule = document.getElementById('osAddRule');
    if (addRule) addRule.addEventListener('click', () => {
      syncAll();
      const config = clone(record(getConfig()));
      const type = text((document.getElementById('osNewRuleType') as HTMLSelectElement | null)?.value, 'targetSoc');
      const rules = normalizeRules(config.rules, list(config.profiles).map((profile) => text(profile.id)));
      rules.push(normalizeRule(defaultRule(type, rules.length), rules.length, list(config.profiles).map((profile) => text(profile.id))));
      config.rules = rules;
      updateConfig(config);
      lastSimulationResult = null;
      rerender();
      setStatus('Neuer Regelbaustein angelegt. Er bleibt ausschließlich im Simulationsmodus.', 'ok');
    });

    const customerExample = document.getElementById('osAddCustomerExample');
    if (customerExample) customerExample.addEventListener('click', () => {
      syncAll();
      const config = clone(record(getConfig()));
      const before = list(config.rules).length;
      config.rules = createCustomerExampleRules(getResources(), config.rules);
      updateConfig(config);
      lastSimulationResult = null;
      rerender();
      const added = Math.max(0, list(config.rules).length - before);
      setStatus(added ? `${added} modulare Regeln des Kundenbeispiels vorbereitet. Fehlende Geräte können direkt in den Regeln zugeordnet werden.` : 'Das Kundenbeispiel ist bereits vorhanden.', added ? 'ok' : 'info');
    });

    document.querySelectorAll<HTMLElement>('[data-os-delete-rule]').forEach((button) => button.addEventListener('click', () => {
      syncAll();
      const config = clone(record(getConfig()));
      const index = integer(button.getAttribute('data-os-delete-rule'), -1, -1, MAX_RULES);
      const rules = list(config.rules);
      if (index < 0 || index >= rules.length) return;
      rules.splice(index, 1);
      config.rules = rules;
      updateConfig(config);
      lastSimulationResult = null;
      rerender();
      setStatus('Regel aus der Betriebsstrategie entfernt.', 'ok');
    }));

    document.querySelectorAll<HTMLElement>('[data-os-add-condition]').forEach((button) => button.addEventListener('click', () => {
      syncAll();
      const config = clone(record(getConfig()));
      const index = integer(button.getAttribute('data-os-add-condition'), -1, -1, MAX_RULES);
      if (index < 0 || !config.rules?.[index]) return;
      config.rules[index].conditions = list(config.rules[index].conditions);
      if (config.rules[index].conditions.length >= MAX_CONDITIONS) {
        setStatus(`Maximal ${MAX_CONDITIONS} Bedingungen pro Regel.`, 'warn');
        return;
      }
      config.rules[index].conditions.push(defaultCondition(config.rules[index].conditions.length));
      updateConfig(config);
      lastSimulationResult = null;
      rerender();
    }));

    document.querySelectorAll<HTMLElement>('[data-os-delete-condition]').forEach((button) => button.addEventListener('click', () => {
      syncAll();
      const config = clone(record(getConfig()));
      const [ruleRaw, conditionRaw] = text(button.getAttribute('data-os-delete-condition')).split(':');
      const ruleIndex = integer(ruleRaw, -1, -1, MAX_RULES);
      const conditionIndex = integer(conditionRaw, -1, -1, MAX_CONDITIONS);
      if (ruleIndex < 0 || conditionIndex < 0 || !config.rules?.[ruleIndex]) return;
      config.rules[ruleIndex].conditions = list(config.rules[ruleIndex].conditions);
      config.rules[ruleIndex].conditions.splice(conditionIndex, 1);
      updateConfig(config);
      lastSimulationResult = null;
      rerender();
    }));

    document.querySelectorAll<HTMLElement>('[data-os-rule-field="ruleType"],[data-os-rule-schedule-field="mode"],[data-os-condition-field="sourceRef"],[data-os-condition-field="metric"]')
      .forEach((node) => node.addEventListener('change', () => {
        syncAll();
        updateConfig(getConfig());
        lastSimulationResult = null;
        rerender();
      }));

    document.querySelectorAll<HTMLElement>('[data-os-rule-field],[data-os-rule-target-field],[data-os-rule-safety-field],[data-os-rule-schedule-field],[data-os-rule-weekday],[data-os-condition-field],[data-os-simulation-field],[data-os-sim-resource-field]')
      .forEach((node) => node.addEventListener('change', () => {
        syncAll();
        lastSimulationResult = null;
      }));

    const loadDemo = document.getElementById('osLoadDemoScenario');
    if (loadDemo) loadDemo.addEventListener('click', () => {
      syncAll();
      const config = demoSimulation(getConfig(), getResources());
      updateConfig(config);
      lastSimulationResult = null;
      rerender();
      setStatus('Beispielwerte für den sicheren Trockenlauf geladen.', 'ok');
    });

    const runSimulation = document.getElementById('osRunSimulation');
    if (runSimulation) runSimulation.addEventListener('click', () => {
      syncAll();
      const config = clone(record(getConfig()));
      lastSimulationResult = simulate(config, getResources(), config.simulation);
      rerender();
      setStatus(`Trockenlauf berechnet: ${list(lastSimulationResult.selectedRequests).length} priorisierte Anforderungen, 0 Hardware-Schreibvorgänge.`, 'ok');
    });
  }

  function resetSimulationResult(): void {
    lastSimulationResult = null;
  }

  (window as any).NexoWattOperatingStrategiesRuleBuilder = {
    version: BUILDER_VERSION,
    defaultRule,
    normalizeCondition,
    normalizeRule,
    normalizeRules,
    normalizeSchedule,
    scheduleEvaluation,
    defaultSimulation,
    normalizeSimulation,
    ensureSimulationStates,
    normalizeCatalog,
    createCustomerExampleRules,
    validateRule,
    evaluateNightReserve,
    simulate,
    render,
    syncFromDom,
    bindEvents,
    resetSimulationResult,
    getLastSimulationResult: () => clone(lastSimulationResult),
  };
})();
