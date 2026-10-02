// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Setzt die freigegebene Anforderung eines allgemeinen Verbrauchers über dessen konfigurierte Steuerdatenpunkte um.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/consumers/generic-load.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/consumers/generic-load.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/consumers/generic-load.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/consumers/generic-load.js
 * Rolle im Projekt: EMS-Verbraucheradapter.
 * Zweck: Kapselt einen regelbaren Verbraucher und übersetzt EMS-Freigaben in konkrete Zustände/Setpoints.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Consumer-Adapter der EMS-Schicht: kapselt eine Verbraucher-/Setpoint-/Schaltlogik für EMS-Module.
 * Zusammenhänge:
 * - Wird von ems/modules/* genutzt, um reale oder simulierte Verbraucher anzusprechen.
 * Wartungshinweise:
 * - DP-Einheiten und Invertierungen müssen zur Installer-Konfiguration passen.
 */

'use strict';

/**
 * Generic power-limited consumer (future use).
 *
 * Expects:
 * {
 *   type: 'load',
 *   key: string,
 *   name: string,
 *   setWKey?: string,
 *   enableKey?: string
 * }
 */

/**
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {{targetW:number}} target
 */
/**
 * Code-Teil: applyLoadSetpoint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function applyLoadSetpoint(ctx, consumer, target) {
    const adapter = ctx && ctx.adapter;
    const dp = ctx && ctx.dp;

    const setWKey = consumer && consumer.setWKey;
    const enableKey = consumer && consumer.enableKey;
    const targetW = Number(target && target.targetW);

    const hasSetW = !!(setWKey && dp && dp.getEntry && dp.getEntry(setWKey));
    const hasEnable = !!(enableKey && dp && dp.getEntry && dp.getEntry(enableKey));

    // Support either a numeric power limit DP, an enable DP, or both.
    if (!hasSetW && !hasEnable) {
        return { applied: false, status: 'no_setpoint_dp', writes: { setW: null, enable: null } };
    }

    /** @type {true|false|null} */
    let wroteW = null;
    /** @type {true|false|null} */
    let wroteEnable = null;

    if (hasSetW) {
        wroteW = await dp.writeNumber(setWKey, Math.round(targetW > 0 ? targetW : 0), false);
    }

    if (enableKey) {
        if (!hasEnable) wroteEnable = false;
        else wroteEnable = await dp.writeBoolean(enableKey, targetW > 0, false);
    }
    const results = [wroteW, wroteEnable].filter(v => v !== null && v !== undefined);
    const anyFalse = results.some(v => v === false);
    const anyTrue = results.some(v => v === true);
    const applied = !anyFalse;

    let status = 'unchanged';
    if (anyFalse && anyTrue) status = 'applied_partial';
    else if (anyFalse) status = 'write_failed';
    else if (anyTrue) status = 'applied';

    if (adapter && adapter.log && typeof adapter.log.debug === 'function') {
        const k = String(consumer && consumer.key || '');
        adapter.log.debug(`[consumer:load] apply '${k}' targetW=${Math.round(targetW || 0)} wroteW=${wroteW} wroteEnable=${wroteEnable} status=${status}`);
    }

    return { applied, status, writes: { setW: wroteW, enable: wroteEnable } };
}

module.exports = { applyLoadSetpoint };
