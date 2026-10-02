// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/tariff-status.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/tariff-status.js
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
 * Original-Hash: a68ed086ad5f17599b5e847b39a480eb41b5d869ac20000372f29cb803638028
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
 * Quelle: src-ts/runtime-executables/ems/modules/tariff-status.ts
 * Quell-Hash: sha256:3fccae2654733e1b4baefeb37594a1e45cb2891f1d027d73fa2871fce4609b69
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/tariff-status.js.
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
 * Aufgabe: Bestimmt aus Tarifdaten und Konfiguration den aktuell für die Energiesteuerung verwendeten Tarifstatus.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/tariff-status.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/tariff-status.js
 *
 * Finalisiert die Tarif-/Speicherstatuskette erst nach der zentralen
 * Speicherregelung. `tarif.statusText` bleibt für den LIVE-Energiefluss bewusst
 * kompakt wie vor RC3. Die vollständige Kette aus Absicht, Resolver, Gate,
 * Hardware-Write und Readback liegt getrennt in `tarif.detailStatusText` und
 * `tarif.statusJson` für die Einstellungs-/Diagnoseansicht.
 */
'use strict';
const { BaseModule } = require('./base');
/**
 * Code-Teil: finiteOrNull
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const finiteOrNull = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' && value.trim() === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
/**
 * Code-Teil: roundedOrNull
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const roundedOrNull = (value) => {
    const n = finiteOrNull(value);
    return n === null ? null : Math.round(n);
};
/**
 * Code-Teil: boolValue
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const boolValue = (value, fallback = false) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'ja', 'on'].includes(normalized))
            return true;
        if (['false', '0', 'no', 'nein', 'off', ''].includes(normalized))
            return false;
    }
    return fallback;
};
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
/**
 * Code-Teil: cleanText
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const cleanText = (value, maxLen = 240) => {
    const text = String(value === undefined || value === null ? '' : value)
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= maxLen)
        return text;
    return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
};
/**
 * Code-Teil: directionOf
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const directionOf = (valueW, deadbandW = 0) => {
    const n = finiteOrNull(valueW);
    if (n === null)
        return 'unknown';
    const deadband = Math.max(0, Number(deadbandW) || 0);
    if (n > deadband)
        return 'discharge';
    if (n < -deadband)
        return 'charge';
    return 'idle';
};
/**
 * Code-Teil: formatPower
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const formatPower = (valueW) => {
    const n = roundedOrNull(valueW);
    if (n === null)
        return '—';
    return `${Math.abs(n)} W`;
};
/**
 * Code-Teil: safeParseJson
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const safeParseJson = (value, fallback = {}) => {
    if (value && typeof value === 'object')
        return value;
    if (typeof value !== 'string' || !value.trim())
        return fallback;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    }
    catch {
        return fallback;
    }
};
/**
 * Code-Teil: containsAny
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const containsAny = (value, terms) => {
    const text = String(value || '').toLowerCase();
    return terms.some((term) => text.includes(term));
};
/**
 * Code-Teil: buildTariffBaseText
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const buildTariffBaseText = (tariff = {}) => {
    const tariffActive = boolValue(tariff.tarifAktiv, false);
    const netFeeActive = boolValue(tariff.netFeeEnabled, false) && String(tariff.netFeeMode || 'off').toLowerCase() !== 'off';
    const mode = Number(tariff.modus) === 2 ? 'Automatik' : (Number(tariff.modus) === 1 ? 'Manuell' : '');
    const stateRaw = String(tariff.state || '').toLowerCase();
    const state = stateRaw === 'guenstig'
        ? 'günstig'
        : (stateRaw === 'teuer'
            ? 'teuer'
            : (stateRaw === 'neutral'
                ? 'neutral'
                : (stateRaw === 'aus' ? 'aus' : 'unbekannt')));
    const price = finiteOrNull(tariff.preisAktuell);
    const priceText = price === null ? '—' : `${price.toFixed(3)} €/kWh`;
    const tariffText = tariffActive
        ? `Tarif${mode ? ` ${mode}` : ''} ${state} (${priceText})`
        : 'Tarif aus';
    return netFeeActive ? `Netzentgelt ${String(tariff.netFeeMode || '').toUpperCase()} | ${tariffText}` : tariffText;
};
/**
 * Code-Teil: buildIntentReason
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const buildIntentReason = (tariff = {}, intentW = 0) => {
    const intentDirection = directionOf(intentW, 0);
    const tariffActive = boolValue(tariff.tarifAktiv, false);
    const netFeeActive = boolValue(tariff.netFeeEnabled, false) && String(tariff.netFeeMode || 'off').toLowerCase() !== 'off';
    const state = String(tariff.state || '').toLowerCase();
    if (!tariffActive && !netFeeActive)
        return 'Tarif und zeitvariables Netzentgelt sind aus';
    if (boolValue(tariff.dynamicTariffStale, false) && tariffActive && !netFeeActive)
        return 'Tarifdaten sind zu alt – keine neue Tarifaktion';
    if (!boolValue(tariff.storageWriterAvailable, true))
        return cleanText(tariff.storageAuthorityReason || 'Kein beschreibbarer Speicher-Ausgang');
    if (boolValue(tariff.gridImportPreferred, false)) {
        if (boolValue(tariff.storageFullHold, false))
            return 'Negativpreis aktiv, SoC-Ladeziel erreicht';
        if (intentDirection === 'charge')
            return 'Negativpreis aktiv – Speicher-Netzladen gewünscht';
        return 'Negativpreis aktiv – Speicher wartet';
    }
    if (boolValue(tariff.storageChargeBlockedByTime, false)) {
        const label = cleanText(tariff.storageChargeWindowLabel || '');
        return label
            ? `Speicher-Netzladen außerhalb des Zeitfensters (${label})`
            : 'Speicher-Netzladen außerhalb des Zeitfensters';
    }
    if (boolValue(tariff.storageFullHold, false))
        return 'SoC-Ladeziel erreicht';
    if (String(tariff.netFeeMode || '').toUpperCase() === 'HT')
        return 'HT – Eigenverbrauch und Entladung bleiben freigegeben';
    if (String(tariff.netFeeMode || '').toUpperCase() === 'NT' && intentDirection === 'charge')
        return 'NT – Speicherladen gewünscht';
    if (state === 'guenstig' && intentDirection === 'charge')
        return 'Günstiger Tarif – Speicherladen gewünscht';
    if (state === 'teuer' && intentDirection === 'discharge')
        return 'Teurer Tarif – Speicherentladung gewünscht';
    if (intentDirection === 'charge')
        return 'Tarif-/Netzentgelt-Policy fordert Laden';
    if (intentDirection === 'discharge')
        return 'Tarif-/Netzentgelt-Policy fordert Entladen';
    return 'Tarif-/Netzentgelt-Policy fordert Warten';
};
/**
 * Code-Teil: buildIntentPart
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const buildIntentPart = (intentW, intentReason) => {
    const direction = directionOf(intentW, 0);
    if (direction === 'charge')
        return `Tarifwunsch Laden ${formatPower(intentW)}`;
    if (direction === 'discharge')
        return `Tarifwunsch Entladen ${formatPower(intentW)}`;
    return `Tarifwunsch Warten${intentReason ? ` (${cleanText(intentReason, 140)})` : ''}`;
};
/**
 * Reine Klassifikation der Tarif-/Speicherstatuskette. Sie wird separat exportiert,
 * damit die Feldfälle ohne ioBroker-Runtime reproduzierbar getestet werden können.
 */
function classifyTariffStorageStatus(input = {}) {
    const active = boolValue(input.active, false);
    const intentW = roundedOrNull(input.intentW) ?? 0;
    const requestW = roundedOrNull(input.requestW) ?? 0;
    const finalW = roundedOrNull(input.finalW) ?? 0;
    const acceptedW = roundedOrNull(input.acceptedW);
    const topology = cleanText(input.topology || 'none', 40).toLowerCase() || 'none';
    const topologyReason = cleanText(input.topologyReason || '', 180);
    const writeStatus = cleanText(input.writeStatus || '', 220);
    const writeStatusLower = writeStatus.toLowerCase();
    const writeOk = boolValue(input.writeOk, false);
    const commandEffective = boolValue(input.commandEffective, false);
    const requestSatisfied = boolValue(input.requestSatisfied, false);
    const partiallyAccepted = boolValue(input.partiallyAccepted, false)
        || containsAny(writeStatusLower, ['farm-partial', 'partial']);
    const actualW = roundedOrNull(input.actualW);
    const actualAgeMs = roundedOrNull(input.actualAgeMs);
    const actualTrusted = boolValue(input.actualTrusted, false);
    const readbackDeadbandW = clamp(Math.round(Number(input.readbackDeadbandW) || 100), 0, 5000);
    const readbackGraceMs = clamp(Math.round(Number(input.readbackGraceMs) || 20000), 0, 300000);
    const readbackMaxAgeMs = clamp(Math.round(Number(input.readbackMaxAgeMs) || 30000), 1000, 600000);
    const targetAgeMs = Math.max(0, Math.round(Number(input.targetAgeMs) || 0));
    // `finalW` ist die fachlich angeforderte Leistung nach Policy/Safety. Für
    // Readback und Status zählt dagegen ausschließlich die durch den Writer
    // akzeptierte Leistung. Bei einer teilweisen Farmausführung darf ein
    // angeforderter 900-W-Befehl mit nur 400 W akzeptierter Leistung niemals als
    // vollständige 900-W-Wirkung erscheinen.
    const effectiveTargetW = commandEffective && acceptedW !== null ? acceptedW : finalW;
    const finalDirection = directionOf(effectiveTargetW, 0);
    const actualDirection = directionOf(actualW, readbackDeadbandW);
    const intentDirection = directionOf(intentW, 0);
    const noWriter = topology === 'none'
        || containsAny(writeStatusLower, ['deaktiviert', 'kein-aktiver-speicher-ausgang']);
    const blocked = !noWriter && (containsAny(writeStatusLower, [
        'blockiert',
        'blocked',
        'authority',
        'dp-zuordnung-konflikt',
        'zielrichtung-nicht-gemappt',
        'farm-nicht-moeglich',
        'nicht möglich',
        'nicht moeglich',
        'gesperrt',
    ])
        || boolValue(input.farmAuthorityBlocked, false));
    const hold = !noWriter && !blocked && containsAny(writeStatusLower, ['no-write', 'hold']);
    const retained = !noWriter && !blocked && writeStatusLower === 'unverändert';
    const writeAccepted = !noWriter && !blocked && !hold && (commandEffective || writeOk || retained);
    const writeFailed = !noWriter && !blocked && !hold && !writeAccepted;
    const feedbackFresh = actualW !== null
        && actualTrusted
        && (actualAgeMs === null || actualAgeMs <= readbackMaxAgeMs);
    let readbackStatus = 'not-evaluated';
    if (!feedbackFresh) {
        readbackStatus = 'no-fresh-feedback';
    }
    else if (finalDirection === 'charge') {
        if (actualDirection === 'charge')
            readbackStatus = 'confirmed-charging';
        else if (targetAgeMs < readbackGraceMs)
            readbackStatus = 'pending-charging';
        else if (actualDirection === 'idle')
            readbackStatus = 'no-charge-response';
        else
            readbackStatus = 'opposite-direction';
    }
    else if (finalDirection === 'discharge') {
        if (actualDirection === 'discharge')
            readbackStatus = 'confirmed-discharging';
        else if (targetAgeMs < readbackGraceMs)
            readbackStatus = 'pending-discharging';
        else if (actualDirection === 'idle')
            readbackStatus = 'no-discharge-response';
        else
            readbackStatus = 'opposite-direction';
    }
    else if (actualDirection === 'idle') {
        readbackStatus = 'confirmed-stop';
    }
    else if (targetAgeMs < readbackGraceMs) {
        readbackStatus = 'stop-pending';
    }
    else {
        readbackStatus = 'stop-not-reached';
    }
    let gateStatus = 'accepted';
    if (noWriter)
        gateStatus = 'no-writer';
    else if (blocked)
        gateStatus = 'blocked';
    else if (hold)
        gateStatus = 'hold';
    else if (writeFailed)
        gateStatus = 'write-failed';
    else if (partiallyAccepted || !requestSatisfied)
        gateStatus = 'partial';
    let status = 'inactive';
    if (active) {
        if (noWriter)
            status = 'no-writer';
        else if (blocked)
            status = 'blocked';
        else if (hold)
            status = 'hold';
        else if (writeFailed)
            status = 'write-failed';
        else if (finalDirection === 'charge') {
            if (readbackStatus === 'confirmed-charging')
                status = 'charging';
            else if (['no-charge-response', 'opposite-direction'].includes(readbackStatus))
                status = 'mismatch';
            else
                status = 'charge-requested';
        }
        else if (finalDirection === 'discharge') {
            if (readbackStatus === 'confirmed-discharging')
                status = 'discharging';
            else if (['no-discharge-response', 'opposite-direction'].includes(readbackStatus))
                status = 'mismatch';
            else
                status = 'discharge-requested';
        }
        else if (readbackStatus === 'confirmed-stop')
            status = 'waiting';
        else if (readbackStatus === 'stop-not-reached')
            status = 'stop-not-reached';
        else
            status = 'stop-requested';
    }
    const farmTargetW = roundedOrNull(input.farmTargetW);
    const farmPlannedW = roundedOrNull(input.farmPlannedW);
    const farmDeliveredW = roundedOrNull(input.farmDeliveredW);
    const farmFailedW = roundedOrNull(input.farmFailedW);
    const farmUnservedW = roundedOrNull(input.farmUnservedW);
    const farmPartial = topology === 'farm'
        && (partiallyAccepted
            || (farmTargetW !== null
                && farmDeliveredW !== null
                && Math.abs(farmTargetW - farmDeliveredW) > Math.max(1, readbackDeadbandW))
            || (farmFailedW !== null && Math.abs(farmFailedW) > 0)
            || (farmUnservedW !== null && Math.abs(farmUnservedW) > 0));
    return {
        active,
        intentW,
        intentDirection,
        requestW,
        finalW,
        acceptedW,
        effectiveTargetW,
        finalDirection,
        topology,
        topologyReason,
        writeOk,
        commandEffective,
        requestSatisfied,
        partiallyAccepted,
        writeStatus,
        writeAccepted,
        writeFailed,
        gateStatus,
        actualW,
        actualDirection,
        actualAgeMs,
        actualTrusted,
        feedbackFresh,
        readbackStatus,
        readbackDeadbandW,
        readbackGraceMs,
        readbackMaxAgeMs,
        targetAgeMs,
        status,
        farmTargetW,
        farmPlannedW,
        farmDeliveredW,
        farmFailedW,
        farmUnservedW,
        farmPartial,
    };
}
/**
 * Code-Teil: buildEffectiveStorageText
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const buildEffectiveStorageText = (result, context = {}) => {
    const reason = cleanText(context.finalReason || context.requestReason || context.topologyReason || result.writeStatus, 180);
    const source = cleanText(context.finalSource || context.requestSource || '', 80);
    const detailParts = [];
    if (source)
        detailParts.push(`Quelle ${source}`);
    if (reason)
        detailParts.push(reason);
    const detail = detailParts.length ? `; ${detailParts.join(' – ')}` : '';
    if (result.status === 'no-writer') {
        return `kein aktiver beschreibbarer Speicher-Ausgang${result.topologyReason ? ` (${result.topologyReason})` : ''}`;
    }
    if (result.status === 'blocked') {
        return `Speicherbefehl blockiert${reason ? `: ${reason}` : (result.writeStatus ? `: ${result.writeStatus}` : '')}`;
    }
    if (result.status === 'hold') {
        return `Speichervorgabe wird bewusst gehalten${reason ? `: ${reason}` : ''}`;
    }
    if (result.status === 'write-failed') {
        return `Speicherbefehl nicht geschrieben${result.writeStatus ? ` (${result.writeStatus})` : ''}${reason ? `: ${reason}` : ''}`;
    }
    const farmSuffix = result.topology === 'farm' && result.farmTargetW !== null && result.farmDeliveredW !== null
        ? `; Farm angefordert ${formatPower(result.farmTargetW)}${result.farmPlannedW !== null ? `, geplant ${formatPower(result.farmPlannedW)}` : ''}, akzeptiert ${formatPower(result.farmDeliveredW)}${result.farmFailedW ? `, Write-Fehler ${formatPower(result.farmFailedW)}` : ''}${result.farmUnservedW ? `, nicht verteilbar ${formatPower(result.farmUnservedW)}` : ''}`
        : '';
    const requestedVsAccepted = result.writeAccepted
        && result.acceptedW !== null
        && Math.abs(result.finalW - result.acceptedW) > Math.max(1, result.readbackDeadbandW)
        ? `; angefordert ${formatPower(result.finalW)}, akzeptiert ${formatPower(result.acceptedW)}`
        : '';
    if (result.finalDirection === 'charge') {
        if (result.readbackStatus === 'confirmed-charging') {
            return `Speicher lädt ${formatPower(result.actualW)} (wirksames Soll ${formatPower(result.effectiveTargetW)}; Richtung bestätigt${requestedVsAccepted}${detail})${farmSuffix}`;
        }
        if (result.readbackStatus === 'no-fresh-feedback') {
            return `Laden ${formatPower(result.effectiveTargetW)} wirksam – keine frische Istwert-Rückmeldung${requestedVsAccepted}${detail}${farmSuffix}`;
        }
        if (result.readbackStatus === 'pending-charging') {
            return `Laden ${formatPower(result.effectiveTargetW)} wirksam – Rückmeldung ausstehend${requestedVsAccepted}${detail}${farmSuffix}`;
        }
        return `Laden ${formatPower(result.effectiveTargetW)} wirksam – Istwert ${result.actualW === null ? '—' : `${result.actualW} W`} bestätigt die Richtung nicht${requestedVsAccepted}${detail}${farmSuffix}`;
    }
    if (result.finalDirection === 'discharge') {
        if (result.readbackStatus === 'confirmed-discharging') {
            return `Speicher entlädt ${formatPower(result.actualW)} (wirksames Soll ${formatPower(result.effectiveTargetW)}; Richtung bestätigt${requestedVsAccepted}${detail})${farmSuffix}`;
        }
        if (result.readbackStatus === 'no-fresh-feedback') {
            return `Entladen ${formatPower(result.effectiveTargetW)} wirksam – keine frische Istwert-Rückmeldung${requestedVsAccepted}${detail}${farmSuffix}`;
        }
        if (result.readbackStatus === 'pending-discharging') {
            return `Entladen ${formatPower(result.effectiveTargetW)} wirksam – Rückmeldung ausstehend${requestedVsAccepted}${detail}${farmSuffix}`;
        }
        return `Entladen ${formatPower(result.effectiveTargetW)} wirksam – Istwert ${result.actualW === null ? '—' : `${result.actualW} W`} bestätigt die Richtung nicht${requestedVsAccepted}${detail}${farmSuffix}`;
    }
    if (result.readbackStatus === 'confirmed-stop') {
        return `Speicher wartet/ruht (0 W bestätigt${detail})${farmSuffix}`;
    }
    if (result.readbackStatus === 'no-fresh-feedback') {
        return `Stopp/Warten (0 W) angefordert – keine frische Istwert-Rückmeldung${detail}${farmSuffix}`;
    }
    if (result.readbackStatus === 'stop-pending') {
        return `Stopp/Warten (0 W) angefordert – Istwert läuft noch aus${detail}${farmSuffix}`;
    }
    return `Stopp/Warten (0 W) angefordert – Istwert ${result.actualW === null ? '—' : `${result.actualW} W`} noch nicht gestoppt${detail}${farmSuffix}`;
};
/** Kompakter, aber weiterhin wahrheitsgetreuer Text für die LIVE-Infozeile. */
const buildCompactStorageText = (result) => {
    switch (result.status) {
        case 'charging': return 'Speicher lädt';
        case 'discharging': return 'Speicher entlädt';
        case 'charge-requested': return 'Speicher-Laden angefordert';
        case 'discharge-requested': return 'Speicher-Entladen angefordert';
        case 'waiting': return 'Speicher wartet';
        case 'stop-requested': return 'Speicher-Stopp angefordert';
        case 'stop-not-reached': return 'Speicher-Stopp noch nicht bestätigt';
        case 'mismatch': return 'Speicher-Rückmeldung abweichend';
        case 'blocked': return 'Speicher gesperrt';
        case 'write-failed': return 'Speicher-Schreiben fehlgeschlagen';
        case 'hold': return 'Speicher hält Vorgabe';
        case 'no-writer': return 'Kein Speicher-Ausgang';
        default: return '';
    }
};
/**
 * Code-Teil: buildCompactEvcsText
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const buildCompactEvcsText = (tariff = {}) => {
    return boolValue(tariff.gridChargeAllowed, true)
        ? 'EVCS Netzladen freigegeben'
        : 'EVCS Netzladen gesperrt (PV möglich)';
};
/**
 * Code-Teil: TariffStatusModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class TariffStatusModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this.adapter = adapter;
        this.dp = dpRegistry;
        this._lastTargetSignature = '';
        this._targetSinceMs = 0;
    }
    async init() {
        await this.adapter.setObjectNotExistsAsync('tarif', {
            type: 'channel',
            common: { name: 'Tarif' },
            native: {},
        });
/**
 * Code-Teil: mk
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };
        await mk('tarif.statusText', 'Tarif Status – kompakte LIVE-Info', 'string', 'text');
        await mk('tarif.detailStatusText', 'Tarif Status – vollständige Steuerkette', 'string', 'text');
        await mk('tarif.intentStatusText', 'Tarif Absicht – vor Resolver/Gates', 'string', 'text');
        await mk('tarif.intentSnapshotAgeMs', 'Alter des Tarif-Policy-Snapshots (ms)', 'number', 'value.interval');
        await mk('tarif.intentSnapshotFresh', 'Tarif-Policy-Snapshot frisch', 'boolean', 'indicator');
        await mk('tarif.speicherIntentW', 'Tarif Speicher-Absicht (W)', 'number', 'value.power');
        await mk('tarif.speicherIntentStatus', 'Tarif Speicher-Absicht Status', 'string', 'text');
        await mk('tarif.speicherIntentGrund', 'Tarif Speicher-Absicht Grund', 'string', 'text');
        await mk('tarif.speicherRequestW', 'Speicher Request vor finaler Begrenzung (W)', 'number', 'value.power');
        await mk('tarif.speicherRequestQuelle', 'Speicher Request Quelle', 'string', 'text');
        await mk('tarif.speicherRequestGrund', 'Speicher Request Grund', 'string', 'text');
        await mk('tarif.speicherFinalW', 'Wirksamer Speicher-Sollwert (W)', 'number', 'value.power');
        await mk('tarif.speicherAcceptedW', 'Vom Hardwarewriter akzeptierter Speicher-Sollwert (W)', 'number', 'value.power');
        await mk('tarif.speicherFinalQuelle', 'Wirksamer Speicher-Sollwert Quelle', 'string', 'text');
        await mk('tarif.speicherFinalGrund', 'Wirksamer Speicher-Sollwert Grund', 'string', 'text');
        await mk('tarif.speicherTopologie', 'Wirksame Speicher-Topologie', 'string', 'text');
        await mk('tarif.speicherGateStatus', 'Speicher Gate-/Write-Klassifikation', 'string', 'text');
        await mk('tarif.speicherWriteOk', 'Speicher Write erfolgreich', 'boolean', 'indicator');
        await mk('tarif.speicherCommandEffective', 'Speicherbefehl wirksam/weiter gültig', 'boolean', 'indicator');
        await mk('tarif.speicherRequestSatisfied', 'Speicheranforderung vollständig akzeptiert', 'boolean', 'indicator');
        await mk('tarif.speicherPartiallyAccepted', 'Speicheranforderung teilweise akzeptiert', 'boolean', 'indicator');
        await mk('tarif.speicherWriteStatus', 'Speicher Write Rohstatus', 'string', 'text');
        await mk('tarif.speicherReadbackW', 'Speicher Istleistung für Status (W)', 'number', 'value.power');
        await mk('tarif.speicherReadbackAgeMs', 'Alter Speicher-Istleistung (ms)', 'number', 'value.interval');
        await mk('tarif.speicherReadbackFresh', 'Speicher Istleistung frisch und vertrauenswürdig', 'boolean', 'indicator');
        await mk('tarif.speicherReadbackStatus', 'Speicher Readback Status', 'string', 'text');
        await mk('tarif.speicherStatus', 'Tatsächlicher Tarif-Speicherstatus', 'string', 'text');
        await mk('tarif.speicherFarmDeliveredW', 'Farm tatsächlich verteilter Sollwert (W)', 'number', 'value.power');
        await mk('tarif.speicherFarmPlannedW', 'Farm geplant verteilter Sollwert (W)', 'number', 'value.power');
        await mk('tarif.speicherFarmFailedW', 'Farm wegen Write-Fehler nicht akzeptierte Leistung (W)', 'number', 'value.power');
        await mk('tarif.speicherFarmUnservedW', 'Farm nicht verteilbarer Rest (W)', 'number', 'value.power');
        await mk('tarif.statusJson', 'Tarif-/Speicher-Steuerkette (JSON)', 'string', 'json');
    }
    _getStatusConfig() {
        const root = this.adapter && this.adapter.config ? this.adapter.config : {};
        const cfg = root && root.tariffStatus && typeof root.tariffStatus === 'object' ? root.tariffStatus : {};
        const storageCfg = root && root.storageControl && typeof root.storageControl === 'object'
            ? root.storageControl
            : (root && root.storage && typeof root.storage === 'object' ? root.storage : {});
        const fallbackStaleSec = finiteOrNull(storageCfg.staleTimeoutSec) ?? 30;
        return {
            intentMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.intentMaxAgeSec) ?? 5) * 1000), 1000, 60000),
            readbackDeadbandW: clamp(Math.round(finiteOrNull(cfg.readbackDeadbandW) ?? 100), 0, 5000),
            readbackGraceMs: clamp(Math.round((finiteOrNull(cfg.readbackGraceSec) ?? 20) * 1000), 0, 300000),
            readbackMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.readbackMaxAgeSec) ?? fallbackStaleSec) * 1000), 1000, 600000),
        };
    }
    async _readValues(ids) {
        const out = {};
        await Promise.all(ids.map(async (id) => {
            try {
                const state = await this.adapter.getStateAsync(id);
                out[id] = state ? state.val : null;
            }
            catch {
                out[id] = null;
            }
        }));
        return out;
    }
    async tick() {
        try {
            const tariff = this.adapter && this.adapter._tarifVis && typeof this.adapter._tarifVis === 'object'
                ? { ...this.adapter._tarifVis }
                : {};
            const ids = [
                'tarif.aktiv',
                'speicher.regelung.topologie',
                'speicher.regelung.topologieGrund',
                'speicher.regelung.requestW',
                'speicher.regelung.requestQuelle',
                'speicher.regelung.requestGrund',
                'speicher.regelung.sollW',
                'speicher.regelung.acceptedSollW',
                'speicher.regelung.quelle',
                'speicher.regelung.grund',
                'speicher.regelung.schreibOk',
                'speicher.regelung.commandEffective',
                'speicher.regelung.requestSatisfied',
                'speicher.regelung.partiallyAccepted',
                'speicher.regelung.schreibStatus',
                'speicher.regelung.farmRequestedW',
                'speicher.regelung.farmPlannedW',
                'speicher.regelung.farmAcceptedW',
                'speicher.regelung.farmFailedW',
                'speicher.regelung.farmUnservedW',
                'speicher.regelung.farmStatus',
                'speicher.regelung.batteryPowerFeedbackMeasuredW',
                'speicher.regelung.batteryPowerFeedbackAgeMs',
                'speicher.regelung.batteryPowerBalanceTrusted',
                'speicher.regelung.batteryPowerTrusted',
                'speicher.regelung.zeroWriteFirewallAction',
                'speicher.regelung.zeroWriteFirewallReason',
                'speicher.regelung.zeroWriteFirewallExplicitStop',
                'storageFarm.totalPowerW',
                'storageFarm.lastDispatchJson',
            ];
            const states = await this._readValues(ids);
            const now = Date.now();
            const statusCfg = this._getStatusConfig();
            const tariffSnapshotTs = roundedOrNull(tariff.ts);
            const tariffSnapshotAgeMs = tariffSnapshotTs === null ? null : Math.max(0, now - tariffSnapshotTs);
            const tariffSnapshotFresh = tariffSnapshotAgeMs !== null && tariffSnapshotAgeMs <= statusCfg.intentMaxAgeMs;
            const active = boolValue(tariff.aktiv, boolValue(states['tarif.aktiv'], false));
            const intentW = tariffSnapshotFresh ? (roundedOrNull(tariff.speicherSollW) ?? 0) : 0;
            const intentStatus = tariffSnapshotFresh
                ? cleanText(tariff.storageIntentStatus || directionOf(intentW, 0), 40)
                : (active ? 'stale' : 'inactive');
            const intentReason = tariffSnapshotFresh
                ? cleanText(tariff.storageIntentReason || buildIntentReason(tariff, intentW), 220)
                : (active ? 'Tarif-Policy-Snapshot ist veraltet – keine aktuelle Tarifabsicht' : 'Tarif und zeitvariables Netzentgelt sind aus');
            const intentStatusText = tariffSnapshotFresh ? cleanText(tariff.intentStatusText || '', 700) : '';
            const topology = cleanText(states['speicher.regelung.topologie'] || tariff.storageTopology || 'none', 40).toLowerCase();
            const topologyReason = cleanText(states['speicher.regelung.topologieGrund'] || tariff.storageAuthorityReason || '', 220);
            const requestW = roundedOrNull(states['speicher.regelung.requestW']) ?? 0;
            const requestSource = cleanText(states['speicher.regelung.requestQuelle'] || '', 100);
            const requestReason = cleanText(states['speicher.regelung.requestGrund'] || '', 260);
            const finalW = roundedOrNull(states['speicher.regelung.sollW']) ?? 0;
            const acceptedW = roundedOrNull(states['speicher.regelung.acceptedSollW']);
            const finalSource = cleanText(states['speicher.regelung.quelle'] || '', 100);
            const finalReason = cleanText(states['speicher.regelung.grund'] || '', 260);
            const writeOk = boolValue(states['speicher.regelung.schreibOk'], false);
            const commandEffective = boolValue(states['speicher.regelung.commandEffective'], false);
            const requestSatisfied = boolValue(states['speicher.regelung.requestSatisfied'], false);
            const partiallyAccepted = boolValue(states['speicher.regelung.partiallyAccepted'], false);
            const writeStatus = cleanText(states['speicher.regelung.schreibStatus'] || '', 240);
            const zeroAction = cleanText(states['speicher.regelung.zeroWriteFirewallAction'] || '', 100);
            const zeroReason = cleanText(states['speicher.regelung.zeroWriteFirewallReason'] || '', 220);
            const zeroExplicitStop = boolValue(states['speicher.regelung.zeroWriteFirewallExplicitStop'], false);
            let actualW = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackMeasuredW']);
            if (actualW === null && topology === 'farm')
                actualW = roundedOrNull(states['storageFarm.totalPowerW']);
            const actualAgeMs = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackAgeMs']);
            const actualTrusted = boolValue(states['speicher.regelung.batteryPowerBalanceTrusted'], false)
                || boolValue(states['speicher.regelung.batteryPowerTrusted'], false);
            const farmDispatch = safeParseJson(states['storageFarm.lastDispatchJson'], {});
            const farmDispatchTs = roundedOrNull(farmDispatch && farmDispatch.ts);
            const farmDispatchAgeMs = farmDispatchTs === null ? null : Math.max(0, now - farmDispatchTs);
            const farmDispatchFresh = topology === 'farm'
                && farmDispatchAgeMs !== null
                && farmDispatchAgeMs <= Math.max(5000, Math.min(30000, statusCfg.readbackMaxAgeMs));
            const farmRequestedStateW = roundedOrNull(states['speicher.regelung.farmRequestedW']);
            const farmPlannedStateW = roundedOrNull(states['speicher.regelung.farmPlannedW']);
            const farmAcceptedStateW = roundedOrNull(states['speicher.regelung.farmAcceptedW']);
            const farmFailedStateW = roundedOrNull(states['speicher.regelung.farmFailedW']);
            const farmUnservedStateW = roundedOrNull(states['speicher.regelung.farmUnservedW']);
            const farmStatus = cleanText(states['speicher.regelung.farmStatus'] || '', 120);
            const rawFarmTargetW = farmRequestedStateW ?? roundedOrNull(farmDispatch && (farmDispatch.requestedW ?? farmDispatch.targetW));
            const farmDispatchMatchesTarget = farmDispatchFresh
                && rawFarmTargetW !== null
                && Math.abs(rawFarmTargetW - finalW) <= 1;
            const farmTargetW = farmDispatchMatchesTarget ? rawFarmTargetW : null;
            const farmPlannedW = farmDispatchMatchesTarget
                ? (farmPlannedStateW ?? roundedOrNull(farmDispatch && farmDispatch.plannedDeliveredW))
                : null;
            const farmDeliveredW = farmDispatchMatchesTarget
                ? (farmAcceptedStateW ?? roundedOrNull(farmDispatch && (farmDispatch.acceptedDeliveredW ?? farmDispatch.deliveredW)))
                : null;
            const farmFailedW = farmDispatchMatchesTarget
                ? (farmFailedStateW ?? roundedOrNull(farmDispatch && farmDispatch.failedW))
                : null;
            const farmUnservedW = farmDispatchMatchesTarget
                ? (farmUnservedStateW ?? roundedOrNull(farmDispatch && farmDispatch.unservedW))
                : null;
            const farmAuthorityBlocked = !!(farmDispatchMatchesTarget
                && Array.isArray(farmDispatch.results)
                && farmDispatch.results.some((row) => row && row.authorityBlocked === true));
            const writeStatusLower = writeStatus.toLowerCase();
            const commandPhase = commandEffective || writeOk || writeStatusLower === 'unverändert'
                ? 'effective'
                : (containsAny(writeStatusLower, ['no-write', 'hold'])
                    ? 'hold'
                    : (containsAny(writeStatusLower, ['blockiert', 'blocked', 'authority', 'konflikt', 'nicht-moeglich', 'nicht möglich', 'nicht moeglich', 'gesperrt'])
                        ? 'blocked'
                        : 'not-effective'));
            const statusTargetW = commandEffective && acceptedW !== null ? acceptedW : finalW;
            const targetSignature = `${topology}|${directionOf(statusTargetW, 0)}|${Math.round(statusTargetW)}|${commandPhase}|${partiallyAccepted ? 'partial' : 'full'}`;
            if (targetSignature !== this._lastTargetSignature || !this._targetSinceMs) {
                this._lastTargetSignature = targetSignature;
                this._targetSinceMs = now;
            }
            const targetAgeMs = Math.max(0, now - this._targetSinceMs);
            const result = classifyTariffStorageStatus({
                active,
                intentW,
                requestW,
                finalW,
                acceptedW,
                topology,
                topologyReason,
                writeOk,
                commandEffective,
                requestSatisfied,
                partiallyAccepted,
                writeStatus,
                actualW,
                actualAgeMs,
                actualTrusted,
                targetAgeMs,
                farmTargetW,
                farmPlannedW,
                farmDeliveredW,
                farmFailedW,
                farmUnservedW,
                farmAuthorityBlocked,
                ...statusCfg,
            });
            const baseText = tariffSnapshotFresh ? buildTariffBaseText(tariff) : (active ? 'Tarifstatus veraltet' : 'Tarif aus');
            const intentPart = buildIntentPart(intentW, intentReason);
            const effectivePart = buildEffectiveStorageText(result, {
                finalSource,
                finalReason,
                requestSource,
                requestReason,
                topologyReason,
            });
            const detailStatusText = active ? `${baseText}: ${intentPart} → ${effectivePart}` : '';
            const compactParts = [buildCompactStorageText(result), buildCompactEvcsText(tariff)].filter(Boolean);
            const statusText = active ? `${baseText}: ${compactParts.join(' + ')}` : '';
            await this._setIfChanged('tarif.intentStatusText', intentStatusText || (active ? `${baseText}: ${intentPart}` : ''));
            await this._setIfChanged('tarif.intentSnapshotAgeMs', tariffSnapshotAgeMs);
            await this._setIfChanged('tarif.intentSnapshotFresh', tariffSnapshotFresh);
            await this._setIfChanged('tarif.speicherIntentW', intentW);
            await this._setIfChanged('tarif.speicherIntentStatus', intentStatus);
            await this._setIfChanged('tarif.speicherIntentGrund', intentReason);
            await this._setIfChanged('tarif.speicherRequestW', requestW);
            await this._setIfChanged('tarif.speicherRequestQuelle', requestSource);
            await this._setIfChanged('tarif.speicherRequestGrund', requestReason);
            await this._setIfChanged('tarif.speicherFinalW', finalW);
            await this._setIfChanged('tarif.speicherAcceptedW', acceptedW);
            await this._setIfChanged('tarif.speicherFinalQuelle', finalSource);
            await this._setIfChanged('tarif.speicherFinalGrund', finalReason);
            await this._setIfChanged('tarif.speicherTopologie', topology);
            await this._setIfChanged('tarif.speicherGateStatus', result.gateStatus);
            await this._setIfChanged('tarif.speicherWriteOk', writeOk);
            await this._setIfChanged('tarif.speicherCommandEffective', result.writeAccepted);
            await this._setIfChanged('tarif.speicherRequestSatisfied', requestSatisfied);
            await this._setIfChanged('tarif.speicherPartiallyAccepted', partiallyAccepted);
            await this._setIfChanged('tarif.speicherWriteStatus', writeStatus);
            await this._setIfChanged('tarif.speicherReadbackW', actualW);
            await this._setIfChanged('tarif.speicherReadbackAgeMs', actualAgeMs);
            await this._setIfChanged('tarif.speicherReadbackFresh', result.feedbackFresh);
            await this._setIfChanged('tarif.speicherReadbackStatus', result.readbackStatus);
            await this._setIfChanged('tarif.speicherStatus', result.status);
            await this._setIfChanged('tarif.speicherFarmDeliveredW', farmDeliveredW);
            await this._setIfChanged('tarif.speicherFarmPlannedW', farmPlannedW);
            await this._setIfChanged('tarif.speicherFarmFailedW', farmFailedW);
            await this._setIfChanged('tarif.speicherFarmUnservedW', farmUnservedW);
            await this._setIfChanged('tarif.statusText', statusText);
            await this._setIfChanged('tarif.detailStatusText', detailStatusText);
            const statusJson = {
                ts: now,
                active,
                baseText,
                intent: {
                    snapshotTs: tariffSnapshotTs,
                    snapshotAgeMs: tariffSnapshotAgeMs,
                    snapshotFresh: tariffSnapshotFresh,
                    snapshotMaxAgeMs: statusCfg.intentMaxAgeMs,
                    targetW: intentW,
                    status: intentStatus,
                    reason: intentReason,
                    text: intentStatusText || (active ? `${baseText}: ${intentPart}` : ''),
                },
                resolver: {
                    requestW,
                    requestSource,
                    requestReason,
                    finalW,
                    acceptedW,
                    effectiveTargetW: result.effectiveTargetW,
                    finalSource,
                    finalReason,
                    topology,
                    topologyReason,
                },
                gate: {
                    status: result.gateStatus,
                    zeroWriteFirewallAction: zeroAction,
                    zeroWriteFirewallReason: zeroReason,
                    zeroWriteFirewallExplicitStop: zeroExplicitStop,
                },
                write: {
                    ok: writeOk,
                    commandEffective: result.writeAccepted,
                    requestSatisfied,
                    partiallyAccepted,
                    status: writeStatus,
                },
                farm: topology === 'farm' ? {
                    dispatchTs: farmDispatchTs,
                    dispatchAgeMs: farmDispatchAgeMs,
                    dispatchFresh: farmDispatchFresh,
                    matchesFinalTarget: farmDispatchMatchesTarget,
                    targetW: farmTargetW,
                    plannedW: farmPlannedW,
                    deliveredW: farmDeliveredW,
                    acceptedW: farmDeliveredW,
                    failedW: farmFailedW,
                    unservedW: farmUnservedW,
                    partial: result.farmPartial,
                    status: farmStatus,
                    authorityBlocked: farmAuthorityBlocked,
                } : null,
                readback: {
                    powerW: actualW,
                    ageMs: actualAgeMs,
                    trusted: actualTrusted,
                    fresh: result.feedbackFresh,
                    status: result.readbackStatus,
                    deadbandW: result.readbackDeadbandW,
                    graceMs: result.readbackGraceMs,
                    maxAgeMs: result.readbackMaxAgeMs,
                    targetAgeMs,
                },
                effective: {
                    status: result.status,
                    statusText,
                    detailStatusText,
                },
            };
            await this._setIfChanged('tarif.statusJson', JSON.stringify(statusJson));
            this.adapter._tariffStatus = statusJson;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (this.adapter && this.adapter.log && typeof this.adapter.log.warn === 'function') {
                this.adapter.log.warn(`[TariffStatus] Fehler in tick(): ${message}`);
            }
        }
    }
    async _setIfChanged(id, value) {
        const nextValue = value === undefined ? null : value;
        try {
            const current = await this.adapter.getStateAsync(id);
            if (current && current.val === nextValue)
                return;
            await this.adapter.setStateAsync(id, nextValue, true);
        }
        catch {
            // Diagnose darf den EMS-Regelzyklus nicht blockieren.
        }
    }
}
module.exports = {
    TariffStatusModule,
    classifyTariffStorageStatus,
    buildTariffBaseText,
    buildIntentReason,
    buildCompactStorageText,
};
