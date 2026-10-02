'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/core-limits/core-budget.ts
 * Quell-Hash: sha256:45ad2b3268c51db48ddbf596f9e6d564f0efb4c7af877a7473ade340b71aa2b5
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * Core-Limits-/EMS-Budget-Spiegel für spätere Shadow-Vergleiche.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStorageReserveActive = isStorageReserveActive;
exports.calculatePvBudgetGate = calculatePvBudgetGate;
exports.calculateGridBudgetGate = calculateGridBudgetGate;
exports.buildCoreBudgetSnapshot = buildCoreBudgetSnapshot;
exports.buildCoreForecastGate = buildCoreForecastGate;
exports.buildCoreTariffGate = buildCoreTariffGate;
exports.buildCorePeakTariffGridGates = buildCorePeakTariffGridGates;
exports.buildCoreRestGatesShadow = buildCoreRestGatesShadow;
exports.buildCoreRestGatesProductive = buildCoreRestGatesProductive;
exports.calculateCoreBudgetFlexUsedW = calculateCoreBudgetFlexUsedW;
exports.buildCoreBudgetConsumersList = buildCoreBudgetConsumersList;
exports.computeCoreBudgetReservation = computeCoreBudgetReservation;
exports.buildCoreBudgetRestGatesSnapshot = buildCoreBudgetRestGatesSnapshot;
exports.compareCoreBudgetRestGates = compareCoreBudgetRestGates;
const number_1 = require("../../utils/number");
/**
 * Datei: src-ts/ems/core-limits/core-budget.ts
 *
 * Zweck:
 * Produktionsnahe TypeScript-Vorbereitung für die zentrale EMS-Budgetberechnung.
 * Diese Datei ist in 0.7.62 noch nicht produktiv verdrahtet. Sie beschreibt und testet
 * aber die Logik, die später aus `ems/modules/core-limits.js` herausgelöst werden soll.
 *
 * Zusammenhang:
 * Core-Limits liefern die Grundlage für Heizstab, EVCS, KI-Berater, Energiefluss und
 * History. Wenn diese Budgets falsch sind, laufen Verbraucherfreigabe und Historie falsch.
 *
 * Wichtig:
 * - 0 W ist ein gültiger Budgetwert.
 * - Speicherreserve muss vom Verbraucherbudget abgezogen werden, wenn sie aktiv ist.
 * - Netzlimit/Peak-Shaving darf nie durch PV-Logik übersteuert werden.
 */
/**
 * Code-Teil: numberPercentOrNull
 *
 * Zweck:
 * Normalisiert einen unbekannten SoC-/Prozentwert auf 0–100 oder `null`.
 *
 * Zusammenhang:
 * Speicherreserve-Entscheidungen hängen vom SoC ab. Ein fehlender SoC darf nicht heimlich
 * als 0 % interpretiert werden, weil dadurch die Reserve dauerhaft aktiv wäre.
 */
function numberPercentOrNull(value) {
    const n = (0, number_1.toNumberOrNull)(value);
    return n === null ? null : (0, number_1.clampNumber)(n, 0, 100);
}
/**
 * Code-Teil: gate
 *
 * Zweck:
 * Erstellt ein einheitliches Budget-Gate mit Rohwert, Effektivwert und Diagnosegrund.
 *
 * Zusammenhang:
 * `core-limits.js` veröffentlicht später mehrere Budgets. Durch eine gemeinsame Struktur
 * können Heizstab, EVCS und KI-Berater dieselben Felder interpretieren.
 */
function gate(rawW, effectiveW, reason, diagnosticText) {
    const result = {
        rawW: Math.max(0, Math.round(rawW)),
        effectiveW: Math.max(0, Math.round(effectiveW)),
        reason,
    };
    if (typeof diagnosticText === 'string' && diagnosticText.length > 0) {
        result.diagnosticText = diagnosticText;
    }
    return result;
}
/**
 * Code-Teil: isStorageReserveActive
 *
 * Zweck:
 * Entscheidet, ob die Speicherreserve fachlich geschützt werden muss.
 *
 * Zusammenhang:
 * Heizstab und andere flexible Verbraucher dürfen die Reserve nicht aufbrauchen, wenn
 * der Speicher-SoC unter der konfigurierten Reserve liegt oder Speicherentladung verboten ist.
 */
function isStorageReserveActive(storageSocPct, reserveSocPct, allowStorageDischarge = true) {
    const reserve = numberPercentOrNull(reserveSocPct);
    if (!allowStorageDischarge)
        return true;
    if (storageSocPct === null || reserve === null)
        return false;
    return storageSocPct <= reserve;
}
/**
 * Code-Teil: calculatePvBudgetGate
 *
 * Zweck:
 * Berechnet das nutzbare PV-Budget nach Speicherreserve und bereits reservierter Leistung.
 *
 * Zusammenhang:
 * Dieses Budget ist später besonders wichtig für Heizstab/EVCS: Es beschreibt, wie viel
 * PV-Überschuss ohne zusätzlichen Netzbezug genutzt werden kann.
 */
function calculatePvBudgetGate(input) {
    const rawPvW = (0, number_1.positiveWatt)(input.pvSurplusW);
    const reserveW = (0, number_1.positiveWatt)(input.storageReserveW);
    const alreadyReservedW = (0, number_1.positiveWatt)(input.alreadyReservedW);
    const soc = numberPercentOrNull(input.storageSocPct);
    const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
    const appliedReserveW = reserveActive ? reserveW : 0;
    const effectiveW = Math.max(0, rawPvW - appliedReserveW - alreadyReservedW);
    const reason = reserveActive ? 'storage-reserve' : (alreadyReservedW > 0 ? 'manual-limit' : 'pv-surplus');
    const diagnosticText = reserveActive
        ? `PV-Budget um Speicherreserve ${Math.round(appliedReserveW)} W reduziert.`
        : `PV-Budget aus Überschuss ${Math.round(rawPvW)} W berechnet.`;
    return gate(rawPvW, effectiveW, reason, diagnosticText);
}
/**
 * Code-Teil: calculateGridBudgetGate
 *
 * Zweck:
 * Berechnet, wie viel zusätzliche Leistung unter Netz-/Peak-Limit noch möglich ist.
 *
 * Zusammenhang:
 * Peak-Shaving, §14a und Netzanschlussgrenzen müssen Verbraucherfreigaben begrenzen.
 * Das verhindert, dass Heizstab oder EVCS Lastspitzen erzeugen.
 */
function calculateGridBudgetGate(input) {
    const importW = (0, number_1.positiveWatt)(input.gridImportW);
    const limit = (0, number_1.toNumberOrNull)(input.gridImportLimitW);
    if (input.allowGridImport === false) {
        return gate(0, 0, 'manual-limit', 'Netzbezug ist für flexible Verbraucher deaktiviert.');
    }
    if (input.peakShavingActive) {
        const eff = limit === null ? 0 : Math.max(0, limit - importW);
        return gate(limit === null ? 0 : Math.max(0, limit), eff, 'peak-shaving', 'Peak-Shaving begrenzt zusätzliches Netzbudget.');
    }
    if (input.externalLimitActive) {
        const eff = limit === null ? 0 : Math.max(0, limit - importW);
        return gate(limit === null ? 0 : Math.max(0, limit), eff, 'para14a', 'Externes Limit begrenzt zusätzliches Netzbudget.');
    }
    if (limit === null || limit <= 0) {
        return gate(0, 0, 'missing-input', 'Kein Netzlimit vorhanden; Netzbudget wird konservativ nicht erweitert.');
    }
    return gate(limit, Math.max(0, limit - importW), 'grid-limit', 'Netzbudget aus Anschluss-/Peak-Limit berechnet.');
}
/**
 * Code-Teil: buildCoreBudgetSnapshot
 *
 * Zweck:
 * Erstellt eine typisierte EMS-Budget-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist der spätere Kandidat für die Migration von Teilen aus
 * `ems/modules/core-limits.js`. In 0.7.62 wird sie nur über TypeScript-Regressionen
 * geprüft und noch nicht produktiv genutzt.
 */
function buildCoreBudgetSnapshot(input) {
    const ts = ((0, number_1.toNumberOrNull)(input.ts) ?? Date.now());
    const soc = numberPercentOrNull(input.storageSocPct);
    const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
    const storageReserveW = reserveActive ? (0, number_1.positiveWatt)(input.storageReserveW) : 0;
    const alreadyReservedW = (0, number_1.positiveWatt)(input.alreadyReservedW);
    const pv = calculatePvBudgetGate(input);
    const grid = calculateGridBudgetGate(input);
    const totalRaw = pv.rawW + grid.rawW;
    const uncappedTotalEffectiveW = Math.max(0, pv.effectiveW + grid.effectiveW);
    const totalCap = (0, number_1.toNumberOrNull)(input.totalBudgetCapW);
    const totalEffectiveW = totalCap !== null && totalCap >= 0
        ? Math.min(uncappedTotalEffectiveW, Math.max(0, totalCap))
        : uncappedTotalEffectiveW;
    const limitReason = totalCap !== null && totalCap >= 0 && totalEffectiveW < uncappedTotalEffectiveW
        ? 'manual-limit'
        : (pv.reason !== 'pv-surplus' ? pv.reason : grid.reason);
    const diagnosticText = [pv.diagnosticText, grid.diagnosticText]
        .filter((x) => typeof x === 'string' && x.length > 0)
        .join(' ');
    return {
        ts,
        pv,
        grid,
        total: gate(totalRaw, totalEffectiveW, limitReason || 'none', diagnosticText),
        storageReserveActive: reserveActive,
        storageSocPct: soc,
        appliedStorageReserveW: storageReserveW,
        alreadyReservedW,
        diagnosticText,
    };
}
/**
 * Code-Teil: restBool
 * Zweck: Normalisiert boolesche Restgate-Felder; `false` ist ein gültiger Wert.
 */
function restBool(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'ja', 'on', 'active'].includes(text))
            return true;
        if (['false', '0', 'no', 'nein', 'off', 'inactive'].includes(text))
            return false;
    }
    return fallback;
}
/** Code-Teil: restString. Zweck: Normalisiert Status-/Quellenfelder. */
function restString(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
}
/** Code-Teil: restNumberOrNull. Zweck: Fehlende Zahlen bleiben `null`, echte 0 bleiben erhalten. */
function restNumberOrNull(value) {
    return (0, number_1.toNumberOrNull)(value);
}
/** Code-Teil: restWatt. Zweck: Normalisiert Wattwerte; 0 W ist gültig. */
function restWatt(value) {
    return (0, number_1.positiveWatt)(restNumberOrNull(value));
}
/**
 * Code-Teil: buildCoreForecastGate
 *
 * Zweck:
 * Baut das PV-Forecast-Gate in TypeScript nach. In 0.7.120 wird dieser Wert nur als
 * Shadow-Vergleich genutzt und nicht produktiv übernommen.
 */
function buildCoreForecastGate(input) {
    const src = input && typeof input === 'object' ? input : {};
    const usable = restBool(src.usable, false);
    return {
        valid: restBool(src.valid, false),
        usable,
        ageMs: restNumberOrNull(src.ageMs) === null ? null : Math.max(0, Math.round(restNumberOrNull(src.ageMs) || 0)),
        points: Math.max(0, Math.round(restNumberOrNull(src.points) || 0)),
        confidencePct: (0, number_1.clampNumber)(restNumberOrNull(src.confidencePct) || 0, 0, 100),
        nowW: restWatt(src.nowW),
        avgNext1hW: restWatt(src.avgNext1hW),
        avgNext3hW: restWatt(src.avgNext3hW),
        peakNext6hW: restWatt(src.peakNext6hW),
        peakNext24hW: restWatt(src.peakNext24hW),
        kwhNext1h: Math.max(0, restNumberOrNull(src.kwhNext1h) || 0),
        kwhNext3h: Math.max(0, restNumberOrNull(src.kwhNext3h) || 0),
        kwhNext6h: Math.max(0, restNumberOrNull(src.kwhNext6h) || 0),
        kwhNext12h: Math.max(0, restNumberOrNull(src.kwhNext12h) || 0),
        kwhNext24h: Math.max(0, restNumberOrNull(src.kwhNext24h) || 0),
        status: restString(src.status, usable ? 'ok' : 'missing'),
        source: restString(src.source, ''),
    };
}
/**
 * Code-Teil: buildCoreTariffGate
 *
 * Zweck:
 * Baut das Tarif-/Negativpreis-Gate in TypeScript nach. In 0.7.120 bleibt dieses Gate
 * Shadow-/Diagnosewert und ersetzt noch keine produktive JS-Logik.
 */
function buildCoreTariffGate(input) {
    const src = input && typeof input === 'object' ? input : {};
    const negativeActive = restBool(src.negativeActive, false);
    const gridImportPreferred = restBool(src.gridImportPreferred, negativeActive);
    const gridChargeAllowed = restBool(src.gridChargeAllowed, true);
    return {
        budgetW: restNumberOrNull(src.budgetW) === null ? null : restWatt(src.budgetW),
        gridChargeAllowed,
        dischargeAllowed: restBool(src.dischargeAllowed, true),
        active: restBool(src.active, false),
        state: restString(src.state, ''),
        currentPriceEurKwh: restNumberOrNull(src.currentPriceEurKwh),
        negativeActive,
        gridImportPreferred,
        storageGridChargeAllowed: restBool(src.storageGridChargeAllowed, gridImportPreferred && gridChargeAllowed),
        evcsGridChargeAllowed: restBool(src.evcsGridChargeAllowed, gridImportPreferred && gridChargeAllowed),
        pvCurtailRecommended: restBool(src.pvCurtailRecommended, gridImportPreferred),
        negativeMinPriceEurKwh: restNumberOrNull(src.negativeMinPriceEurKwh),
        nextNegativeFrom: restString(src.nextNegativeFrom, ''),
        nextNegativeTo: restString(src.nextNegativeTo, ''),
        status: restString(src.status, gridImportPreferred ? 'active_grid_import_preferred' : (negativeActive ? 'negative_detected' : 'inactive')),
    };
}
/**
 * Code-Teil: buildCorePeakTariffGridGates
 *
 * Zweck:
 * Bereitet Peak-/Netz-/§14a- und EVCS-High-Level-Gates in TypeScript auf.
 */
function buildCorePeakTariffGridGates(input) {
    const peak = input && input.peak && typeof input.peak === 'object' ? input.peak : {};
    const para14a = input && input.para14a && typeof input.para14a === 'object' ? input.para14a : {};
    const evcsHighLevel = input && input.evcsHighLevel && typeof input.evcsHighLevel === 'object' ? input.evcsHighLevel : {};
    const controlledHighLevel = input && input.controlledHighLevel && typeof input.controlledHighLevel === 'object' ? input.controlledHighLevel : {};
    const grid = input && input.grid && typeof input.grid === 'object' ? input.grid : {};
    const tariff = buildCoreTariffGate(input && input.tariff ? input.tariff : null);
    return {
        peak: {
            active: restBool(peak.active, false),
            budgetW: restNumberOrNull(peak.budgetW) === null ? null : restWatt(peak.budgetW),
        },
        tariff,
        para14a: {
            active: restBool(para14a.active, false),
            mode: restString(para14a.mode, ''),
            evcsCapW: restNumberOrNull(para14a.evcsCapW) === null ? null : restWatt(para14a.evcsCapW),
            totalCapW: restNumberOrNull(para14a.totalCapW) === null ? null : restWatt(para14a.totalCapW),
            appCapsW: para14a.appCapsW && typeof para14a.appCapsW === 'object' ? { ...para14a.appCapsW } : {},
            signalFresh: restBool(para14a.signalFresh, false),
            signalStatus: restString(para14a.signalStatus, ''),
            constraintOnly: restBool(para14a.constraintOnly, false),
        },
        evcsHighLevel: {
            capW: restNumberOrNull(evcsHighLevel.capW) === null ? null : restWatt(evcsHighLevel.capW),
            binding: restString(evcsHighLevel.binding, ''),
        },
        controlledHighLevel: {
            capW: restNumberOrNull(controlledHighLevel.capW) === null ? null : restWatt(controlledHighLevel.capW),
            binding: restString(controlledHighLevel.binding, ''),
        },
        grid: {
            gridConnectionLimitW_cfg: restWatt(grid.gridConnectionLimitW_cfg),
            gridSafetyMarginW: restWatt(grid.gridSafetyMarginW),
            gridConstraintsCapW: restNumberOrNull(grid.gridConstraintsCapW),
            gridImportLimitW_physical: restWatt(grid.gridImportLimitW_physical),
            gridImportLimitW_peakShaving: restWatt(grid.gridImportLimitW_peakShaving),
            gridImportLimitW_effective: restWatt(grid.gridImportLimitW_effective),
            gridImportLimitW_source: restString(grid.gridImportLimitW_source, ''),
            gridMaxPhaseA_cfg: restWatt(grid.gridMaxPhaseA_cfg),
        },
    };
}
/**
 * Code-Teil: buildCoreRestGatesShadow
 *
 * Zweck:
 * Erstellt den kompletten TS-Shadow für Forecast-, Tarif-, Peak-/Netz- und §14a-Gates.
 *
 * Sicherheitsregel:
 * Diese Funktion schreibt keine States und verändert keine produktiven Budgets. Sie dient
 * nur dazu, die Restlogik kontrolliert gegen die bestehende JS-Runtime zu vergleichen.
 */
function buildCoreRestGatesShadow(input) {
    const ts = ((0, number_1.toNumberOrNull)(input && input.ts) ?? Date.now());
    const peakGrid = buildCorePeakTariffGridGates(input || {});
    return {
        ok: true,
        source: 'ts-core-rest-gates-shadow',
        ts,
        gates: {
            forecast: buildCoreForecastGate(input && input.forecast ? input.forecast : null),
            tariff: (peakGrid.tariff || {}),
            peak: (peakGrid.peak || {}),
            para14a: (peakGrid.para14a || {}),
            evcsHighLevel: (peakGrid.evcsHighLevel || {}),
            controlledHighLevel: (peakGrid.controlledHighLevel || {}),
            grid: (peakGrid.grid || {}),
        },
    };
}
/**
 * Code-Teil: buildCoreRestGatesProductive
 *
 * Zweck:
 * Baut denselben Forecast-/Tarif-/Peak-/§14a-Snapshot wie der Shadow-Helfer,
 * markiert ihn aber ausdrücklich als produktiv übernehmbaren TypeScript-Restgate-
 * Snapshot.
 *
 * Zusammenhang:
 * Ab 0.7.121 darf `core-limits.js` diese Werte übernehmen, wenn der zuvor berechnete
 * JS/TS-Vergleich ohne Mismatches war. JS bleibt Fallback bei Fehlern oder Abweichungen.
 */
function buildCoreRestGatesProductive(input) {
    const base = buildCoreRestGatesShadow(input);
    return {
        ...base,
        source: 'ts-core-rest-gates-productive',
        productive: true,
        preparedOnly: false,
    };
}
/**
 * Code-Teil: reservationString
 *
 * Zweck:
 * Normalisiert dynamische Request-Felder wie key/app/label/mode auf Strings.
 *
 * Zusammenhang:
 * Die alte JS-Logik erlaubt unterschiedliche Aliase (`key`, `consumer`, `app`). Diese
 * Kompatibilität muss bei der TS-Migration erhalten bleiben.
 */
function reservationString(value, fallback) {
    const s = String(value ?? '').trim();
    return s || fallback;
}
/**
 * Code-Teil: reservationPositiveWatt
 *
 * Zweck:
 * Normalisiert Verbraucherleistungen auf positive Wattwerte und erhält 0 W als gültig.
 */
function reservationPositiveWatt(value, fallback = 0) {
    const n = (0, number_1.toNumberOrNull)(value);
    return (0, number_1.positiveWatt)(n === null ? fallback : n);
}
/**
 * Code-Teil: reservationPriority
 *
 * Zweck:
 * Normalisiert Verbraucherprioritäten. Fehlende Priorität bleibt wie in JS bei 999.
 */
function reservationPriority(value) {
    const n = (0, number_1.toNumberOrNull)(value);
    return n === null ? 999 : n;
}
/**
 * Code-Teil: calculateCoreBudgetFlexUsedW
 *
 * Zweck:
 * Berechnet die Summe der veröffentlichten flexiblen Verbraucherleistung.
 *
 * Zusammenhang:
 * Entspricht fachlich der alten JS-Summe aus `makeBudgetRuntime.reserve`. Diese Summe
 * wird als `ems.budget.flexUsedW` veröffentlicht.
 */
function calculateCoreBudgetFlexUsedW(consumers, order) {
    const keys = Array.isArray(order) && order.length ? order : Object.keys(consumers || {});
    const sum = keys.reduce((acc, key) => {
        const entry = consumers && consumers[key] ? consumers[key] : null;
        if (!entry)
            return acc;
        const used = (0, number_1.toNumberOrNull)(entry.usedW ?? entry.reserveW);
        return acc + (0, number_1.positiveWatt)(used);
    }, 0);
    return Math.round(sum);
}
/**
 * Code-Teil: buildCoreBudgetConsumersList
 *
 * Zweck:
 * Baut die geordnete Liste für `ems.budget.consumersJson`.
 *
 * Zusammenhang:
 * Das App-Center und Diagnosen erwarten ein Array. Die Runtime hält intern ein Objekt
 * plus Reihenfolge. Diese Funktion macht die Umwandlung typisiert und stabil.
 */
function buildCoreBudgetConsumersList(consumers, order) {
    const keys = Array.isArray(order) && order.length > 0 ? Array.from(order) : Object.keys(consumers || {});
    const result = [];
    for (const key of keys) {
        const entry = consumers && consumers[key] ? consumers[key] : null;
        if (entry)
            result.push({ key, ...entry });
    }
    return result;
}
/**
 * Code-Teil: computeCoreBudgetReservation
 *
 * Zweck:
 * Berechnet eine Verbraucher-Reservierung gegen das zentrale Budget in TypeScript.
 *
 * Zusammenhang:
 * Dies ist die Vorbereitung für die Migration von `makeBudgetRuntime.reserve` aus
 * `ems/modules/core-limits.js`. Ab 0.7.107 wird das Ergebnis produktiv für Consumer-Reservierungen genutzt,
 * während die alte JS-Rechnung als Fallback-/Vergleichspfad erhalten bleibt.
 *
 * Sicherheitsregel:
 * Die Funktion schreibt keine States und kennt keinen Adapter. Sie berechnet nur Entry,
 * Restbudgets und Verbraucherlisten. Dadurch kann sie gefahrlos gegen die JS-Runtime
 * verglichen werden.
 */
function computeCoreBudgetReservation(runtime, request, tsInput) {
    const r = request && typeof request === 'object' ? request : {};
    const ts = ((0, number_1.toNumberOrNull)(tsInput) ?? Date.now());
    const key = reservationString(r.key ?? r.consumer ?? r.app, 'unknown');
    const app = reservationString(r.app, key);
    const priority = reservationPriority(r.priority);
    const requestedW = reservationPositiveWatt(r.requestedW, 0);
    const reserveW = reservationPositiveWatt(r.reserveW, requestedW);
    const pvOnly = r.pvOnly === true;
    const pvReserveW = reservationPositiveWatt(r.pvReserveW, pvOnly ? reserveW : 0);
    const actualW = reservationPositiveWatt(r.actualW, reserveW);
    const remainingTotalNumber = (0, number_1.toNumberOrNull)(runtime && runtime.remainingTotalW);
    const remainingTotalW = remainingTotalNumber === null ? null : Math.max(0, remainingTotalNumber);
    const remainingPvW = (0, number_1.positiveWatt)(runtime && runtime.remainingPvW);
    const totalCap = remainingTotalW === null ? Number.POSITIVE_INFINITY : remainingTotalW;
    const pvCap = remainingPvW;
    const cap = pvOnly ? Math.min(totalCap, pvCap) : totalCap;
    const grantW = Math.max(0, Math.min(requestedW, cap));
    const nextRemainingTotalW = remainingTotalW === null ? null : Math.max(0, Math.round(remainingTotalW - reserveW));
    const nextRemainingPvW = Math.max(0, Math.round(remainingPvW - pvReserveW));
    const entry = {
        key,
        app,
        label: reservationString(r.label, key),
        priority,
        requestedW: Math.round(requestedW),
        grantW: Math.round(grantW),
        usedW: Math.round(reserveW),
        pvUsedW: Math.round(pvReserveW),
        reserveW: Math.round(reserveW),
        pvReserveW: Math.round(pvReserveW),
        actualW: Math.round(actualW),
        pvOnly,
        mode: reservationString(r.mode, ''),
        ts,
        remainingTotalW: nextRemainingTotalW,
        remainingPvW: nextRemainingPvW,
    };
    const consumers = {};
    const sourceConsumers = runtime && runtime.consumers ? runtime.consumers : {};
    for (const existingKey of Object.keys(sourceConsumers)) {
        const existing = sourceConsumers[existingKey];
        if (existing)
            consumers[existingKey] = existing;
    }
    consumers[key] = entry;
    const runtimeOrder = runtime && Array.isArray(runtime.order) ? runtime.order : [];
    const order = Array.from(runtimeOrder);
    if (!order.includes(key))
        order.push(key);
    const flexUsedW = calculateCoreBudgetFlexUsedW(consumers, order);
    return {
        ok: true,
        source: 'ts-core-reservation',
        entry,
        nextRemainingTotalW,
        nextRemainingPvW,
        order,
        consumers,
        flexUsedW,
    };
}
/**
 * Code-Teil: restGateNumber
 *
 * Zweck:
 * Normalisiert unbekannte Gate-Werte auf Zahlen oder `null`.
 *
 * Wichtig:
 * `0` bleibt gültig. Nur fehlende/nicht-numerische Werte werden zu `null`.
 */
function restGateNumber(value) {
    const n = (0, number_1.toNumberOrNull)(value);
    return n === null ? null : n;
}
/** Code-Teil: restGateWatt. Zweck: Normalisiert positive Wattwerte, erhält 0 W als gültig. */
function restGateWatt(value) {
    const n = restGateNumber(value);
    return (0, number_1.positiveWatt)(n === null ? 0 : n);
}
/** Code-Teil: restGateNullableWatt. Zweck: Gibt positive Watt oder `null` für fehlende Caps zurück. */
function restGateNullableWatt(value) {
    const n = restGateNumber(value);
    return n === null ? null : (0, number_1.positiveWatt)(n);
}
/** Code-Teil: restGateBool. Zweck: Normalisiert boolesche Gate-Werte, ohne false zu verlieren. */
function restGateBool(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on', 'ja', 'active'].includes(v))
            return true;
        if (['false', '0', 'no', 'off', 'nein', 'inactive'].includes(v))
            return false;
    }
    return fallback;
}
/** Code-Teil: restGateText. Zweck: Normalisiert Gate-Status-/Quellentexte. */
function restGateText(value, fallback = '') {
    if (value === null || value === undefined)
        return fallback;
    return String(value);
}
/**
 * Code-Teil: buildCoreBudgetRestGatesSnapshot
 *
 * Zweck:
 * Baut aus den bestehenden JS-Gate-Strukturen einen typisierten TS-Restgate-Snapshot.
 *
 * Zusammenhang:
 * 0.7.120 bereitet Forecast-, Tarif- und Peak-/Grid-Constraints-Gates vor. Produktiv
 * bleibt vorerst die JS-Runtime; dieser Snapshot wird nur gegen JS verglichen und in
 * `ems.budget.tsRestGatesJson` sichtbar gemacht.
 */
function buildCoreBudgetRestGatesSnapshot(input = {}) {
    const forecast = (input.forecast && typeof input.forecast === 'object') ? input.forecast : {};
    const tariff = (input.tariff && typeof input.tariff === 'object') ? input.tariff : {};
    const peak = (input.peak && typeof input.peak === 'object') ? input.peak : {};
    const grid = (input.grid && typeof input.grid === 'object') ? input.grid : {};
    const para14a = (input.para14a && typeof input.para14a === 'object') ? input.para14a : {};
    const evcsHighLevel = (input.evcsHighLevel && typeof input.evcsHighLevel === 'object') ? input.evcsHighLevel : {};
    const ts = ((0, number_1.toNumberOrNull)(input.ts) ?? Date.now());
    return {
        source: 'ts-core-rest-gates',
        ts,
        forecast: {
            valid: restGateBool(forecast.valid, false),
            usable: restGateBool(forecast.usable, false),
            ageMs: restGateNumber(forecast.ageMs),
            points: Math.max(0, Math.round(restGateNumber(forecast.points) ?? 0)),
            confidencePct: Math.max(0, Math.min(100, Math.round(restGateNumber(forecast.confidencePct) ?? 0))),
            nowW: restGateWatt(forecast.nowW),
            avgNext1hW: restGateWatt(forecast.avgNext1hW),
            avgNext3hW: restGateWatt(forecast.avgNext3hW),
            peakNext6hW: restGateWatt(forecast.peakNext6hW),
            peakNext24hW: restGateWatt(forecast.peakNext24hW),
            kwhNext1h: restGateNumber(forecast.kwhNext1h) ?? 0,
            kwhNext3h: restGateNumber(forecast.kwhNext3h) ?? 0,
            kwhNext6h: restGateNumber(forecast.kwhNext6h) ?? 0,
            kwhNext12h: restGateNumber(forecast.kwhNext12h) ?? 0,
            kwhNext24h: restGateNumber(forecast.kwhNext24h) ?? 0,
            status: restGateText(forecast.status),
            source: restGateText(forecast.source),
        },
        tariff: {
            active: restGateBool(tariff.active, false),
            state: restGateText(tariff.state),
            currentPriceEurKwh: restGateNumber(tariff.currentPriceEurKwh),
            negativeActive: restGateBool(tariff.negativeActive, false),
            gridImportPreferred: restGateBool(tariff.gridImportPreferred, false),
            storageGridChargeAllowed: restGateBool(tariff.storageGridChargeAllowed, false),
            evcsGridChargeAllowed: restGateBool(tariff.evcsGridChargeAllowed, false),
            dischargeAllowed: restGateBool(tariff.dischargeAllowed, true),
            pvCurtailRecommended: restGateBool(tariff.pvCurtailRecommended, false),
            negativeMinPriceEurKwh: restGateNumber(tariff.negativeMinPriceEurKwh),
            nextNegativeFrom: restGateText(tariff.nextNegativeFrom),
            nextNegativeTo: restGateText(tariff.nextNegativeTo),
            status: restGateText(tariff.status, restGateBool(tariff.gridImportPreferred, false) ? 'grid_import_preferred' : (restGateBool(tariff.active, false) ? 'active' : 'inactive')),
        },
        peakGrid: {
            peakActive: restGateBool(peak.active, false),
            peakBudgetW: restGateNullableWatt(peak.budgetW),
            gridImportLimitW_effective: restGateWatt(grid.gridImportLimitW_effective),
            gridImportLimitW_source: restGateText(grid.gridImportLimitW_source),
            para14aActive: restGateBool(para14a.active, false),
            para14aMode: restGateText(para14a.mode),
            para14aEvcsCapW: restGateNullableWatt(para14a.evcsCapW),
            evcsHighLevelCapW: restGateNullableWatt(evcsHighLevel.capW),
            evcsHighLevelBinding: restGateText(evcsHighLevel.binding),
        },
        productive: false,
        preparedOnly: true,
    };
}
/**
 * Code-Teil: compareCoreBudgetRestGates
 *
 * Zweck:
 * Vergleicht JS-Restgates mit dem TS-Restgate-Snapshot. In 0.7.120 ist das reine
 * Diagnose und keine produktive Umschaltung.
 */
function compareCoreBudgetRestGates(js, ts) {
    const mismatches = [];
    const f = js.forecast || {};
    const t = js.tariff || {};
    const p = js.peak || {};
    const g = js.grid || {};
    const a = js.para14a || {};
    const e = js.evcsHighLevel || {};
    const cmpNum = (field, jsValue, tsValue, tolerance = 0) => {
        const j = restGateNumber(jsValue);
        const tv = restGateNumber(tsValue);
        if (j === null && tv === null)
            return;
        if (j === null || tv === null || Math.abs(j - tv) > tolerance) {
            mismatches.push({ field, js: j, ts: tv, diff: j !== null && tv !== null ? Math.round((tv - j) * 1000) / 1000 : null, tolerance });
        }
    };
    const cmpBool = (field, jsValue, tsValue) => {
        const j = restGateBool(jsValue, false);
        const tv = restGateBool(tsValue, false);
        if (j !== tv)
            mismatches.push({ field, js: j, ts: tv });
    };
    const cmpText = (field, jsValue, tsValue) => {
        const j = restGateText(jsValue);
        const tv = restGateText(tsValue);
        if (j !== tv)
            mismatches.push({ field, js: j, ts: tv });
    };
    cmpBool('forecast.valid', f.valid, ts.forecast.valid);
    cmpBool('forecast.usable', f.usable, ts.forecast.usable);
    cmpNum('forecast.confidencePct', f.confidencePct, ts.forecast.confidencePct, 1);
    cmpNum('forecast.nowW', f.nowW, ts.forecast.nowW, 5);
    cmpNum('forecast.avgNext1hW', f.avgNext1hW, ts.forecast.avgNext1hW, 5);
    cmpNum('forecast.avgNext3hW', f.avgNext3hW, ts.forecast.avgNext3hW, 5);
    cmpText('forecast.status', f.status, ts.forecast.status);
    cmpBool('tariff.active', t.active, ts.tariff.active);
    cmpBool('tariff.negativeActive', t.negativeActive, ts.tariff.negativeActive);
    cmpBool('tariff.gridImportPreferred', t.gridImportPreferred, ts.tariff.gridImportPreferred);
    cmpBool('tariff.storageGridChargeAllowed', t.storageGridChargeAllowed, ts.tariff.storageGridChargeAllowed);
    cmpBool('tariff.evcsGridChargeAllowed', t.evcsGridChargeAllowed, ts.tariff.evcsGridChargeAllowed);
    cmpBool('tariff.dischargeAllowed', t.dischargeAllowed !== false, ts.tariff.dischargeAllowed);
    cmpNum('tariff.currentPriceEurKwh', t.currentPriceEurKwh, ts.tariff.currentPriceEurKwh, 0.0001);
    cmpText('tariff.status', t.status, ts.tariff.status);
    cmpBool('peak.active', p.active, ts.peakGrid.peakActive);
    cmpNum('peak.budgetW', p.budgetW, ts.peakGrid.peakBudgetW, 5);
    cmpNum('grid.gridImportLimitW_effective', g.gridImportLimitW_effective, ts.peakGrid.gridImportLimitW_effective, 5);
    cmpText('grid.gridImportLimitW_source', g.gridImportLimitW_source, ts.peakGrid.gridImportLimitW_source);
    cmpBool('para14a.active', a.active, ts.peakGrid.para14aActive);
    cmpText('para14a.mode', a.mode, ts.peakGrid.para14aMode);
    cmpNum('para14a.evcsCapW', a.evcsCapW, ts.peakGrid.para14aEvcsCapW, 5);
    cmpNum('evcsHighLevel.capW', e.capW, ts.peakGrid.evcsHighLevelCapW, 5);
    cmpText('evcsHighLevel.binding', e.binding, ts.peakGrid.evcsHighLevelBinding);
    return mismatches;
}
