'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/utils/energy-flow.ts
 * Quell-Hash: sha256:27d1a8dd06990ddbb007fb8779153a882106247f6d2a34012eda9fcc042c0b6a
 * Erzeugung: npm run sync:ts-energy-flow-mirrors
 *
 * Zweck:
 * Energiefluss-Helfer für signed/split/Fallback.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die spätere Brücke für Shadow-Vergleiche zwischen alter
 * JavaScript-Runtime und neuer TypeScript-Energieflusslogik. In 0.7.69 wird
 * er noch nicht produktiv von main.js/www/app.js genutzt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in der TypeScript-Quelle unter src-ts/ vornehmen.
 * 2. npm run sync:ts-energy-flow-mirrors ausführen.
 * 3. npm run test:energy-flow-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitSignedStoragePower = splitSignedStoragePower;
exports.resolveSplitStorageDps = resolveSplitStorageDps;
exports.calculateStorageFromBalance = calculateStorageFromBalance;
exports.chooseStorageFlowResult = chooseStorageFlowResult;
exports.splitSignedGridPower = splitSignedGridPower;
exports.resolveSplitGridDps = resolveSplitGridDps;
exports.hasUsableMeasuredStorageSource = hasUsableMeasuredStorageSource;
exports.resolveStorageFlow = resolveStorageFlow;
exports.resolveGridFlow = resolveGridFlow;
exports.calculateBuildingLoadFromBalance = calculateBuildingLoadFromBalance;
const number_1 = require("./number");
/**
 * Code-Teil: splitSignedStoragePower
 *
 * Zweck:
 * Teilt einen signed Speicherleistungswert in positive Lade- und Entladeleistung auf.
 *
 * Zusammenhang:
 * Einige Speicher liefern einen einzigen Leistungs-DP mit Vorzeichen. Andere liefern
 * getrennte DPs. Dieser Helfer bildet die signed Variante so ab, dass spätere Resolver
 * immer mit `chargeW` und `dischargeW` weiterarbeiten können.
 *
 * Wichtig:
 * Die Vorzeichen-Konvention muss bekannt sein. Standard ist `positive-discharge`, also
 * positive Werte = Entladen und negative Werte = Laden.
 */
function splitSignedStoragePower(input) {
    const signed = (0, number_1.toNumberOrNull)(input.signedW);
    const convention = input.convention || 'positive-discharge';
    if (signed === null) {
        return {
            chargeW: 0,
            dischargeW: 0,
            signedW: null,
            socPct: input.socPct ?? null,
            source: 'missing',
            signedConvention: convention,
            hasConfiguredStorageDp: false,
            diagnosticText: 'Kein signed Speicherwert vorhanden.',
        };
    }
    const positiveMeansDischarge = convention !== 'positive-charge';
    const chargeW = positiveMeansDischarge ? Math.max(0, -signed) : Math.max(0, signed);
    const dischargeW = positiveMeansDischarge ? Math.max(0, signed) : Math.max(0, -signed);
    return {
        chargeW,
        dischargeW,
        signedW: signed,
        socPct: input.socPct ?? null,
        source: 'signed-dp',
        signedConvention: convention,
        hasConfiguredStorageDp: true,
        diagnosticText: 'Signed Speicher-DP wurde in Laden/Entladen aufgeteilt.',
    };
}
/**
 * Code-Teil: resolveSplitStorageDps
 *
 * Zweck:
 * Bildet getrennte Speicher-Lade- und Speicher-Entlade-DPs auf ein gemeinsames Ergebnis
 * ab.
 *
 * Zusammenhang:
 * Viele Speichersysteme liefern getrennte DPs. Wenn diese DPs konfiguriert sind, sind
 * sie Quelle der Wahrheit. Ein Wert von 0 W ist dabei ausdrücklich gültig.
 */
function resolveSplitStorageDps(input) {
    const hasConfiguredStorageDp = !!(input.hasChargeDp || input.hasDischargeDp);
    return {
        chargeW: input.hasChargeDp ? (0, number_1.positiveWatt)(input.chargeW) : 0,
        dischargeW: input.hasDischargeDp ? (0, number_1.positiveWatt)(input.dischargeW) : 0,
        signedW: null,
        socPct: input.socPct ?? null,
        source: hasConfiguredStorageDp ? 'split-dp' : 'missing',
        signedConvention: 'unknown',
        hasConfiguredStorageDp,
        diagnosticText: hasConfiguredStorageDp
            ? 'Getrennte Lade-/Entlade-DPs sind Quelle der Wahrheit; 0 W bleibt gültig.'
            : 'Keine getrennten Speicher-DPs konfiguriert.',
    };
}
/**
 * Code-Teil: calculateStorageFromBalance
 *
 * Zweck:
 * Ermittelt Speicherleistung rechnerisch aus einer Energieflussbilanz.
 *
 * Zusammenhang:
 * Diese Rechnung ist nur ein Fallback für Anlagen ohne echten Speicherleistungs-DP.
 * Produktive Resolver müssen vorher prüfen, ob signed oder split DPs konfiguriert sind.
 *
 * Formel:
 * `storageSignedW = buildingLoadW - pvW - gridImportW + gridExportW`
 * Bei `positive-discharge` bedeutet ein positiver Wert Entladen und ein negativer Wert
 * Laden.
 */
function calculateStorageFromBalance(input) {
    const pvW = (0, number_1.toNumberOrNull)(input.pvW);
    const buildingLoadW = (0, number_1.toNumberOrNull)(input.buildingLoadW);
    const gridImportW = (0, number_1.toNumberOrNull)(input.gridImportW);
    const gridExportW = (0, number_1.toNumberOrNull)(input.gridExportW);
    if (pvW === null || buildingLoadW === null || gridImportW === null || gridExportW === null) {
        return {
            chargeW: 0,
            dischargeW: 0,
            signedW: null,
            socPct: input.socPct ?? null,
            source: 'missing',
            signedConvention: 'positive-discharge',
            hasConfiguredStorageDp: false,
            diagnosticText: 'Bilanz-Fallback nicht möglich, weil PV, Verbrauch oder Netzwerte fehlen.',
        };
    }
    const signedW = buildingLoadW - pvW - gridImportW + gridExportW;
    return {
        chargeW: Math.max(0, -signedW),
        dischargeW: Math.max(0, signedW),
        signedW: signedW,
        socPct: input.socPct ?? null,
        source: 'calculated',
        signedConvention: 'positive-discharge',
        hasConfiguredStorageDp: false,
        diagnosticText: 'Speicherleistung wurde aus der Bilanz berechnet, weil kein echter Speicher-DP genutzt wurde.',
    };
}
/**
 * Code-Teil: chooseStorageFlowResult
 *
 * Zweck:
 * Wählt aus möglichen Speicherquellen die fachlich korrekte Quelle aus.
 *
 * Zusammenhang:
 * Diese Priorität ist die wichtigste Vertragsregel für die spätere Produktivmigration:
 * split DP oder signed DP schlagen jede Rechenbilanz. Rechenfallback darf nur greifen,
 * wenn kein echter Speicher-DP konfiguriert ist.
 */
function chooseStorageFlowResult(options) {
    if (options.split?.hasConfiguredStorageDp)
        return options.split;
    if (options.signed?.hasConfiguredStorageDp)
        return options.signed;
    if (options.calculated?.source === 'calculated')
        return options.calculated;
    return options.split || options.signed || options.calculated || {
        chargeW: 0,
        dischargeW: 0,
        signedW: null,
        socPct: null,
        source: 'missing',
        signedConvention: 'unknown',
        hasConfiguredStorageDp: false,
        diagnosticText: 'Keine Speicherquelle verfügbar.',
    };
}
/**
 * Code-Teil: splitSignedGridPower
 *
 * Zweck:
 * Teilt einen signed Netzanschlusspunkt in Netzbezug und Netzeinspeisung auf.
 *
 * Zusammenhang:
 * Genau wie beim Speicher gibt es auch beim Netz unterschiedliche DPs. Manche Anlagen
 * liefern getrennte Import-/Exportwerte, andere einen signed Netzanschlusspunkt.
 */
function splitSignedGridPower(signedValue, convention = 'positive-import') {
    const signed = (0, number_1.toNumberOrNull)(signedValue);
    if (signed === null) {
        return {
            importW: 0,
            exportW: 0,
            signedW: null,
            source: 'missing',
        };
    }
    const positiveMeansImport = convention === 'positive-import';
    return {
        importW: positiveMeansImport ? Math.max(0, signed) : Math.max(0, -signed),
        exportW: positiveMeansImport ? Math.max(0, -signed) : Math.max(0, signed),
        signedW: signed,
        source: 'signed-dp',
    };
}
/**
 * Code-Teil: resolveSplitGridDps
 *
 * Zweck:
 * Bildet getrennte Netzbezug-/Netzeinspeisung-DPs auf einen gemeinsamen Netzvertrag ab.
 *
 * Zusammenhang:
 * 0 W Netzbezug oder 0 W Einspeisung ist gültig. Fehlende DPs dürfen später nicht dazu
 * führen, dass echte 0-Werte verworfen werden.
 */
function resolveSplitGridDps(importW, exportW, hasImportDp, hasExportDp) {
    const hasAnyDp = !!(hasImportDp || hasExportDp);
    return {
        importW: hasImportDp ? (0, number_1.positiveWatt)(importW) : 0,
        exportW: hasExportDp ? (0, number_1.positiveWatt)(exportW) : 0,
        signedW: null,
        source: hasAnyDp ? 'split-dp' : 'missing',
    };
}
/**
 * Code-Teil: hasUsableMeasuredStorageSource
 *
 * Zweck:
 * Zeigt an, ob ein Speicherergebnis aus einem echten konfigurierten DP stammt.
 *
 * Zusammenhang:
 * Diese Prüfung schützt History und EMS-Logik davor, einen echten 0-W-Speicherwert
 * durch eine ungewollte Bilanzrechnung zu überschreiben.
 */
function hasUsableMeasuredStorageSource(result) {
    return !!result && result.hasConfiguredStorageDp && (result.source === 'split-dp' || result.source === 'signed-dp');
}
/**
 * Code-Teil: resolveStorageFlow
 *
 * Zweck:
 * Führt die später produktive Speicher-DP-Priorität in einer kleinen, typisierten
 * Funktion zusammen: Split-DPs zuerst, danach signed DP, danach berechneter Fallback.
 *
 * Zusammenhang:
 * Diese Funktion ist noch nicht in der Adapter-Runtime verdrahtet. Sie bildet aber
 * exakt die fachliche Reihenfolge ab, die später in `main.js`, `www/app.js`,
 * `core-limits.js`, `heating-rod-control.js` und der History gleich gelten muss.
 *
 * Wichtig:
 * Ein konfigurierter Split- oder signed Speicher-DP ist Quelle der Wahrheit. Auch 0 W
 * ist gültig. Der Rechenfallback darf nur benutzt werden, wenn wirklich kein Speicher-
 * DP konfiguriert ist.
 */
function resolveStorageFlow(input) {
    const hasChargeDp = input.hasConfiguredChargeDp ?? (!!input.hasConfiguredSplitDp && input.chargeW !== undefined);
    const hasDischargeDp = input.hasConfiguredDischargeDp ?? (!!input.hasConfiguredSplitDp && input.dischargeW !== undefined);
    const hasSplitDp = !!(input.hasConfiguredSplitDp || hasChargeDp || hasDischargeDp);
    if (hasSplitDp) {
        return resolveSplitStorageDps({
            chargeW: input.chargeW,
            dischargeW: input.dischargeW,
            socPct: input.socPct,
            hasChargeDp,
            hasDischargeDp,
        });
    }
    if (input.hasConfiguredSignedDp) {
        return splitSignedStoragePower({
            signedW: input.signedW,
            socPct: input.socPct,
            convention: input.signedConvention || 'positive-discharge',
        });
    }
    const calculatedSigned = (0, number_1.toNumberOrNull)(input.calculatedSignedW);
    if (calculatedSigned !== null) {
        const result = splitSignedStoragePower({
            signedW: calculatedSigned,
            socPct: input.socPct,
            convention: input.signedConvention || 'positive-discharge',
        });
        return {
            ...result,
            source: 'calculated',
            hasConfiguredStorageDp: false,
            diagnosticText: input.calculatedReason || 'Speicherleistung wurde vorbereitet aus Bilanz-Fallback berechnet.',
        };
    }
    return {
        chargeW: 0,
        dischargeW: 0,
        signedW: null,
        socPct: input.socPct ?? null,
        source: 'missing',
        signedConvention: input.signedConvention || 'unknown',
        hasConfiguredStorageDp: false,
        diagnosticText: 'Kein Speicher-DP und kein berechneter Fallback verfügbar.',
    };
}
/**
 * Code-Teil: resolveGridFlow
 *
 * Zweck:
 * Führt die spätere Netz-DP-Priorität zusammen: getrennte Import-/Export-DPs zuerst,
 * danach signed Netzanschlusspunkt.
 *
 * Zusammenhang:
 * Der Netzfluss ist Grundlage für Energiefluss, Speicherfallback, Peak-Shaving,
 * Heizstab-Budget und History. Deshalb muss auch hier 0 W als gültiger Wert gelten.
 */
function resolveGridFlow(input) {
    const hasImportDp = input.hasConfiguredImportDp ?? (!!input.hasConfiguredSplitDp && input.importW !== undefined);
    const hasExportDp = input.hasConfiguredExportDp ?? (!!input.hasConfiguredSplitDp && input.exportW !== undefined);
    const hasSplitDp = !!(input.hasConfiguredSplitDp || hasImportDp || hasExportDp);
    if (hasSplitDp)
        return resolveSplitGridDps(input.importW, input.exportW, hasImportDp, hasExportDp);
    if (input.hasConfiguredSignedDp)
        return splitSignedGridPower(input.signedW, input.signedConvention || 'positive-import');
    return {
        importW: 0,
        exportW: 0,
        signedW: null,
        source: 'missing',
    };
}
/**
 * Code-Teil: calculateBuildingLoadFromBalance
 *
 * Zweck:
 * Bereitet die spätere Gebäudelast-Bilanzrechnung vor.
 *
 * Zusammenhang:
 * Wenn kein echter Gebäudeverbrauchs-DP vorhanden ist, kann Verbrauch aus PV, Netz und
 * Speicher hergeleitet werden. Diese Rechnung darf aber niemals echte Speicher-DPs
 * überschreiben, weil sonst History und Heizstab-Budget verfälscht werden können.
 *
 * Formel:
 * `buildingLoadW = pvW + gridImportW + storageDischargeW - gridExportW - storageChargeW + additionalKnownLoadW`
 */
function calculateBuildingLoadFromBalance(input) {
    const pvW = (0, number_1.toNumberOrNull)(input.pvW);
    const gridImportW = (0, number_1.toNumberOrNull)(input.gridImportW);
    const gridExportW = (0, number_1.toNumberOrNull)(input.gridExportW);
    const storageChargeW = (0, number_1.toNumberOrNull)(input.storageChargeW);
    const storageDischargeW = (0, number_1.toNumberOrNull)(input.storageDischargeW);
    const additionalKnownLoadW = (0, number_1.toNumberOrNull)(input.additionalKnownLoadW) ?? 0;
    if (pvW === null || gridImportW === null || gridExportW === null || storageChargeW === null || storageDischargeW === null) {
        return null;
    }
    return Math.max(0, pvW + gridImportW + storageDischargeW - gridExportW - storageChargeW + additionalKnownLoadW);
}
