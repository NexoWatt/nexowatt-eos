// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/station-display-presentation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/station-display-presentation.js
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
 * Original-Hash: c0d9cf757b5dc356940197fd2cf713f3a42db5d0eba5f07f6f96828670717d7f
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
 * Quelle: src-ts/runtime-executables/lib/station-display-presentation.ts
 * Quell-Hash: sha256:8f2e0c545c0a1c75f1faac67d74dd0719b8854999130e0dd52d20014bcc0b32c
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/station-display-presentation.js.
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
 * Aufgabe: Bereitet Ladepunkt-Zustände und Entscheidungsgründe für eine konsistente Stationsanzeige auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/station-display-presentation.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * Code-Teil: buildStationDisplayPresentation
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildStationDisplayPresentation(input) {
    const connectors = Array.isArray(input.connectors) ? input.connectors.filter(Boolean) : [];
    const chargingConnectors = connectors.filter((entry) => entry.charging === true);
    const connectedConnectors = connectors.filter((entry) => entry.plugged === true);
    const onlineConnectors = connectors.filter((entry) => entry.online === true && entry.meterStale !== true);
    const goalConnectors = connectors.filter((entry) => entry.controls?.goalEnabled === true);
    const goalOverrideConnectors = goalConnectors.filter((entry) => entry.controls?.goalTariffOverride === true);
    const activeModes = [...new Set(connectors
            .filter((entry) => entry.controls?.userEnabled !== false)
            .map((entry) => String(entry.controls?.userMode || entry.mode || 'auto').trim().toLowerCase())
            .filter(Boolean))];
    const warnings = [];
/**
 * Code-Teil: addWarning
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const addWarning = (level, title, message, lp) => {
        const normalizedLevel = level === 'error' ? 'error' : (level === 'info' ? 'info' : 'warning');
        const item = {
            level: normalizedLevel,
            title: String(title || '').trim(),
            message: String(message || '').trim(),
            ...(lp ? { lp: String(lp) } : {}),
        };
        const signature = `${item.level}|${item.title}|${item.message}|${item.lp || ''}`;
        if (!warnings.some((entry) => `${entry.level}|${entry.title}|${entry.message}|${entry.lp || ''}` === signature))
            warnings.push(item);
    };
    if (input.runtime?.displayOnline !== true)
        addWarning('error', 'Stationsdisplay offline', input.runtime?.warning || 'Kein aktueller Display-Heartbeat.');
    if (input.station?.maintenanceMode === true)
        addWarning('warning', 'Wartungsmodus aktiv', 'Bedienbefehle der Stationsseite sind gesperrt.');
    if (!input.globalControlActive)
        addWarning('warning', 'Laderegelung deaktiviert', input.globalControlStatus || 'Die zentrale Ladeoptimierung ist ausgeschaltet.');
    if (input.staleMeter)
        addWarning('error', 'Netzmesswert veraltet', 'Die Ladeleistung wird aus Sicherheitsgründen eingeschränkt.');
    if (input.staleBudget)
        addWarning('warning', 'Leistungsbudget veraltet', 'Das letzte sichere Budget wird nur begrenzt weiterverwendet.');
    if (input.failsafeDetails)
        addWarning('error', 'Safety-Freigabe eingeschränkt', input.failsafeDetails);
    if (input.tariffActive && !input.tariffFresh)
        addWarning('warning', 'Tarifdaten veraltet', 'Wirtschaftliche Tarifentscheidungen arbeiten fail-closed.');
    for (const entry of connectors) {
        const lpName = String(entry.name || entry.id || 'Ladepunkt');
        if (!entry.online || entry.status === 'offline')
            addWarning('error', `${lpName} offline`, entry.statusDetail || 'Keine sichere Kommunikation zum Ladepunkt.', entry.id);
        else if (entry.faultActive || entry.status === 'error')
            addWarning('error', `${lpName}: Störung`, entry.faultReason || entry.statusDetail || 'Der Ladepunkt meldet einen Fehler.', entry.id);
        else if (entry.unavailableActive || entry.status === 'unavailable')
            addWarning('warning', `${lpName} nicht verfügbar`, entry.unavailableReason || entry.statusDetail || 'Der Ladepunkt ist momentan nicht betriebsbereit.', entry.id);
        if (entry.meterStale)
            addWarning('warning', `${lpName}: Messwert veraltet`, 'Die Leistungsrückmeldung ist nicht aktuell.', entry.id);
        const issues = Array.isArray(entry.diagnostics?.mappingIssues) ? entry.diagnostics.mappingIssues : [];
        if (issues.length)
            addWarning('warning', `${lpName}: Zuordnung prüfen`, issues.slice(0, 3).map(String).join(', '), entry.id);
        if (entry.diagnostics?.hardwareCommandConfirmed === false) {
            addWarning('warning', `${lpName}: Stellwert noch nicht bestätigt`, entry.diagnostics.hardwareCommandState || entry.diagnostics.applyStatus || 'Die Hardware-Rückmeldung steht aus.', entry.id);
        }
    }
    const tariffLabel = input.tariffState === 'cheap' ? 'günstig'
        : (input.tariffState === 'expensive' ? 'teuer'
            : (input.tariffState === 'neutral' ? 'neutral'
                : (input.tariffState === 'off' ? 'deaktiviert' : 'unbekannt')));
    const decisionLines = [];
/**
 * Code-Teil: addDecision
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const addDecision = (text, level = 'info') => {
        const normalized = String(text || '').trim();
        if (!normalized || decisionLines.some((entry) => entry.text === normalized))
            return;
        decisionLines.push({ level: level === 'warning' ? 'warning' : (level === 'error' ? 'error' : 'info'), text: normalized });
    };
    if (!input.globalControlActive)
        addDecision('Laderegelung ist deaktiviert – es wird keine automatische Leistungsoptimierung ausgeführt.', 'warning');
    else if (activeModes.length > 1)
        addDecision(`Gemischter Betrieb aktiv: ${activeModes.join(', ')}. Jeder Ladepunkt wird nach seinem gewählten Modus geregelt.`);
    else
        addDecision(`Modus ${String(activeModes[0] || input.globalControlMode || 'auto').toUpperCase()} aktiv – EOS optimiert die Ladeleistung automatisch.`);
    if (!input.tariffActive)
        addDecision('Dynamischer Tarif ist nicht aktiv – die Regelung nutzt Netz-, PV- und Zielvorgaben ohne Tarifoptimierung.');
    else if (!input.tariffFresh)
        addDecision('Tarifdaten sind veraltet – tarifabhängige Freigaben bleiben sicher gesperrt.', 'warning');
    else if (input.tariffState === 'expensive')
        addDecision('Tarif teuer – Netzladen wird vermieden, sofern kein Zeit-Ziel-Override erforderlich ist.', 'warning');
    else if (input.tariffState === 'cheap')
        addDecision('Tarif günstig – wirtschaftliches Laden ist freigegeben, soweit Netz- und Stationsgrenzen es erlauben.');
    else
        addDecision(`Tarif ${tariffLabel} – die aktuelle Preisstufe verursacht keine zusätzliche Freigabe.`);
    if (input.pvAvailable && input.pvSurplusW > 0)
        addDecision(`PV-Überschuss verfügbar (${Math.round(input.pvSurplusW)} W) – Solarenergie wird bevorzugt verteilt.`);
    else
        addDecision('Kein nutzbarer PV-Überschuss – Solar-Laden wartet auf eine ausreichende Freigabe.', 'warning');
    if (goalOverrideConnectors.length)
        addDecision(`Zeit-Ziel-Override aktiv bei ${goalOverrideConnectors.length} Ladepunkt(en) – die Zielzeit wird knapp.`, 'warning');
    else if (goalConnectors.length)
        addDecision(`Ziel-Laden aktiv bei ${goalConnectors.length} Ladepunkt(en) – die Zielerreichung wird fortlaufend geplant.`);
    if (input.storageAssistActive)
        addDecision(`Speicherunterstützung aktiv (${Math.round(input.storageProtectedLoadW)} W geschützt) – freigegebene Speicherleistung wird berücksichtigt.`);
    else
        addDecision('Speicher schützen aktiv – Ladepunkte greifen nicht auf eine nicht freigegebene Speicherreserve zu.');
    if (input.para14aBinding)
        addDecision('§14a begrenzt aktuell die verfügbare Ladeleistung.', 'warning');
    else if (input.gridCapBinding || input.phaseCapBinding)
        addDecision(`Anlagenbegrenzung aktiv: ${input.gridCapBinding ? 'Netzanschluss' : ''}${input.gridCapBinding && input.phaseCapBinding ? ' und ' : ''}${input.phaseCapBinding ? 'Phasenlimit' : ''}.`, 'warning');
    if (chargingConnectors.length)
        addDecision(`${chargingConnectors.length} von ${connectors.length} Ladepunkt(en) laden aktuell mit zusammen ${Math.round(connectors.reduce((sum, entry) => sum + (Number(entry.powerW) || 0), 0))} W.`);
    else if (connectedConnectors.length)
        addDecision(`${connectedConnectors.length} Fahrzeug(e) verbunden – EOS wartet auf Ladebedarf oder eine gültige Energiefreigabe.`);
    else
        addDecision('Kein Fahrzeug verbunden – die Station ist betriebsbereit.');
    const errorCount = warnings.filter((entry) => entry.level === 'error').length;
    const warningCount = warnings.filter((entry) => entry.level === 'warning').length;
    let shortDecision = 'Station bereit – aktuell fordert kein Fahrzeug Leistung.';
    if (errorCount)
        shortDecision = `Regelung eingeschränkt: ${warnings.find((entry) => entry.level === 'error')?.title || 'Fehler'}.`;
    else if (!input.globalControlActive)
        shortDecision = 'Automatische Laderegelung ist deaktiviert.';
    else if (goalOverrideConnectors.length)
        shortDecision = 'Zeit-Ziel wird knapp – wirtschaftliche Sperre wird kontrolliert übersteuert.';
    else if (chargingConnectors.length)
        shortDecision = `Laden freigegeben: ${chargingConnectors.length} Ladepunkt(e) aktiv.`;
    else if (connectedConnectors.length)
        shortDecision = 'Fahrzeug verbunden – EOS wartet auf Ladebedarf oder Freigabe.';
    return {
        summary: {
            chargingCount: chargingConnectors.length,
            connectedCount: connectedConnectors.length,
            onlineCount: onlineConnectors.length,
            goalCount: goalConnectors.length,
            goalOverrideCount: goalOverrideConnectors.length,
            activeModes,
            warningCount,
            errorCount,
            shortDecision,
        },
        decisionLines: decisionLines.slice(0, 8),
        warnings: warnings.slice(0, 12),
    };
}
module.exports = { buildStationDisplayPresentation };
