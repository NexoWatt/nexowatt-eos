/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Stellt gemeinsame Zahlenprüfung, Begrenzung und Konvertierung bereit; Null bleibt ein zulässiger Messwert.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/utils/number.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { NullableNumber, Percent, Watt } from '../contracts/units';

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
export function isFiniteNumber(value: unknown): value is number {
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
export function toNumberOrNull(value: unknown): NullableNumber {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
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
export function clampNumber(value: number, min: number, max: number): number {
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
export function positiveWatt(value: unknown): Watt {
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
export function percent(value: unknown, fallback: Percent = 0): Percent {
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
export function roundForDisplay(value: unknown, digits = 1): NullableNumber {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  const factor = 10 ** Math.max(0, Math.min(6, Math.round(digits)));
  return Math.round(n * factor) / factor;
}
