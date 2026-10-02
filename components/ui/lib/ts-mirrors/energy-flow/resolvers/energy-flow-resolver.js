'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/resolvers/energy-flow-resolver.ts
 * Quell-Hash: sha256:18231364bb6164d96096e62a87398f50369d10c16b766bd623a77fc56408d906
 * Erzeugung: npm run sync:ts-energy-flow-mirrors
 *
 * Zweck:
 * Produktionsnaher Energiefluss-Resolver für spätere Shadow-Vergleiche.
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
exports.resolveStorageFlow = resolveStorageFlow;
exports.resolveGridFlow = resolveGridFlow;
exports.calculateBuildingLoadFromBalance = calculateBuildingLoadFromBalance;
exports.buildEnergyFlowSnapshot = buildEnergyFlowSnapshot;
exports.createEnergyFlowSnapshot = createEnergyFlowSnapshot;
exports.buildEnergyFlowSnapshotFromInputs = buildEnergyFlowSnapshotFromInputs;
const energy_flow_1 = require("../utils/energy-flow");
const number_1 = require("../utils/number");
/**
 * Code-Teil: configuredStorageZeroResult
 *
 * Zweck:
 * Erzeugt ein sicheres 0-W-Ergebnis für einen konfigurierten Speicher-DP, dessen Wert
 * gerade nicht numerisch gelesen werden kann.
 *
 * Zusammenhang:
 * Diese Hilfsfunktion ist bewusst konservativ. Wenn ein echter Speicher-DP konfiguriert
 * ist, darf der Adapter nicht einfach eine Bilanzrechnung darüberlegen. Sonst können
 * Historie, Heizstab-Budget und KI-Berater falsche Speicherwerte bekommen.
 */
function configuredStorageZeroResult(sourceText, input) {
    return {
        chargeW: 0,
        dischargeW: 0,
        signedW: null,
        socPct: (0, number_1.toNumberOrNull)(input.socPct),
        source: 'default-zero',
        signedConvention: input.signedConvention || 'unknown',
        hasConfiguredStorageDp: true,
        diagnosticText: `${sourceText} ist konfiguriert, liefert aber keinen numerischen Wert; 0 W bleibt Quelle der Wahrheit und verhindert einen Rechenfallback.`,
    };
}
/**
 * Code-Teil: calculatedStorageFromBalanceInput
 *
 * Zweck:
 * Erstellt den Speicher-Fallback aus einer Bilanz, wenn kein echter Speicher-DP vorhanden
 * ist.
 *
 * Zusammenhang:
 * Die Rechnung selbst liegt in `calculateStorageFromBalance`. Diese Wrapper-Funktion
 * dokumentiert, wann sie genutzt werden darf: ausschließlich ohne konfigurierten signed
 * oder Split-Speicher-DP.
 */
function calculatedStorageFromBalanceInput(input) {
    if ((0, number_1.toNumberOrNull)(input.calculatedSignedW) !== null) {
        return (0, energy_flow_1.splitSignedStoragePower)({
            signedW: input.calculatedSignedW,
            socPct: (0, number_1.toNumberOrNull)(input.socPct),
            convention: 'positive-discharge',
        });
    }
    const balance = input.balance;
    if (!balance) {
        return {
            chargeW: 0,
            dischargeW: 0,
            signedW: null,
            socPct: (0, number_1.toNumberOrNull)(input.socPct),
            source: 'missing',
            signedConvention: input.signedConvention || 'unknown',
            hasConfiguredStorageDp: false,
            diagnosticText: 'Kein Speicher-DP und keine vollständige Bilanz für Fallback vorhanden.',
        };
    }
    return (0, energy_flow_1.calculateStorageFromBalance)({
        pvW: balance.pvW,
        buildingLoadW: balance.additionalKnownLoadW ?? undefined,
        gridImportW: balance.gridImportW,
        gridExportW: balance.gridExportW,
        socPct: (0, number_1.toNumberOrNull)(input.socPct),
    });
}
/**
 * Code-Teil: resolveStorageFlow
 *
 * Zweck:
 * Löst Speicher-Laden und Speicher-Entladen nach unserer fachlichen Priorität auf.
 *
 * Priorität:
 * 1. Getrennte Lade-/Entlade-DPs, wenn konfiguriert.
 * 2. Signed Batterie-Leistungs-DP, wenn konfiguriert.
 * 3. Rechenfallback, nur wenn kein Speicher-DP konfiguriert ist.
 *
 * Warum das kritisch ist:
 * In den letzten Versionen haben falsche Fallbacks historische Speicherwerte verfälscht.
 * Diese Funktion hält die Regel typisiert fest, damit spätere Runtime-Migrationen nicht
 * wieder Split-DPs, signed DPs oder gültige 0-W-Werte überschreiben.
 *
 * Merksatz:
 * Bilanz-Fallback bleibt gesperrt, sobald ein echter Speicher-DP konfiguriert ist.
 */
function resolveStorageFlow(input) {
    if (input.hasConfiguredSplitDp) {
        return (0, energy_flow_1.resolveSplitStorageDps)({
            chargeW: input.chargeW,
            dischargeW: input.dischargeW,
            socPct: (0, number_1.toNumberOrNull)(input.socPct),
            hasChargeDp: true,
            hasDischargeDp: true,
        });
    }
    if (input.hasConfiguredSignedDp) {
        const signed = (0, number_1.toNumberOrNull)(input.signedW);
        if (signed === null)
            return configuredStorageZeroResult('signed-dp', input);
        return (0, energy_flow_1.splitSignedStoragePower)({
            signedW: signed,
            socPct: (0, number_1.toNumberOrNull)(input.socPct),
            convention: input.signedConvention || 'positive-discharge',
        });
    }
    return calculatedStorageFromBalanceInput(input);
}
/**
 * Code-Teil: configuredGridZeroResult
 *
 * Zweck:
 * Erzeugt ein sicheres 0-W-Netzergebnis, wenn ein Netz-DP konfiguriert ist, aber aktuell
 * keinen numerischen Wert liefert.
 *
 * Zusammenhang:
 * Genau wie beim Speicher ist 0 W ein gültiger Zustand. Später darf ein fehlender Momentwert
 * nicht automatisch zu falschem Import/Export führen.
 */
function configuredGridZeroResult() {
    return {
        importW: 0,
        exportW: 0,
        signedW: null,
        source: 'default-zero',
    };
}
/**
 * Code-Teil: resolveGridFlow
 *
 * Zweck:
 * Löst Netzbezug und Netzeinspeisung aus Split-DPs oder signed Netzanschlusspunkt auf.
 *
 * Zusammenhang:
 * Die Netzwerte sind Basis für Energiefluss, Speicher-Fallback, History und Peak-Shaving.
 * Deshalb wird hier dieselbe Prioritätsregel wie beim Speicher vorbereitet: echte DPs
 * schlagen berechnete oder fehlende Werte.
 */
function resolveGridFlow(input) {
    if (input.hasConfiguredSplitDp) {
        return (0, energy_flow_1.resolveSplitGridDps)(input.importW, input.exportW, true, true);
    }
    if (input.hasConfiguredSignedDp) {
        const signed = (0, number_1.toNumberOrNull)(input.signedW);
        if (signed === null)
            return configuredGridZeroResult();
        return (0, energy_flow_1.splitSignedGridPower)(signed, input.signedConvention || 'positive-import');
    }
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
 * Berechnet den Gebäudeverbrauch aus PV, Netz und Speicher, wenn kein direkter
 * Verbrauchs-DP vorhanden ist.
 *
 * Formel:
 * Gebäude = PV + Netzbezug + Speicherentladung - Netzeinspeisung - Speicherladung
 *
 * Wichtig:
 * Diese Berechnung darf später nur genutzt werden, wenn die Eingangsquellen fachlich
 * sauber aufgelöst wurden. Sonst erzeugt der Verbrauchswert falsche Folgewerte in History
 * und KPI-Kacheln.
 */
function calculateBuildingLoadFromBalance(input) {
    const pvW = (0, number_1.toNumberOrNull)(input.pvW);
    if (pvW === null)
        return null;
    const additionalKnownLoadW = (0, number_1.positiveWatt)(input.additionalKnownLoadW);
    const calculated = pvW
        + input.grid.importW
        + input.storage.dischargeW
        - input.grid.exportW
        - input.storage.chargeW
        + additionalKnownLoadW;
    return Math.max(0, calculated);
}
/**
 * Code-Teil: buildEnergyFlowSnapshot
 *
 * Zweck:
 * Baut eine vollständige, typisierte Energiefluss-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist die spätere Zielstruktur für die Migration von Backend- und
 * Frontend-Resolvern. Sie ist in 0.7.61 noch nicht produktiv aktiv, bildet aber schon
 * die Reihenfolge ab, die wir später in Runtime-Code übernehmen wollen.
 */
function buildEnergyFlowSnapshot(input) {
    const grid = resolveGridFlow(input.grid);
    const storage = resolveStorageFlow({
        ...input.storage,
        balance: input.storage.balance || {
            pvW: input.pvW,
            gridImportW: grid.importW,
            gridExportW: grid.exportW,
            additionalKnownLoadW: input.buildingLoadW,
        },
    });
    const directBuildingLoad = (0, number_1.toNumberOrNull)(input.buildingLoadW);
    const buildingLoadW = directBuildingLoad === null
        ? calculateBuildingLoadFromBalance({
            pvW: input.pvW,
            grid,
            storage,
            additionalKnownLoadW: undefined,
        })
        : Math.max(0, directBuildingLoad);
    const evcsW = (0, number_1.positiveWatt)(input.evcsW);
    const heatingRodW = (0, number_1.positiveWatt)(input.heatingRodW);
    const thermalW = (0, number_1.positiveWatt)(input.thermalW);
    return {
        ts: input.ts,
        pvW: (0, number_1.positiveWatt)(input.pvW),
        buildingLoadW,
        grid,
        storage,
        evcsW,
        heatingRodW,
        thermalW,
        residualLoadW: buildingLoadW === null ? null : Math.max(0, buildingLoadW - evcsW - heatingRodW - thermalW),
    };
}
/**
 * Code-Teil: createEnergyFlowSnapshot
 *
 * Zweck:
 * Rückwärtskompatibler Alias für die produktionsnahe Snapshot-Funktion.
 *
 * Zusammenhang:
 * Erste Regressionstests und spätere Migrationsschritte nutzen teilweise den Begriff
 * `createEnergyFlowSnapshot`, während die fachliche Implementierung aktuell
 * `buildEnergyFlowSnapshot` heißt. Der Alias vermeidet doppelte Logik und hält die
 * Testverträge stabil.
 */
function createEnergyFlowSnapshot(input) {
    return buildEnergyFlowSnapshot(input);
}
/**
 * Code-Teil: buildEnergyFlowSnapshotFromInputs
 *
 * Zweck:
 * Rückwärtskompatibler Alias für frühe Regressionstests.
 *
 * Zusammenhang:
 * Einige Testdateien benennen die Zielstruktur ausdrücklich als „aus Eingaben bauen“.
 * Damit keine doppelte Logik entsteht, leitet dieser Alias direkt auf
 * `buildEnergyFlowSnapshot` weiter.
 */
function buildEnergyFlowSnapshotFromInputs(input) {
    return buildEnergyFlowSnapshot(input);
}
