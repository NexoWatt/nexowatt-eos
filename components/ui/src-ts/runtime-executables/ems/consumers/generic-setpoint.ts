// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Übersetzt eine normierte Sollwertanforderung auf den konfigurierten allgemeinen Datenpunkt-Schreibpfad.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/consumers/generic-setpoint.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/consumers/generic-setpoint.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/consumers/generic-setpoint.js`.
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
 * Datei: ems/consumers/generic-setpoint.js
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
 * Generic numeric setpoint consumer (e.g. temperature setpoint) with optional enable/switch datapoint.
 *
 * Consumer:
 * {
 *   type: 'setpoint',
 *   key: string,
 *   name: string,
 *   setKey?: string,     // numeric setpoint (write)
 *   enableKey?: string   // boolean enable/switch (write)
 * }
 *
 * Target:
 * {
 *   enable?: boolean|null,
 *   setpoint?: number|null
 * }
 */

/**
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {{enable?:boolean|null, setpoint?:number|null}} target
 */
/**
 * Code-Teil: applySetpointNumeric
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function applySetpointNumeric(ctx, consumer, target) {
    const adapter = ctx && ctx.adapter;
    const dp = ctx && ctx.dp;

    const setKey = consumer && (consumer.setKey || consumer.setWKey);
    const enableKey = consumer && consumer.enableKey;

    const hasSet = !!(setKey && dp && dp.getEntry && dp.getEntry(setKey));
    const hasEnable = !!(enableKey && dp && dp.getEntry && dp.getEntry(enableKey));

    if (!hasSet && !hasEnable) {
        return { applied: false, status: 'no_setpoint_dp', writes: { setpoint: null, enable: null } };
    }

    /** @type {true|false|null} */
    let wroteSetpoint = null;
    /** @type {true|false|null} */
    let wroteEnable = null;

    // Enable
    if (enableKey) {
        if (!hasEnable) {
            wroteEnable = false;
        } else if (target && target.enable !== undefined && target.enable !== null) {
            wroteEnable = await dp.writeBoolean(enableKey, !!target.enable, false);
        }
    }

    // Numeric setpoint
    if (hasSet) {
        const n = (target && target.setpoint !== undefined && target.setpoint !== null) ? Number(target.setpoint) : null;
        if (n !== null && Number.isFinite(n)) {
            wroteSetpoint = await dp.writeNumber(setKey, n, false);
        }
    }
    const results = [wroteSetpoint, wroteEnable].filter(v => v !== null && v !== undefined);
    const anyFalse = results.some(v => v === false);
    const anyTrue = results.some(v => v === true);
    const applied = !anyFalse;

    let status = 'unchanged';
    if (anyFalse && anyTrue) status = 'applied_partial';
    else if (anyFalse) status = 'write_failed';
    else if (anyTrue) status = 'applied';

    if (adapter && adapter.log && typeof adapter.log.debug === 'function') {
        const k = String(consumer && consumer.key || '');
        adapter.log.debug(`[consumer:setpoint] apply '${k}' enable=${target && target.enable} setpoint=${target && target.setpoint} wroteSetpoint=${wroteSetpoint} wroteEnable=${wroteEnable} status=${status}`);
    }

    return { applied, status, writes: { setpoint: wroteSetpoint, enable: wroteEnable } };
}

module.exports = { applySetpointNumeric };
