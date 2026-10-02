// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/evcs-control-mapping.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/evcs-control-mapping.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 4213703d8df229d902712906dd542081282d4020f96caabe469280ad1682744d
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/evcs-control-mapping.ts
 * Quell-Hash: sha256:a290402630770ed3f07395061762ecf828b6ab45b71cb04b45a2e4381b68cb84
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/evcs-control-mapping.js.
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
 * Aufgabe: Vereinheitlicht die konfigurierten Steuerdatenpunkte einer Ladestation für die nachgelagerten EVCS-Schreibpfade.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/evcs-control-mapping.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: ems/evcs-control-mapping.js
 * Rolle: Feldkompatible Auflösung von EVCS-Mess- und Steuer-Datenpunkten.
 *
 * Ziel:
 * - `nexowatt-devices` stellt herstellerunabhängige EVCS-Fähigkeiten über einen
 *   stabilen Gerätevertrag bereit. Das Lademanagement soll diese Fähigkeiten
 *   automatisch übernehmen, ohne herstellerspezifische Sonderlogik zu benötigen.
 * - Explizite Installer-Zuordnungen bleiben immer autoritativ.
 * - Ein Ladepunkt darf niemals Mess- oder Steuerpfade mehrerer Gerätebasen
 *   mischen. Alle automatisch ergänzten DPs stammen deshalb aus genau einer
 *   Gerätebasis.
 * - Ein Ladebedarf-DP wird bewusst NICHT automatisch abgeleitet. Ein falsches
 *   `charging=true` als Ladebedarf würde sonst den Startpfad blockieren oder ein
 *   volles Fahrzeug wiederholt anfordern. Startfähigkeit wird aus Status und
 *   Fahrzeugkontakt semantisch normalisiert.
 */

'use strict';

/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text() {
    const value = arguments[0];
    return String(value === undefined || value === null ? '' : value).trim();
}

/**
 * Code-Teil: deriveNexowattDeviceBaseId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function deriveNexowattDeviceBaseId() {
    const id = Function.prototype.apply.call(text, null, [arguments[0]]);
    if (!id) return '';
    const match = id.match(/^(.*?\.devices\.[^.]+)(?:\.|$)/i);
    return match && match[1] ? Function.prototype.apply.call(text, null, [match[1]]) : '';
}

/**
 * Code-Teil: unique
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function unique() {
    const values = arguments[0];
    return Array.from(new Set((Array.isArray(values) ? values : [])
        .map((value) => Function.prototype.apply.call(text, null, [value]))
        .filter(Boolean)));
}

/**
 * Code-Teil: buildEvcsControlCandidates
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildEvcsControlCandidates() {
    const base = Function.prototype.apply.call(text, null, [arguments[0]]);
    if (!base) return { current: [], power: [], enable: [] };
    return {
        current: [
            `${base}.aliases.v1.ctrl.targetCurrentA`,
            `${base}.aliases.v1.ctrl.currentLimitA`,
            `${base}.aliases.v1.ctrl.setCurrentA`,
            `${base}.aliases.ctrl.targetCurrentA`,
            `${base}.aliases.ctrl.currentLimitA`,
            `${base}.aliases.ctrl.setCurrentA`,
            `${base}.ctrl.targetCurrentA`,
            `${base}.ctrl.currentLimitA`,
            `${base}.ctrl.setCurrentA`,
        ],
        power: [
            `${base}.aliases.v1.ctrl.targetPowerW`,
            `${base}.aliases.v1.ctrl.powerLimitW`,
            `${base}.aliases.v1.ctrl.setPowerW`,
            `${base}.aliases.ctrl.targetPowerW`,
            `${base}.aliases.ctrl.powerLimitW`,
            `${base}.aliases.ctrl.setPowerW`,
            `${base}.ctrl.targetPowerW`,
            `${base}.ctrl.powerLimitW`,
            `${base}.ctrl.setPowerW`,
        ],
        enable: [
            `${base}.aliases.v1.ctrl.run`,
            `${base}.aliases.v1.ctrl.enable`,
            `${base}.aliases.v1.ctrl.enabled`,
            `${base}.aliases.ctrl.run`,
            `${base}.aliases.ctrl.enable`,
            `${base}.aliases.ctrl.enabled`,
            `${base}.ctrl.run`,
            `${base}.ctrl.enable`,
            `${base}.ctrl.enabled`,
        ],
    };
}

/**
 * Herstellerunabhängige EVCS-Telemetrie des `nexowatt-devices`-Vertrags.
 * Reihenfolge: versionierter stabiler Vertrag, Legacy-Vertrag, Rohpfad.
 */
function buildEvcsTelemetryCandidates() {
    const base = Function.prototype.apply.call(text, null, [arguments[0]]);
    if (!base) {
        return {
            power: [], energyTotal: [], status: [], vehicleConnected: [], online: [], heartbeat: [],
        };
    }
    return {
        power: [
            `${base}.aliases.v1.r.power`,
            `${base}.aliases.r.power`,
            `${base}.r.power`,
            `${base}.aliases.v1.r.powerEstimated`,
            `${base}.aliases.r.powerEstimated`,
            `${base}.r.powerEstimated`,
        ],
        energyTotal: [
            `${base}.aliases.v1.r.energyTotal`,
            `${base}.aliases.r.energyTotal`,
            `${base}.r.energyTotal`,
        ],
        status: [
            // Mode-3-/EV-Zustände sind für Startfähigkeit aussagekräftiger als
            // ein generischer numerischer Gerätecode.
            `${base}.aliases.v1.r.mode3State`,
            `${base}.aliases.r.mode3State`,
            `${base}.r.mode3State`,
            `${base}.aliases.v1.r.mode3Code`,
            `${base}.aliases.r.mode3Code`,
            `${base}.r.mode3Code`,
            `${base}.aliases.v1.r.evState`,
            `${base}.aliases.r.evState`,
            `${base}.r.evState`,
            `${base}.aliases.v1.r.statusText`,
            `${base}.aliases.r.statusText`,
            `${base}.r.statusText`,
            `${base}.aliases.v1.r.statusCode`,
            `${base}.aliases.r.statusCode`,
            `${base}.r.statusCode`,
        ],
        vehicleConnected: [
            `${base}.aliases.v1.r.vehicleConnected`,
            `${base}.aliases.r.vehicleConnected`,
            `${base}.r.vehicleConnected`,
        ],
        online: [
            `${base}.aliases.v1.r.online`,
            `${base}.aliases.r.online`,
            `${base}.r.online`,
            `${base}.aliases.v1.comm.connected`,
            `${base}.aliases.comm.connected`,
            `${base}.comm.connected`,
        ],
        heartbeat: [
            `${base}.aliases.v1.r.lastSeenMs`,
            `${base}.aliases.r.lastSeenMs`,
            `${base}.r.lastSeenMs`,
            `${base}.aliases.v1.r.heartbeat`,
            `${base}.aliases.r.heartbeat`,
            `${base}.r.heartbeat`,
        ],
    };
}

/**
 * Code-Teil: firstExisting
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function firstExisting() {
    const candidates = arguments[0];
    const exists = arguments[1];
    if (typeof exists !== 'function') return '';
    for (const id of Function.prototype.apply.call(unique, null, [candidates])) {
        try {
            if (await exists(id)) return id;
        } catch (_e) {
            // Ein einzelner nicht lesbarer Kandidat darf die restliche Suche
            // nicht abbrechen.
        }
    }
    return '';
}

/**
 * Ein Beobachtungs-DP wie `r.charging` oder `transactionActive` ist kein
 * eigener Ladebedarfswunsch. Alte Zuordnungen werden beim Start neutralisiert,
 * damit ein noch nicht gestartetes Fahrzeug nicht durch `false` blockiert wird.
 */
function normalizeEvcsChargeDemandObjectId() {
    const id = Function.prototype.apply.call(text, null, [arguments[0]]);
    if (!id) return '';
    const token = id.toLowerCase();
    if (/(?:^|\.)(?:aliases(?:\.v1)?\.)?r\.(?:charging|active)$/.test(token)) return '';
    if (/(?:^|\.)transactions\.(?:transactionactive|chargingstate)$/.test(token)) return '';
    if (/(?:^|\.)(?:transactionactive|chargingactive|chargeactive|ischarging)$/.test(token)) return '';
    return id;
}

/**
 * Alte Schnellzuordnungen nutzten häufig nur den generischen Gerätecode.
 * Wenn derselbe NexoWatt-Devices-Ladepunkt inzwischen einen semantisch
 * aussagekräftigeren Mode-3-/EV-Zustand anbietet, darf genau diese bekannte
 * automatische Zuordnung stationsgleich aktualisiert werden. Frei gewählte
 * Installer-Datenpunkte bleiben unberührt.
 */
function isUpgradeableNexowattEvcsStatusObjectId() {
    const id = Function.prototype.apply.call(text, null, [arguments[0]]).toLowerCase();
    if (!id || !Function.prototype.apply.call(deriveNexowattDeviceBaseId, null, [id])) return false;
    return /(?:^|\.)(?:aliases(?:\.v1)?\.)?r\.(?:statuscode|statustext)$/.test(id);
}

/**
 * Code-Teil: baseBelongsToRow
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function baseBelongsToRow() {
    const baseId = Function.prototype.apply.call(text, null, [arguments[0]]);
    const row = arguments[1] && typeof arguments[1] === 'object' ? arguments[1] : {};
    if (!baseId) return false;
    const fields = [
        'powerId', 'actualPowerWId', 'energyTotalId', 'statusId', 'onlineId',
        'vehicleConnectedId', 'heartbeatId', 'setCurrentAId', 'setPowerWId',
        'enableWriteId', 'phaseSwitchId', 'phaseFeedbackId',
    ];
    return fields.some((field) => Function.prototype.apply.call(deriveNexowattDeviceBaseId, null, [row[field]]) === baseId);
}

/**
 * Ergänzt fehlende EVCS-Mess- und Steuerpfade aus genau einer Gerätebasis.
 *
 * @param {object} row
 * @param {(id:string)=>Promise<boolean>} writeExists
 * @param {(id:string)=>Promise<boolean>} [readExists]
 */
async function resolveEvcsControlMapping() {
    const row = arguments[0];
    const writeExists = arguments[1];
    const readExists = typeof arguments[2] === 'function' ? arguments[2] : writeExists;
    const source = row && typeof row === 'object' ? row : {};
    const out = { ...source };
    const normalizedChargeDemandId = Function.prototype.apply.call(normalizeEvcsChargeDemandObjectId, null, [out.chargeDemandId]);
    const ignoredObservationDemand = !!Function.prototype.apply.call(text, null, [out.chargeDemandId]) && !normalizedChargeDemandId;
    out.chargeDemandId = normalizedChargeDemandId;

    const sourceFields = [
        source.baseId,
        source.deviceBaseId,
        source.deviceId,
        source.devId,
        source.objectId,
        source.powerId,
        source.actualPowerWId,
        source.statusId,
        source.onlineId,
        source.activeId,
        source.vehicleConnectedId,
        source.chargeDemandId,
        source.heartbeatId,
        source.energyTotalId,
        source.lockWriteId,
        source.rfidReadId,
        source.vehicleSocId,
        source.phaseSwitchId,
        source.phaseFeedbackId,
        source.setCurrentAId,
        source.setPowerWId,
        source.enableWriteId,
    ];
    const baseIds = Function.prototype.apply.call(unique, null, [sourceFields
        .map((value) => Function.prototype.apply.call(deriveNexowattDeviceBaseId, null, [value]))]);

    const flags = {
        inferredCurrent: false,
        inferredPower: false,
        inferredEnable: false,
        inferredPowerRead: false,
        inferredEnergyTotal: false,
        inferredStatus: false,
        upgradedStatus: false,
        inferredVehicleConnected: false,
        inferredOnline: false,
        inferredHeartbeat: false,
    };
    let usedBaseId = '';

    // Die erste bereits explizit verwendete Gerätebasis hat Vorrang. Ohne
    // expliziten Pfad wird die erste Basis mit mindestens einer realen Fähigkeit
    // gewählt. Danach werden ausschließlich Kandidaten dieser Basis ergänzt.
    for (const baseId of baseIds) {
        const control = Function.prototype.apply.call(buildEvcsControlCandidates, null, [baseId]);
        const telemetry = Function.prototype.apply.call(buildEvcsTelemetryCandidates, null, [baseId]);
        const explicitBase = Function.prototype.apply.call(baseBelongsToRow, null, [baseId, source]);

        const resolved = {
            current: !Function.prototype.apply.call(text, null, [out.setCurrentAId])
                ? await Function.prototype.apply.call(firstExisting, null, [control.current, writeExists]) : '',
            power: !Function.prototype.apply.call(text, null, [out.setPowerWId])
                ? await Function.prototype.apply.call(firstExisting, null, [control.power, writeExists]) : '',
            enable: !Function.prototype.apply.call(text, null, [out.enableWriteId])
                ? await Function.prototype.apply.call(firstExisting, null, [control.enable, writeExists]) : '',
            powerRead: !Function.prototype.apply.call(text, null, [out.powerId || out.actualPowerWId])
                ? await Function.prototype.apply.call(firstExisting, null, [telemetry.power, readExists]) : '',
            energyTotal: !Function.prototype.apply.call(text, null, [out.energyTotalId])
                ? await Function.prototype.apply.call(firstExisting, null, [telemetry.energyTotal, readExists]) : '',
            status: (!Function.prototype.apply.call(text, null, [out.statusId])
                || (Function.prototype.apply.call(deriveNexowattDeviceBaseId, null, [out.statusId]) === baseId
                    && Function.prototype.apply.call(isUpgradeableNexowattEvcsStatusObjectId, null, [out.statusId])))
                ? await Function.prototype.apply.call(firstExisting, null, [telemetry.status, readExists]) : '',
            vehicleConnected: !Function.prototype.apply.call(text, null, [out.vehicleConnectedId])
                ? await Function.prototype.apply.call(firstExisting, null, [telemetry.vehicleConnected, readExists]) : '',
            online: !Function.prototype.apply.call(text, null, [out.onlineId])
                ? await Function.prototype.apply.call(firstExisting, null, [telemetry.online, readExists]) : '',
            heartbeat: !Function.prototype.apply.call(text, null, [out.heartbeatId])
                ? await Function.prototype.apply.call(firstExisting, null, [telemetry.heartbeat, readExists]) : '',
        };

        const foundAny = Object.values(resolved).some(Boolean);
        if (!explicitBase && !foundAny) continue;
        usedBaseId = baseId;

        if (resolved.current) { out.setCurrentAId = resolved.current; flags.inferredCurrent = true; }
        if (resolved.power) { out.setPowerWId = resolved.power; flags.inferredPower = true; }
        if (resolved.enable) { out.enableWriteId = resolved.enable; flags.inferredEnable = true; }
        if (resolved.powerRead) { out.powerId = resolved.powerRead; flags.inferredPowerRead = true; }
        if (resolved.energyTotal) {
            out.energyTotalId = resolved.energyTotal;
            // Der NexoWatt-Gerätevertrag führt kumulierte EVCS-Energie in Wh.
            out.energyTotalInputIsWh = true;
            flags.inferredEnergyTotal = true;
        }
        if (resolved.status && resolved.status !== Function.prototype.apply.call(text, null, [out.statusId])) {
            const hadStatus = !!Function.prototype.apply.call(text, null, [out.statusId]);
            out.statusId = resolved.status;
            flags.inferredStatus = true;
            flags.upgradedStatus = hadStatus;
        }
        if (resolved.vehicleConnected) { out.vehicleConnectedId = resolved.vehicleConnected; flags.inferredVehicleConnected = true; }
        if (resolved.online) { out.onlineId = resolved.online; flags.inferredOnline = true; }
        if (resolved.heartbeat) { out.heartbeatId = resolved.heartbeat; flags.inferredHeartbeat = true; }
        break;
    }

    const preference = Function.prototype.apply.call(text, null, [out.controlPreference]).toLowerCase();
    const hasCurrentTarget = !!Function.prototype.apply.call(text, null, [out.setCurrentAId]);
    const hasPowerTarget = !!Function.prototype.apply.call(text, null, [out.setPowerWId]);
    let preferenceMigrated = false;
    if (preference === 'none' || preference === 'off') {
        if (hasPowerTarget && !hasCurrentTarget) {
            out.controlPreference = 'powerW';
            preferenceMigrated = true;
        } else if (hasCurrentTarget && !hasPowerTarget) {
            out.controlPreference = 'currentA';
            preferenceMigrated = true;
        } else if (hasCurrentTarget && hasPowerTarget) {
            out.controlPreference = 'auto';
            preferenceMigrated = true;
        }
    } else if (!preference || preference === 'auto') {
        if (hasPowerTarget && !hasCurrentTarget) out.controlPreference = 'powerW';
        else if (hasCurrentTarget && !hasPowerTarget) out.controlPreference = 'currentA';
    }

    const inferredAny = Object.values(flags).some(Boolean);
    return {
        row: out,
        changed: inferredAny || preferenceMigrated || ignoredObservationDemand,
        ...flags,
        preferenceMigrated,
        ignoredObservationDemand,
        baseId: usedBaseId || baseIds[0] || '',
    };
}

eval('module').exports = {
    deriveNexowattDeviceBaseId,
    buildEvcsControlCandidates,
    buildEvcsTelemetryCandidates,
    normalizeEvcsChargeDemandObjectId,
    isUpgradeableNexowattEvcsStatusObjectId,
    resolveEvcsControlMapping,
};
