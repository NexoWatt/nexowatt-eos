/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/consumers/sg-ready.ts
 * Quell-Hash: sha256:18cf48ec40db5dcd3a2d22ee1184948fef5c26375b4d894d0dc95e221f51db6f
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/consumers/sg-ready.js.
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
 * Aufgabe: Überträgt die angeforderte SG-Ready-Betriebsstufe auf die zugeordneten Steuerkontakte/Datenpunkte.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/consumers/sg-ready.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/consumers/sg-ready.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/consumers/sg-ready.js`.
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
 * Datei: ems/consumers/sg-ready.js
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
 * SG-Ready consumer actuation (two digital outputs).
 *
 * Consumer:
 * {
 *   type: 'sgready',
 *   key: string,
 *   name: string,
 *   sg1Key?: string,      // DP-registry key (write)
 *   sg2Key?: string,      // DP-registry key (write)
 *   enableKey?: string,   // optional enable DP (write)
 *   invert1?: boolean,
 *   invert2?: boolean
 * }
 *
 * Target:
 * {
 *   state?: 'off'|'on'|'boost'|'normal'|'block'
 * }
 */

/**
 * Default SG-Ready state mapping:
 * - off/normal:  sg1=false, sg2=false
 * - on:          sg1=true,  sg2=false
 * - boost:       sg1=true,  sg2=true
 * - block:       sg1=false, sg2=true
 *
 * Note: Real installations may wire/invert relays differently.
 * Use invert1/invert2 to adapt to active-low relays.
 */

/**
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {{state?:string}} target
 */
/**
 * Code-Teil: applySgReady
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function applySgReady(ctx, consumer, target) {
    const adapter = ctx && ctx.adapter;
    const dp = ctx && ctx.dp;

    const sg1Key = consumer && consumer.sg1Key;
    const sg2Key = consumer && consumer.sg2Key;
    const enableKey = consumer && consumer.enableKey;

    const has1 = !!(sg1Key && dp && dp.getEntry && dp.getEntry(sg1Key));
    const has2 = !!(sg2Key && dp && dp.getEntry && dp.getEntry(sg2Key));
    const hasEn = !!(enableKey && dp && dp.getEntry && dp.getEntry(enableKey));

    if (!has1 && !has2 && !hasEn) {
        return { applied: false, status: 'no_sgready_dp', writes: { sg1: null, sg2: null, enable: null } };
    }

    const raw = String(target && target.state || 'off').trim().toLowerCase();
    const state = (!raw || raw === '0') ? 'off'
        : (raw === 'normal') ? 'off'
        : (raw === 'on' || raw === '1') ? 'on'
        : (raw === 'boost' || raw === '2') ? 'boost'
        : (raw === 'block' || raw === 'blocked' || raw === '3') ? 'block'
        : 'off';

    /** @type {boolean} */
    let sg1 = false;
    /** @type {boolean} */
    let sg2 = false;

    if (state === 'on') { sg1 = true; sg2 = false; }
    else if (state === 'boost') { sg1 = true; sg2 = true; }
    else if (state === 'block') { sg1 = false; sg2 = true; }

    const enable = (state !== 'off' && state !== 'normal' && state !== 'block');

    const inv1 = !!(consumer && consumer.invert1);
    const inv2 = !!(consumer && consumer.invert2);
    if (inv1) sg1 = !sg1;
    if (inv2) sg2 = !sg2;

    /** @type {true|false|null} */
    let wrote1 = null;
    /** @type {true|false|null} */
    let wrote2 = null;

    /** @type {true|false|null} */
    let wroteEn = null;

    if (has1) wrote1 = await dp.writeBoolean(sg1Key, !!sg1, false);
    if (has2) wrote2 = await dp.writeBoolean(sg2Key, !!sg2, false);
    if (enableKey) {
        if (!hasEn) wroteEn = false;
        else wroteEn = await dp.writeBoolean(enableKey, !!enable, false);
    }
    const results = [wrote1, wrote2, wroteEn].filter(v => v !== null && v !== undefined);
    const anyFalse = results.some(v => v === false);
    const anyTrue = results.some(v => v === true);
    const applied = !anyFalse;

    let status = 'unchanged';
    if (anyFalse && anyTrue) status = 'applied_partial';
    else if (anyFalse) status = 'write_failed';
    else if (anyTrue) status = 'applied';

    if (adapter && adapter.log && typeof adapter.log.debug === 'function') {
        const k = String(consumer && consumer.key || '');
        adapter.log.debug(`[consumer:sgready] apply '${k}' state=${state} wrote1=${wrote1} wrote2=${wrote2} wroteEn=${wroteEn} status=${status}`);
    }

    return { applied, status, writes: { sg1: wrote1, sg2: wrote2, enable: wroteEn }, state };
}

module.exports = { applySgReady };
