/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Uhrzeiten und Zeitfenster für die zeitabhängige Planung.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/utils/clock.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { ClockTime } from '../contracts/units';

/**
 * Datei: src-ts/utils/clock.ts
 *
 * Zweck:
 * Reine Helfer für Uhrzeiten im Format `HH:mm`.
 *
 * Zusammenhang:
 * KI-Berater, EV-Zielplanung, Komfortfenster, Ruhezeiten und spätere Zeitfenster im
 * App-Center nutzen dieselbe Uhrzeitlogik. Diese Datei bereitet die spätere Migration
 * dieser Bereiche auf TypeScript vor.
 */

/**
 * Code-Teil: isClockTime
 *
 * Zweck:
 * Prüft, ob ein Wert eine gültige Uhrzeit im Format `HH:mm` ist.
 *
 * Zusammenhang:
 * Kunden- und Installer-Einstellungen dürfen später nicht ungeprüft in Tagesfahrplan,
 * KI-Beratung oder Komfortfenster laufen. Ungültige Zeitwerte werden vorher erkannt.
 *
 * TypeScript-Hinweis:
 * Der Type Guard macht aus einem unbekannten Wert nach erfolgreicher Prüfung eine
 * `ClockTime`.
 */
export function isClockTime(value: unknown): value is ClockTime {
  if (typeof value !== 'string') return false;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * Code-Teil: normalizeClockTime
 *
 * Zweck:
 * Gibt eine sichere `HH:mm`-Uhrzeit zurück. Ungültige Eingaben fallen auf einen gültigen
 * Fallback zurück.
 *
 * Zusammenhang:
 * Dadurch können UI-Eingaben aus Kunden-/Installerformularen später gefahrlos vom
 * KI-Berater oder von Zeitfensterlogiken verwendet werden.
 */
export function normalizeClockTime(value: unknown, fallback: ClockTime = '00:00'): ClockTime {
  if (!isClockTime(fallback)) throw new Error(`Ungültiger Fallback für ClockTime: ${fallback}`);
  if (!isClockTime(value)) return fallback;
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = String(Number(hourRaw)).padStart(2, '0');
  return `${hour}:${minuteRaw}` as ClockTime;
}

/**
 * Code-Teil: clockTimeToMinutes
 *
 * Zweck:
 * Wandelt eine `HH:mm`-Uhrzeit in Minuten seit Tagesbeginn um.
 *
 * Zusammenhang:
 * Für Vergleiche von Zeitfenstern ist eine Zahl einfacher und weniger fehleranfällig
 * als Stringvergleiche. Diese Funktion wird später für Komfort-, Ruhe- und EV-Fenster
 * verwendet.
 */
export function clockTimeToMinutes(value: ClockTime): number {
  const safe = normalizeClockTime(value);
  const [hourRaw, minuteRaw] = safe.split(':');
  return Number(hourRaw) * 60 + Number(minuteRaw);
}

/**
 * Code-Teil: isClockTimeInWindow
 *
 * Zweck:
 * Prüft, ob eine Uhrzeit in einem Zeitfenster liegt. Fenster über Mitternacht werden
 * unterstützt, z. B. `22:00` bis `06:00`.
 *
 * Zusammenhang:
 * Genau diese Logik brauchen KI-Berater und Komfort-/Ruhezeiten. Der Helfer verhindert,
 * dass jede spätere Datei eigene fehleranfällige Mitternachtslogik baut.
 */
export function isClockTimeInWindow(current: ClockTime, start: ClockTime, end: ClockTime): boolean {
  const cur = clockTimeToMinutes(current);
  const from = clockTimeToMinutes(start);
  const to = clockTimeToMinutes(end);
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}
