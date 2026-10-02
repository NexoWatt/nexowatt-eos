/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet aus freigegebenen Ladepunkten, deren Grenzen und Stationszuordnung den Leistungsbedarf der Ladeinfrastruktur.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/charging-budget-helpers.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: ems/charging-budget-helpers.js
 * Rolle: Typisierte, seiteneffektfreie EVCS-Budget-Helfer.
 *
 * Zweck:
 * - Ermittelt die installierte Leistung einzelner Ladepunkte und der gesamten
 *   Ladeinfrastruktur einschließlich gemeinsam genutzter Stationslimits.
 * - Reserviert im bereits durch NVP, Phasen, §14a und weitere Gates begrenzten
 *   EVCS-Budget die technische Mindestleistung aller versorgbaren Auto-, Boost-
 *   und Min+PV-Ladepunkte.
 *
 * Sicherheitsregel:
 * Diese Funktionen erzeugen keine Gerätesollwerte und schreiben keine States.
 * Sie liefern ausschließlich deterministische Grenz- und Reservierungswerte an
 * die produktive Lademanagement-Runtime.
 */

'use strict';

/** Liefert nur endliche positive Zahlen; 0/leere Werte bedeuten „nicht gesetzt“. */
function positiveNumber() {
  const value = Number(arguments[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Vereinheitlicht die AC-Grenzen eines Ladepunkts.
 *
 * Vertrag:
 * - Ist nur Maximalstrom gesetzt, wird die Maximalleistung daraus abgeleitet.
 * - Ist nur Maximalleistung gesetzt, wird der maximal erlaubte Strom daraus
 *   abgeleitet. Das ist besonders wichtig für stromgeregelte Wallboxen.
 * - Sind beide Werte gesetzt, gilt immer die strengere Grenze.
 * - Erst wenn keiner der beiden Werte gesetzt ist, greifen die globalen
 *   Standardwerte.
 * - Mindeststrom und optionale Mindestleistung werden als technische Untergrenze
 *   zusammengeführt; eine Maximalgrenze unter dieser Untergrenze führt später
 *   korrekt zu 0 A/0 W statt zu einer physikalisch nicht fahrbaren Vorgabe.
 *
 * @param {{
 *   phases?:number, voltageV?:number,
 *   minA?:number, maxA?:number, minPowerW?:number, maxPowerW?:number,
 *   defaultMinA?:number, defaultMaxA?:number,
 *   controlBasis?:string, acMinPower3pW?:number
 * }} [options]
 * @returns {{
 *   phases:number, voltageV:number, factorWPerA:number,
 *   minA:number, maxA:number, minPowerW:number, maxPowerW:number,
 *   explicitMinA:boolean, explicitMaxA:boolean,
 *   explicitMinPower:boolean, explicitMaxPower:boolean,
 *   maxLimitedBy:string
 * }}
 */
function resolveAcChargingLimits() {
  const input = arguments[0] && typeof arguments[0] === 'object' ? arguments[0] : {};
  const phases = Number(input.phases) === 1 ? 1 : 3;
  const voltageV = Function.prototype.apply.call(positiveNumber, null, [input.voltageV]) || 230;
  const factorWPerA = Math.max(1, phases * voltageV);

  const configuredMinA = Function.prototype.apply.call(positiveNumber, null, [input.minA]);
  const configuredMaxA = Function.prototype.apply.call(positiveNumber, null, [input.maxA]);
  const configuredMinPowerW = Function.prototype.apply.call(positiveNumber, null, [input.minPowerW]);
  const configuredMaxPowerW = Function.prototype.apply.call(positiveNumber, null, [input.maxPowerW]);
  const defaultMinA = Function.prototype.apply.call(positiveNumber, null, [input.defaultMinA]) || 6;
  const defaultMaxA = Function.prototype.apply.call(positiveNumber, null, [input.defaultMaxA]) || 16;

  let minA = configuredMinA || defaultMinA;
  let minPowerW = minA * factorWPerA;
  if (configuredMinPowerW !== null) minPowerW = Math.max(minPowerW, configuredMinPowerW);

  const controlBasis = String(input.controlBasis || '').trim().toLowerCase();
  const acMinPower3pW = Function.prototype.apply.call(positiveNumber, null, [input.acMinPower3pW]);
  const powerControlled = controlBasis === 'powerw' || controlBasis === 'power' || controlBasis === 'w';
  if (powerControlled && phases === 3 && acMinPower3pW !== null) {
    minPowerW = Math.max(minPowerW, acMinPower3pW);
  }
  minA = Math.max(minA, minPowerW / factorWPerA);

  const maxCandidates = [];
  if (configuredMaxA !== null) maxCandidates.push({ source: 'configured-current', powerW: configuredMaxA * factorWPerA });
  if (configuredMaxPowerW !== null) maxCandidates.push({ source: 'configured-power', powerW: configuredMaxPowerW });
  if (!maxCandidates.length) maxCandidates.push({ source: 'default-current', powerW: defaultMaxA * factorWPerA });
  maxCandidates.sort((a, b) => a.powerW - b.powerW);
  const limiting = maxCandidates[0] || { source: 'default-current', powerW: defaultMaxA * factorWPerA };
  const maxPowerW = Math.max(0, Number(limiting.powerW) || 0);
  const maxA = maxPowerW / factorWPerA;

  return {
    phases,
    voltageV,
    factorWPerA,
    minA,
    maxA,
    minPowerW,
    maxPowerW,
    explicitMinA: configuredMinA !== null,
    explicitMaxA: configuredMaxA !== null,
    explicitMinPower: configuredMinPowerW !== null,
    explicitMaxPower: configuredMaxPowerW !== null,
    maxLimitedBy: limiting.source,
  };
}

/**
 * Ermittelt die installierte Maximalleistung eines aktivierten und steuerbaren
 * Ladepunkts. Explizite Leistung, Strom-/Phasenangaben und der AppCenter-
 * Fallback werden in dieser Reihenfolge ausgewertet.
 *
 * @param {any} wallbox Ladepunktkonfiguration.
 * @param {number} [fallbackPerConnectorW=11000] Nennleistung je Ladepunkt.
 * @returns {number} Installierte Ladepunktleistung in Watt.
 */
function deriveChargingConnectorCapacityW() {
  const wallbox = arguments[0];
  const fallbackPerConnectorW = arguments.length > 1 ? Number(arguments[1]) : 11000;
  const wb = wallbox && typeof wallbox === 'object' ? wallbox : {};
  if (wb.enabled === false) return 0;
  // Ein Ladepunkt ist technisch steuerbar, sobald ein beschreibbarer Strom-
  // oder Leistungssollwert vorhanden ist. `controlBasis=none` war ein alter,
  // versteckter Zweit-Schalter und wird nicht mehr als Deaktivierung verwendet;
  // dafuer existiert ausschliesslich `enabled` / „Aktiv (Regelung)“.
  const controllable = !!(wb.setCurrentAId || wb.setPowerWId);
  if (!controllable) return 0;

  const chargerType = String(wb.chargerType || wb.type || 'ac').trim().toLowerCase();
  const fallbackW = Number(fallbackPerConnectorW);
  const safeFallbackW = Number.isFinite(fallbackW) && fallbackW > 0 ? fallbackW : 0;
  if (chargerType === 'dc') {
    const explicitPowerW = Function.prototype.apply.call(positiveNumber, null, [wb.maxPowerW]);
    return Math.max(0, Math.round(explicitPowerW !== null ? explicitPowerW : safeFallbackW));
  }

  const phases = Number(wb.phases) === 1 ? 1 : 3;
  const voltageV = Function.prototype.apply.call(positiveNumber, null, [wb.voltageV]) || 230;
  const factorWPerA = Math.max(1, phases * voltageV);
  const fallbackMaxA = safeFallbackW > 0 ? safeFallbackW / factorWPerA : 16;
  const limits = Function.prototype.apply.call(resolveAcChargingLimits, null, [{
    phases,
    voltageV,
    maxA: wb.maxA !== undefined ? wb.maxA : wb.maxCurrentA,
    maxPowerW: wb.maxPowerW,
    defaultMaxA: fallbackMaxA,
    defaultMinA: wb.minA !== undefined ? wb.minA : wb.minCurrentA,
    controlBasis: wb.controlBasis || wb.controlPreference || 'auto',
  }]);
  return Math.max(0, Math.round(limits.maxPowerW));
}

/**
 * Summiert alle aktivierten, steuerbaren Ladepunkte. Ports derselben Station
 * werden in der effektiven Summe auf das gemeinsame Stationslimit begrenzt.
 *
 * @param {{wallboxes?: any[], stationGroups?: any[], fallbackPerConnectorW?: number}} [options]
 * @returns {{rawCapacityW:number, effectiveCapacityW:number, wallboxCount:number, stationCount:number}}
 */
function computeChargingInfrastructureCapacity() {
  const input = arguments[0];
  const options = input && typeof input === 'object' ? input : {};
  const wallboxes = Array.isArray(options.wallboxes) ? options.wallboxes : [];
  const stationGroups = Array.isArray(options.stationGroups) ? options.stationGroups : [];
  const fallbackPerConnectorW = Number.isFinite(Number(options.fallbackPerConnectorW))
    ? Number(options.fallbackPerConnectorW)
    : 11000;
  /** @type {Map<string, number>} */
  const stationCaps = new Map();
  for (const group of stationGroups) {
    const key = String(group && group.stationKey || '').trim();
    const capW = Number(group && (group.maxPowerW !== undefined ? group.maxPowerW : Number(group.maxPowerKw) * 1000));
    if (!key || !Number.isFinite(capW) || capW <= 0) continue;
    const previous = stationCaps.get(key);
    stationCaps.set(key, Number.isFinite(previous) ? Math.min(/** @type {number} */ (previous), capW) : capW);
  }

  let rawCapacityW = 0;
  let standaloneCapacityW = 0;
  let wallboxCount = 0;
  /** @type {Map<string, number>} */
  const stationPortCapacityW = new Map();

  for (const wallbox of wallboxes) {
    const capacityW = Function.prototype.apply.call(deriveChargingConnectorCapacityW, null, [wallbox, fallbackPerConnectorW]);
    if (!(capacityW > 0)) continue;
    wallboxCount += 1;
    rawCapacityW += capacityW;
    const stationKey = String(wallbox && wallbox.stationKey || '').trim();
    if (!stationKey) {
      standaloneCapacityW += capacityW;
      continue;
    }
    stationPortCapacityW.set(stationKey, (stationPortCapacityW.get(stationKey) || 0) + capacityW);
  }

  let effectiveCapacityW = standaloneCapacityW;
  for (const [stationKey, portCapacityW] of stationPortCapacityW.entries()) {
    const stationCapW = stationCaps.get(stationKey);
    effectiveCapacityW += Number.isFinite(stationCapW) && /** @type {number} */ (stationCapW) > 0
      ? Math.min(portCapacityW, /** @type {number} */ (stationCapW))
      : portCapacityW;
  }

  return {
    rawCapacityW: Math.max(0, Math.round(rawCapacityW)),
    effectiveCapacityW: Math.max(0, Math.round(effectiveCapacityW)),
    wallboxCount,
    stationCount: stationPortCapacityW.size,
  };
}

/**
 * Reserviert die technischen Mindestleistungen der verbundenen netzfähigen
 * Ladepunkte, wenn das bereits sicher begrenzte Gesamt- und Stationsbudget für
 * alle Minima ausreicht. Reines PV-Laden bleibt ausschließlich PV-Grant-geführt.
 *
 * @param {{wallboxes?: any[], totalBudgetW?: number, stationCaps?: Map<string, number>|Record<string, number>|null}} [options]
 * @returns {{
 *   preserveAll:boolean,
 *   eligibleCount:number,
 *   totalMinimumW:number,
 *   minimumBySafe:Map<string, number>,
 *   futureMinimumBySafe:Map<string, number>,
 *   futureStationMinimumBySafe:Map<string, number>,
 *   stationMinimumW:Map<string, number>,
 *   totalFits:boolean,
 *   stationsFit:boolean
 * }}
 */
function computeChargingMinimumServicePlan() {
  const input = arguments[0];
  const options = input && typeof input === 'object' ? input : {};
  const list = Array.isArray(options.wallboxes) ? options.wallboxes : [];
  const totalBudgetW = options.totalBudgetW === undefined
    ? Number.POSITIVE_INFINITY
    : Number(options.totalBudgetW);
  const stationCapsInput = options.stationCaps || null;
  /** @type {Map<string, number>} */
  const capByStation = new Map();

  if (stationCapsInput instanceof Map) {
    for (const [key, value] of stationCapsInput.entries()) {
      const capW = Number(value);
      if (String(key || '').trim() && Number.isFinite(capW) && capW > 0) {
        capByStation.set(String(key).trim(), capW);
      }
    }
  } else if (stationCapsInput && typeof stationCapsInput === 'object') {
    for (const [key, value] of Object.entries(stationCapsInput)) {
      const capW = Number(value);
      if (String(key || '').trim() && Number.isFinite(capW) && capW > 0) {
        capByStation.set(String(key).trim(), capW);
      }
    }
  }

  /** @type {Map<string, number>} */
  const minimumBySafe = new Map();
  /** @type {Map<string, number>} */
  const stationMinimumW = new Map();
  let totalMinimumW = 0;
  let eligibleCount = 0;

  for (const wallbox of list) {
    const w = wallbox && typeof wallbox === 'object' ? wallbox : {};
    const safe = String(w.safe || '').trim();
    const modeRaw = String(w.effectiveMode || w.userMode || 'normal').trim().toLowerCase();
    const mode = modeRaw === 'min+pv' || modeRaw === 'min_pv' ? 'minpv'
      : (modeRaw === 'turbo' ? 'boost' : modeRaw);
    const boost = mode === 'boost';
    const goalStatus = String(w.goalStatus || '').trim().toLowerCase();
    const goalBlocked = !boost && !!w.goalEnabled && (goalStatus === 'waiting_soc' || goalStatus === 'soc_stale');
    const demandConfirmed = w.vehicleDemandConfirmed === true
      || (w.vehicleDemandConfirmed === undefined && w.vehiclePlugged === true);
    // Ein semantisch verbundenes Fahrzeug darf in Auto/Min+PV seine technische
    // Mindestleistung als begrenzten Startversuch reservieren. Reines PV bleibt
    // weiterhin vollständig PV-Grant-geführt und ist deshalb unten ausgeschlossen.
    const startProbeAllowed = w.vehicleStartEligible === true
      && w.vehicleStartCooldownActive !== true;
    const commandDemandAllowed = demandConfirmed || boost || startProbeAllowed;
    const hasSetpoint = !!(w.setAKey || w.setWKey || w.setCurrentAId || w.setPowerWId);
    const controlToken = String(w.controlBasis || 'auto').trim().toLowerCase();
    const controllable = controlToken !== 'none' || hasSetpoint;

    const maxW = Number.isFinite(Number(w.maxPW ?? w.maxPowerW))
      ? Math.max(0, Number(w.maxPW ?? w.maxPowerW))
      : Number.POSITIVE_INFINITY;
    const minWRaw = Number(w.minPW ?? w.minPowerW);
    const minW = Number.isFinite(minWRaw) ? Math.max(0, Math.min(maxW, minWRaw)) : 0;

    // Die Betriebsstrategien-App darf Auto ausdrücklich pausieren oder unter
    // die technische Mindestleistung begrenzen. Ein solcher Ladepunkt darf in
    // der vorgelagerten Fairnessplanung keine Mindestleistung reservieren, weil
    // er sie im selben Tick anschließend nicht verwenden könnte. Sonst würde
    // ein pausierter Ladepunkt aktive Nachbarn unnötig verdrängen.
    const autoSource = String(w.userAutoSource || '').trim().toLowerCase();
    const userMode = String(w.userMode || w.effectiveMode || '').trim().toLowerCase();
    const strategy = w.strategyOverlay && typeof w.strategyOverlay === 'object'
      ? w.strategyOverlay
      : null;
    const strategyOwnsAuto = !!strategy
      && ['auto', 'default', 'global', ''].includes(userMode)
      && ['strategy', 'operating-strategy', 'operating_strategy'].includes(autoSource);
    const strategyAction = strategyOwnsAuto ? String(strategy.action || 'standard').trim().toLowerCase() : '';
    const strategyPaused = strategyOwnsAuto && (
      strategy.fallbackPause === true
      || ['pause', 'off', 'block', 'disable', 'stop'].includes(strategyAction)
    );
    let strategyCapW = null;
    if (strategyOwnsAuto && strategy.active === true) {
      const targetCapW = Number(strategy.targetPowerW);
      const maxCapW = Number(strategy.maxPowerW);
      if (Number.isFinite(targetCapW)) strategyCapW = Math.max(0, targetCapW);
      if (Number.isFinite(maxCapW)) {
        const normalizedMaxCapW = Math.max(0, maxCapW);
        strategyCapW = strategyCapW === null ? normalizedMaxCapW : Math.min(strategyCapW, normalizedMaxCapW);
      }
    }
    const strategyBelowMinimum = strategyCapW !== null && minW > 0 && strategyCapW + 1 < minW;
    const eligible = !!safe
      && w.enabled !== false
      && w.online !== false
      && commandDemandAllowed
      && controllable
      && mode !== 'pv'
      && mode !== 'off'
      && !goalBlocked
      && !strategyPaused
      && !strategyBelowMinimum;
    if (!eligible) {
      if (safe) minimumBySafe.set(safe, 0);
      continue;
    }

    if (!(minW > 0)) {
      minimumBySafe.set(safe, 0);
      continue;
    }

    minimumBySafe.set(safe, minW);
    totalMinimumW += minW;
    eligibleCount += 1;
    const stationKey = String(w.stationKey || '').trim();
    if (stationKey) {
      stationMinimumW.set(stationKey, (stationMinimumW.get(stationKey) || 0) + minW);
      const ownCapW = Number(w.stationMaxPowerW);
      if (!capByStation.has(stationKey) && Number.isFinite(ownCapW) && ownCapW > 0) {
        capByStation.set(stationKey, ownCapW);
      }
    }
  }

  const totalCapW = Number.isFinite(totalBudgetW) ? Math.max(0, totalBudgetW) : Number.POSITIVE_INFINITY;
  const totalFits = !Number.isFinite(totalCapW) || totalCapW + 1e-6 >= totalMinimumW;
  let stationsFit = true;
  for (const [stationKey, requiredW] of stationMinimumW.entries()) {
    const capW = capByStation.get(stationKey);
    if (Number.isFinite(capW) && /** @type {number} */ (capW) > 0 && requiredW > /** @type {number} */ (capW) + 1e-6) {
      stationsFit = false;
      break;
    }
  }
  const preserveAll = eligibleCount > 1 && totalFits && stationsFit;

  /** @type {Map<string, number>} */
  const futureMinimumBySafe = new Map();
  /** @type {Map<string, number>} */
  const futureStationMinimumBySafe = new Map();
  let runningTotalW = 0;
  /** @type {Map<string, number>} */
  const runningByStation = new Map();
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const w = list[index] || {};
    const safe = String(w.safe || '').trim();
    const stationKey = String(w.stationKey || '').trim();
    if (safe) {
      futureMinimumBySafe.set(safe, preserveAll ? runningTotalW : 0);
      futureStationMinimumBySafe.set(safe, preserveAll && stationKey ? (runningByStation.get(stationKey) || 0) : 0);
    }
    const minW = safe ? (minimumBySafe.get(safe) || 0) : 0;
    if (minW > 0) {
      runningTotalW += minW;
      if (stationKey) runningByStation.set(stationKey, (runningByStation.get(stationKey) || 0) + minW);
    }
  }

  return {
    preserveAll,
    eligibleCount,
    totalMinimumW: Math.max(0, Math.round(totalMinimumW)),
    minimumBySafe,
    futureMinimumBySafe,
    futureStationMinimumBySafe,
    stationMinimumW,
    totalFits,
    stationsFit,
  };
}

eval('module').exports = {
  resolveAcChargingLimits,
  deriveChargingConnectorCapacityW,
  computeChargingInfrastructureCapacity,
  computeChargingMinimumServicePlan,
};
