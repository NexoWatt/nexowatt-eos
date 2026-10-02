'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/utils/number.ts
 * Quell-Hash: sha256:4697ce157c0cc0e0df67dbede599b62474811d0bdad2acf85c630e3b68659422
 * Erzeugung: npm run sync:ts-energy-flow-mirrors
 *
 * Zweck:
 * Zahlenhelfer für Watt/Prozent/0-Werte.
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
exports.isFiniteNumber = isFiniteNumber;
exports.toNumberOrNull = toNumberOrNull;
exports.clampNumber = clampNumber;
exports.positiveWatt = positiveWatt;
exports.percent = percent;
exports.roundForDisplay = roundForDisplay;
/**
 * Datei: src-ts/utils/number.ts
 *
 * Zweck:
 * Kleine, reine Zahlen-Helfer für die spätere TypeScript-Migration.
 * Diese Funktionen werden aktuell noch nicht von der produktiven Adapter-Runtime genutzt.
 *
 * Zusammenhang:
 * Energiefluss, Heizstab, History, KI-Berater und App-Center arbeiten alle mit Watt-,
 * Prozent- und optionalen Zahlenwerten. In JavaScript sind diese Werte bisher nur normale
 * `number`-Werte. Diese Datei legt die spätere gemeinsame TypeScript-Basis an, damit
 * überall dieselbe Null-/Fallback-Logik gilt.
 *
 * Kritische Regel:
 * `0` ist ein gültiger Messwert. Das gilt besonders für Speicher-Laden/Entladen,
 * Netzbezug, Netzeinspeisung und Heizstab-Leistung. Kein Helfer in dieser Datei darf
 * `0` als „nicht vorhanden“ interpretieren.
 */
/**
 * Code-Teil: isFiniteNumber
 *
 * Zweck:
 * Prüft, ob ein unbekannter Wert bereits eine echte endliche JavaScript-Zahl ist.
 *
 * Zusammenhang:
 * Diese Prüfung ist die spätere Grundlage für Resolver, die zwischen „0 W ist gültig“
 * und „Wert fehlt wirklich“ unterscheiden müssen. Sie darf nur `NaN`, `Infinity`,
 * Strings, Objekte und leere Werte ablehnen.
 *
 * TypeScript-Hinweis:
 * Der Rückgabetyp `value is number` ist ein Type Guard. Nach erfolgreicher Prüfung
 * erkennt TypeScript den Wert im aufrufenden Code als `number`.
 */
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
/**
 * Code-Teil: toNumberOrNull
 *
 * Zweck:
 * Wandelt ioBroker-/UI-Werte robust in eine Zahl um. Strings mit deutschem Komma
 * werden ebenfalls akzeptiert, z. B. `"12,5"`.
 *
 * Zusammenhang:
 * Viele Datenpunkte kommen als number, string oder leerer Wert aus ioBroker. Diese
 * Funktion vereinheitlicht das Verhalten für spätere TypeScript-Resolver.
 *
 * Wichtig:
 * `null` bedeutet bewusst „nicht vorhanden / nicht verwertbar“. `0` bleibt eine echte
 * Zahl und muss als gültiger Messwert weitergegeben werden.
 */
function toNumberOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
/**
 * Code-Teil: clampNumber
 *
 * Zweck:
 * Begrenzt numerische Konfigurationswerte auf einen erlaubten Bereich.
 *
 * Zusammenhang:
 * Wird später für Schwellenwerte wie Speicherreserve, Peak-Warnschwelle,
 * Prozentwerte und KI-Grenzen verwendet. Dadurch kann eine falsche UI-Eingabe nicht
 * unbegrenzt in die Regelungslogik durchlaufen.
 */
function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/**
 * Code-Teil: positiveWatt
 *
 * Zweck:
 * Normalisiert Leistung auf einen positiven Wattwert. Negative, fehlende oder ungültige
 * Werte werden zu 0.
 *
 * Zusammenhang:
 * Split-DPs wie `storageChargePower`, `storageDischargePower`, `gridImportW` und
 * `gridExportW` sollen nach der Auflösung immer positiv oder 0 sein. Signed-DPs werden
 * vorher gesondert interpretiert.
 *
 * Wichtig:
 * Diese Funktion ist nicht für signed Leistungswerte gedacht, weil dort das Vorzeichen
 * fachlich relevant ist.
 */
function positiveWatt(value) {
    const n = toNumberOrNull(value);
    return n === null ? 0 : Math.max(0, n);
}
/**
 * Code-Teil: percent
 *
 * Zweck:
 * Normalisiert einen unbekannten Wert auf einen Prozentwert von 0 bis 100.
 *
 * Zusammenhang:
 * Speicher-SoC, EV-Ziel-SoC, Peak-Auslastung und Prognosequalität werden später mit
 * diesem Helfer typisiert verarbeitet.
 */
function percent(value, fallback = 0) {
    const n = toNumberOrNull(value);
    return clampNumber(n === null ? fallback : n, 0, 100);
}
/**
 * Code-Teil: roundForDisplay
 *
 * Zweck:
 * Rundet Werte ausschließlich für Anzeige, Diagnose und Testausgaben.
 *
 * Zusammenhang:
 * Regelungsentscheidungen sollen möglichst mit ungerundeten Werten rechnen. Erst bei
 * UI-Texten, Logs, Diagnose-States oder Testbeispielen wird gerundet.
 */
function roundForDisplay(value, digits = 1) {
    const n = toNumberOrNull(value);
    if (n === null)
        return null;
    const factor = 10 ** Math.max(0, Math.min(6, Math.round(digits)));
    return Math.round(n * factor) / factor;
}
