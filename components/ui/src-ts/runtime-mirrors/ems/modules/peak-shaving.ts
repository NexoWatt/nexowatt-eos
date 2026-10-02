// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/peak-shaving.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/peak-shaving.js
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
 * Original-Hash: d2d0f0b32428d469410be916046f0449548a2e810bafb8d543bad6ebd92645fe
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
 * Quelle: src-ts/runtime-executables/ems/modules/peak-shaving.ts
 * Quell-Hash: sha256:83511e1c3171b0f74ae7059ae5915c9e06ff0b07a2a8fd056b829ba5aad05a03
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/peak-shaving.js.
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
 * Aufgabe: Bestimmt die Speicher-Unterstützung zur Begrenzung von Netzbezugsspitzen innerhalb der freigegebenen Speicherleistung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/peak-shaving.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/peak-shaving.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/peak-shaving.js`.
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
 * Datei: ems/modules/peak-shaving.js
 * Rolle im Projekt: Lastspitzenkappung.
 * Zweck: Berechnet Peak-Shaving-Freigaben und Schutzlogik für Netzanschluss/Hochlastfenster.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Peak-Shaving/Lastspitzenkappung: überwacht Netzanschluss, Limits, Hysterese und HLZF/§19-Fenster.
 * Zusammenhänge:
 * - Wird von core-limits.js und ai-advisor.js ausgewertet.
 * - Konfiguration kommt aus App-Center/Installer.
 * Wartungshinweise:
 * - Netzanschlussleistung und Warnschwellen müssen konsistent in W/% geführt werden.
 */

'use strict';

const { BaseModule } = require('./base');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { ReasonCodes, reasonToGerman } = require('../reasons');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { ActuatorCommandContract } = require('../services/actuator-command-contract');

/**
 * Code-Teil: Klasse `SlidingWindow`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: SlidingWindow. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Lastspitzenkappung, Netzanschlusslimit und HLZF-Logik.
/**
 * Klasse: SlidingWindow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class SlidingWindow {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(maxSeconds) {
        this.maxSeconds = Math.max(1, Number(maxSeconds) || 30);
        /** @type {Array<{t:number, v:number}>} */
        this.samples = [];
    }

    /**
     * Code-Teil: Methode `setMaxSeconds`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setMaxSeconds
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    setMaxSeconds(maxSeconds) {
        const s = Math.max(1, Number(maxSeconds) || 30);
        if (s !== this.maxSeconds) {
            this.maxSeconds = s;
            this.prune(Date.now());
        }
    }

    /**
     * Code-Teil: push
     * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    push(v, t = Date.now()) {
        if (!Number.isFinite(v)) return;
        this.samples.push({ t, v });
        this.prune(t);
    }

    /**
     * Code-Teil: Methode `prune`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: prune
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    prune(nowTs) {
        const cutoff = nowTs - this.maxSeconds * 1000;
        while (this.samples.length && this.samples[0].t < cutoff) {
            this.samples.shift();
        }
    }

    /**
     * Code-Teil: Methode `mean`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mean
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    mean() {
        if (!this.samples.length) return null;
        let sum = 0;
        for (const s of this.samples) sum += s.v;
        return sum / this.samples.length;
    }

    /**
     * Code-Teil: Methode `max`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: max
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    max() {
        if (!this.samples.length) return null;
        let m = Number.NEGATIVE_INFINITY;
        for (const s of this.samples) {
            if (s.v > m) m = s.v;
        }
        return Number.isFinite(m) ? m : null;
    }

    /**
     * Code-Teil: Methode `count`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: count
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    count() {
        return this.samples.length;
    }
}
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

const ATYPICAL_THRESHOLD_PERCENT_BY_VOLTAGE_LEVEL = Object.freeze({
    // §19 Abs. 2 S. 1 StromNEV / BNetzA-Leitfaden: Erheblichkeitsschwellen je Entnahmeebene.
    HOS: 5,
    HOSHS: 10,
    HS: 10,
    HSMS: 20,
    MS: 20,
    MSNS: 30,
    NS: 30,
});
/**
 * Code-Teil: normalizeVoltageLevelKey
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeVoltageLevelKey(v) {
    return String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');
}
/**
 * Code-Teil: atypicalThresholdPercent
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function atypicalThresholdPercent(voltageLevel, fallback = 20) {
    const key = normalizeVoltageLevelKey(voltageLevel);
    if (Object.prototype.hasOwnProperty.call(ATYPICAL_THRESHOLD_PERCENT_BY_VOLTAGE_LEVEL, key)) {
        return ATYPICAL_THRESHOLD_PERCENT_BY_VOLTAGE_LEVEL[key];
    }
    return fallback;
}
/**
 * Code-Teil: isPeakShavingRuntimeEnabled
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isPeakShavingRuntimeEnabled(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    if (cfg.enablePeakShaving === true) return true;
    const ps = (cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};
    const atypical = (ps.atypical && typeof ps.atypical === 'object') ? ps.atypical : {};
    return atypical.enabled === true;
}
/**
 * Code-Teil: parseHmToMinutes
 * Zweck: Parst Rohdaten in ein sicheres internes Format.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function parseHmToMinutes(value) {
    const s = String(value || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
}
/**
 * Code-Teil: localYmd
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function localYmd(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    const y = String(d.getFullYear()).padStart(4, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
/**
 * Code-Teil: normalizeYmd
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeYmd(value) {
    if (value instanceof Date) return localYmd(value);
    const s = String(value || '').trim();
    if (!s) return '';
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
        return `${String(m[1]).padStart(4, '0')}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : localYmd(d);
}
/**
 * Code-Teil: asArray
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (value === null || value === undefined || value === '') return [];
    return [value];
}
/**
 * Code-Teil: toNumberArray
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function toNumberArray(value) {
    const out = [];
    const seen = new Set();
    for (const item of asArray(value)) {
        const n = Number(item);
        if (!Number.isFinite(n)) continue;
        const r = Math.round(n);
        if (seen.has(r)) continue;
        seen.add(r);
        out.push(r);
    }
    return out;
}
/**
 * Code-Teil: toDateSet
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function toDateSet(value) {
    const set = new Set();
    for (const item of asArray(value)) {
        let raw = item;
        if (item && typeof item === 'object' && !(item instanceof Date)) {
            raw = item.date || item.day || item.ymd || item.value || '';
        }
        const ymd = normalizeYmd(raw);
        if (ymd) set.add(ymd);
    }
    return set;
}
/**
 * Code-Teil: isoWeekday
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isoWeekday(date) {
    const js = date.getDay();
    return js === 0 ? 7 : js;
}
/**
 * Code-Teil: isChristmasNewYearPeriod
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isChristmasNewYearPeriod(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return (month === 12 && day >= 24) || (month === 1 && day <= 1);
}


/**
 * Code-Teil: Klasse `PeakShavingModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: PeakShavingModule. Aufgabe: gehört zur KI-/Prognose-/Peak-Beratung. Die KI bleibt beratend und darf keine Verbraucher direkt schalten. Zusammenhang: Lastspitzenkappung, Netzanschlusslimit und HLZF-Logik.
/**
 * Klasse: PeakShavingModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class PeakShavingModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        this._winPower = new SlidingWindow(10);
        this._winL1 = new SlidingWindow(10);
        this._winL2 = new SlidingWindow(10);
        this._winL3 = new SlidingWindow(10);

        this._status = 'inactive'; // inactive | pending_on | active | pending_off
        this._pendingSince = 0;
        this._activeSince = 0;

        /** @type {Map<string, {mode:string, phases:number, baseline:number|null, baselineEnabled:boolean|null}>} */
        this._baselines = new Map();
        this._wasActive = false;
        this._restorePending = false;
        this._actuatorContract = new ActuatorCommandContract();

        // Atypische Nachkontrolle: laufende Jahres-/HLZF-Maxima werden über States persistiert.
        this._atypicalReviewLoaded = false;
        this._atypicalReviewState = {
            resetIdentity: '',
            pAbsMaxW: 0,
            pHlzfMaxW: 0,
            lastUpdate: 0,
        };

        // Nachweis/Audit: throttled samples for Influx/CSV/PDF export.
        this._atypicalAuditLastSampleMs = 0;
        this._atypicalAuditLastReason = '';
        this._atypicalAuditLastHistorySetupMs = 0;
    }

    /**
     * Code-Teil: Methode `_isEnabled`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _isEnabled
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _isEnabled() {
        return isPeakShavingRuntimeEnabled(this.adapter && this.adapter.config);
    }
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        if (!this._isEnabled()) return;

        // Channels
        await this.adapter.setObjectNotExistsAsync('peakShaving', {
            type: 'channel',
            common: { name: 'Peak Shaving' },
            native: {},
        });

        for (const ch of ['measure', 'calc', 'control', 'dynamic', 'actuators', 'atypical', 'atypical.review', 'atypical.audit']) {
            await this.adapter.setObjectNotExistsAsync(`peakShaving.${ch}`, {
                type: 'channel',
                common: { name: ch },
                native: {},
            });
        }

        // States (created lazily too, but create the core set)
        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mk
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('peakShaving.control.active', 'Active', 'boolean', 'indicator');
        await mk('peakShaving.control.status', 'Status', 'string', 'text');
        await mk('peakShaving.control.reason', 'Reason (Code)', 'string', 'text');
        await mk('peakShaving.control.reasonText', 'Grund', 'string', 'text');
        await mk('peakShaving.control.limitW', 'Effective limit (W)', 'number', 'value.power');
        await mk('peakShaving.control.effectivePowerW', 'Effective power (W)', 'number', 'value.power');
        await mk('peakShaving.control.overW', 'Over limit (W)', 'number', 'value.power');
        await mk('peakShaving.control.requiredReductionW', 'Required reduction (W)', 'number', 'value.power');
        await mk('peakShaving.control.requiredReductionA', 'Required reduction (A)', 'number', 'value.current');
        await mk('peakShaving.control.requestedActuatorReductionW', 'Requested actuator reduction (W)', 'number', 'value.power');
        await mk('peakShaving.control.acceptedActuatorReductionW', 'Accepted actuator reduction (W)', 'number', 'value.power');
        await mk('peakShaving.control.confirmedActuatorReductionW', 'Confirmed actuator reduction (W)', 'number', 'value.power');
        await mk('peakShaving.control.unmetActuatorReductionW', 'Unmet actuator reduction (W)', 'number', 'value.power');
        await mk('peakShaving.control.actuatorWritePendingCount', 'Pending actuator writes', 'number', 'value');
        await mk('peakShaving.control.actuatorFaultCount', 'Fault locked actuators', 'number', 'value');
        await mk('peakShaving.control.restorePending', 'Actuator restore pending', 'boolean', 'indicator');
        await mk('peakShaving.control.phaseViolation', 'Phase violation', 'boolean', 'indicator');
        await mk('peakShaving.control.worstPhase', 'Worst phase', 'string', 'text');
        await mk('peakShaving.control.worstPhaseOverA', 'Worst phase over (A)', 'number', 'value.current');
        await mk('peakShaving.control.lastUpdate', 'Last update', 'number', 'value.time');

        await mk('peakShaving.dynamic.allowedPowerW', 'Allowed power (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.reserveW', 'Reserve (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.effectiveLimitW', 'Dynamic effective limit (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.baseLoadW', 'Base load (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.pvW', 'PV power (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.batteryW', 'Battery power (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.availableForControlledW', 'Available for controlled loads (W)', 'number', 'value.power');

        await mk('peakShaving.calc.avgPowerW', 'Average power (W)', 'number', 'value.power');
        await mk('peakShaving.calc.samples', 'Samples', 'number', 'value');

        await mk('peakShaving.atypical.enabled', 'Atypische Spitzenkappung aktiviert', 'boolean', 'indicator');
        await mk('peakShaving.atypical.enforce', 'Atypische Spitzenkappung erzwingen', 'boolean', 'indicator');
        await mk('peakShaving.atypical.activeWindow', 'Aktives Hochlastzeitfenster', 'boolean', 'indicator');
        await mk('peakShaving.atypical.status', 'Atypische Spitzenkappung Status', 'string', 'text');
        await mk('peakShaving.atypical.windowLabel', 'Aktuelles Hochlastzeitfenster', 'string', 'text');
        await mk('peakShaving.atypical.voltageLevel', 'Entnahmeebene', 'string', 'text');
        await mk('peakShaving.atypical.thresholdPercent', 'Erheblichkeitsschwelle (%)', 'number', 'value');
        await mk('peakShaving.atypical.minShiftW', 'Mindestverlagerung (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.pAbsRefW', 'Referenz-Jahreshöchstlast P_abs_ref (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.targetLimitW', 'HLZF-Ziellast (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.effectiveLimitW', 'Wirksames HLZF-Limit nach Hybrid-Minimum (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.deltaW', 'Verlagerung gegenüber P_abs_ref (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.deltaPercent', 'Verlagerung gegenüber P_abs_ref (%)', 'number', 'value');
        await mk('peakShaving.atypical.eligiblePotential', '§19-Potenzial erfüllt Zielparameter', 'boolean', 'indicator');
        await mk('peakShaving.atypical.binding', 'Bindendes Limit / Quelle', 'string', 'text');
        await mk('peakShaving.atypical.gridOperator', 'Netzbetreiber Hochlastzeitfenster', 'string', 'text');
        await mk('peakShaving.atypical.year', 'Gültigkeitsjahr Hochlastzeitfenster', 'number', 'value');
        await mk('peakShaving.atypical.sourceDocument', 'HLZF Quelle / Dokument', 'string', 'text');
        await mk('peakShaving.atypical.sourcePublishedAt', 'HLZF Veröffentlichungsdatum', 'string', 'text');
        await mk('peakShaving.atypical.sourceUrl', 'HLZF Quell-URL / Ablage', 'string', 'text');
        await mk('peakShaving.atypical.sourceNote', 'HLZF Bemerkung', 'string', 'text');
        await mk('peakShaving.atypical.snapshotJson', 'Atypische Spitzenkappung Snapshot (JSON)', 'string', 'text');

        await mk('peakShaving.atypical.review.enabled', 'Nachkontrolle aktiv', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.status', 'Nachkontrolle Status', 'string', 'text');
        await mk('peakShaving.atypical.review.year', 'Nachkontrolle Jahr', 'number', 'value');
        await mk('peakShaving.atypical.review.resetIdentity', 'Nachkontrolle Reset-Identität', 'string', 'text');
        await mk('peakShaving.atypical.review.pAbsMaxW', 'Gemessene Jahreshöchstlast P_abs_max (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.pHlzfMaxW', 'Gemessene HLZF-Höchstlast P_HLZF_max (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.pAbsEvalW', 'Bewertete Jahreshöchstlast P_abs (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.pHlzfEvalW', 'Bewertete HLZF-Höchstlast P_HLZF (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.deltaW', 'Nachkontrolle Verlagerung (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.deltaPercent', 'Nachkontrolle Verlagerung (%)', 'number', 'value');
        await mk('peakShaving.atypical.review.thresholdOk', 'Erheblichkeitsschwelle erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.minShiftOk', 'Mindestverlagerung erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.savingsEur', 'Geschätzte Ersparnis (€)', 'number', 'value');
        await mk('peakShaving.atypical.review.savingsOk', 'Bagatellgrenze erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.eligible', 'Nachkontrolle erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.lastUpdate', 'Nachkontrolle letzte Aktualisierung', 'number', 'value.time');
        await mk('peakShaving.atypical.review.snapshotJson', 'Nachkontrolle Snapshot (JSON)', 'string', 'text');

        await mk('peakShaving.atypical.audit.lastSampleTs', 'Nachweis letzter Influx-Sample-Zeitpunkt', 'number', 'value.time');
        await mk('peakShaving.atypical.audit.gridImportW', 'Nachweis Netzbezug Sample (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.audit.activeWindow', 'Nachweis HLZF aktiv', 'boolean', 'indicator');
        await mk('peakShaving.atypical.audit.windowLabel', 'Nachweis Hochlastzeitfenster', 'string', 'text');
        await mk('peakShaving.atypical.audit.effectiveLimitW', 'Nachweis wirksames Limit (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.audit.pAbsMaxW', 'Nachweis P_abs_max laufend (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.audit.pHlzfMaxW', 'Nachweis P_HLZF_max laufend (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.audit.deltaW', 'Nachweis Verlagerung (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.audit.deltaPercent', 'Nachweis Verlagerung (%)', 'number', 'value');
        await mk('peakShaving.atypical.audit.thresholdOk', 'Nachweis Erheblichkeit erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.audit.minShiftOk', 'Nachweis Mindestverlagerung erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.audit.savingsEur', 'Nachweis Ersparnis (€)', 'number', 'value');
        await mk('peakShaving.atypical.audit.eligible', 'Nachweis §19 erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.audit.sampleReason', 'Nachweis Sample-Grund', 'string', 'text');
        await mk('peakShaving.atypical.audit.snapshotJson', 'Nachweis Audit-Snapshot (JSON)', 'string', 'text');
        await mk('peakShaving.atypical.audit.historyEnabled', 'Nachweis Historie/Influx aktiv', 'boolean', 'indicator');
        await mk('peakShaving.atypical.audit.historyInstance', 'Nachweis Historien-Instanz', 'string', 'text');
        await mk('peakShaving.atypical.audit.historyProvisionState', 'Nachweis Historienstatus', 'string', 'text');
        await mk('peakShaving.atypical.audit.historyProvisionError', 'Nachweis Historienhinweis/Fehler', 'string', 'text');
        await mk('peakShaving.atypical.audit.retentionTargetDays', 'Nachweis Retention-Ziel (Tage)', 'number', 'value.interval');

        try { await this._setupAtypicalAuditHistory(); } catch { /* optional */ }
    }


    /**
     * Code-Teil: Methode `_atypicalSeasonMonths`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _atypicalSeasonMonths
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _atypicalSeasonMonths(season) {
        const s = String(season || '').trim().toLowerCase();
        if (!s) return [];
        if (['winter', 'win', 'w'].includes(s)) return [1, 2, 12];
        if (['sommer', 'summer', 'sum', 's'].includes(s)) return [6, 7, 8];
        if (['uebergang', 'übergang', 'transition', 'spring-autumn', 'fruehjahr-herbst', 'frühjahr-herbst'].includes(s)) return [3, 4, 5, 9, 10, 11];
        return [];
    }

    /**
     * Code-Teil: Methode `_atypicalWindowLabel`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _atypicalWindowLabel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _atypicalWindowLabel(win) {
        if (win && typeof win === 'object') {
            const explicit = String(win.label || win.name || win.id || '').trim();
            if (explicit) return explicit;
            const from = String(win.from || win.start || win.startTime || win.fromTime || '').trim();
            const to = String(win.to || win.end || win.endTime || win.toTime || '').trim();
            if (from || to) return `${from || '?'}-${to || '?'}`;
        }
        return '';
    }

    /**
     * Code-Teil: Methode `_atypicalWindowMatches`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _atypicalWindowMatches
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _atypicalWindowMatches(win, nowDate) {
        if (!win || typeof win !== 'object') return false;
        if (win.enabled === false || win.active === false) return false;

        const ymd = localYmd(nowDate);
        const validFrom = normalizeYmd(win.validFrom || win.validFromDate || win.fromDate || '');
        const validTo = normalizeYmd(win.validTo || win.validToDate || win.toDate || '');
        if (validFrom && ymd < validFrom) return false;
        if (validTo && ymd > validTo) return false;

        const month = nowDate.getMonth() + 1;
        const months = toNumberArray(win.months || win.month || []);
        if (months.length && !months.includes(month)) return false;
        if (!months.length) {
            const seasonMonths = this._atypicalSeasonMonths(win.season || win.jahreszeit || '');
            if (seasonMonths.length && !seasonMonths.includes(month)) return false;
        }

        const weekdays = toNumberArray(win.weekdays || win.days || win.weekday || []);
        if (weekdays.length) {
            const iso = isoWeekday(nowDate); // 1=Mon ... 7=Sun
            const js = nowDate.getDay(); // 0=Sun ... 6=Sat
            if (!weekdays.includes(iso) && !weekdays.includes(js)) return false;
        }

        const fromMin = parseHmToMinutes(win.from || win.start || win.startTime || win.fromTime);
        const toMin = parseHmToMinutes(win.to || win.end || win.endTime || win.toTime);
        if (fromMin === null || toMin === null || fromMin === toMin) return false;

        const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
        if (toMin > fromMin) return nowMin >= fromMin && nowMin < toMin;
        // Overnight windows are not typical for HLZF, but supporting them keeps the parser robust.
        return nowMin >= fromMin || nowMin < toMin;
    }

    /**
     * Code-Teil: Methode `_evaluateAtypicalSchedule`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _evaluateAtypicalSchedule
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _evaluateAtypicalSchedule(atypicalCfg, now) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const enabled = !!cfg.enabled;
        const date = new Date(now || Date.now());
        const ymd = localYmd(date);
        if (!enabled) return { enabled: false, active: false, reason: 'disabled', ymd, windowLabel: '' };

        const includeWeekends = cfg.includeWeekends === true;
        if (!includeWeekends && isoWeekday(date) >= 6) {
            return { enabled: true, active: false, reason: 'weekend', ymd, windowLabel: '' };
        }

        const excludeChristmasNewYear = cfg.excludeChristmasNewYear !== false;
        if (excludeChristmasNewYear && isChristmasNewYearPeriod(date)) {
            return { enabled: true, active: false, reason: 'christmas-new-year-period', ymd, windowLabel: '' };
        }

        const holidaySet = toDateSet(cfg.holidays || cfg.holidayDates || []);
        const bridgeDaySet = toDateSet(cfg.bridgeDays || cfg.bridgeDayDates || []);
        const exceptionSet = toDateSet(cfg.calendarExceptions || cfg.exceptions || []);
        if (holidaySet.has(ymd)) return { enabled: true, active: false, reason: 'holiday', ymd, windowLabel: '' };
        if (bridgeDaySet.has(ymd)) return { enabled: true, active: false, reason: 'bridge-day', ymd, windowLabel: '' };
        if (exceptionSet.has(ymd)) return { enabled: true, active: false, reason: 'calendar-exception', ymd, windowLabel: '' };

        const windows = Array.isArray(cfg.highLoadWindows)
            ? cfg.highLoadWindows
            : (Array.isArray(cfg.windows) ? cfg.windows : []);
        if (!windows.length) return { enabled: true, active: false, reason: 'no-high-load-windows', ymd, windowLabel: '' };

        for (const win of windows) {
            if (this._atypicalWindowMatches(win, date)) {
                return {
                    enabled: true,
                    active: true,
                    reason: 'active-high-load-window',
                    ymd,
                    windowLabel: this._atypicalWindowLabel(win),
                    window: win,
                };
            }
        }

        return { enabled: true, active: false, reason: 'outside-high-load-window', ymd, windowLabel: '' };
    }

    /**
     * Code-Teil: Methode `_calculateAtypicalTarget`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _calculateAtypicalTarget
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _calculateAtypicalTarget(atypicalCfg) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const voltageLevel = String(
            cfg.voltageLevel ||
            this.adapter?.config?.installerConfig?.voltageLevel ||
            this.adapter?.config?.settingsConfig?.voltageLevel ||
            'MS'
        );
        const fallbackThreshold = atypicalThresholdPercent(voltageLevel, 20);
        let thresholdPercent = clamp(num(cfg.thresholdPercent, fallbackThreshold), 0, 100);
        if (typeof thresholdPercent !== 'number') thresholdPercent = fallbackThreshold;

        let minShiftW = clamp(num(cfg.minShiftW, 100000), 0, 1e12);
        if (typeof minShiftW !== 'number') minShiftW = 100000;

        const pAbsRefW = Math.max(0, num(
            cfg.annualPeakReferenceW ?? cfg.pAbsRefW ?? cfg.pAbsMaxW ?? cfg.referencePeakW ?? cfg.referencePeakPowerW,
            0
        ) || 0);
        const explicitTargetW = num(cfg.targetLimitW ?? cfg.hlzfTargetW ?? cfg.highLoadLimitW ?? cfg.capW, null);
        const marginW = Math.max(0, num(cfg.safetyMarginW, 0) || 0);

        let rawTargetW = 0;
        let targetSource = '';
        if (typeof explicitTargetW === 'number' && explicitTargetW > 0) {
            rawTargetW = explicitTargetW;
            targetSource = 'explicit';
        } else if (pAbsRefW > 0) {
            const byPercentW = pAbsRefW * Math.max(0, 1 - (thresholdPercent / 100));
            const byShiftW = Math.max(0, pAbsRefW - minShiftW);
            rawTargetW = Math.min(byPercentW, byShiftW);
            targetSource = 'derived-from-annual-peak';
        }

        const targetLimitW = rawTargetW > 0 ? Math.max(0, rawTargetW - marginW) : 0;
        const deltaW = (pAbsRefW > 0 && rawTargetW > 0) ? Math.max(0, pAbsRefW - rawTargetW) : 0;
        const deltaPercent = pAbsRefW > 0 ? (deltaW / pAbsRefW * 100) : 0;
        const thresholdOk = pAbsRefW > 0 && deltaPercent + 1e-9 >= thresholdPercent;
        const minShiftOk = pAbsRefW > 0 && deltaW + 1e-9 >= minShiftW;
        const eligiblePotential = rawTargetW > 0 && thresholdOk && minShiftOk;

        let reason = 'ok';
        if (!(rawTargetW > 0)) reason = 'missing-target-or-reference-peak';
        else if (targetSource === 'explicit' && !(pAbsRefW > 0)) reason = 'explicit-target-without-reference-peak';
        else if (!eligiblePotential && pAbsRefW > 0) reason = 'threshold-or-min-shift-not-met';

        return {
            voltageLevel,
            thresholdPercent,
            minShiftW,
            pAbsRefW,
            rawTargetW,
            marginW,
            targetLimitW,
            targetSource,
            deltaW,
            deltaPercent,
            thresholdOk,
            minShiftOk,
            eligiblePotential,
            reason,
        };
    }

    /**
     * Code-Teil: Methode `_getAtypicalSourceInfo`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAtypicalSourceInfo
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAtypicalSourceInfo(atypicalCfg) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const yearRaw = Number(cfg.year ?? cfg.validityYear ?? cfg.calendarYear ?? 0);
        return {
            gridOperator: String(cfg.gridOperatorName || cfg.gridOperator || cfg.networkOperator || cfg.netzbetreiber || '').trim(),
            year: Number.isFinite(yearRaw) && yearRaw > 0 ? Math.round(yearRaw) : 0,
            sourceDocument: String(cfg.sourceDocument || cfg.sourceName || cfg.source || '').trim(),
            sourcePublishedAt: String(cfg.sourcePublishedAt || cfg.publishedAt || cfg.publicationDate || '').trim(),
            sourceUrl: String(cfg.sourceUrl || cfg.sourceLink || cfg.sourcePath || '').trim(),
            sourceNote: String(cfg.sourceNote || cfg.note || cfg.notes || '').trim(),
        };
    }

    /**
     * Code-Teil: Methode `_readOwnNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readOwnNumber(id, fallback = 0) {
        try {
            const st = await this.adapter.getStateAsync(id);
            const n = st ? Number(st.val) : NaN;
            return Number.isFinite(n) ? n : fallback;
        } catch {
            return fallback;
        }
    }

    /**
     * Code-Teil: Methode `_readOwnString`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnString
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readOwnString(id, fallback = '') {
        try {
            const st = await this.adapter.getStateAsync(id);
            if (!st || st.val === null || st.val === undefined) return fallback;
            return String(st.val);
        } catch {
            return fallback;
        }
    }

    /**
     * Code-Teil: Methode `_ensureAtypicalReviewLoaded`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _ensureAtypicalReviewLoaded
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureAtypicalReviewLoaded(resetIdentity) {
        const identity = String(resetIdentity || '');
        const st = this._atypicalReviewState || { resetIdentity: '', pAbsMaxW: 0, pHlzfMaxW: 0, lastUpdate: 0 };
        if (this._atypicalReviewLoaded && st.resetIdentity === identity) return;

        const persistedIdentity = await this._readOwnString('peakShaving.atypical.review.resetIdentity', '');
        if (persistedIdentity && persistedIdentity === identity) {
            st.resetIdentity = persistedIdentity;
            st.pAbsMaxW = Math.max(0, await this._readOwnNumber('peakShaving.atypical.review.pAbsMaxW', 0));
            st.pHlzfMaxW = Math.max(0, await this._readOwnNumber('peakShaving.atypical.review.pHlzfMaxW', 0));
            st.lastUpdate = Math.max(0, await this._readOwnNumber('peakShaving.atypical.review.lastUpdate', 0));
        } else {
            st.resetIdentity = identity;
            st.pAbsMaxW = 0;
            st.pHlzfMaxW = 0;
            st.lastUpdate = 0;
        }
        this._atypicalReviewState = st;
        this._atypicalReviewLoaded = true;
    }

    /**
     * Code-Teil: Methode `_buildAtypicalReviewContext`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _buildAtypicalReviewContext({ atypicalCfg, schedule, target, gridPowerRaw, effPower, staleMeter, now }) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const review = (cfg.review && typeof cfg.review === 'object') ? cfg.review : ((cfg.nachkontrolle && typeof cfg.nachkontrolle === 'object') ? cfg.nachkontrolle : {});
        const source = this._getAtypicalSourceInfo(cfg);
        const year = Math.round(num(review.year ?? source.year, (new Date(now || Date.now())).getFullYear()) || (new Date(now || Date.now())).getFullYear());
        const resetToken = String(review.resetToken || review.resetKey || '').trim();
        const resetIdentity = `${year}|${resetToken}`;
        const enabled = cfg.enabled === true && review.enabled !== false;

        await this._ensureAtypicalReviewLoaded(resetIdentity);
        const st = this._atypicalReviewState || { resetIdentity, pAbsMaxW: 0, pHlzfMaxW: 0, lastUpdate: 0 };
        st.resetIdentity = resetIdentity;

        const rawW = Number.isFinite(Number(gridPowerRaw)) ? Number(gridPowerRaw) : (Number.isFinite(Number(effPower)) ? Number(effPower) : null);
        const importW = (rawW !== null && Number.isFinite(rawW)) ? Math.max(0, rawW) : null;
        const measurementUsable = enabled && !staleMeter && importW !== null;

        if (measurementUsable) {
            if (importW > st.pAbsMaxW) st.pAbsMaxW = Math.round(importW);
            if (schedule && schedule.active && importW > st.pHlzfMaxW) st.pHlzfMaxW = Math.round(importW);
            st.lastUpdate = now || Date.now();
        }

        const manualPAbs = num(review.pAbsActualW ?? review.actualAnnualPeakW ?? review.pAbsIstW, null);
        const manualHlzf = num(review.pHlzfMaxW ?? review.hlzfPeakW ?? review.pHlzfIstW, null);
        const pAbsEvalW = (typeof manualPAbs === 'number' && manualPAbs > 0) ? manualPAbs : st.pAbsMaxW;
        const pHlzfEvalW = (typeof manualHlzf === 'number' && manualHlzf >= 0) ? manualHlzf : st.pHlzfMaxW;

        const thresholdPercent = Math.max(0, num(target && target.thresholdPercent, atypicalThresholdPercent(target && target.voltageLevel, 20)) || 0);
        const minShiftW = Math.max(0, num(target && target.minShiftW, 100000) || 0);
        const complete = pAbsEvalW > 0 && pHlzfEvalW >= 0;
        const deltaW = complete ? Math.max(0, pAbsEvalW - pHlzfEvalW) : 0;
        const deltaPercent = complete ? (deltaW / pAbsEvalW * 100) : 0;
        const thresholdOk = complete && deltaPercent + 1e-9 >= thresholdPercent;
        const minShiftOk = complete && deltaW + 1e-9 >= minShiftW;

        const powerPrice = num(review.powerPriceEurPerKwYear ?? review.powerPriceEurPerKwA ?? review.leistungspreisEurProKwJahr, null);
        const bagatelleEur = Math.max(0, num(review.savingsBagatelleEur ?? review.bagatelleEur ?? 500, 500) || 0);
        const generalGridFeeEur = num(review.generalGridFeeEur ?? review.generalGridFee ?? review.allgemeinesNetzentgeltEur, null);
        const maxReductionPercent = Math.min(100, Math.max(0, num(review.maxReductionPercent ?? 80, 80) || 0));
        const grossSavingsEur = (complete && typeof powerPrice === 'number' && powerPrice > 0) ? ((deltaW / 1000) * powerPrice) : null;
        const reductionCapEur = (grossSavingsEur !== null && typeof generalGridFeeEur === 'number' && generalGridFeeEur > 0) ? (generalGridFeeEur * maxReductionPercent / 100) : null;
        const savingsEur = grossSavingsEur === null ? null : (reductionCapEur === null ? grossSavingsEur : Math.min(grossSavingsEur, reductionCapEur));
        const savingsOk = savingsEur === null ? null : savingsEur + 1e-9 >= bagatelleEur;
        const technicalEligible = complete && thresholdOk && minShiftOk;
        const eligible = enabled && technicalEligible && (savingsOk === null ? true : savingsOk);

        let status = 'disabled';
        if (enabled) {
            if (!complete) status = 'collecting';
            else if (!thresholdOk) status = 'threshold-missing';
            else if (!minShiftOk) status = 'min-shift-missing';
            else if (savingsOk === false) status = 'bagatelle-missing';
            else if (savingsOk === null) status = 'technical-ok-savings-open';
            else status = 'eligible';
        }

        return {
            enabled,
            status,
            year,
            resetIdentity,
            measurementUsable,
            influxLogEnabled: review.influxLogEnabled !== false,
            auditIntervalMinutes: Math.max(1, Math.min(1440, Math.round(num(review.auditIntervalMinutes ?? review.influxSampleIntervalMinutes ?? cfg.auditIntervalMinutes ?? 15, 15) || 15))),
            pAbsMaxW: st.pAbsMaxW,
            pHlzfMaxW: st.pHlzfMaxW,
            pAbsEvalW,
            pHlzfEvalW,
            manualPAbsW: (typeof manualPAbs === 'number' && manualPAbs > 0) ? manualPAbs : null,
            manualHlzfW: (typeof manualHlzf === 'number' && manualHlzf >= 0) ? manualHlzf : null,
            thresholdPercent,
            minShiftW,
            deltaW,
            deltaPercent,
            thresholdOk,
            minShiftOk,
            powerPriceEurPerKwYear: typeof powerPrice === 'number' ? powerPrice : null,
            bagatelleEur,
            grossSavingsEur,
            reductionCapEur,
            savingsEur,
            savingsOk,
            technicalEligible,
            eligible,
            lastUpdate: st.lastUpdate || 0,
        };
    }

    /**
     * Code-Teil: Methode `_setupAtypicalAuditHistory`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setupAtypicalAuditHistory
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setupAtypicalAuditHistory() {
        let historyInstance = '';
        let provisionState = 'missing';
        let provisionError = '';

        try {
            if (this.adapter && typeof this.adapter._nwDetectInfluxInstance === 'function') {
                const detected = await this.adapter._nwDetectInfluxInstance();
                if (detected) provisionState = 'detected';
            }
        } catch (e) {
            provisionState = 'detect_error';
            provisionError = String(e && e.message ? e.message : e);
        }

        try {
            if (this.adapter && typeof this.adapter._nwGetHistoryInstance === 'function') {
                historyInstance = String(this.adapter._nwGetHistoryInstance() || '').trim();
                if (historyInstance && provisionState === 'missing') provisionState = 'configured_or_default';
            }
        } catch (e) {
            historyInstance = '';
            provisionState = 'history_instance_error';
            provisionError = String(e && e.message ? e.message : e);
        }

        const historyReady = !!historyInstance && !!(this.adapter && typeof this.adapter._nwEnsureInfluxCustom === 'function');
        /**
         * Code-Teil: Arrow-Funktion `set`
         * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: set
         * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const set = async (id, val) => {
            try { await this.adapter.setStateAsync(id, val, true); } catch { /* optional */ }
        };

        await set('peakShaving.atypical.audit.historyEnabled', historyReady);
        await set('peakShaving.atypical.audit.historyInstance', historyInstance);
        await set('peakShaving.atypical.audit.historyProvisionState', historyReady ? provisionState : (provisionState || 'missing'));
        await set('peakShaving.atypical.audit.historyProvisionError', provisionError || '');
        await set('peakShaving.atypical.audit.retentionTargetDays', 730);

        if (!historyReady) return;

        const metaIds = [
            'peakShaving.atypical.audit.historyEnabled',
            'peakShaving.atypical.audit.historyInstance',
            'peakShaving.atypical.audit.historyProvisionState',
            'peakShaving.atypical.audit.historyProvisionError',
            'peakShaving.atypical.audit.retentionTargetDays',
        ];
        const auditIds = [
            'peakShaving.atypical.audit.lastSampleTs',
            'peakShaving.atypical.audit.gridImportW',
            'peakShaving.atypical.audit.activeWindow',
            'peakShaving.atypical.audit.windowLabel',
            'peakShaving.atypical.audit.effectiveLimitW',
            'peakShaving.atypical.audit.pAbsMaxW',
            'peakShaving.atypical.audit.pHlzfMaxW',
            'peakShaving.atypical.audit.deltaW',
            'peakShaving.atypical.audit.deltaPercent',
            'peakShaving.atypical.audit.thresholdOk',
            'peakShaving.atypical.audit.minShiftOk',
            'peakShaving.atypical.audit.savingsEur',
            'peakShaving.atypical.audit.eligible',
            'peakShaving.atypical.audit.sampleReason',
            'peakShaving.atypical.audit.snapshotJson',
        ];
        const reviewIds = [
            'peakShaving.atypical.review.status',
            'peakShaving.atypical.review.year',
            'peakShaving.atypical.review.pAbsMaxW',
            'peakShaving.atypical.review.pHlzfMaxW',
            'peakShaving.atypical.review.pAbsEvalW',
            'peakShaving.atypical.review.pHlzfEvalW',
            'peakShaving.atypical.review.deltaW',
            'peakShaving.atypical.review.deltaPercent',
            'peakShaving.atypical.review.thresholdOk',
            'peakShaving.atypical.review.minShiftOk',
            'peakShaving.atypical.review.savingsEur',
            'peakShaving.atypical.review.savingsOk',
            'peakShaving.atypical.review.eligible',
        ];

        for (const id of metaIds) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: true });
        }
        // Audit samples are deliberately logged per write so the CSV/PDF proof can reconstruct
        // a time series even if values stay constant over a longer period.
        for (const id of auditIds) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: false });
        }
        // Review states are maxima/status values; logging only changes keeps Influx lean.
        for (const id of reviewIds) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: true });
        }
    }

    /**
     * Code-Teil: Methode `_getAtypicalAuditIntervalMs`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAtypicalAuditIntervalMs
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAtypicalAuditIntervalMs(atypicalCfg) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const review = (cfg.review && typeof cfg.review === 'object') ? cfg.review : ((cfg.nachkontrolle && typeof cfg.nachkontrolle === 'object') ? cfg.nachkontrolle : {});
        const minutes = num(review.auditIntervalMinutes ?? review.influxSampleIntervalMinutes ?? cfg.auditIntervalMinutes ?? 15, 15);
        const clamped = clamp(Number(minutes), 1, 1440);
        return Math.round((Number.isFinite(clamped) ? clamped : 15) * 60 * 1000);
    }

    /**
     * Code-Teil: Methode `_publishAtypicalAuditSample`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _publishAtypicalAuditSample
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _publishAtypicalAuditSample(ctx) {
        const c = (ctx && typeof ctx === 'object') ? ctx : {};
        const review = (c.review && typeof c.review === 'object') ? c.review : {};
        const cfg = (c.atypicalCfg && typeof c.atypicalCfg === 'object') ? c.atypicalCfg : {};
        const reviewCfg = (cfg.review && typeof cfg.review === 'object') ? cfg.review : ((cfg.nachkontrolle && typeof cfg.nachkontrolle === 'object') ? cfg.nachkontrolle : {});
        if (!review.enabled || reviewCfg.influxLogEnabled === false) return;

        const now = Number.isFinite(Number(c.now)) ? Math.round(Number(c.now)) : Date.now();
        const intervalMs = this._getAtypicalAuditIntervalMs(c.atypicalCfg || {});
        const schedule = (c.schedule && typeof c.schedule === 'object') ? c.schedule : {};
        const activeWindow = !!schedule.active;
        const status = String(review.status || '');
        const reasonSig = `${activeWindow ? 1 : 0}|${status}|${String(c.binding || '')}|${review.eligible ? 1 : 0}`;
        const due = !this._atypicalAuditLastSampleMs || (now - this._atypicalAuditLastSampleMs) >= intervalMs;
        const changedImportant = this._atypicalAuditLastReason && this._atypicalAuditLastReason !== reasonSig;
        if (!due && !changedImportant) return;

        this._atypicalAuditLastSampleMs = now;
        this._atypicalAuditLastReason = reasonSig;

        const rawW = Number.isFinite(Number(c.gridPowerRaw)) ? Number(c.gridPowerRaw) : (Number.isFinite(Number(c.effPower)) ? Number(c.effPower) : 0);
        const gridImportW = Math.max(0, rawW);
        /**
         * Code-Teil: Arrow-Funktion `set`
         * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: set
         * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const set = async (id, val) => {
            try { await this.adapter.setStateAsync(id, val, true); } catch { /* audit only */ }
        };
        const sampleReason = due ? 'interval' : 'state-change';
        const source = (c.source && typeof c.source === 'object') ? c.source : {};
        const target = (c.target && typeof c.target === 'object') ? c.target : {};
        const snapshot = {
            ts: now,
            sampleReason,
            gridImportW: Math.round(gridImportW),
            activeWindow,
            windowLabel: String(schedule.windowLabel || ''),
            effectiveLimitW: Number.isFinite(Number(c.effectiveLimitW)) ? Math.round(Number(c.effectiveLimitW)) : 0,
            binding: String(c.binding || ''),
            status,
            gridOperator: String(source.gridOperator || ''),
            sourceDocument: String(source.sourceDocument || ''),
            sourcePublishedAt: String(source.sourcePublishedAt || ''),
            sourceUrl: String(source.sourceUrl || ''),
            voltageLevel: String(target.voltageLevel || ''),
            thresholdPercent: Number.isFinite(Number(target.thresholdPercent)) ? Number(target.thresholdPercent) : (Number.isFinite(Number(review.thresholdPercent)) ? Number(review.thresholdPercent) : 0),
            minShiftW: Number.isFinite(Number(target.minShiftW)) ? Math.round(Number(target.minShiftW)) : (Number.isFinite(Number(review.minShiftW)) ? Math.round(Number(review.minShiftW)) : 0),
            year: Number.isFinite(Number(review.year)) ? Math.round(Number(review.year)) : 0,
            pAbsMaxW: Number.isFinite(Number(review.pAbsMaxW)) ? Math.round(Number(review.pAbsMaxW)) : 0,
            pHlzfMaxW: Number.isFinite(Number(review.pHlzfMaxW)) ? Math.round(Number(review.pHlzfMaxW)) : 0,
            pAbsEvalW: Number.isFinite(Number(review.pAbsEvalW)) ? Math.round(Number(review.pAbsEvalW)) : 0,
            pHlzfEvalW: Number.isFinite(Number(review.pHlzfEvalW)) ? Math.round(Number(review.pHlzfEvalW)) : 0,
            deltaW: Number.isFinite(Number(review.deltaW)) ? Math.round(Number(review.deltaW)) : 0,
            deltaPercent: Number.isFinite(Number(review.deltaPercent)) ? Math.round(Number(review.deltaPercent) * 100) / 100 : 0,
            thresholdOk: !!review.thresholdOk,
            minShiftOk: !!review.minShiftOk,
            savingsEur: Number.isFinite(Number(review.savingsEur)) ? Math.round(Number(review.savingsEur) * 100) / 100 : null,
            savingsOk: review.savingsOk === null ? null : review.savingsOk === true,
            eligible: !!review.eligible,
        };

        await set('peakShaving.atypical.audit.lastSampleTs', now);
        await set('peakShaving.atypical.audit.gridImportW', snapshot.gridImportW);
        await set('peakShaving.atypical.audit.activeWindow', activeWindow);
        await set('peakShaving.atypical.audit.windowLabel', snapshot.windowLabel);
        await set('peakShaving.atypical.audit.effectiveLimitW', snapshot.effectiveLimitW);
        await set('peakShaving.atypical.audit.pAbsMaxW', snapshot.pAbsMaxW);
        await set('peakShaving.atypical.audit.pHlzfMaxW', snapshot.pHlzfMaxW);
        await set('peakShaving.atypical.audit.deltaW', snapshot.deltaW);
        await set('peakShaving.atypical.audit.deltaPercent', snapshot.deltaPercent);
        await set('peakShaving.atypical.audit.thresholdOk', snapshot.thresholdOk);
        await set('peakShaving.atypical.audit.minShiftOk', snapshot.minShiftOk);
        await set('peakShaving.atypical.audit.savingsEur', snapshot.savingsEur === null ? 0 : snapshot.savingsEur);
        await set('peakShaving.atypical.audit.eligible', snapshot.eligible);
        await set('peakShaving.atypical.audit.sampleReason', sampleReason);
        await set('peakShaving.atypical.audit.snapshotJson', JSON.stringify(snapshot));
    }

    /**
     * Code-Teil: Methode `_publishAtypicalDiagnostics`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _publishAtypicalDiagnostics
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _publishAtypicalDiagnostics(ctx) {
        const c = (ctx && typeof ctx === 'object') ? ctx : {};
        const schedule = (c.schedule && typeof c.schedule === 'object') ? c.schedule : {};
        const target = (c.target && typeof c.target === 'object') ? c.target : {};
        const source = (c.source && typeof c.source === 'object') ? c.source : {};
        const review = (c.review && typeof c.review === 'object') ? c.review : {};
        /**
         * Code-Teil: set
         * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const set = async (id, val) => {
            try { await this.adapter.setStateAsync(id, val, true); } catch { /* diagnostics only */ }
        };

        await set('peakShaving.atypical.enabled', !!c.enabled);
        await set('peakShaving.atypical.enforce', !!c.enforce);
        await set('peakShaving.atypical.activeWindow', !!schedule.active);
        await set('peakShaving.atypical.status', String(schedule.reason || target.reason || ''));
        await set('peakShaving.atypical.windowLabel', String(schedule.windowLabel || ''));
        await set('peakShaving.atypical.voltageLevel', String(target.voltageLevel || ''));
        await set('peakShaving.atypical.thresholdPercent', Number.isFinite(Number(target.thresholdPercent)) ? Number(target.thresholdPercent) : 0);
        await set('peakShaving.atypical.minShiftW', Number.isFinite(Number(target.minShiftW)) ? Math.round(Number(target.minShiftW)) : 0);
        await set('peakShaving.atypical.pAbsRefW', Number.isFinite(Number(target.pAbsRefW)) ? Math.round(Number(target.pAbsRefW)) : 0);
        await set('peakShaving.atypical.targetLimitW', Number.isFinite(Number(target.targetLimitW)) ? Math.round(Number(target.targetLimitW)) : 0);
        await set('peakShaving.atypical.effectiveLimitW', Number.isFinite(Number(c.effectiveLimitW)) ? Math.round(Number(c.effectiveLimitW)) : 0);
        await set('peakShaving.atypical.deltaW', Number.isFinite(Number(target.deltaW)) ? Math.round(Number(target.deltaW)) : 0);
        await set('peakShaving.atypical.deltaPercent', Number.isFinite(Number(target.deltaPercent)) ? Math.round(Number(target.deltaPercent) * 100) / 100 : 0);
        await set('peakShaving.atypical.eligiblePotential', !!target.eligiblePotential);
        await set('peakShaving.atypical.binding', String(c.binding || ''));
        await set('peakShaving.atypical.gridOperator', String(source.gridOperator || ''));
        await set('peakShaving.atypical.year', Number.isFinite(Number(source.year)) ? Math.round(Number(source.year)) : 0);
        await set('peakShaving.atypical.sourceDocument', String(source.sourceDocument || ''));
        await set('peakShaving.atypical.sourcePublishedAt', String(source.sourcePublishedAt || ''));
        await set('peakShaving.atypical.sourceUrl', String(source.sourceUrl || ''));
        await set('peakShaving.atypical.sourceNote', String(source.sourceNote || ''));

        await set('peakShaving.atypical.review.enabled', !!review.enabled);
        await set('peakShaving.atypical.review.status', String(review.status || ''));
        await set('peakShaving.atypical.review.year', Number.isFinite(Number(review.year)) ? Math.round(Number(review.year)) : 0);
        await set('peakShaving.atypical.review.resetIdentity', String(review.resetIdentity || ''));
        await set('peakShaving.atypical.review.pAbsMaxW', Number.isFinite(Number(review.pAbsMaxW)) ? Math.round(Number(review.pAbsMaxW)) : 0);
        await set('peakShaving.atypical.review.pHlzfMaxW', Number.isFinite(Number(review.pHlzfMaxW)) ? Math.round(Number(review.pHlzfMaxW)) : 0);
        await set('peakShaving.atypical.review.pAbsEvalW', Number.isFinite(Number(review.pAbsEvalW)) ? Math.round(Number(review.pAbsEvalW)) : 0);
        await set('peakShaving.atypical.review.pHlzfEvalW', Number.isFinite(Number(review.pHlzfEvalW)) ? Math.round(Number(review.pHlzfEvalW)) : 0);
        await set('peakShaving.atypical.review.deltaW', Number.isFinite(Number(review.deltaW)) ? Math.round(Number(review.deltaW)) : 0);
        await set('peakShaving.atypical.review.deltaPercent', Number.isFinite(Number(review.deltaPercent)) ? Math.round(Number(review.deltaPercent) * 100) / 100 : 0);
        await set('peakShaving.atypical.review.thresholdOk', !!review.thresholdOk);
        await set('peakShaving.atypical.review.minShiftOk', !!review.minShiftOk);
        await set('peakShaving.atypical.review.savingsEur', Number.isFinite(Number(review.savingsEur)) ? Math.round(Number(review.savingsEur) * 100) / 100 : 0);
        await set('peakShaving.atypical.review.savingsOk', review.savingsOk === true);
        await set('peakShaving.atypical.review.eligible', !!review.eligible);
        await set('peakShaving.atypical.review.lastUpdate', Number.isFinite(Number(review.lastUpdate)) ? Math.round(Number(review.lastUpdate)) : 0);
        await set('peakShaving.atypical.review.snapshotJson', JSON.stringify(review || {}));

        await set('peakShaving.atypical.snapshotJson', JSON.stringify({
            ts: Date.now(),
            mode: String(c.mode || ''),
            enabled: !!c.enabled,
            enforce: !!c.enforce,
            schedule,
            target,
            source,
            review,
            limitCandidateW: Number.isFinite(Number(c.limitCandidateW)) ? Math.round(Number(c.limitCandidateW)) : 0,
            effectiveLimitW: Number.isFinite(Number(c.effectiveLimitW)) ? Math.round(Number(c.effectiveLimitW)) : 0,
            binding: String(c.binding || ''),
        }));

        try {
            const nowSetup = Date.now();
            if (!this._atypicalAuditLastHistorySetupMs || (nowSetup - this._atypicalAuditLastHistorySetupMs) >= 5 * 60 * 1000) {
                this._atypicalAuditLastHistorySetupMs = nowSetup;
                await this._setupAtypicalAuditHistory();
            }
        } catch { /* optional */ }
        await this._publishAtypicalAuditSample(c);
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        if (!this._isEnabled()) return;

        const cfg = this.adapter.config.peakShaving || {};
        const now = Date.now();

        // Normalize config
        const mode = String(cfg.mode || 'static');
        const smoothingSeconds = clamp(num(cfg.smoothingSeconds, 10), 1, 600);
        const useAverage = cfg.useAverage !== false; // default true

        // Peak-Shaving limit source:
        // Prefer central plant parameter "Netzanschlussleistung" (installerConfig.gridConnectionPower).
        // Fallback to legacy peakShaving.maxPowerW for backwards compatibility.
        const instLimitW = clamp(num(this.adapter?.config?.installerConfig?.gridConnectionPower, 0), 0, 1e12);
        const legacyLimitW = num(cfg.maxPowerW, 0);
        const plantLimitW = (typeof instLimitW === 'number' && instLimitW > 0) ? instLimitW : legacyLimitW;
        const hysteresisW = clamp(num(cfg.hysteresisW, 500), 0, 1e9);
        const activateDelayS = clamp(num(cfg.activateDelaySeconds, 2), 0, 3600);
        const releaseDelayS = clamp(num(cfg.releaseDelaySeconds, 5), 0, 3600);

        const safetyMarginW = clamp(num(cfg.safetyMarginW, 0), 0, 1e9);
        const fastTripEnabled = cfg.fastTripEnabled !== false; // default true
        const fastTripMode = String(cfg.fastTripMode || 'max'); // max|raw

        const maxPhaseA = num(cfg.maxPhaseA, 0);
        const phaseMode = String(cfg.phaseMode || (maxPhaseA > 0 ? 'enforce' : 'off')); // off|info|enforce
        const hysteresisA = clamp(num(cfg.hysteresisA, 1), 0, 100);
        const voltageV = clamp(num(cfg.voltageV, 230), 50, 400);


        // Atypische Netznutzung / HLZF-Spitzenkappung (§19 Abs. 2 S. 1 StromNEV)
        // strategyMode steuert die UI-Auswahl:
        // - standard: nur klassische Lastspitzenkappung
        // - atypical: nur HLZF-Cap innerhalb aktiver Hochlastzeitfenster
        // - hybrid: klassisch + HLZF, es bindet immer das strengere Limit
        // - monitor: HLZF-Diagnose ohne Peak-Shaving-Setpoint aus diesem Modul
        const atypicalCfg = (cfg.atypical && typeof cfg.atypical === 'object') ? cfg.atypical : {};
        let strategyMode = String(cfg.strategyMode || cfg.strategy || '').trim().toLowerCase();
        if (!['standard', 'atypical', 'hybrid', 'monitor'].includes(strategyMode)) {
            const legacyMode = String(atypicalCfg.mode || '').trim().toLowerCase();
            strategyMode = atypicalCfg.enabled ? (legacyMode === 'monitor' ? 'monitor' : 'hybrid') : 'standard';
        }
        const standardLimitEnabled = strategyMode === 'standard' || strategyMode === 'hybrid';
        const atypicalRuntimeEnabled = !!atypicalCfg.enabled && (strategyMode === 'atypical' || strategyMode === 'hybrid' || strategyMode === 'monitor');
        const atypicalMode = strategyMode === 'monitor' ? 'monitor' : String(atypicalCfg.mode || (strategyMode === 'atypical' ? 'enforce' : 'hybrid')).trim().toLowerCase(); // monitor|enforce|hybrid
        const atypicalEnforce = atypicalRuntimeEnabled && atypicalMode !== 'monitor' && atypicalCfg.enforce !== false;
        const atypicalSchedule = this._evaluateAtypicalSchedule({ ...atypicalCfg, enabled: atypicalRuntimeEnabled }, now);
        const atypicalTarget = this._calculateAtypicalTarget(atypicalCfg);
        const atypicalLimitCandidateW = (atypicalSchedule.active && atypicalEnforce && atypicalTarget.targetLimitW > 0) ? atypicalTarget.targetLimitW : 0;
        const atypicalWantsPowerLimit = atypicalLimitCandidateW > 0;

        // Bind datapoints from config (manufacturer-independent)
        if (cfg.gridPointPowerId) {
            // IMPORTANT: enable alive-prefix heartbeat. Many meters/adapters are event-driven
            // and do not update state.ts while the measurement stays stable.
            await this.dp.upsert({ key: 'ps.gridPowerW', objectId: cfg.gridPointPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        }
        if (cfg.allowedPowerId) {
            await this.dp.upsert({ key: 'ps.allowedPowerW', objectId: cfg.allowedPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.baseLoadPowerId) {
            await this.dp.upsert({ key: 'ps.baseLoadW', objectId: cfg.baseLoadPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.pvPowerId) {
            await this.dp.upsert({ key: 'ps.pvW', objectId: cfg.pvPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.batteryPowerId) {
            await this.dp.upsert({ key: 'ps.batteryW', objectId: cfg.batteryPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.l1CurrentId) await this.dp.upsert({ key: 'ps.l1A', objectId: cfg.l1CurrentId, dataType: 'number', direction: 'in', unit: 'A' });
        if (cfg.l2CurrentId) await this.dp.upsert({ key: 'ps.l2A', objectId: cfg.l2CurrentId, dataType: 'number', direction: 'in', unit: 'A' });
        if (cfg.l3CurrentId) await this.dp.upsert({ key: 'ps.l3A', objectId: cfg.l3CurrentId, dataType: 'number', direction: 'in', unit: 'A' });

        // MU6.7: stale meter failsafe (protect against missing/old grid measurements)
        // IMPORTANT: Many real-world meters update slowly or only on change.
        // A too aggressive legacy default (15s) caused false activation and blocked controlled loads.
        // Default to 300s; if a persisted legacy default "15" exists, treat it as legacy and keep 300.
        // Staleness threshold (seconds). Default is conservative (300s) but can be lowered.
        // NOTE: With the device-prefix heartbeat enabled for NVP/grid metering, low thresholds
        // like 15s are now safe even for event-driven adapters.
        let staleTimeoutSec = num(cfg.staleTimeoutSec, 300);
        staleTimeoutSec = clamp(staleTimeoutSec, 1, 3600);
        const staleMaxAgeMs = staleTimeoutSec * 1000;
        const wantsPowerLimit = (standardLimitEnabled && typeof plantLimitW === 'number' && plantLimitW > 0) || atypicalWantsPowerLimit;
        const wantsPhaseLimit = (phaseMode === 'info' || phaseMode === 'enforce') && typeof maxPhaseA === 'number' && maxPhaseA > 0;
        let staleMeter = false;
        const staleKeys = [];
        const centralNvp = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, now, Math.max(staleMaxAgeMs, 10000));
        const centralNvpCurrent = centralNvp.current;
        if (wantsPowerLimit || wantsPhaseLimit) {
            // Grid power is the primary safety signal
            if (wantsPowerLimit) {
                if (centralNvpCurrent) {
                    if (!centralNvp.usable) staleKeys.push(`nvp:${centralNvp.status || 'stale'}`);
                } else if (!this.dp.getEntry('ps.gridPowerW')) staleKeys.push('ps.gridPowerW');
                else if (this.dp.isStale('ps.gridPowerW', staleMaxAgeMs)) staleKeys.push('ps.gridPowerW');
            }
            if (wantsPhaseLimit) {
                const phaseKeys = ['ps.l1A', 'ps.l2A', 'ps.l3A'];
                const anyPhaseConfigured = phaseKeys.some(k => !!this.dp.getEntry(k));
                if (!anyPhaseConfigured && !wantsPowerLimit && phaseMode === 'enforce') {
                    staleKeys.push('ps.l1A/ps.l2A/ps.l3A');
                } else {
                    for (const k of phaseKeys) {
                        if (this.dp.getEntry(k) && this.dp.isStale(k, staleMaxAgeMs)) staleKeys.push(k);
                    }
                }
            }
            staleMeter = staleKeys.length > 0;
        }

        // Measurements
        const gridPowerRaw = centralNvpCurrent ? (centralNvp.usable ? centralNvp.netW : null) : this.dp.getNumber('ps.gridPowerW', null);
        const l1Raw = this.dp.getNumber('ps.l1A', null);
        const l2Raw = this.dp.getNumber('ps.l2A', null);
        const l3Raw = this.dp.getNumber('ps.l3A', null);

        // Update windows
        this._winPower.setMaxSeconds(smoothingSeconds);
        this._winL1.setMaxSeconds(smoothingSeconds);
        this._winL2.setMaxSeconds(smoothingSeconds);
        this._winL3.setMaxSeconds(smoothingSeconds);

        if (typeof gridPowerRaw === 'number') this._winPower.push(gridPowerRaw, now);
        if (typeof l1Raw === 'number') this._winL1.push(l1Raw, now);
        if (typeof l2Raw === 'number') this._winL2.push(l2Raw, now);
        if (typeof l3Raw === 'number') this._winL3.push(l3Raw, now);

        const avgPower = this._winPower.mean();
        const maxPower = this._winPower.max();
        const effPower = useAverage && typeof avgPower === 'number' ? avgPower : gridPowerRaw;

        // MU6.9: FastTrip path (react to spikes without losing smoothing for steady-state)
        let tripPower = null;
        if (fastTripEnabled) {
            if (fastTripMode === 'max') {
                tripPower = (typeof maxPower === 'number') ? maxPower : gridPowerRaw;
            } else if (fastTripMode === 'raw') {
                tripPower = gridPowerRaw;
            } else {
                tripPower = gridPowerRaw;
            }
        }

        const samples = this._winPower.count();
        await this.adapter.setStateAsync('peakShaving.calc.avgPowerW', typeof avgPower === 'number' ? avgPower : 0, true);
        await this.adapter.setStateAsync('peakShaving.calc.samples', samples, true);

        // Determine power limit
        let limitW = 0;
        let allowedPowerW = null;
        let reserveW = num(cfg.reserveW, 0);
        let limitSource = '';

        if (standardLimitEnabled && mode === 'dynamic') {
            allowedPowerW = this.dp.getNumber('ps.allowedPowerW', null);
            // Central plant limit is a hard cap (if configured). If not configured, allow dynamic DP only.
            const baseMax = (typeof plantLimitW === 'number' && plantLimitW > 0) ? plantLimitW : Number.POSITIVE_INFINITY;
            const allowed = (typeof allowedPowerW === 'number' && allowedPowerW > 0) ? allowedPowerW : Number.POSITIVE_INFINITY;
            limitW = Math.min(baseMax, allowed) - Math.max(0, reserveW);
            if (!Number.isFinite(limitW)) limitW = 0;
            if (limitW > 0) limitSource = (Number.isFinite(baseMax) && Number.isFinite(allowed)) ? 'standard+dynamic' : (Number.isFinite(allowed) ? 'dynamic' : 'standard');
        } else if (standardLimitEnabled) {
            // static: fester Grenzwert, aber Reserve ebenfalls abziehen (Reserve ist keine dynamic-only Funktion)
            const base = (typeof plantLimitW === 'number' && plantLimitW > 0) ? plantLimitW : 0;
            limitW = Math.max(0, base - Math.max(0, reserveW));
            if (limitW > 0) limitSource = 'standard';
        } else {
            // Atypisch-only/Monitor: kein permanenter Standard-Cap außerhalb der HLZF.
            limitW = 0;
            limitSource = '';
        }

        if (atypicalWantsPowerLimit) {
            if (limitW > 0) {
                if (atypicalLimitCandidateW <= limitW + 0.001) {
                    limitSource = limitSource ? `atypical+${limitSource}` : 'atypical';
                }
                limitW = Math.min(limitW, atypicalLimitCandidateW);
            } else {
                limitW = atypicalLimitCandidateW;
                limitSource = 'atypical';
            }
        }

        // GridConstraints (RLM): zusätzliche dynamische Obergrenze für den Netzbezug
        // (wird nur berücksichtigt, wenn das GridConstraints-Modul aktiv ist und RLM eingeschaltet ist)
        if (this.adapter.config.gridConstraints && this.adapter.config.gridConstraints.rlmEnabled) {
            try {
                const st = await this.adapter.getStateAsync('gridConstraints.rlm.capNowW');
                const cap = (st && typeof st.val === 'number') ? st.val : Number(st && st.val);
                if (Number.isFinite(cap) && cap > 0) {
                    const beforeLimitW = limitW;
                    limitW = (limitW > 0) ? Math.min(limitW, cap) : cap;
                    if (limitW > 0 && (!(beforeLimitW > 0) || cap <= beforeLimitW + 0.001)) {
                        limitSource = limitSource
                            ? `gridConstraints+${limitSource}`
                            : 'gridConstraints';
                    }
                }
            } catch {
                // ignore
            }
        }


        // MU6.9: Safety margin (keep headroom to avoid overload due to latency/noise)
        if (typeof limitW === 'number' && limitW > 0) {
            limitW = Math.max(0, limitW - Math.max(0, safetyMarginW));
        }

        const atypicalSource = this._getAtypicalSourceInfo(atypicalCfg);
        const atypicalReview = await this._buildAtypicalReviewContext({
            atypicalCfg: { ...atypicalCfg, enabled: atypicalRuntimeEnabled },
            schedule: atypicalSchedule,
            target: atypicalTarget,
            gridPowerRaw,
            effPower,
            staleMeter,
            now,
        });

        await this._publishAtypicalDiagnostics({
            enabled: !!atypicalRuntimeEnabled,
            mode: atypicalMode,
            enforce: atypicalEnforce,
            schedule: atypicalSchedule,
            target: atypicalTarget,
            source: atypicalSource,
            review: atypicalReview,
            atypicalCfg: { ...atypicalCfg, enabled: atypicalRuntimeEnabled },
            now,
            gridPowerRaw,
            effPower,
            limitCandidateW: atypicalLimitCandidateW,
            effectiveLimitW: atypicalWantsPowerLimit ? limitW : 0,
            binding: atypicalWantsPowerLimit ? (limitSource || 'atypical') : '',
        });

        // Phase analysis
        const l1 = useAverage ? this._winL1.mean() : l1Raw;
        const l2 = useAverage ? this._winL2.mean() : l2Raw;
        const l3 = useAverage ? this._winL3.mean() : l3Raw;

        const phases = [
            { k: 'L1', v: typeof l1 === 'number' ? l1 : null },
            { k: 'L2', v: typeof l2 === 'number' ? l2 : null },
            { k: 'L3', v: typeof l3 === 'number' ? l3 : null },
        ].filter(p => typeof p.v === 'number');

        let worstPhase = '';
        let worstPhaseOverA = 0;
        if (phases.length && typeof maxPhaseA === 'number' && maxPhaseA > 0) {
            let best = { k: '', over: 0 };
            for (const p of phases) {
                const over = (p.v - maxPhaseA);
                if (over > best.over) best = { k: p.k, over };
            }
            worstPhase = best.k;
            worstPhaseOverA = best.over > 0 ? best.over : 0;
        }

        const phaseViolation = worstPhaseOverA > 0;
        const requiredReductionA = phaseViolation ? worstPhaseOverA : 0;
        const requiredReductionWPhase1p = phaseViolation ? requiredReductionA * voltageV : 0;
        const requiredReductionWPhase3p = phaseViolation ? requiredReductionA * voltageV * 3 : 0;

        // Power violation
        const overWAvg = (typeof effPower === 'number' && limitW > 0) ? (effPower - limitW) : 0;
        const overWTrip = (fastTripEnabled && typeof tripPower === 'number' && limitW > 0) ? (tripPower - limitW) : 0;
        const overW = Math.max(0, overWAvg, overWTrip);
        const powerViolation = overW > 0;
        const fastTripViolation = overWTrip > 0;

        // Determine whether we consider phase for activation
        const considerPhase = phaseMode === 'info' || phaseMode === 'enforce';
        const canActivateFromPhaseOnly = phaseMode === 'enforce';

        const hasPowerLimit = limitW > 0;
        const violationNow =
            staleMeter ||
            (hasPowerLimit && powerViolation) ||
            (considerPhase && phaseViolation && (hasPowerLimit || canActivateFromPhaseOnly));

        // Determine requested reduction (W)
        const reqFromPower = powerViolation ? overW : 0;
        const reqFromPhase = (considerPhase && phaseViolation) ? requiredReductionWPhase3p : 0;
        const requiredReductionW = staleMeter ? 1000000000 : Math.max(0, reqFromPower, reqFromPhase);
        // State machine with delays/hysteresis
        const underPowerRelease = !hasPowerLimit ? true : (typeof effPower === 'number' ? effPower <= (limitW - hysteresisW) : true);
        const underPhaseRelease = !considerPhase ? true : (phaseViolation ? false : true); // if no violation, ok
        const releaseConditionNow = !staleMeter && !fastTripViolation && underPowerRelease && underPhaseRelease;

        let status = this._status;
        let active = status === 'active';

        if (status === 'inactive') {
            if (violationNow) {
                status = fastTripViolation ? 'active' : (activateDelayS > 0 ? 'pending_on' : 'active');
                this._pendingSince = now;
                if (status === 'active') this._activeSince = now;
            }
        } else if (status === 'pending_on') {
            if (!violationNow) {
                status = 'inactive';
                this._pendingSince = 0;
            } else if (fastTripViolation) {
                status = 'active';
                this._pendingSince = 0;
                this._activeSince = now;
            } else if ((now - this._pendingSince) >= activateDelayS * 1000) {
                status = 'active';
                this._activeSince = now;
            }
        } else if (status === 'active') {
            if (releaseConditionNow) {
                status = releaseDelayS > 0 ? 'pending_off' : 'inactive';
                this._pendingSince = now;
                if (status === 'inactive') this._pendingSince = 0;
            }
        } else if (status === 'pending_off') {
            if (!releaseConditionNow) {
                status = 'active';
                this._pendingSince = 0;
            } else if ((now - this._pendingSince) >= releaseDelayS * 1000) {
                status = 'inactive';
                this._pendingSince = 0;
            }
        }


        // MU6.9: fast trip => force immediate active (bypass activate delay)
        if (fastTripViolation) {
            status = 'active';
            this._pendingSince = 0;
            this._activeSince = now;
        }

        // MU6.7: stale meter => force immediate active (bypass delays)
        if (staleMeter) {
            status = 'active';
            this._pendingSince = 0;
            if (!this._activeSince) this._activeSince = now;
        }
        this._status = status;
        active = status === 'active';

        // Reason (MU6.12): standardized reason codes
        let reason = ReasonCodes.OK;
        if (staleMeter) {
            reason = ReasonCodes.STALE_METER;
        } else if (active || status.startsWith('pending')) {
            if (powerViolation && phaseViolation && considerPhase) reason = ReasonCodes.LIMIT_POWER_AND_PHASE;
            else if (powerViolation) reason = ReasonCodes.LIMIT_POWER;
            else if (phaseViolation && considerPhase) reason = ReasonCodes.LIMIT_PHASE;
            else reason = ReasonCodes.UNKNOWN;
        }

        let availableForControlledW = 0;

        // Dynamic diagnostics
        if (mode === 'dynamic') {
            const baseLoadW = this.dp.getNumber('ps.baseLoadW', 0) || 0;
            const pvW = this.dp.getNumber('ps.pvW', 0) || 0;
            const batteryW = this.dp.getNumber('ps.batteryW', 0) || 0;

            // A heuristic: baseLoad minus PV minus (discharging battery positive?) user-defined conventions differ.
            // We store values as-is and compute a conservative available budget.
            availableForControlledW = Math.max(0, limitW - Math.max(0, baseLoadW - pvW - batteryW));

            await this.adapter.setStateAsync('peakShaving.dynamic.allowedPowerW', typeof allowedPowerW === 'number' ? allowedPowerW : 0, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.reserveW', reserveW || 0, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.effectiveLimitW', limitW || 0, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.baseLoadW', baseLoadW, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.pvW', pvW, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.batteryW', batteryW, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.availableForControlledW', availableForControlledW, true);

            // Mirror for easier consumption by other modules
            await this.adapter.setStateAsync('peakShaving.control.availableForControlledW', availableForControlledW, true).catch(() => {});
        } else {
            // ensure mirror exists
            await this.adapter.setObjectNotExistsAsync('peakShaving.control.availableForControlledW', {
                type: 'state',
                common: { name: 'Available for controlled loads (W)', type: 'number', role: 'value.power', read: true, write: false },
                native: {},
            }).catch(() => {});
            await this.adapter.setStateAsync('peakShaving.control.availableForControlledW', 0, true).catch(() => {});
        }

        // Publish control states
        await this.adapter.setStateAsync('peakShaving.control.active', active, true);
        await this.adapter.setStateAsync('peakShaving.control.status', status, true);
        await this.adapter.setStateAsync('peakShaving.control.reason', reason, true);
        await this.adapter.setStateAsync('peakShaving.control.reasonText', reasonToGerman(reason), true);
        await this.adapter.setStateAsync('peakShaving.control.limitW', limitW || 0, true);
        await this.adapter.setStateAsync('peakShaving.control.effectivePowerW', typeof effPower === 'number' ? effPower : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.overW', powerViolation ? overW : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.requiredReductionW', active ? requiredReductionW : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.requiredReductionA', active ? requiredReductionA : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.phaseViolation', phaseViolation, true);
        await this.adapter.setStateAsync('peakShaving.control.worstPhase', worstPhase, true);
        await this.adapter.setStateAsync('peakShaving.control.worstPhaseOverA', worstPhaseOverA || 0, true);
        await this.adapter.setStateAsync('peakShaving.control.lastUpdate', now, true);

        // Actuation (Step 1.5)
        const actEnabled = !!cfg.actuationEnabled;
        const actuators = Array.isArray(cfg.actuators) ? cfg.actuators : [];
        this.adapter._peakShavingAuthorityActive = !!(actEnabled && ((active && requiredReductionW > 0) || this._restorePending));

        // New activation starts with a fresh baseline snapshot. A pending restore
        // is retried until the real actuator state is confirmed or the contract
        // enters its bounded fault lock.
        if (active && !this._wasActive) {
            this._baselines.clear();
            this._restorePending = false;
        }

        let actuatorResult = {
            requestedReductionW: active ? requiredReductionW : 0,
            acceptedReductionW: 0,
            confirmedReductionW: 0,
            unmetReductionW: active ? requiredReductionW : 0,
            pendingCount: 0,
            faultCount: 0,
        };
        if (actEnabled && active && requiredReductionW > 0) {
            actuatorResult = await this._applyActuators(actuators, requiredReductionW, voltageV);
        } else if (actEnabled && !active && (this._wasActive || this._restorePending || this._baselines.size > 0)) {
            const restore = await this._restoreActuators(actuators);
            this._restorePending = !restore.complete;
            actuatorResult.pendingCount = restore.pendingCount;
            actuatorResult.faultCount = restore.faultCount;
        } else if (!actEnabled) {
            this._restorePending = false;
        }
        // Restore authority must remain visible in the same cycle in which the
        // restore is still pending. Otherwise a later comfort module could write
        // against a not-yet-restored actuator before the next EMS tick.
        this.adapter._peakShavingAuthorityActive = !!(actEnabled && (
            (active && requiredReductionW > 0) || this._restorePending || this._baselines.size > 0
        ));

        await this.adapter.setStateAsync('peakShaving.control.requestedActuatorReductionW', Math.round(Math.max(0, actuatorResult.requestedReductionW || 0)), true);
        await this.adapter.setStateAsync('peakShaving.control.acceptedActuatorReductionW', Math.round(Math.max(0, actuatorResult.acceptedReductionW || 0)), true);
        await this.adapter.setStateAsync('peakShaving.control.confirmedActuatorReductionW', Math.round(Math.max(0, actuatorResult.confirmedReductionW || 0)), true);
        await this.adapter.setStateAsync('peakShaving.control.unmetActuatorReductionW', Math.round(Math.max(0, actuatorResult.unmetReductionW || 0)), true);
        await this.adapter.setStateAsync('peakShaving.control.actuatorWritePendingCount', Math.max(0, Math.round(actuatorResult.pendingCount || 0)), true);
        await this.adapter.setStateAsync('peakShaving.control.actuatorFaultCount', Math.max(0, Math.round(actuatorResult.faultCount || 0)), true);
        await this.adapter.setStateAsync('peakShaving.control.restorePending', !!this._restorePending, true);


        // MU6.1: diagnostics logging (compact)
        const diagCfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        if (diagCfg && diagCfg.enabled) {
            const lvl = (diagCfg.logLevel === 'info' || diagCfg.logLevel === 'debug') ? diagCfg.logLevel : 'debug';
            const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[lvl] === 'function') ? this.adapter.log[lvl] : this.adapter.log.debug;
            try {
                fn.call(this.adapter.log, `[Lastspitzenkappung] Modus=${mode} aktiv=${active} status=${status} Grund=${reason} (${reasonToGerman(reason)}) MesswertAlt=${staleMeter ? 1 : 0} FastTrip=${fastTripViolation ? 1 : 0} Safety=${Math.round(Number(safetyMarginW || 0))}W Limit=${Math.round(Number(limitW || 0))}W Quelle=${limitSource || 'none'} Atypisch=${atypicalSchedule.active ? 1 : 0} AtypischLimit=${Math.round(Number(atypicalLimitCandidateW || 0))}W Roh=${Math.round(Number(gridPowerRaw || 0))}W MW=${Math.round(Number(avgPower || 0))}W Trip=${Math.round(Number(tripPower || 0))}W Eff=${Math.round(Number(effPower || 0))}W Über=${Math.round(Number(overW || 0))}W VerfCtl=${Math.round(Number(availableForControlledW || 0))}W BedarfRed=${Math.round(Number(requiredReductionW || 0))}W`);
            } catch {
                // ignore
            }
        }

        this._wasActive = active;
    }

    /**
     * Code-Teil: Methode `_ensureActuatorChannel`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _ensureActuatorChannel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureActuatorChannel(idPart) {
        const ch = `peakShaving.actuators.${idPart}`;
        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: idPart },
            native: {},
        });
        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mk
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mk = async (sid, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(`${ch}.${sid}`, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };
        await mk('target', 'Target (W/A)', 'number', 'value');
        await mk('owner', 'Actuator owner', 'string', 'text');
        await mk('requestedReductionW', 'Requested reduction (W)', 'number', 'value.power');
        await mk('acceptedReductionW', 'Accepted reduction (W)', 'number', 'value.power');
        await mk('confirmedReductionW', 'Confirmed reduction (W)', 'number', 'value.power');
        await mk('appliedReductionW', 'Applied reduction (W)', 'number', 'value.power');
        await mk('writeAccepted', 'Write accepted', 'boolean', 'indicator');
        await mk('readbackOk', 'Readback confirmed', 'boolean', 'indicator');
        await mk('writePending', 'Write pending', 'boolean', 'indicator');
        await mk('retryCount', 'Retries', 'number', 'value');
        await mk('faultLocked', 'Fault locked', 'boolean', 'indicator');
        await mk('writeContractStatus', 'Write contract status', 'string', 'text');
        await mk('restorePending', 'Restore pending', 'boolean', 'indicator');
        await mk('status', 'Status', 'string', 'text');
        await mk('lastWrite', 'Last write', 'number', 'value.time');
        return ch;
    }

    _actuatorOwner(safeId) {
        return `peakShaving.${safeId}`;
    }

    _actuatorIds(a, safeId) {
        const ids = [];
        for (const key of [`ps.act.${safeId}.setpoint`, `ps.act.${safeId}.enable`]) {
            try {
                const id = String(this.dp && this.dp.getEntry && this.dp.getEntry(key)?.objectId || '').trim();
                if (id && !ids.includes(id)) ids.push(id);
            } catch (_e) {}
        }
        if (a.readbackId && !ids.includes(a.readbackId)) ids.push(a.readbackId);
        return ids;
    }

    _actuatorHasExclusiveAuthority(a, safeId, owner) {
        const matrix = this.adapter && this.adapter._stageAActuatorOwnerById;
        const ids = this._actuatorIds(a, safeId).filter((id) => id !== a.readbackId);
        if (!ids.length || !matrix || typeof matrix !== 'object') return false;
        return ids.every((id) => {
            const row = matrix[id];
            const activeOwners = Array.isArray(row && row.activeOwners)
                ? row.activeOwners.map((value) => String(value || '').trim()).filter(Boolean)
                : [];
            return activeOwners.length === 1 && activeOwners[0] === owner;
        });
    }

    _actuatorContractCfg(a) {
        return {
            requireReadback: a.requireReadback === true && !!a.readbackKey,
            ackTimeoutMs: Math.max(250, Math.round(num(a.readbackTimeoutSec, 5) * 1000)),
            retryDelayMs: Math.max(250, Math.round(num(a.retryDelaySec, 3) * 1000)),
            maxRetries: Math.max(0, Math.round(num(a.maxRetries, 3))),
            faultLockMs: Math.max(1000, Math.round(num(a.faultLockSec, 60) * 1000)),
        };
    }

    _readActuatorReadback(a, safeId) {
        try {
            const staleMs = Math.max(250, Math.round(num(a.readbackMaxAgeSec, 15) * 1000));
            if (a.readbackKey) {
                if (a.mode === 'onOff') {
                    const value = this.dp.getBoolean(a.readbackKey, null);
                    const age = this.dp.getAgeMs ? this.dp.getAgeMs(a.readbackKey) : null;
                    return (value === null || (Number.isFinite(age) && age > staleMs)) ? null : !!value;
                }
                const value = this.dp.getNumberFresh(a.readbackKey, staleMs, null);
                return Number.isFinite(Number(value)) ? Number(value) : null;
            }
            if (a.mode === 'onOff' && a.measurePowerId) {
                const value = this.dp.getNumberFresh(`ps.act.${safeId}.measureW`, staleMs, null);
                return Number.isFinite(Number(value)) ? Number(value) : null;
            }
        } catch (_e) {}
        return null;
    }

    _actuatorReadbackMatches(a, requested, actual) {
        if (actual === null || actual === undefined) return null;
        if (a.mode === 'onOff') {
            const expectedEnabled = requested && requested.enable === true;
            if (typeof actual === 'boolean') return actual === expectedEnabled;
            const n = Number(actual);
            if (!Number.isFinite(n)) return null;
            const toleranceW = Math.max(10, num(a.readbackTolerance, 100));
            return expectedEnabled ? n > toleranceW : n <= toleranceW;
        }
        const expected = Number(requested && requested.target);
        const value = Number(actual);
        if (!Number.isFinite(expected) || !Number.isFinite(value)) return null;
        const tolerance = Math.max(0.01, num(a.readbackTolerance, a.mode === 'limitA' ? 0.25 : Math.max(50, Math.abs(expected) * 0.03)));
        return Math.abs(value - expected) <= tolerance;
    }

    async _publishActuatorContract(ch, owner, requestedReductionW, acceptedReductionW, confirmedReductionW, contract, restorePending = false) {
        await this.adapter.setStateAsync(`${ch}.owner`, owner, true);
        await this.adapter.setStateAsync(`${ch}.requestedReductionW`, Math.round(Math.max(0, num(requestedReductionW, 0))), true);
        await this.adapter.setStateAsync(`${ch}.acceptedReductionW`, Math.round(Math.max(0, num(acceptedReductionW, 0))), true);
        await this.adapter.setStateAsync(`${ch}.confirmedReductionW`, Math.round(Math.max(0, num(confirmedReductionW, 0))), true);
        await this.adapter.setStateAsync(`${ch}.appliedReductionW`, Math.round(Math.max(0, num(confirmedReductionW, 0))), true);
        await this.adapter.setStateAsync(`${ch}.writeAccepted`, !!contract.accepted, true);
        await this.adapter.setStateAsync(`${ch}.readbackOk`, contract.readbackOk === true, true);
        await this.adapter.setStateAsync(`${ch}.writePending`, !!contract.pending, true);
        await this.adapter.setStateAsync(`${ch}.retryCount`, Math.max(0, Math.round(num(contract.retryCount, 0))), true);
        await this.adapter.setStateAsync(`${ch}.faultLocked`, !!contract.faultLocked, true);
        await this.adapter.setStateAsync(`${ch}.writeContractStatus`, String(contract.status || ''), true);
        await this.adapter.setStateAsync(`${ch}.restorePending`, !!restorePending, true);
    }

    async _writeActuatorCommand(a, safeId, ch, requested, reason, releaseAuthority = false) {
        const owner = this._actuatorOwner(safeId);
        const key = `peakShaving:${safeId}`;
        const cfg = this._actuatorContractCfg(a);
        const now = Date.now();
        const actualBefore = this._readActuatorReadback(a, safeId);
        const readbackBefore = this._actuatorReadbackMatches(a, requested, actualBefore);
        const confirmed = this._actuatorContract.confirmFromReadback(key, requested, actualBefore, readbackBefore === true, now);
        if (confirmed) return { accepted: true, confirmed: true, contract: confirmed, owner, actual: actualBefore };

        const decision = this._actuatorContract.prepare(key, requested, now, cfg);
        if (!decision.allowed) {
            return { accepted: false, confirmed: false, contract: this._actuatorContract.result(key, now, decision.targetChanged), owner, actual: actualBefore };
        }

        const enforceAuthority = this._actuatorHasExclusiveAuthority(a, safeId, owner);
        const writeResult = await withActuatorShadowContext(this.adapter, {
            owner,
            module: 'peakShaving',
            priority: priorityForOwner(owner),
            reason,
            leaseMs: 20000,
            kind: 'peak-shaving-actuator',
            enforceAuthority,
            releaseAuthority,
        }, async () => {
            const results = [];
            if (a.mode === 'onOff') {
                if (a.enableId) results.push(await this.dp.writeBoolean(`ps.act.${safeId}.enable`, requested.enable === true, false));
            } else {
                if (a.setpointId) results.push(await this.dp.writeNumber(`ps.act.${safeId}.setpoint`, requested.target, false));
                if (a.enableId) results.push(await this.dp.writeBoolean(`ps.act.${safeId}.enable`, requested.enable === true, false));
            }
            return results.length > 0 && results.every((value) => value !== false);
        });
        const accepted = writeResult === true;
        const actualAfter = this._readActuatorReadback(a, safeId);
        const readbackOk = this._actuatorReadbackMatches(a, requested, actualAfter);
        const contract = this._actuatorContract.complete(key, requested, accepted, readbackOk, actualAfter, Date.now(), cfg);
        return { accepted, confirmed: contract.confirmed, contract, owner, actual: actualAfter };
    }

    _normalizeActuators(actuators) {
        return (Array.isArray(actuators) ? actuators : [])
            .filter((row) => row && row.enabled !== false)
            .map((row) => ({
                id: String(row.id || '').trim(),
                name: String(row.name || ''),
                mode: String(row.mode || 'limitW'),
                phases: Number(row.phases || 3),
                priority: Number(row.priority || 999),
                measurePowerId: String(row.measurePowerId || '').trim(),
                setpointId: String(row.setpointId || '').trim(),
                enableId: String(row.enableId || '').trim(),
                readbackId: String(row.readbackId || row.actualId || '').trim(),
                readbackScale: Number.isFinite(Number(row.readbackScale)) ? Number(row.readbackScale) : 1,
                readbackInvert: row.readbackInvert === true,
                requireReadback: row.requireReadback === true,
                readbackTolerance: num(row.readbackTolerance, null),
                readbackMaxAgeSec: num(row.readbackMaxAgeSec, 15),
                readbackTimeoutSec: num(row.readbackTimeoutSec, 5),
                retryDelaySec: num(row.retryDelaySec, 3),
                maxRetries: num(row.maxRetries, 3),
                faultLockSec: num(row.faultLockSec, 60),
                min: num(row.min, null),
                max: num(row.max, null),
            }))
            .filter((row) => row.id && (row.setpointId || row.enableId))
            .sort((a, b) => (a.priority - b.priority) || a.id.localeCompare(b.id));
    }

    async _prepareActuatorDatapoints(a, safeId) {
        if (a.measurePowerId) await this.dp.upsert({ key: `ps.act.${safeId}.measureW`, objectId: a.measurePowerId, dataType: 'number', direction: 'in', unit: 'W' });
        if (a.setpointId) await this.dp.upsert({ key: `ps.act.${safeId}.setpoint`, objectId: a.setpointId, dataType: 'number', direction: 'out' });
        if (a.enableId) await this.dp.upsert({ key: `ps.act.${safeId}.enable`, objectId: a.enableId, dataType: 'boolean', direction: 'out' });
        if (a.readbackId) {
            await this.dp.upsert({
                key: `ps.act.${safeId}.readback`,
                objectId: a.readbackId,
                dataType: a.mode === 'onOff' ? 'boolean' : 'number',
                direction: 'in',
                scale: a.readbackScale,
                invert: a.readbackInvert,
                unit: a.mode === 'limitA' ? 'A' : (a.mode === 'limitW' ? 'W' : ''),
            });
            a.readbackKey = `ps.act.${safeId}.readback`;
        } else {
            a.readbackKey = '';
        }
    }

    /**
     * Code-Teil: Methode `_applyActuators`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _applyActuators
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _applyActuators(actuators, requestedReductionW, voltageV) {
        let remainingW = Math.max(0, num(requestedReductionW, 0));
        let acceptedReductionW = 0;
        let confirmedReductionW = 0;
        let pendingCount = 0;
        let faultCount = 0;
        const list = this._normalizeActuators(actuators);

        for (const a of list) {
            if (remainingW <= 0) break;
            const safeId = a.id.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64);
            const ch = await this._ensureActuatorChannel(safeId);
            await this._prepareActuatorDatapoints(a, safeId);

            const phases = a.phases === 1 ? 1 : 3;
            const vFactor = Math.max(1, voltageV * phases);
            let baseline = null;
            let baselineEnabled = null;
            const mem = this._baselines.get(safeId);
            if (mem) {
                baseline = mem.baseline;
                baselineEnabled = mem.baselineEnabled;
            } else {
                if (a.mode === 'limitW') {
                    const measured = a.measurePowerId ? this.dp.getNumber(`ps.act.${safeId}.measureW`, null) : null;
                    const currentSetpoint = a.setpointId ? this.dp.getNumber(`ps.act.${safeId}.setpoint`, null) : null;
                    baseline = typeof measured === 'number' ? measured : (typeof currentSetpoint === 'number' ? currentSetpoint : (typeof a.max === 'number' ? a.max : null));
                } else if (a.mode === 'limitA') {
                    const currentSetpoint = a.setpointId ? this.dp.getNumber(`ps.act.${safeId}.setpoint`, null) : null;
                    baseline = typeof currentSetpoint === 'number' ? currentSetpoint : (typeof a.max === 'number' ? a.max : null);
                }
                baselineEnabled = a.enableId ? this.dp.getBoolean(`ps.act.${safeId}.enable`, null) : null;
                this._baselines.set(safeId, { mode: a.mode, phases, baseline, baselineEnabled });
            }

            let requestedForActuatorW = 0;
            let requested = null;
            let targetValue = 0;
            if (a.mode === 'onOff') {
                const measuredW = a.measurePowerId ? this.dp.getNumber(`ps.act.${safeId}.measureW`, null) : null;
                const assumedW = typeof measuredW === 'number' && measuredW > 0 ? measuredW : (typeof a.max === 'number' ? a.max : 0);
                if (!(assumedW > 0 && remainingW >= assumedW * 0.5 && a.enableId)) {
                    await this.adapter.setStateAsync(`${ch}.status`, 'skipped', true);
                    continue;
                }
                requestedForActuatorW = Math.min(remainingW, assumedW);
                requested = { enable: false };
                targetValue = 0;
            } else if (typeof baseline !== 'number' || !Number.isFinite(baseline)) {
                await this.adapter.setStateAsync(`${ch}.status`, 'no_baseline', true);
                continue;
            } else if (a.mode === 'limitW') {
                const minW = typeof a.min === 'number' ? a.min : 0;
                const maxW = typeof a.max === 'number' ? a.max : baseline;
                const baseW = clamp(baseline, minW, maxW);
                const reducibleW = Math.max(0, baseW - minW);
                requestedForActuatorW = Math.min(remainingW, reducibleW);
                targetValue = baseW - requestedForActuatorW;
                requested = { target: targetValue, enable: targetValue > 0 };
            } else if (a.mode === 'limitA') {
                const minA = typeof a.min === 'number' ? a.min : 0;
                const maxA = typeof a.max === 'number' ? a.max : baseline;
                const baseA = clamp(baseline, minA, maxA);
                const reducibleW = Math.max(0, (baseA - minA) * vFactor);
                requestedForActuatorW = Math.min(remainingW, reducibleW);
                targetValue = baseA - (requestedForActuatorW / vFactor);
                requested = { target: targetValue, enable: targetValue > 0 };
            } else {
                await this.adapter.setStateAsync(`${ch}.status`, 'unsupported_mode', true);
                continue;
            }

            if (!(requestedForActuatorW > 0) || !requested) continue;
            const result = await this._writeActuatorCommand(a, safeId, ch, requested, 'peak-reduction', false);
            const acceptedW = result.accepted ? requestedForActuatorW : 0;
            const confirmedW = result.confirmed ? requestedForActuatorW : 0;
            acceptedReductionW += acceptedW;
            confirmedReductionW += confirmedW;
            remainingW = Math.max(0, remainingW - confirmedW);
            if (result.contract.pending) pendingCount += 1;
            if (result.contract.faultLocked) faultCount += 1;

            await this.adapter.setStateAsync(`${ch}.target`, targetValue, true);
            await this.adapter.setStateAsync(`${ch}.status`, result.confirmed ? (a.mode === 'onOff' ? 'disabled-confirmed' : 'limited-confirmed') : String(result.contract.status || 'pending'), true);
            if (result.accepted) await this.adapter.setStateAsync(`${ch}.lastWrite`, Date.now(), true);
            await this._publishActuatorContract(ch, result.owner, requestedForActuatorW, acceptedW, confirmedW, result.contract, false);
        }

        return {
            requestedReductionW: Math.max(0, num(requestedReductionW, 0)),
            acceptedReductionW,
            confirmedReductionW,
            unmetReductionW: Math.max(0, num(requestedReductionW, 0) - confirmedReductionW),
            pendingCount,
            faultCount,
        };
    }

    /**
     * Code-Teil: Methode `_restoreActuators`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _restoreActuators
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _restoreActuators(actuators) {
        const list = this._normalizeActuators(actuators);
        let pendingCount = 0;
        let faultCount = 0;
        const restored = [];

        for (const a of list) {
            const safeId = a.id.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64);
            const mem = this._baselines.get(safeId);
            if (!mem) continue;
            const ch = await this._ensureActuatorChannel(safeId);
            await this._prepareActuatorDatapoints(a, safeId);

            let requested = null;
            let targetValue = 0;
            if (a.mode === 'onOff') {
                if (typeof mem.baselineEnabled !== 'boolean' || !a.enableId) {
                    restored.push(safeId);
                    this._actuatorContract.release(`peakShaving:${safeId}`);
                    continue;
                }
                requested = { enable: mem.baselineEnabled };
                targetValue = mem.baselineEnabled ? 1 : 0;
            } else if (typeof mem.baseline === 'number' && Number.isFinite(mem.baseline)) {
                requested = { target: mem.baseline, enable: typeof mem.baselineEnabled === 'boolean' ? mem.baselineEnabled : mem.baseline > 0 };
                targetValue = mem.baseline;
            } else if (typeof mem.baselineEnabled === 'boolean' && a.enableId) {
                requested = { target: 0, enable: mem.baselineEnabled };
                targetValue = mem.baselineEnabled ? 1 : 0;
            }

            if (!requested) {
                restored.push(safeId);
                this._actuatorContract.release(`peakShaving:${safeId}`);
                continue;
            }

            const result = await this._writeActuatorCommand(a, safeId, ch, requested, 'peak-restore', true);
            const restoreComplete = result.confirmed || (result.accepted && a.requireReadback !== true);
            if (restoreComplete) {
                restored.push(safeId);
                this._actuatorContract.release(`peakShaving:${safeId}`);
            } else {
                if (result.contract.pending) pendingCount += 1;
                if (result.contract.faultLocked) faultCount += 1;
            }
            await this.adapter.setStateAsync(`${ch}.target`, targetValue, true);
            await this.adapter.setStateAsync(`${ch}.status`, restoreComplete ? 'restored' : String(result.contract.status || 'restore-pending'), true);
            if (result.accepted) await this.adapter.setStateAsync(`${ch}.lastWrite`, Date.now(), true);
            await this._publishActuatorContract(ch, result.owner, 0, 0, 0, result.contract, !restoreComplete);
        }

        for (const safeId of restored) this._baselines.delete(safeId);
        return { complete: this._baselines.size === 0, pendingCount, faultCount };
    }

}

module.exports = { PeakShavingModule };
