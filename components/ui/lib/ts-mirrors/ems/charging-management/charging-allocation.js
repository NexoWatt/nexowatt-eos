'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-allocation.ts
 * Quell-Hash: sha256:833af6270658dcad8a7d431925757f479c5bd8481fcfdefee041f067692cc4bb
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-/Wallbox-Allocation-Shadow und Produktiv-Vorbereitung.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verteilt das begrenzte Ladebudget auf die zugelassenen Ladepunkte und deren elektrische Grenzen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-allocation.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-allocation.ts
 *
 * Zweck:
 * TypeScript-Shadow, Produktiv-Vorbereitung und produktiver Apply-Vertrag für die EVCS-/Wallbox-Allocation.
 * Ab 0.7.126 liefert TS den geprüften Zielplan für die Runtime. Ab 0.7.127
 * ist JavaScript im EVCS-Normalpfad nur noch Executor/Fallback; auch Safety-Rampdowns
 * laufen über denselben Executor-Vertrag statt über eigene Direktwrite-Schleifen.
 *
 * Wichtig:
 * - 0 W / 0 A sind gültige sichere Zielwerte.
 * - Anlagen ohne Ladepunkte dürfen keine EVCS-Sichtbarkeit erzeugen.
 * - Diese Datei schreibt keine ioBroker-States und keine Wallbox-Setpoints.
 * - JS bleibt nur Executor/Fallback; fachliche Apply-Verträge kommen aus TypeScript.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingAllocationShadowPlan = buildChargingAllocationShadowPlan;
exports.compareChargingAllocationShadowPlan = compareChargingAllocationShadowPlan;
exports.buildChargingAllocationProductivePrep = buildChargingAllocationProductivePrep;
exports.buildChargingAllocationProductive = buildChargingAllocationProductive;
exports.buildChargingAllocationNormalSource = buildChargingAllocationNormalSource;
function finiteOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const s = value.trim().replace(',', '.');
        if (!s)
            return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function nonNegative(value, fallback = 0) {
    const n = finiteOrNull(value);
    const v = n === null ? fallback : n;
    return v > 0 ? Math.round(v) : 0;
}
function nonNegativeFloat(value, fallback = 0) {
    const n = finiteOrNull(value);
    const v = n === null ? fallback : n;
    return v > 0 ? Number(v.toFixed(3)) : 0;
}
/**
 * Code-Teil: physicalPvBudgetW
 * Zweck: Liefert den gesamten physikalischen PV-Rest, den reine PV-Ladepunkte
 * und die Zusatzleistung von Min+PV gemeinsam verwenden. Das alte Feld
 * `pvAvailableW` bleibt als Kompatibilitaetsfallback erhalten.
 */
function physicalPvBudgetW(input) {
    const explicit = finiteOrNull(input.pvPhysicalAvailableW);
    if (explicit !== null)
        return Math.max(0, Math.round(explicit));
    return nonNegative(input.pvAvailableW);
}
/**
 * Code-Teil: purePvBudgetW
 * Zweck: Liefert den kundenseitig priorisierten EVCS-Anteil fuer reine
 * PV-Ladepunkte. Min+PV, Auto, Boost und Zeit-Ziel-Laden werden durch diesen
 * Anteil nicht begrenzt. Der Wert kann niemals groesser als das physikalische
 * PV-Budget sein.
 */
function purePvBudgetW(input) {
    const physicalW = physicalPvBudgetW(input);
    const explicit = finiteOrNull(input.pvPureAvailableW);
    if (explicit === null)
        return physicalW;
    return Math.max(0, Math.min(physicalW, Math.round(explicit)));
}
function boolValue(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'connected', 'plugged'].includes(s))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive', 'disconnected', 'unplugged'].includes(s))
            return false;
    }
    return fallback;
}
function str(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
}
function safeKey(value, fallbackIndex = 0) {
    const raw = str(value, `wallbox_${fallbackIndex + 1}`);
    const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return safe || `wallbox_${fallbackIndex + 1}`;
}
function normalizeControlBasis(value) {
    const raw = str(value, 'power').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return raw === 'a' || raw === 'amp' || raw === 'amps' || raw === 'current' || raw === 'currenta' || raw === 'currentampere'
        ? 'current'
        : 'power';
}
function allocationSafe(allocation, fallbackIndex = 0) {
    return safeKey(allocation.safe ?? allocation.key ?? allocation.id ?? allocation.name, fallbackIndex);
}
function buildAllocationMap(allocations) {
    const map = new Map();
    let allocationRank = 0;
    allocations.forEach((allocation, index) => {
        if (!allocation || typeof allocation !== 'object')
            return;
        if (String(allocation.type || '') === 'budget')
            return;
        const safe = allocationSafe(allocation, index);
        if (!safe)
            return;
        allocationRank += 1;
        // Die zentrale Runtime liefert den bereits hysterese-/rampenbereinigten und fachlich
        // priorisierten Ladeplan. TypeScript übernimmt danach ausschließlich den finalen
        // Sicherheitsvertrag für Gesamt-/PV-Budget, technische Mindestleistung und Stationslimit.
        // Der Rang transportiert die zustandsbehaftete Round-Robin-Reihenfolge in den reinen Guard.
        map.set(safe, { ...allocation, __allocationRank: allocationRank });
    });
    return map;
}
function buildPhaseDecisionMap(input) {
    const map = new Map();
    const wallboxes = input.phasePlan && Array.isArray(input.phasePlan.wallboxes) ? input.phasePlan.wallboxes : [];
    wallboxes.forEach((decision, index) => {
        if (!decision || typeof decision !== 'object')
            return;
        const safe = safeKey(decision.safe ?? decision.key ?? decision.id ?? decision.name, index);
        if (safe)
            map.set(safe, decision);
    });
    return map;
}
function wantsTsNativeAllocation(input) {
    return boolValue(input.preferTsNativeAllocation, false) || boolValue(input.tsNormalSourceLock, false);
}
function isJsComparisonDiagnosticOnly(input, plan) {
    if (plan && plan.jsComparisonDiagnosticOnly === true)
        return true;
    if (wantsTsNativeAllocation(input))
        return true;
    return boolValue(input.allowJsComparisonFallback, true) === false;
}
function normalizedChargingMode(wb) {
    // Der wirksame Modus hat Vorrang vor der Benutzerwahl. Das ist insbesondere bei
    // Tarif-/Safety-Uebersteuerungen wichtig: Ein effektives "auto" darf nicht allein
    // wegen eines gespeicherten Benutzerwerts "pv" erneut als PV-only behandelt werden.
    const effectiveRaw = String(wb.effectiveMode || '').trim().toLowerCase();
    const userRaw = String(wb.userMode || '').trim().toLowerCase();
    const raw = effectiveRaw || userRaw;
    if (raw.includes('boost') || raw.includes('turbo'))
        return 'boost';
    if (raw.includes('minpv') || raw.includes('min+pv') || raw.includes('min_pv') || raw.includes('min-plus-pv'))
        return 'minpv';
    if (raw === 'pv' || raw.includes('pvonly') || raw.includes('pv_only') || raw.includes('pvsurplus'))
        return 'pv';
    if (raw.includes('off') || raw.includes('disabled') || raw.includes('aus'))
        return 'off';
    return 'auto';
}
/**
 * Boost darf als expliziter Kundenbefehl einen positiven Sollwert vorladen,
 * obwohl ein optionaler Fahrzeug-/Ladebedarfsnachweis noch fehlt. Die physische
 * Ladefreigabe bleibt bei Wallbox und Fahrzeug; alle harten EMS-Grenzen werden
 * weiterhin im finalen Allocation-Guard erzwungen.
 */
function modeAllowsPrearmedSetpoint(wb) {
    return normalizedChargingMode(wb) === 'boost' && wb.boostPrearmAllowed !== false;
}
function commandDemandAllowed(wb) {
    return wb.demandConfirmed
        || wb.vehicleStartProbeActive
        || modeAllowsPrearmedSetpoint(wb);
}
function floorToPositiveStep(value, step) {
    if (!(value > 0))
        return 0;
    if (!(step > 0))
        return value;
    return Math.floor((value + 1e-9) / step) * step;
}
function ceilToPositiveStep(value, step) {
    if (!(value > 0))
        return 0;
    if (!(step > 0))
        return value;
    return Math.ceil((value - 1e-9) / step) * step;
}
function powerFactorWPerA(wb) {
    return Math.max(1, wb.phases || 1) * Math.max(1, wb.voltageV || 230);
}
function technicalMinPowerW(wb) {
    if (wb.controlBasis === 'current') {
        const minA = Math.max(0, wb.minA || 0);
        if (!(minA > 0))
            return Math.max(0, wb.minPowerW || 0);
        const stepA = wb.stepA > 0 ? wb.stepA : 0.1;
        return Math.max(0, Math.round(ceilToPositiveStep(minA, stepA) * powerFactorWPerA(wb)));
    }
    const rawMin = Math.max(0, wb.minPowerW || 0);
    if (!(rawMin > 0))
        return 0;
    return Math.max(0, Math.round(ceilToPositiveStep(rawMin, wb.stepW)));
}
function technicalMaxPowerW(wb) {
    let rawMax = wb.maxPowerW > 0
        ? wb.maxPowerW
        : (wb.maxA > 0 ? powerFactorWPerA(wb) * wb.maxA : (wb.chargerType === 'dc' ? 50000 : 11000));
    if (wb.controlBasis === 'current') {
        const maxA = wb.maxA > 0 ? wb.maxA : rawMax / powerFactorWPerA(wb);
        const stepA = wb.stepA > 0 ? wb.stepA : 0.1;
        // Eine explizite Leistungsobergrenze bleibt auch bei Stromvorgabe bindend.
        rawMax = Math.min(rawMax, floorToPositiveStep(maxA, stepA) * powerFactorWPerA(wb));
    }
    else {
        rawMax = floorToPositiveStep(rawMax, wb.stepW);
    }
    // Die Netzanteilgrenze ist KEIN Gerätemaximum. Sie wird zusammen mit dem
    // einmalig verteilten PV-Rest erst im finalen Guard geprüft.
    return Math.max(0, Math.floor(rawMax));
}
function quantizeTargetDown(wb, requestedW) {
    const maxW = technicalMaxPowerW(wb);
    const boundedW = Math.max(0, Math.min(maxW, Number.isFinite(requestedW) ? requestedW : 0));
    if (!(boundedW > 0))
        return { powerW: 0, currentA: 0 };
    if (wb.controlBasis === 'current') {
        const factor = powerFactorWPerA(wb);
        const stepA = wb.stepA > 0 ? wb.stepA : 0.1;
        const maxA = wb.maxA > 0 ? wb.maxA : maxW / factor;
        let amps = floorToPositiveStep(Math.min(maxA, boundedW / factor), stepA);
        amps = Number(Math.max(0, amps).toFixed(3));
        if (amps > 0 && wb.minA > 0 && amps + 1e-9 < wb.minA)
            return { powerW: 0, currentA: 0 };
        const powerW = Math.max(0, Math.round(amps * factor));
        if (wb.minPowerW > 0 && powerW < wb.minPowerW)
            return { powerW: 0, currentA: 0 };
        return { powerW, currentA: amps };
    }
    const steppedW = floorToPositiveStep(boundedW, wb.stepW);
    const powerW = Math.max(0, Math.floor(steppedW + 1e-9));
    if (wb.minPowerW > 0 && powerW < wb.minPowerW)
        return { powerW: 0, currentA: 0 };
    const currentA = wb.chargerType === 'dc' ? 0 : Number((powerW / powerFactorWPerA(wb)).toFixed(3));
    return { powerW, currentA };
}
function capFromBinding(binding, cap) {
    if (!boolValue(binding, false))
        return null;
    const n = finiteOrNull(cap);
    return n === null ? 0 : Math.max(0, Math.round(n));
}
function effectiveNativeBudgetW(input, candidates) {
    const requestedCandidateW = candidates.reduce((sum, wb) => sum + Math.max(0, wb.requestedPowerW || 0), 0);
    const maxCandidateW = candidates.reduce((sum, wb) => sum + technicalMaxPowerW(wb), 0);
    const fallbackDemandW = requestedCandidateW > 0 ? requestedCandidateW : maxCandidateW;
    const budget = finiteOrNull(input.budgetW);
    const remaining = finiteOrNull(input.remainingW);
    const budgetMode = String(input.budgetMode || '').trim().toLowerCase();
    const unlimitedBudget = boolValue(input.budgetUnlimited, false)
        || budgetMode === 'unlimited'
        || budgetMode.endsWith(':unlimited')
        || budgetMode.includes('+unlimited');
    // Ein explizit vorhandenes Restbudget von 0 W ist ein harter Stop und darf
    // niemals als "Budget fehlt" auf den vorherigen Ladebedarf zurueckfallen. Bei
    // bewusst unbegrenztem Gesamtbudget bleibt dagegen der aktuelle Ladebedarf die
    // Obergrenze; `Infinity` wird nicht versehentlich als fehlendes 0-W-Budget behandelt.
    let available = unlimitedBudget
        ? fallbackDemandW
        : (budget === null ? (remaining !== null ? remaining : fallbackDemandW) : budget);
    if (!Number.isFinite(available) || available < 0)
        available = 0;
    const caps = [
        capFromBinding(input.gridCapBinding, input.gridCapEvcsW),
        capFromBinding(input.phaseCapBinding, input.phaseCapEvcsW),
        (boolValue(input.para14aActive, false) || boolValue(input.para14aBinding, false)) ? capFromBinding(true, input.para14aCapEvcsW) : null,
    ].filter((value) => typeof value === 'number' && Number.isFinite(value));
    for (const cap of caps)
        available = Math.min(available, cap);
    if (boolValue(input.pausedByPeakShaving, false))
        available = 0;
    return Math.max(0, Math.round(available));
}
function isChargingCandidate(wb) {
    const mode = normalizedChargingMode(wb);
    if (!wb.enabled || !wb.online)
        return false;
    if (!commandDemandAllowed(wb))
        return false;
    if (!wb.hasSetpoint)
        return false;
    if (mode === 'off')
        return false;
    if (wb.phaseSwitchRequired || wb.phaseSwitchSafetyStopRequired)
        return false;
    return wb.requestedPowerW > 0 || wb.requestedCurrentA > 0;
}
function finalGuardPriority(a, b) {
    // allocationRank transportiert die bereits zustandsbehaftete Reihenfolge der zentralen
    // Runtime (Boost, Ziel-Laden, laufende Session, Prioritaet und Stations-Round-Robin).
    // Der Abschluss-Guard darf diese Reihenfolge nicht neu erfinden.
    const aRank = a.allocationRank > 0 ? a.allocationRank : Number.POSITIVE_INFINITY;
    const bRank = b.allocationRank > 0 ? b.allocationRank : Number.POSITIVE_INFINITY;
    if (aRank !== bRank)
        return aRank - bRank;
    const aBoost = normalizedChargingMode(a) === 'boost' || a.boost ? 0 : 1;
    const bBoost = normalizedChargingMode(b) === 'boost' || b.boost ? 0 : 1;
    if (aBoost !== bBoost)
        return aBoost - bBoost;
    const aGoal = a.goalActive ? 0 : 1;
    const bGoal = b.goalActive ? 0 : 1;
    if (aGoal !== bGoal)
        return aGoal - bGoal;
    const aCharging = a.charging ? 0 : 1;
    const bCharging = b.charging ? 0 : 1;
    if (aCharging !== bCharging)
        return aCharging - bCharging;
    const aPriority = a.priority > 0 ? a.priority : 9999;
    const bPriority = b.priority > 0 ? b.priority : 9999;
    if (aPriority !== bPriority)
        return aPriority - bPriority;
    if (a.orderIndex !== b.orderIndex)
        return a.orderIndex - b.orderIndex;
    return a.safe.localeCompare(b.safe);
}
function appendAllocationSafetyReason(current, reason) {
    const reasons = String(current || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (reason && !reasons.includes(reason))
        reasons.push(reason);
    return reasons.join(',');
}
function actualPowerReservationW(wallbox) {
    const actualW = Math.max(0, Number.isFinite(wallbox.actualPowerW) ? wallbox.actualPowerW : 0);
    if (!(actualW > 0) || !wallbox.online)
        return 0;
    // Bei veralteter Leistungstelemetrie wird nur dann weiter konservativ reserviert,
    // wenn die Wallbox selbst noch einen aktiven Ladevorgang meldet. So kann ein alter
    // Messwert weder ein Stationsbudget dauerhaft blockieren noch während realem Laden
    // vorschnell freigegeben werden.
    if (wallbox.staleAny && !wallbox.charging)
        return 0;
    return actualW;
}
/**
 * Begrenzte Speicherzusage des Runtime-Aufrufers in W. Der Aufrufer prüft Messung,
 * Writer-Annahme und Schutzfreigaben und reserviert auch auslaufende Istleistung,
 * bevor er solche Zusagen verteilt. Hier darf weder ein fremder LP-Anteil noch
 * eine entfallene Freigabe durch Umverteilen ersetzt werden. Min+PV ergänzt nur
 * seine Mindestbasis; reines PV-Laden erhält weiterhin keinen Speicheranteil.
 * Ohne aktiven LP-Netzanteil bleibt der bisherige Speicherpfad unverändert.
 */
function zeroExportStorageCreditW(wallbox) {
    const mode = normalizedChargingMode(wallbox);
    if (typeof wallbox.zeroExportGridMaxW !== 'number' || !wallbox.effectiveStorageAssist || mode === 'pv' || wallbox.staleAny)
        return 0;
    const creditW = Math.max(0, Math.floor(finiteOrNull(wallbox.zeroExportStorageCreditW) ?? 0));
    return mode === 'minpv'
        ? Math.min(creditW, Math.max(0, technicalMinPowerW(wallbox) - wallbox.zeroExportGridMaxW))
        : creditW;
}
function gridBaseForPowerW(wallbox) {
    const mode = normalizedChargingMode(wallbox);
    if (mode === 'pv')
        return 0;
    const limited = typeof wallbox.zeroExportGridMaxW === 'number';
    return mode === 'minpv'
        ? Math.min(technicalMinPowerW(wallbox), limited ? wallbox.zeroExportGridMaxW : Infinity)
        : (limited ? wallbox.zeroExportGridMaxW : Infinity);
}
/** Dieselbe Quellaufteilung gilt für Ziele und auslaufende Istlast; Batterie wird nie als PV gezählt. */
function pvReservationForPowerW(wallbox, powerW) {
    const safePowerW = Math.max(0, Number.isFinite(powerW) ? powerW : 0);
    return Math.max(0, safePowerW - gridBaseForPowerW(wallbox) - zeroExportStorageCreditW(wallbox));
}
/**
 * Code-Teil: applyFinalAllocationSafetyGuards
 * Zweck: Erzwingt direkt vor dem produktiven Write-Plan die vier unverhandelbaren
 * Lademanagement-Invarianten: Gesamtbudget, PV-Grant, Stationslimit und technische
 * Mindest-/Schrittleistung. Der Guard verteilt keine zusaetzliche Leistung und kann
 * einen bereits zentral ermittelten Zielwert ausschliesslich reduzieren.
 */
/**
 * Ablauf und Zusammenhang: Begrenzt den ermittelten Ladeplan nochmals anhand der verbleibenden Ressourcen und Sicherheitsbedingungen. Nach Quantisierung und Verteilung dürfen Summen-/Stations-/PV-Grenzen nicht überschritten werden.
 */
/**
 * Zusätzliche Suchleistung ist eine explizite, ablaufende Einzelzusage des
 * zentralen 0-Einspeise-Koordinators. Veraltete Messungen, Phasenwechsel und
 * andere Betriebsarten dürfen diese Zusage niemals zum PV-Budget umdeuten.
 */
function validZeroExportProbeW(wallbox, input) {
    const now = nonNegative(input.ts, Date.now());
    if (normalizedChargingMode(wallbox) !== 'pv' || wallbox.staleAny
        || boolValue(input.staleMeter, false) || boolValue(input.staleBudget, false)
        || wallbox.phaseSwitchRequired || wallbox.phaseSwitchSafetyStopRequired
        || !(Number(wallbox.zeroExportProbeValidUntil) > now))
        return 0;
    return Math.min(technicalMaxPowerW(wallbox), nonNegative(wallbox.zeroExportProbeExtraW), typeof wallbox.zeroExportGridMaxW === 'number' ? wallbox.zeroExportGridMaxW : Infinity);
}
function applyFinalAllocationSafetyGuards(planRaw, input) {
    const planned = planRaw.map((wallbox) => ({ ...wallbox }));
    const totalBudgetW = effectiveNativeBudgetW(input, planned);
    const hasPvManagedDemand = planned.some((wallbox) => {
        const mode = normalizedChargingMode(wallbox);
        return mode === 'pv' || mode === 'minpv' || typeof wallbox.zeroExportGridMaxW === 'number';
    });
    let totalRemainingW = Math.max(0, totalBudgetW);
    const physicalPvBudgetTotalW = hasPvManagedDemand ? physicalPvBudgetW(input) : Number.POSITIVE_INFINITY;
    const purePvBudgetTotalW = hasPvManagedDemand ? purePvBudgetW(input) : Number.POSITIVE_INFINITY;
    let physicalPvRemainingW = physicalPvBudgetTotalW;
    let purePvRemainingW = purePvBudgetTotalW;
    const stationCapByKey = new Map();
    for (const wallbox of planned) {
        const stationKey = String(wallbox.stationKey || '').trim();
        const capW = Math.max(0, wallbox.stationMaxPowerW || 0);
        if (!stationKey || !(capW > 0))
            continue;
        const previous = stationCapByKey.get(stationKey);
        stationCapByKey.set(stationKey, previous !== undefined ? Math.min(previous, capW) : capW);
    }
    const stationRemainingW = new Map(stationCapByKey);
    const stationAllocatedW = new Map();
    // Bereits physisch fließende Ladeleistung muss bis zur bestätigten Rücknahme im
    // Gesamt- und Stationsbudget reserviert bleiben. Andernfalls könnte ein zweiter
    // Connector sofort hochfahren, während der erste den vorherigen Sollwert noch umsetzt.
    // Der Guard arbeitet deshalb mit max(Istleistung, neuem Sollwert), nicht nur mit Zielwerten.
    const actualReservationBySafe = new Map();
    const actualPvReservationBySafe = new Map();
    const actualPurePvReservationBySafe = new Map();
    let totalReservedW = 0;
    let physicalPvReservedW = 0;
    let purePvReservedW = 0;
    const stationReservedW = new Map();
    for (const wallbox of planned) {
        const actualW = actualPowerReservationW(wallbox);
        const actualProbeW = validZeroExportProbeW(wallbox, input);
        const actualPvW = pvReservationForPowerW(wallbox, Math.max(0, actualW - actualProbeW));
        const actualPurePvW = normalizedChargingMode(wallbox) === 'pv' ? actualPvW : 0;
        actualReservationBySafe.set(wallbox.safe, actualW);
        actualPvReservationBySafe.set(wallbox.safe, actualPvW);
        actualPurePvReservationBySafe.set(wallbox.safe, actualPurePvW);
        totalReservedW += actualW;
        physicalPvReservedW += actualPvW;
        purePvReservedW += actualPurePvW;
        const stationKey = String(wallbox.stationKey || '').trim();
        if (stationKey && stationCapByKey.has(stationKey)) {
            stationReservedW.set(stationKey, (stationReservedW.get(stationKey) || 0) + actualW);
        }
    }
    totalRemainingW = Math.max(0, totalBudgetW - totalReservedW);
    if (Number.isFinite(physicalPvRemainingW)) {
        physicalPvRemainingW = Math.max(0, physicalPvRemainingW - physicalPvReservedW);
    }
    if (Number.isFinite(purePvRemainingW)) {
        purePvRemainingW = Math.max(0, purePvRemainingW - purePvReservedW);
    }
    for (const [stationKey, capW] of stationCapByKey.entries()) {
        stationRemainingW.set(stationKey, Math.max(0, capW - (stationReservedW.get(stationKey) || 0)));
    }
    const guardedBySafe = new Map();
    const candidates = [...planned].sort(finalGuardPriority);
    for (const wallbox of candidates) {
        const mode = normalizedChargingMode(wallbox);
        const requestedW = Math.max(0, Math.min(technicalMaxPowerW(wallbox), Number.isFinite(wallbox.targetPowerW) ? wallbox.targetPowerW : 0));
        let safetyReason = String(wallbox.allocationSafetyReason || '');
        let allowedW = requestedW;
        const actualReservedW = Math.max(0, actualReservationBySafe.get(wallbox.safe) || 0);
        const actualPvReservedW = Math.max(0, actualPvReservationBySafe.get(wallbox.safe) || 0);
        const actualPurePvReservedW = Math.max(0, actualPurePvReservationBySafe.get(wallbox.safe) || 0);
        const canRun = wallbox.enabled
            && wallbox.online
            && commandDemandAllowed(wallbox)
            && wallbox.hasSetpoint
            && mode !== 'off'
            && !(nonNegative(wallbox.zeroExportRestartUntilMs) > nonNegative(input.ts, Date.now()))
            && !wallbox.phaseSwitchRequired
            && !wallbox.phaseSwitchSafetyStopRequired
            && !boolValue(input.pausedByPeakShaving, false);
        if (!canRun || !(requestedW > 0)) {
            allowedW = 0;
            if (requestedW > 0)
                safetyReason = appendAllocationSafetyReason(safetyReason, 'availability-or-safety');
        }
        const totalAllowedForWallboxW = Math.max(0, totalBudgetW - Math.max(0, totalReservedW - actualReservedW));
        if (allowedW > totalAllowedForWallboxW) {
            allowedW = totalAllowedForWallboxW;
            safetyReason = appendAllocationSafetyReason(safetyReason, 'central-budget');
        }
        const stationKey = String(wallbox.stationKey || '').trim();
        if (allowedW > 0 && stationKey && stationRemainingW.has(stationKey)) {
            const stationCapW = Math.max(0, Number(stationCapByKey.get(stationKey) || 0));
            const stationReservedTotalW = Math.max(0, Number(stationReservedW.get(stationKey) || 0));
            const stationAllowedForWallboxW = Math.max(0, stationCapW - Math.max(0, stationReservedTotalW - actualReservedW));
            if (allowedW > stationAllowedForWallboxW) {
                allowedW = stationAllowedForWallboxW;
                safetyReason = appendAllocationSafetyReason(safetyReason, 'station-limit');
            }
        }
        const minW = technicalMinPowerW(wallbox);
        const probeExtraW = canRun ? validZeroExportProbeW(wallbox, input) : 0;
        // PV wird auch für Boost/Auto aus demselben Topf reserviert. Bereits
        // fließende Leistung anderer LP bleibt bis zum realen Abregeln belegt.
        if (allowedW > 0 && typeof wallbox.zeroExportGridMaxW === 'number') {
            const pvForWallboxW = Math.max(0, physicalPvBudgetTotalW - Math.max(0, physicalPvReservedW - actualPvReservedW));
            const maxByGridShareW = wallbox.zeroExportGridMaxW + zeroExportStorageCreditW(wallbox) + pvForWallboxW;
            if (allowedW > maxByGridShareW) {
                allowedW = maxByGridShareW;
                safetyReason = appendAllocationSafetyReason(safetyReason, 'zero-export-grid-share');
            }
        }
        if (allowedW > 0 && mode === 'pv') {
            const physicalAllowedForWallboxW = Math.max(0, physicalPvBudgetTotalW - Math.max(0, physicalPvReservedW - actualPvReservedW));
            const pureAllowedForWallboxW = Math.max(0, purePvBudgetTotalW - Math.max(0, purePvReservedW - actualPurePvReservedW));
            const maxByPvW = Math.min(physicalAllowedForWallboxW, pureAllowedForWallboxW) + probeExtraW;
            if (allowedW > maxByPvW) {
                allowedW = maxByPvW;
                safetyReason = appendAllocationSafetyReason(safetyReason, 'pv-grant');
            }
        }
        else if (allowedW > 0 && mode === 'minpv') {
            // Bei Min+PV kommt nur die technische Basis aus dem Gesamtbudget. Alles oberhalb
            // dieser Basis muss durch den physikalischen PV-Rest gedeckt sein. Die
            // kundenseitige Speicher/E-Mobilitaets-Aufteilung gilt nur fuer reine
            // PV-Ladepunkte und darf Min+PV nicht unter seine Betriebssemantik druecken.
            const pvAllowedForWallboxW = Math.max(0, physicalPvBudgetTotalW - Math.max(0, physicalPvReservedW - actualPvReservedW));
            const gridBaseW = typeof wallbox.zeroExportGridMaxW === 'number' ? Math.min(minW, wallbox.zeroExportGridMaxW) : minW;
            const maxByPvW = Math.max(0, gridBaseW) + zeroExportStorageCreditW(wallbox) + pvAllowedForWallboxW;
            if (allowedW > maxByPvW) {
                allowedW = maxByPvW;
                safetyReason = appendAllocationSafetyReason(safetyReason, 'pv-grant');
            }
        }
        let quantized = quantizeTargetDown(wallbox, allowedW);
        if (quantized.powerW > 0 && minW > 0 && quantized.powerW + 1e-6 < minW) {
            quantized = { powerW: 0, currentA: 0 };
            safetyReason = appendAllocationSafetyReason(safetyReason, 'technical-minimum');
        }
        if (requestedW > 0 && quantized.powerW <= 0 && !safetyReason) {
            safetyReason = 'technical-minimum';
        }
        if (quantized.powerW + 1 < requestedW && !safetyReason) {
            safetyReason = 'quantization';
        }
        const finalPowerW = Math.max(0, Math.min(requestedW, quantized.powerW));
        const finalCurrentA = finalPowerW <= 0
            ? 0
            : (wallbox.controlBasis === 'current'
                ? Math.max(0, quantized.currentA)
                : (Math.abs(finalPowerW - requestedW) <= 1
                    ? Math.max(0, wallbox.targetCurrentA || 0)
                    : Number((finalPowerW / powerFactorWPerA(wallbox)).toFixed(3))));
        const pvUsedW = pvReservationForPowerW(wallbox, mode === 'pv' ? Math.max(0, finalPowerW - probeExtraW) : finalPowerW);
        // Nach Stop, Quantisierung oder engerem Stationslimit nur den tatsächlich
        // vorgesehenen Anteil ausweisen. Die ungenutzte Zusage bleibt bei diesem LP
        // reserviert und wird hier niemals an andere Ladepunkte weitergereicht.
        const batteryContributionW = typeof wallbox.zeroExportGridMaxW === 'number'
            ? Math.min(zeroExportStorageCreditW(wallbox), Math.max(0, finalPowerW - gridBaseForPowerW(wallbox)))
            : wallbox.batteryContributionW;
        const purePvUsedW = mode === 'pv' ? pvUsedW : 0;
        const finalReservedW = Math.max(actualReservedW, finalPowerW);
        const finalPvReservedW = Math.max(actualPvReservedW, pvUsedW);
        const finalPurePvReservedW = Math.max(actualPurePvReservedW, purePvUsedW);
        totalReservedW += Math.max(0, finalReservedW - actualReservedW);
        totalRemainingW = Math.max(0, totalBudgetW - totalReservedW);
        if (Number.isFinite(physicalPvRemainingW)) {
            physicalPvReservedW += Math.max(0, finalPvReservedW - actualPvReservedW);
            physicalPvRemainingW = Math.max(0, physicalPvBudgetTotalW - physicalPvReservedW);
        }
        if (Number.isFinite(purePvRemainingW)) {
            purePvReservedW += Math.max(0, finalPurePvReservedW - actualPurePvReservedW);
            purePvRemainingW = Math.max(0, purePvBudgetTotalW - purePvReservedW);
        }
        if (stationKey && stationRemainingW.has(stationKey)) {
            const nextStationReservedW = Math.max(0, Number(stationReservedW.get(stationKey) || 0))
                + Math.max(0, finalReservedW - actualReservedW);
            stationReservedW.set(stationKey, nextStationReservedW);
            stationRemainingW.set(stationKey, Math.max(0, Number(stationCapByKey.get(stationKey) || 0) - nextStationReservedW));
            stationAllocatedW.set(stationKey, (stationAllocatedW.get(stationKey) || 0) + finalPowerW);
        }
        guardedBySafe.set(wallbox.safe, {
            ...wallbox,
            targetPowerW: finalPowerW,
            targetCurrentA: finalCurrentA,
            zeroExportProbeExtraW: Math.min(finalPowerW, probeExtraW),
            batteryContributionW,
            pvUsedW,
            allocationSafetyCapped: finalPowerW + 1 < requestedW
                || (wallbox.controlBasis === 'current' && finalCurrentA + 0.001 < Math.max(0, wallbox.targetCurrentA || 0)),
            allocationSafetyReason: safetyReason,
            // Ein positiver Runtime-Wunsch, der wegen Budget/Minimum final auf 0 faellt,
            // muss als expliziter Stop an den bestehenden Executor uebergeben werden.
            writeRequired: wallbox.online && wallbox.hasSetpoint && (wallbox.writeRequired || requestedW > 0),
            reason: finalPowerW > 0
                ? (wallbox.reason || 'central-allocation-final')
                : (requestedW > 0 ? (safetyReason || 'central-allocation-blocked') : wallbox.reason),
        });
    }
    return planned.map((wallbox) => {
        const guarded = guardedBySafe.get(wallbox.safe) || { ...wallbox };
        const stationKey = String(guarded.stationKey || '').trim();
        const stationCapW = stationKey && stationCapByKey.has(stationKey) ? Number(stationCapByKey.get(stationKey) || 0) : 0;
        const stationUsedW = stationKey && stationCapByKey.has(stationKey) ? Number(stationAllocatedW.get(stationKey) || 0) : 0;
        const stationSafeRemainingW = stationKey && stationRemainingW.has(stationKey)
            ? Number(stationRemainingW.get(stationKey) || 0)
            : 0;
        return {
            ...guarded,
            stationAllocatedW: Math.max(0, Math.round(stationUsedW)),
            stationRemainingW: stationCapW > 0 ? Math.max(0, Math.round(stationSafeRemainingW)) : 0,
        };
    });
}
function compareNativeCandidates(a, b) {
    const aBoost = a.mode === 'boost' || a.wb.boost ? 0 : 1;
    const bBoost = b.mode === 'boost' || b.wb.boost ? 0 : 1;
    if (aBoost !== bBoost)
        return aBoost - bBoost;
    const aGoal = a.wb.goalActive ? 0 : 1;
    const bGoal = b.wb.goalActive ? 0 : 1;
    if (aGoal !== bGoal)
        return aGoal - bGoal;
    if (a.wb.goalActive && b.wb.goalActive) {
        const aFinish = a.wb.goalFinishTs > 0 ? a.wb.goalFinishTs : Number.POSITIVE_INFINITY;
        const bFinish = b.wb.goalFinishTs > 0 ? b.wb.goalFinishTs : Number.POSITIVE_INFINITY;
        if (aFinish !== bFinish)
            return aFinish - bFinish;
        if (a.wb.goalUrgency !== b.wb.goalUrgency)
            return b.wb.goalUrgency - a.wb.goalUrgency;
    }
    const aCharging = a.wb.charging ? 0 : 1;
    const bCharging = b.wb.charging ? 0 : 1;
    if (aCharging !== bCharging)
        return aCharging - bCharging;
    const aSince = a.wb.chargingSinceMs > 0 ? a.wb.chargingSinceMs : Number.POSITIVE_INFINITY;
    const bSince = b.wb.chargingSinceMs > 0 ? b.wb.chargingSinceMs : Number.POSITIVE_INFINITY;
    if (aSince !== bSince)
        return aSince - bSince;
    // In der NexoWatt-Konfiguration bedeutet eine kleinere Zahl eine höhere Priorität.
    if (a.wb.priority !== b.wb.priority)
        return a.wb.priority - b.wb.priority;
    if (a.wb.allocationRank !== b.wb.allocationRank)
        return a.wb.allocationRank - b.wb.allocationRank;
    if (a.wb.orderIndex !== b.wb.orderIndex)
        return a.wb.orderIndex - b.wb.orderIndex;
    return a.wb.safe.localeCompare(b.wb.safe);
}
function nativePriorityGroupKey(candidate) {
    const wb = candidate.wb;
    const boost = candidate.mode === 'boost' || wb.boost ? 1 : 0;
    const goal = wb.goalActive ? 1 : 0;
    const finishBucket = goal && wb.goalFinishTs > 0 ? Math.floor(wb.goalFinishTs / 60000) : 0;
    const charging = wb.charging ? 1 : 0;
    return `${boost}|${goal}|${finishBucket}|${charging}|${wb.priority}`;
}
function buildStationCaps(candidates) {
    const caps = new Map();
    for (const candidate of candidates) {
        const key = String(candidate.wb.stationKey || '').trim();
        const cap = Math.max(0, candidate.wb.stationMaxPowerW || 0);
        if (!key || !(cap > 0))
            continue;
        const previous = caps.get(key);
        caps.set(key, previous !== undefined ? Math.min(previous, cap) : cap);
    }
    return caps;
}
function stationResourceW(candidate, stationRemaining) {
    const key = String(candidate.wb.stationKey || '').trim();
    if (!key || !stationRemaining.has(key))
        return Number.POSITIVE_INFINITY;
    return Math.max(0, Number(stationRemaining.get(key) || 0));
}
function pvRequiredForIncrement(candidate, incrementW) {
    if (!(incrementW > 0))
        return 0;
    if (typeof candidate.wb.zeroExportGridMaxW === 'number') {
        return Math.max(0, pvReservationForPowerW(candidate.wb, candidate.allocatedW + incrementW)
            - pvReservationForPowerW(candidate.wb, candidate.allocatedW));
    }
    if (candidate.mode === 'pv')
        return incrementW;
    if (candidate.mode === 'minpv') {
        const beforeExtra = Math.max(0, candidate.allocatedW - candidate.minW);
        const afterExtra = Math.max(0, candidate.allocatedW + incrementW - candidate.minW);
        return Math.max(0, afterExtra - beforeExtra);
    }
    return 0;
}
function maxIncrementByPv(candidate, pvRemainingW) {
    if (typeof candidate.wb.zeroExportGridMaxW === 'number') {
        const freeBaseW = Math.max(0, gridBaseForPowerW(candidate.wb) + zeroExportStorageCreditW(candidate.wb) - candidate.allocatedW);
        return freeBaseW + Math.max(0, pvRemainingW);
    }
    if (candidate.mode === 'pv')
        return Math.max(0, pvRemainingW);
    if (candidate.mode === 'minpv') {
        const freeBaseW = Math.max(0, candidate.minW - candidate.allocatedW);
        return freeBaseW + Math.max(0, pvRemainingW);
    }
    return Number.POSITIVE_INFINITY;
}
function applyTsNativeAllocationPlan(plannedRaw, input) {
    const allCandidates = plannedRaw.map((wb, sourceIndex) => {
        const minW = technicalMinPowerW(wb);
        const maxW = Math.max(minW, technicalMaxPowerW(wb));
        // Auch der experimentelle TS-Native-Modus darf keinen Ladebedarf erfinden.
        // Der zustandsbehaftete Runtime-Plan liefert den maximal aktuell erlaubten Demand
        // (einschliesslich Hysterese, Startfreigabe und Rampen); TypeScript verteilt diesen
        // Demand nur innerhalb von Gesamt-, PV- und Stationsbudget.
        const demandCeilingW = Math.max(0, Math.min(maxW, wb.requestedPowerW || 0));
        const requested = quantizeTargetDown(wb, demandCeilingW);
        return {
            wb,
            sourceIndex,
            mode: normalizedChargingMode(wb),
            minW,
            maxW,
            requestW: requested.powerW,
            allocatedW: 0,
            pvUsedW: 0,
            reason: requested.powerW > 0 ? 'ts-native-demand-ready' : 'no-demand',
            eligible: false,
        };
    });
    const candidates = allCandidates.filter((candidate) => isChargingCandidate(candidate.wb)).sort(compareNativeCandidates);
    const availableW = effectiveNativeBudgetW(input, candidates.map((item) => item.wb));
    const hasPvManagedDemand = candidates.some((candidate) => candidate.mode === 'pv' || candidate.mode === 'minpv'
        || typeof candidate.wb.zeroExportGridMaxW === 'number');
    let remainingW = availableW;
    let physicalPvRemainingW = hasPvManagedDemand ? physicalPvBudgetW(input) : Number.POSITIVE_INFINITY;
    let purePvRemainingW = hasPvManagedDemand ? purePvBudgetW(input) : Number.POSITIVE_INFINITY;
    const stationCaps = buildStationCaps(candidates);
    const stationRemaining = new Map(stationCaps);
    const consume = (candidate, incrementW) => {
        if (!(incrementW > 0))
            return false;
        const quantized = quantizeTargetDown(candidate.wb, candidate.allocatedW + incrementW);
        const nextW = Math.min(candidate.requestW, quantized.powerW);
        const actualIncrementW = Math.max(0, nextW - candidate.allocatedW);
        if (!(actualIncrementW > 0))
            return false;
        if (actualIncrementW > remainingW + 1e-6)
            return false;
        const stationAvailableW = stationResourceW(candidate, stationRemaining);
        if (actualIncrementW > stationAvailableW + 1e-6)
            return false;
        const pvIncrementW = pvRequiredForIncrement(candidate, actualIncrementW);
        const purePvIncrementW = candidate.mode === 'pv' ? pvIncrementW : 0;
        if (pvIncrementW > physicalPvRemainingW + 1e-6)
            return false;
        if (purePvIncrementW > purePvRemainingW + 1e-6)
            return false;
        candidate.allocatedW += actualIncrementW;
        candidate.pvUsedW += pvIncrementW;
        remainingW = Math.max(0, remainingW - actualIncrementW);
        if (Number.isFinite(physicalPvRemainingW)) {
            physicalPvRemainingW = Math.max(0, physicalPvRemainingW - pvIncrementW);
        }
        if (Number.isFinite(purePvRemainingW)) {
            purePvRemainingW = Math.max(0, purePvRemainingW - purePvIncrementW);
        }
        const stationKey = String(candidate.wb.stationKey || '').trim();
        if (stationKey && stationRemaining.has(stationKey)) {
            stationRemaining.set(stationKey, Math.max(0, Number(stationRemaining.get(stationKey) || 0) - actualIncrementW));
        }
        candidate.reason = candidate.allocatedW + 1 >= candidate.requestW ? 'ts-native-request-satisfied' : 'ts-native-budget-allocated';
        return true;
    };
    // Prioritaetsklassen werden nacheinander abgearbeitet. Dadurch kann eine niedriger
    // priorisierte Klasse nicht bereits Mindestleistung reservieren, solange eine hoehere
    // Klasse noch ungedeckten Bedarf hat. Innerhalb derselben Klasse wird fair verteilt;
    // allocationRank bildet dabei die zustandsbehaftete Stations-Round-Robin-Reihenfolge ab.
    const groups = [];
    for (const candidate of candidates) {
        const key = nativePriorityGroupKey(candidate);
        const previous = groups.length ? groups[groups.length - 1] : null;
        if (!previous || !previous[0] || nativePriorityGroupKey(previous[0]) !== key)
            groups.push([candidate]);
        else
            previous.push(candidate);
    }
    for (const group of groups) {
        // Nur vollstaendige technische Mindestleistungen werden gestartet. Ein Ladepunkt
        // erhaelt niemals einen Teilwert unterhalb von 6 A / seiner konfigurierten Basis.
        for (const candidate of group) {
            if (!(candidate.requestW > 0)) {
                candidate.reason = 'no-demand';
                continue;
            }
            if (candidate.minW > 0 && candidate.requestW < candidate.minW) {
                candidate.reason = 'requested-below-minimum';
                continue;
            }
            const startW = candidate.minW > 0 ? candidate.minW : 0;
            const stationAvailableW = stationResourceW(candidate, stationRemaining);
            const pvStartW = pvRequiredForIncrement(candidate, startW);
            if (startW > remainingW + 1e-6) {
                candidate.reason = 'budget-below-minimum';
                continue;
            }
            if (startW > stationAvailableW + 1e-6) {
                candidate.reason = 'station-budget-below-minimum';
                continue;
            }
            if (pvStartW > physicalPvRemainingW + 1e-6 || (candidate.mode === 'pv' && pvStartW > purePvRemainingW + 1e-6)) {
                candidate.reason = 'pv-budget-below-minimum';
                continue;
            }
            candidate.eligible = true;
            if (startW > 0)
                consume(candidate, startW);
        }
        let guard = 0;
        while (remainingW > 0 && guard < 200) {
            guard += 1;
            const active = group.filter((candidate) => candidate.eligible && candidate.allocatedW + 1 < candidate.requestW);
            if (!active.length)
                break;
            const activePv = active.filter((candidate) => candidate.mode === 'pv' || candidate.mode === 'minpv'
                || typeof candidate.wb.zeroExportGridMaxW === 'number');
            const activePurePv = active.filter((candidate) => candidate.mode === 'pv');
            const activeByStation = new Map();
            for (const candidate of active) {
                const key = String(candidate.wb.stationKey || '').trim();
                if (key && stationRemaining.has(key))
                    activeByStation.set(key, (activeByStation.get(key) || 0) + 1);
            }
            const globalShareW = Number.isFinite(remainingW) ? Math.max(0, Math.floor(remainingW / active.length)) : Number.POSITIVE_INFINITY;
            const physicalPvShareW = Number.isFinite(physicalPvRemainingW) && activePv.length
                ? Math.max(0, Math.floor(physicalPvRemainingW / activePv.length))
                : Number.POSITIVE_INFINITY;
            const purePvShareW = Number.isFinite(purePvRemainingW) && activePurePv.length
                ? Math.max(0, Math.floor(purePvRemainingW / activePurePv.length))
                : Number.POSITIVE_INFINITY;
            let progress = false;
            for (const candidate of active) {
                const roomW = Math.max(0, candidate.requestW - candidate.allocatedW);
                const stationKey = String(candidate.wb.stationKey || '').trim();
                const stationCount = stationKey && activeByStation.has(stationKey) ? Math.max(1, Number(activeByStation.get(stationKey) || 1)) : 1;
                const stationShareW = stationKey && stationRemaining.has(stationKey)
                    ? Math.max(0, Math.floor(Number(stationRemaining.get(stationKey) || 0) / stationCount))
                    : Number.POSITIVE_INFINITY;
                const candidatePvShareW = candidate.mode === 'pv'
                    ? Math.min(physicalPvShareW, purePvShareW)
                    : (candidate.mode === 'minpv' || typeof candidate.wb.zeroExportGridMaxW === 'number' ? physicalPvShareW : Number.POSITIVE_INFINITY);
                const addLimitW = Math.min(roomW, globalShareW, stationShareW, maxIncrementByPv(candidate, candidatePvShareW));
                if (addLimitW > 0 && consume(candidate, addLimitW))
                    progress = true;
            }
            if (progress)
                continue;
            // Falls der faire Anteil kleiner als ein Geraeteschritt ist, erhaelt der erste
            // passende Ladepunkt genau einen quantisierten Schritt. So bleibt das Budget
            // nutzbar, ohne durch Aufrunden ueberschritten zu werden.
            for (const candidate of active) {
                const beforeW = candidate.allocatedW;
                const stepRequestW = candidate.wb.controlBasis === 'current'
                    ? powerFactorWPerA(candidate.wb) * (candidate.wb.stepA > 0 ? candidate.wb.stepA : 0.1)
                    : (candidate.wb.stepW > 0 ? candidate.wb.stepW : 1);
                if (consume(candidate, Math.max(1, stepRequestW))) {
                    progress = candidate.allocatedW > beforeW;
                    if (progress)
                        break;
                }
            }
            if (!progress)
                break;
        }
        // Solange diese Klasse ihr zulaessiges Budget nicht ausschöpfen konnte, darf die
        // naechste Klasse den verbleibenden Rest nutzen. Ist das Gesamtbudget bereits leer,
        // endet die Verteilung sofort.
        if (!(remainingW > 0))
            break;
    }
    const finalStationAllocated = new Map();
    for (const candidate of allCandidates) {
        const key = String(candidate.wb.stationKey || '').trim();
        if (!key || !stationCaps.has(key))
            continue;
        finalStationAllocated.set(key, (finalStationAllocated.get(key) || 0) + candidate.allocatedW);
    }
    const bySafe = new Map(allCandidates.map((candidate) => [candidate.wb.safe, candidate]));
    return plannedRaw.map((wb) => {
        if (wb.phaseSwitchRequired || wb.phaseSwitchSafetyStopRequired) {
            const canWriteSafeStop = wb.online && wb.hasSetpoint;
            const reason = wb.phaseSwitchCommandAllowed
                ? (wb.phaseSwitchReason || 'phase-switch-command-ready')
                : (wb.phaseSwitchReason || 'phase-switch-stop-before-switch');
            return {
                ...wb,
                targetPowerW: 0,
                targetCurrentA: 0,
                pvUsedW: 0,
                stationAllocatedW: 0,
                stationRemainingW: wb.stationMaxPowerW,
                blocked: !canWriteSafeStop,
                reason: canWriteSafeStop ? reason : (wb.online ? 'missing-wallbox-setpoint' : 'offline'),
                writeRequired: canWriteSafeStop,
                boost: false,
            };
        }
        const chosen = bySafe.get(wb.safe);
        const quantized = chosen ? quantizeTargetDown(wb, chosen.allocatedW) : { powerW: 0, currentA: 0 };
        let reason = chosen ? chosen.reason : 'no-demand';
        let blocked = false;
        if (!wb.online) {
            blocked = true;
            reason = 'offline';
        }
        else if (!wb.enabled) {
            blocked = false;
            reason = 'control_disabled';
        }
        else if (!commandDemandAllowed(wb)) {
            blocked = false;
            reason = 'no_vehicle_demand';
        }
        else if (!wb.hasSetpoint) {
            blocked = true;
            reason = 'missing-wallbox-setpoint';
        }
        else if (wb.requestedPowerW <= 0 && reason === 'no-demand') {
            reason = wb.reason || 'no-demand';
        }
        const stationKey = String(wb.stationKey || '').trim();
        const stationCapW = stationKey && stationCaps.has(stationKey) ? Number(stationCaps.get(stationKey) || 0) : 0;
        const stationAllocatedW = stationKey && stationCaps.has(stationKey) ? Number(finalStationAllocated.get(stationKey) || 0) : 0;
        const stationRemainingW = stationCapW > 0 ? Math.max(0, stationCapW - stationAllocatedW) : 0;
        const writeRequired = wb.hasSetpoint && wb.online;
        return {
            ...wb,
            targetPowerW: quantized.powerW,
            targetCurrentA: quantized.currentA,
            pvUsedW: chosen ? Math.max(0, Math.round(chosen.pvUsedW)) : 0,
            stationAllocatedW: Math.max(0, Math.round(stationAllocatedW)),
            stationRemainingW: Math.max(0, Math.round(stationRemainingW)),
            blocked,
            reason: reason || 'ts-native-budget-allocated',
            writeRequired,
            boost: normalizedChargingMode(wb) === 'boost',
        };
    });
}
function normalizeWallboxPlan(wallbox, index, allocation, input, phaseDecision = null) {
    const safe = safeKey(wallbox.safe ?? wallbox.key ?? wallbox.id ?? wallbox.name ?? (allocation ? allocation.safe : null), index);
    const name = str(wallbox.name ?? (allocation ? allocation.name : null), safe);
    const enabled = boolValue(wallbox.enabled, boolValue(allocation ? allocation.enabled : undefined, false));
    const online = boolValue(wallbox.online, boolValue(allocation ? allocation.online : undefined, false));
    const charging = boolValue(wallbox.charging, boolValue(allocation ? allocation.charging : undefined, false));
    const effectiveMode = str(allocation ? allocation.effectiveMode : undefined, str(wallbox.effectiveMode, str(wallbox.userMode, str(input.mode, 'unknown'))));
    // Physischer Anschluss und fachlich bestätigter Ladebedarf sind zwei getrennte
    // Signale. Das verhindert, dass ein bewusst vorgerüsteter Boost in der UI als
    // angeschlossenes Fahrzeug erscheint. Für ältere Aufrufer bleibt der echte
    // Plug-Status ein konservativer Demand-Fallback.
    const connected = boolValue(wallbox.vehiclePlugged, boolValue(allocation ? allocation.vehiclePlugged : undefined, false));
    const demandConfirmed = boolValue(wallbox.vehicleDemandConfirmed, boolValue(allocation ? allocation.vehicleDemandConfirmed : undefined, connected));
    const vehicleStartEligible = boolValue(wallbox.vehicleStartEligible, boolValue(allocation ? allocation.vehicleStartEligible : undefined, false));
    const vehicleStartProbeActive = boolValue(wallbox.vehicleStartProbeActive, boolValue(allocation ? allocation.vehicleStartProbeActive : undefined, false));
    const vehicleStartCooldownActive = boolValue(wallbox.vehicleStartCooldownActive, boolValue(allocation ? allocation.vehicleStartCooldownActive : undefined, false));
    const boostPrearmAllowed = boolValue(wallbox.boostPrearmAllowed, boolValue(allocation ? allocation.boostPrearmAllowed : undefined, effectiveMode.trim().toLowerCase() === 'boost'));
    const userMode = str(wallbox.userMode, str(allocation ? allocation.userMode : undefined, ''));
    const chargerType = str(wallbox.chargerType ?? (allocation ? allocation.chargerType : null), 'ac').toLowerCase();
    const controlBasisRaw = str(wallbox.controlBasis ?? (allocation ? allocation.controlBasis : null), 'power').toLowerCase();
    const controlBasis = ['current', 'currenta', 'current_a', 'a', 'amp', 'amps'].includes(controlBasisRaw) ? 'current' : 'power';
    const configuredPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision && chargerType !== 'dc' ? phaseDecision.configuredPhaseCount : undefined, nonNegative(wallbox.configuredPhaseCount ?? wallbox.phases, chargerType === 'dc' ? 1 : 3)) || 1));
    const currentPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.currentPhaseCount : undefined, nonNegative(wallbox.currentPhaseCount ?? wallbox.phases, configuredPhaseCount)) || configuredPhaseCount));
    const targetPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.targetPhaseCount : undefined, nonNegative(wallbox.targetPhaseCount ?? wallbox.phases, configuredPhaseCount)) || configuredPhaseCount));
    const allocationPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.allocationPhaseCount : undefined, nonNegative(wallbox.allocationPhaseCount ?? wallbox.phases, currentPhaseCount)) || currentPhaseCount));
    const phases = chargerType === 'dc'
        ? (wallbox.dcCurrentReference === 'ac-input' ? configuredPhaseCount : 1)
        : (allocationPhaseCount === 1 ? 1 : 3);
    const voltageV = Math.max(1, nonNegative(wallbox.voltageV, 230) || 230);
    const minA = nonNegativeFloat(wallbox.minA, 0);
    const maxA = nonNegativeFloat(wallbox.maxA, 0);
    const derivedMinW = phases * voltageV * minA;
    const derivedMaxW = phases * voltageV * maxA;
    const minPowerW = nonNegative(wallbox.minPowerW ?? wallbox.minPW, derivedMinW);
    const maxPowerW = nonNegative(wallbox.maxPowerW ?? wallbox.maxPW, derivedMaxW);
    const requestedCurrentA = nonNegativeFloat((allocation ? (allocation.targetA ?? allocation.targetCurrentA) : undefined) ?? wallbox.targetCurrentA ?? wallbox.targetA);
    const requestedPowerExplicitW = nonNegative((allocation ? (allocation.targetW ?? allocation.targetPowerW) : undefined) ?? wallbox.targetPowerW ?? wallbox.targetW);
    const requestedPowerW = requestedPowerExplicitW > 0
        ? requestedPowerExplicitW
        : (requestedCurrentA > 0 ? Math.round(requestedCurrentA * phases * voltageV) : 0);
    // Im nicht nativen Diagnosepfad bleiben die gelieferten Zielwerte unverändert sichtbar.
    // Im TS-Normalpfad dienen sie ausschließlich als pro Ladepunkt angeforderte Obergrenze;
    // die endgültige Verteilung erfolgt danach zentral gegen Gesamt-, PV- und Stationsbudget.
    const targetPowerW = requestedPowerW;
    const targetCurrentA = requestedCurrentA > 0
        ? requestedCurrentA
        : (controlBasis === 'current' && requestedPowerW > 0 ? Number((requestedPowerW / (phases * voltageV)).toFixed(3)) : 0);
    const actualPowerW = nonNegative(wallbox.actualPowerW ?? (allocation ? allocation.actualPowerW : undefined));
    const staleAny = boolValue(wallbox.staleAny ?? (allocation ? allocation.staleAny : undefined), false);
    const pvUsedW = nonNegative(allocation ? allocation.pvUsedW : undefined);
    const hasPowerSetpoint = boolValue(wallbox.hasSetPower, typeof wallbox.setWKey === 'string' && wallbox.setWKey.trim().length > 0);
    const hasCurrentSetpoint = boolValue(wallbox.hasSetCurrent, typeof wallbox.setAKey === 'string' && wallbox.setAKey.trim().length > 0);
    const hasSetpoint = boolValue(wallbox.hasSetpoint, hasPowerSetpoint || hasCurrentSetpoint || !!wallbox.setWKey || !!wallbox.setAKey);
    const reason = str((allocation ? allocation.reason : undefined) ?? wallbox.reason, enabled && online ? '' : 'not_available');
    const blocked = !enabled || !online || reason === 'blocked' || reason === 'stale_meter' || reason === 'control_disabled';
    const writeRequired = hasSetpoint && online && (targetPowerW > 0 || targetCurrentA > 0 || enabled === false || reason === 'control_disabled');
    const storageAssistCustomerAllowed = boolValue(wallbox.storageAssistCustomerAllowed ?? (allocation ? allocation.storageAssistCustomerAllowed : undefined), false);
    const userStorageAssistEnabled = boolValue(wallbox.userStorageAssistEnabled ?? (allocation ? allocation.userStorageAssistEnabled : undefined), false);
    const effectiveStorageAssist = boolValue(wallbox.effectiveStorageAssist ?? (allocation ? allocation.effectiveStorageAssist : undefined), false);
    const storageAssistBlockedReason = str(wallbox.storageAssistBlockedReason ?? (allocation ? allocation.storageAssistBlockedReason : undefined));
    const batteryContributionW = nonNegative(wallbox.batteryContributionW ?? (allocation ? allocation.batteryContributionW : undefined));
    return {
        safe,
        name,
        enabled,
        online,
        connected,
        demandConfirmed,
        vehicleStartEligible,
        vehicleStartProbeActive,
        vehicleStartCooldownActive,
        boostPrearmAllowed,
        charging,
        effectiveMode,
        userMode,
        chargerType,
        dcCurrentReference: str(wallbox.dcCurrentReference),
        controlBasis,
        phases,
        phaseMode: str((phaseDecision ? phaseDecision.mode : undefined) ?? wallbox.phaseMode, phases === 1 ? 'fixed-1p' : 'fixed-3p'),
        configuredPhaseCount,
        currentPhaseCount,
        targetPhaseCount,
        allocationPhaseCount,
        phaseSwitchRequired: boolValue((phaseDecision ? phaseDecision.switchRequired : undefined) ?? wallbox.phaseSwitchRequired, false),
        phaseSwitchAllowed: boolValue((phaseDecision ? phaseDecision.switchAllowed : undefined) ?? wallbox.phaseSwitchAllowed, true),
        phaseSwitchCommandAllowed: boolValue((phaseDecision ? phaseDecision.switchCommandAllowed : undefined) ?? wallbox.phaseSwitchCommandAllowed, false),
        phaseSwitchKey: str((phaseDecision ? phaseDecision.phaseSwitchKey : undefined) ?? wallbox.phaseSwitchKey),
        phaseSwitchValue: (phaseDecision ? phaseDecision.phaseSwitchValue : undefined) ?? wallbox.phaseSwitchValue ?? targetPhaseCount,
        phaseSwitchReason: str((phaseDecision ? phaseDecision.reason : undefined) ?? wallbox.phaseSwitchReason),
        phaseSwitchSafetyStopRequired: boolValue((phaseDecision ? phaseDecision.safetyStopRequired : undefined) ?? wallbox.phaseSwitchSafetyStopRequired, false),
        phaseSwitchCooldownRemainingMs: nonNegative((phaseDecision ? phaseDecision.cooldownRemainingMs : undefined) ?? wallbox.phaseSwitchCooldownRemainingMs),
        stopBeforePhaseSwitch: boolValue((phaseDecision ? phaseDecision.stopBeforePhaseSwitch : undefined) ?? wallbox.stopBeforePhaseSwitch, true),
        storageAssistCustomerAllowed,
        userStorageAssistEnabled,
        effectiveStorageAssist,
        storageAssistBlockedReason,
        batteryContributionW,
        voltageV,
        minPowerW,
        maxPowerW,
        boostMaxPowerW: wallbox.boostMaxPowerW === null || wallbox.boostMaxPowerW === undefined || (typeof wallbox.boostMaxPowerW === 'string' && !wallbox.boostMaxPowerW.trim())
            ? null : (typeof wallbox.boostMaxPowerW !== 'boolean' && Number.isFinite(Number(wallbox.boostMaxPowerW)) ? Math.max(0, Number(wallbox.boostMaxPowerW)) : 0),
        zeroExportGridMaxW: wallbox.zeroExportGridMaxW === null || wallbox.zeroExportGridMaxW === undefined
            ? null : (typeof wallbox.zeroExportGridMaxW !== 'boolean' && Number.isFinite(Number(wallbox.zeroExportGridMaxW)) ? Math.max(0, Number(wallbox.zeroExportGridMaxW)) : 0),
        zeroExportStorageCreditW: boolValue(input.staleMeter, false) || boolValue(input.staleBudget, false)
            ? 0 : Math.max(0, Math.floor(finiteOrNull(wallbox.zeroExportStorageCreditW) ?? 0)),
        zeroExportRestartUntilMs: nonNegative(wallbox.zeroExportRestartUntilMs),
        minA,
        maxA,
        priority: nonNegative(wallbox.priority ?? (allocation ? allocation.priority : undefined), 999) || 999,
        orderIndex: nonNegative(wallbox.orderIndex ?? (allocation ? allocation.orderIndex : undefined), index),
        allocationRank: nonNegative(wallbox.allocationRank ?? (allocation ? (allocation.allocationRank ?? allocation.__allocationRank) : undefined), index + 1) || (index + 1),
        chargingSinceMs: nonNegative(wallbox.chargingSinceMs ?? (allocation ? allocation.chargingSinceMs : undefined)),
        goalActive: boolValue(wallbox.goalActive ?? (allocation ? allocation.goalActive : undefined), false),
        goalFinishTs: nonNegative(wallbox.goalFinishTs ?? (allocation ? allocation.goalFinishTs : undefined)),
        goalUrgency: nonNegativeFloat(wallbox.goalUrgency ?? (allocation ? allocation.goalUrgency : undefined), 0),
        goalDesiredW: nonNegative(wallbox.goalDesiredW ?? (allocation ? allocation.goalDesiredW : undefined)),
        goalOverdue: boolValue(wallbox.goalOverdue ?? (allocation ? allocation.goalOverdue : undefined), false),
        stationKey: str(wallbox.stationKey ?? (allocation ? allocation.stationKey : undefined)),
        stationMaxPowerW: nonNegative(wallbox.stationMaxPowerW ?? (allocation ? allocation.stationMaxPowerW : undefined)),
        stationAllocatedW: 0,
        stationRemainingW: 0,
        connectorNo: nonNegative(wallbox.connectorNo ?? (allocation ? allocation.connectorNo : undefined)),
        stepW: nonNegative(wallbox.stepW ?? (allocation ? allocation.stepW : undefined)),
        stepA: nonNegativeFloat(wallbox.stepA ?? (allocation ? allocation.stepA : undefined), controlBasis === 'current' ? 0.1 : 0),
        maxDeltaWPerTick: nonNegative(wallbox.maxDeltaWPerTick ?? (allocation ? allocation.maxDeltaWPerTick : undefined)),
        maxDeltaAPerTick: nonNegativeFloat(wallbox.maxDeltaAPerTick ?? (allocation ? allocation.maxDeltaAPerTick : undefined), 0),
        pvRampUpWPerTick: nonNegative(wallbox.pvRampUpWPerTick ?? (allocation ? allocation.pvRampUpWPerTick : undefined)),
        pvRampUpAPerTick: nonNegativeFloat(wallbox.pvRampUpAPerTick ?? (allocation ? allocation.pvRampUpAPerTick : undefined), 0),
        lastCommandPowerW: nonNegative(wallbox.lastCommandPowerW ?? (allocation ? allocation.lastCommandPowerW : undefined)),
        lastCommandCurrentA: nonNegativeFloat(wallbox.lastCommandCurrentA ?? (allocation ? allocation.lastCommandCurrentA : undefined), 0),
        setAKey: str(wallbox.setAKey ?? (allocation ? allocation.setAKey : undefined)),
        setWKey: str(wallbox.setWKey ?? (allocation ? allocation.setWKey : undefined)),
        enableKey: str(wallbox.enableKey ?? (allocation ? allocation.enableKey : undefined)),
        requestedPowerW,
        requestedCurrentA,
        targetPowerW,
        targetCurrentA,
        actualPowerW,
        zeroExportProbeExtraW: nonNegative(wallbox.zeroExportProbeExtraW ?? allocation?.zeroExportProbeExtraW),
        zeroExportProbeLeaseId: str(wallbox.zeroExportProbeLeaseId ?? allocation?.zeroExportProbeLeaseId),
        zeroExportProbeValidUntil: nonNegative(wallbox.zeroExportProbeValidUntil ?? allocation?.zeroExportProbeValidUntil),
        staleAny,
        pvUsedW,
        allocationSafetyCapped: false,
        allocationSafetyReason: '',
        blocked,
        reason,
        writeRequired,
        hasSetpoint,
        hasPowerSetpoint,
        hasCurrentSetpoint,
        boost: boolValue(allocation ? allocation.boost : undefined, effectiveMode === 'boost'),
    };
}
/**
 * Code-Teil: buildChargingAllocationShadowPlan
 * Zweck: Baut pro Wallbox einen typisierten Allocation-Plan aus den produktiven JS-Diagnosedaten.
 */
function buildChargingAllocationShadowPlan(input) {
    const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const allocations = Array.isArray(input.allocations) ? input.allocations : [];
    const allocationMap = buildAllocationMap(allocations);
    const phaseDecisionMap = buildPhaseDecisionMap(input);
    const safetyStop = boolValue(input.safetyStop, false);
    const useTsNativeAllocation = wantsTsNativeAllocation(input);
    const diagnosticOnlyComparison = isJsComparisonDiagnosticOnly(input);
    const safetyReason = safetyStop ? str(input.safetyReason, boolValue(input.staleMeter) ? 'stale-meter-safety-stop' : 'evcs-safety-stop') : '';
    const plannedRaw = wallboxes.map((wallbox, index) => {
        const key = safeKey(wallbox.safe ?? wallbox.key ?? wallbox.id ?? wallbox.name, index);
        return normalizeWallboxPlan(wallbox, index, allocationMap.get(key) || null, input, phaseDecisionMap.get(key) || null);
    });
    if (!useTsNativeAllocation) {
        for (const [safe, allocation] of allocationMap.entries()) {
            if (!plannedRaw.some((w) => w.safe === safe))
                plannedRaw.push(normalizeWallboxPlan({ safe }, plannedRaw.length, allocation, input, phaseDecisionMap.get(safe) || null));
        }
    }
    const allocatedPlan = useTsNativeAllocation ? applyTsNativeAllocationPlan(plannedRaw, input) : plannedRaw;
    const planned = safetyStop
        ? plannedRaw.map((wb) => {
            const hasAnySetpoint = !!(wb.hasSetpoint || wb.setAKey || wb.setWKey);
            const canWriteSafeStop = wb.online && hasAnySetpoint;
            return {
                ...wb,
                targetPowerW: 0,
                targetCurrentA: 0,
                pvUsedW: 0,
                batteryContributionW: typeof wb.zeroExportGridMaxW === 'number' ? 0 : wb.batteryContributionW,
                allocationSafetyCapped: wb.targetPowerW > 0 || wb.targetCurrentA > 0,
                allocationSafetyReason: 'central-budget',
                stationAllocatedW: 0,
                stationRemainingW: wb.stationMaxPowerW,
                boost: false,
                blocked: !canWriteSafeStop,
                reason: canWriteSafeStop ? safetyReason : (wb.online ? 'missing-wallbox-setpoint' : 'offline'),
                writeRequired: canWriteSafeStop,
            };
        })
        : applyFinalAllocationSafetyGuards(allocatedPlan, input);
    const sumTargetPowerW = planned.reduce((sum, wb) => sum + Math.max(0, wb.targetPowerW || 0), 0);
    const sumTargetCurrentA = planned.reduce((sum, wb) => sum + Math.max(0, wb.targetCurrentA || 0), 0);
    const finalGuardChangedPlan = planned.some((wb) => wb.allocationSafetyCapped);
    // Im kompatiblen Runtime-Normalpfad bleiben die bereits zentral berechneten Summen
    // erhalten, solange der Abschluss-Guard nichts reduzieren musste. Sobald ein Cap
    // greift, werden die Summen zwingend aus den finalen Einzelzielen neu gebildet.
    const explicitTotalPower = safetyStop
        ? 0
        : (!useTsNativeAllocation && !finalGuardChangedPlan ? finiteOrNull(input.totalTargetPowerW) : null);
    const explicitTotalCurrent = safetyStop
        ? 0
        : (!useTsNativeAllocation && !finalGuardChangedPlan ? finiteOrNull(input.totalTargetCurrentA) : null);
    const finalBudgetW = finiteOrNull(input.budgetW);
    const finalUsedW = Math.max(0, Math.round(sumTargetPowerW));
    const finalRemainingW = finalBudgetW === null ? nonNegative(input.remainingW) : Math.max(0, Math.round(finalBudgetW - finalUsedW));
    const blockers = [];
    const warnings = [];
    if (useTsNativeAllocation)
        warnings.push('ts-native-allocation-active');
    if (diagnosticOnlyComparison)
        warnings.push('js-comparison-diagnostic-only');
    if (!planned.length)
        warnings.push('no-wallboxes-configured');
    if (safetyStop)
        warnings.push(safetyReason);
    if (boolValue(input.staleMeter) && !safetyStop)
        blockers.push('stale-meter');
    if (boolValue(input.staleBudget) && !safetyStop)
        blockers.push('stale-budget');
    if (safetyStop && planned.some((wb) => wb.targetPowerW > 0 || wb.targetCurrentA > 0))
        blockers.push('non-zero-safety-stop-target');
    if (planned.length && !planned.some((wb) => wb.hasSetpoint))
        warnings.push('no-wallbox-setpoints');
    if (planned.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint))
        warnings.push('enabled-online-wallbox-without-setpoint');
    if (planned.some((wb) => wb.phaseSwitchRequired))
        warnings.push('phase-switch-pending');
    if (planned.some((wb) => wb.phaseSwitchCommandAllowed))
        warnings.push('phase-switch-command-ready');
    if (planned.some((wb) => wb.allocationSafetyCapped))
        warnings.push('final-allocation-safety-cap-active');
    if (planned.some((wb) => String(wb.allocationSafetyReason || '').split(',').includes('station-limit')))
        warnings.push('station-limit-finally-enforced');
    if (planned.some((wb) => wb.phaseSwitchRequired && !wb.phaseSwitchAllowed))
        blockers.push('phase-switch-blocked');
    return {
        source: 'ts-charging-allocation-shadow-v1',
        available: true,
        ok: blockers.length === 0,
        productive: false,
        ts: finiteOrNull(input.ts) ?? Date.now(),
        mode: str(input.mode, 'unknown'),
        budgetMode: str(input.budgetMode, 'unknown'),
        allocationMode: useTsNativeAllocation ? 'ts-native' : 'js-diagnostic-normalized',
        normalSource: useTsNativeAllocation ? 'ts-native-allocation' : 'js-diagnostic-normalized',
        tsNormalSourceLock: useTsNativeAllocation,
        jsComparisonDiagnosticOnly: diagnosticOnlyComparison,
        budgetW: finiteOrNull(input.budgetW),
        usedW: finalUsedW,
        remainingW: finalRemainingW,
        totalPowerW: nonNegative(input.totalPowerW),
        totalTargetPowerW: explicitTotalPower === null ? Math.round(sumTargetPowerW) : Math.max(0, Math.round(explicitTotalPower)),
        totalTargetCurrentA: explicitTotalCurrent === null ? Number(sumTargetCurrentA.toFixed(3)) : Math.max(0, Number(explicitTotalCurrent.toFixed(3))),
        wallboxCount: planned.length,
        onlineWallboxes: planned.filter((wb) => wb.online).length,
        connectedCount: planned.filter((wb) => wb.connected).length,
        activeTargetCount: planned.filter((wb) => wb.targetPowerW > 0 || wb.targetCurrentA > 0).length,
        boostCount: planned.filter((wb) => wb.boost).length,
        pvLimitedCount: planned.filter((wb) => wb.pvUsedW > 0 || String(wb.effectiveMode).toLowerCase().includes('pv')).length,
        gates: {
            pausedByPeakShaving: boolValue(input.pausedByPeakShaving),
            staleMeter: boolValue(input.staleMeter),
            staleBudget: boolValue(input.staleBudget),
            pvAvailable: boolValue(input.pvAvailable),
            gridCapBinding: boolValue(input.gridCapBinding),
            phaseCapBinding: boolValue(input.phaseCapBinding),
            para14aActive: boolValue(input.para14aActive),
            para14aBinding: boolValue(input.para14aBinding),
            storageAssistActive: boolValue(input.storageAssistActive),
            safetyStop,
            phaseSwitchActive: planned.some((wb) => wb.phaseSwitchRequired),
            phaseSwitchCommandReady: planned.some((wb) => wb.phaseSwitchCommandAllowed),
            tsNativeAllocation: useTsNativeAllocation,
        },
        safetyReason,
        caps: {
            // Der Plan gibt beide PV-Budgetebenen aus: den kundenseitig priorisierten
            // Anteil fuer reine PV-Ladepunkte und den physikalischen Rest fuer Min+PV.
            pvAvailableW: physicalPvBudgetW(input),
            pvPureAvailableW: purePvBudgetW(input),
            pvPhysicalAvailableW: physicalPvBudgetW(input),
            gridCapEvcsW: nonNegative(input.gridCapEvcsW),
            phaseCapEvcsW: nonNegative(input.phaseCapEvcsW),
            para14aCapEvcsW: nonNegative(input.para14aCapEvcsW),
            storageAssistW: nonNegative(input.storageAssistW),
        },
        wallboxes: planned,
        warnings,
        blockers,
    };
}
/**
 * Code-Teil: compareChargingAllocationShadowPlan
 * Zweck: Vergleicht TS-Plan mit JS-Summen und JS-Diagnose-Allocation pro Wallbox.
 */
function compareChargingAllocationShadowPlan(input, plan) {
    const mismatches = [];
    const pushMismatch = (field, js, ts, diff, safe) => {
        const item = { field, js, ts };
        if (safe)
            item.safe = safe;
        if (diff !== undefined)
            item.diff = diff;
        mismatches.push(item);
    };
    const cmpNumber = (field, jsValue, tsValue, tolerance = 1, safe) => {
        const js = finiteOrNull(jsValue);
        const ts = finiteOrNull(tsValue);
        if (js === null && ts === null)
            return;
        if (js === null || ts === null) {
            pushMismatch(field, js, ts, null, safe);
            return;
        }
        const diff = Math.abs(js - ts);
        if (diff > tolerance)
            pushMismatch(field, js, ts, Number(diff.toFixed(3)), safe);
    };
    cmpNumber('totalTargetPowerW', input.totalTargetPowerW, plan.totalTargetPowerW, 1);
    cmpNumber('totalTargetCurrentA', input.totalTargetCurrentA, plan.totalTargetCurrentA, 0.05);
    cmpNumber('wallboxCount', Array.isArray(input.wallboxes) ? input.wallboxes.length : 0, plan.wallboxCount, 0);
    const tsBySafe = new Map(plan.wallboxes.map((wb) => [wb.safe, wb]));
    const allocations = Array.isArray(input.allocations) ? input.allocations : [];
    allocations.forEach((allocation, index) => {
        if (!allocation || typeof allocation !== 'object' || String(allocation.type || '') === 'budget')
            return;
        const safe = allocationSafe(allocation, index);
        const wb = tsBySafe.get(safe);
        if (!wb) {
            mismatches.push({ field: 'wallbox', safe, js: 'present', ts: 'missing', diff: null });
            return;
        }
        cmpNumber('targetPowerW', allocation.targetW ?? allocation.targetPowerW, wb.targetPowerW, 1, safe);
        cmpNumber('targetCurrentA', allocation.targetA ?? allocation.targetCurrentA, wb.targetCurrentA, 0.05, safe);
    });
    return {
        source: 'ts-charging-allocation-shadow-comparison-v1',
        ok: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches,
    };
}
function buildChargingAllocationApply(plan) {
    return {
        wallboxes: plan.wallboxes.map((wb) => ({ ...wb })),
        totalTargetPowerW: plan.totalTargetPowerW,
        totalTargetCurrentA: plan.totalTargetCurrentA,
        budgetW: plan.budgetW,
        usedW: plan.usedW,
        remainingW: plan.remainingW,
    };
}
function collectProductiveBlockers(input, plan, comparison) {
    const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
    if (!comparison.ok && !isJsComparisonDiagnosticOnly(input, plan))
        blockers.push('ts-js-allocation-mismatch');
    if (plan.wallboxes.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint))
        blockers.push('missing-wallbox-setpoint');
    return Array.from(new Set(blockers));
}
function collectNormalSourceBlockers(plan) {
    const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
    if (plan.wallboxes.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint))
        blockers.push('missing-wallbox-setpoint');
    return Array.from(new Set(blockers));
}
function normalSourceWarnings(plan, comparison) {
    const warnings = Array.isArray(plan.warnings) ? [...plan.warnings] : [];
    if (comparison && comparison.ok === false) {
        warnings.push(`js-comparison-diagnostic-only:${Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0}`);
    }
    return Array.from(new Set(warnings));
}
/**
 * Code-Teil: buildChargingAllocationProductivePrep
 * Zweck: Bereitet die spätere produktive TS-Allocation vor, ohne Setpoints zu schreiben.
 */
function buildChargingAllocationProductivePrep(input, plan = buildChargingAllocationShadowPlan(input), comparison = compareChargingAllocationShadowPlan(input, plan)) {
    const blockers = collectProductiveBlockers(input, plan, comparison);
    const diagnosticOnlyComparison = isJsComparisonDiagnosticOnly(input, plan);
    const comparisonAllowsTakeover = comparison.ok === true || diagnosticOnlyComparison === true;
    const prepared = plan.ok === true && comparisonAllowsTakeover && blockers.length === 0;
    const fallbackReason = prepared
        ? ''
        : (!comparison.ok && !diagnosticOnlyComparison ? 'ts-js-allocation-mismatch' : (blockers[0] || 'ts-allocation-not-ready'));
    return {
        source: 'ts-charging-allocation-productive-prep-v1',
        available: true,
        ok: prepared,
        productive: false,
        prepared,
        preparedForProductiveTakeover: prepared,
        fallback: !prepared,
        fallbackReason,
        blockers,
        warnings: Array.from(new Set([...(Array.isArray(plan.warnings) ? plan.warnings : []), ...(!comparison.ok && diagnosticOnlyComparison ? ['ts-js-allocation-mismatch-diagnostic-only'] : [])])),
        tsNormalSourceLocked: wantsTsNativeAllocation(input),
        jsComparisonDiagnosticOnly: diagnosticOnlyComparison,
        comparison,
        plan,
        apply: prepared ? buildChargingAllocationApply(plan) : null,
        safety: {
            keepsSetpointWritingInJavascript: true,
            keepsBoostFailsafeAndPvLogicInJavascriptUntilNextGate: true,
            doesNotWriteIoBrokerStates: true,
        },
        nextAction: prepared
            ? 'Allocation-Apply-Vertrag ist vorbereitet; im nächsten Gate kann TS die Zielwerte liefern, während JavaScript nur noch validiert und schreibt.'
            : 'JavaScript bleibt führend; erst Allocation-Mismatches oder harte Blocker bereinigen.',
    };
}
/**
 * Code-Teil: buildChargingAllocationProductive
 * Zweck: Macht den geprüften TS-Allocation-Vertrag zum produktiven Zielwertlieferanten.
 * JavaScript bleibt Executor und harter Fallback, schreibt aber bei grünem Vertrag die
 * aus TS normalisierten Zielwerte.
 */
function buildChargingAllocationProductive(input, plan = buildChargingAllocationShadowPlan(input), comparison = compareChargingAllocationShadowPlan(input, plan)) {
    const blockers = collectProductiveBlockers(input, plan, comparison);
    const diagnosticOnlyComparison = isJsComparisonDiagnosticOnly(input, plan);
    const comparisonAllowsTakeover = comparison.ok === true || diagnosticOnlyComparison === true;
    const canApply = plan.ok === true && comparisonAllowsTakeover && blockers.length === 0;
    const fallbackReason = canApply
        ? ''
        : (!comparison.ok && !diagnosticOnlyComparison ? 'ts-js-allocation-mismatch' : (blockers[0] || 'ts-allocation-not-ready'));
    return {
        source: 'ts-charging-allocation-productive-v1',
        available: true,
        ok: canApply,
        productive: canApply,
        prepared: canApply,
        preparedForProductiveTakeover: canApply,
        fallback: !canApply,
        fallbackReason,
        blockers,
        warnings: Array.from(new Set([...(Array.isArray(plan.warnings) ? plan.warnings : []), ...(!comparison.ok && diagnosticOnlyComparison ? ['ts-js-allocation-mismatch-diagnostic-only'] : [])])),
        tsNormalSourceLocked: wantsTsNativeAllocation(input),
        jsComparisonDiagnosticOnly: diagnosticOnlyComparison,
        comparison,
        plan,
        apply: canApply ? buildChargingAllocationApply(plan) : null,
        safety: {
            setpointWritingViaJavascriptExecutor: true,
            setpointWritingUsesJavascriptExecutorOnly: true,
            javascriptFallbackOnMismatch: true,
            javascriptAllocationIsFallbackOnly: true,
            legacyJavascriptDecisionTreeKeptAsFallbackCandidate: true,
            normalJavascriptDecisionTreeRemovedFromNormalPath: true,
            directJavascriptSetpointLoopsRemoved: true,
            executorFallbackOnlyForHardBlockers: true,
            tsNormalSourceLocked: true,
            jsShadowComparisonDiagnosticOnly: true,
            jsMismatchDoesNotBlockNormalPath: true,
            nativeTsAllocatorRespectsDemandCeilings: true,
            allowsTsSafetyStopHandover: true,
            safeStopCanBypassStaleBlockersForZeroTargets: true,
            nonZeroSafetyStopRejected: true,
            doesNotWriteIoBrokerStates: true,
        },
        nextAction: canApply
            ? 'TS-Allocation liefert produktiv die finalen Wallbox-Zielwerte; JavaScript führt nur noch den ioBroker-Executor aus und bleibt harter Fallback.'
            : 'JavaScript bleibt führend; Allocation-Mismatch, fehlende Setpoints oder harte Blocker verhindern die TS-Übernahme.',
    };
}
/**
 * Code-Teil: buildChargingAllocationNormalSource
 *
 * Zweck:
 * Schaltet die EVCS-Allocation in den nächsten Migrationsmodus: TypeScript ist im
 * normalen Runtime-Tick die fachliche Quelle. Der alte JS-Vergleich bleibt sichtbar,
 * blockiert aber nicht mehr allein wegen Diagnoseabweichungen; harte Safety-/Runtime-
 * Blocker behalten den JS-Executor/Fallback als Sicherheitsnetz.
 */
/**
 * Ablauf und Zusammenhang: Liefert den aus der normierten Eingangsquelle gebildeten Lade-Verteilungsplan. Die Aufrufer verwenden diesen Plan vor Phasenprüfung, Schreibplanung und tatsächlicher Aktorausführung.
 */
function buildChargingAllocationNormalSource(input, plan = buildChargingAllocationShadowPlan(input), comparison = compareChargingAllocationShadowPlan(input, plan)) {
    const blockers = collectNormalSourceBlockers(plan);
    const canApply = plan.ok === true && blockers.length === 0;
    const mismatchCount = comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0;
    const fallbackReason = canApply ? '' : (blockers[0] || 'ts-allocation-normal-source-not-ready');
    return {
        source: 'ts-charging-allocation-normal-source-v1',
        available: true,
        ok: canApply,
        productive: canApply,
        normalSource: canApply,
        prepared: canApply,
        fallback: !canApply,
        fallbackReason,
        blockers,
        warnings: normalSourceWarnings(plan, comparison),
        diagnosticComparison: comparison,
        diagnosticMismatchCount: mismatchCount,
        plan,
        apply: canApply ? buildChargingAllocationApply(plan) : null,
        safety: {
            tsIsNormalAllocationSource: true,
            jsComparisonIsDiagnosticOnly: true,
            javascriptAllocationIsHardFallbackOnly: true,
            legacyJavascriptDecisionTreeRemovedFromNormalPath: true,
            hardFallbackOnlyForRuntimeMirrorOrSafetyBlockers: true,
            setpointWritingViaJavascriptExecutor: true,
            directJavascriptSetpointLoopsRemoved: true,
            allowsTsSafetyStopHandover: true,
            doesNotWriteIoBrokerStates: true,
        },
        hardFallbackReasons: [
            'missing-ts-allocation-mirror',
            'missing-ts-write-plan-mirror',
            'ts-runtime-error',
            'stale-meter',
            'stale-budget',
            'missing-wallbox-setpoint',
            'invalid-apply-plan',
            'executor-error',
        ],
        nextAction: canApply
            ? 'EVCS-Allocation läuft als TypeScript-Normalquelle; JavaScript bleibt ioBroker-Executor und harter Fallback.'
            : 'TS-Normalquelle blockiert; JavaScript darf nur noch als harter Fallback für Runtime-/Safety-Blocker einspringen.',
    };
}
