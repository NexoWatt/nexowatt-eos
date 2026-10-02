/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „units“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/units.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/contracts/units.ts
 *
 * Zweck:
 * Zentrale TypeScript-Basistypen für physikalische Einheiten.
 *
 * Warum das wichtig ist:
 * Im bisherigen JavaScript-Code sind fast alle Werte einfache Zahlen. Für Menschen ist
 * dann schwer erkennbar, ob ein Wert Watt, Kilowattstunden, Prozent oder Sekunden meint.
 * Diese Typ-Aliase sind noch keine echte Runtime-Prüfung, machen aber die spätere
 * TypeScript-Migration verständlicher und reduzieren Verwechslungen.
 */

/** Leistung in Watt. Beispiel: 3000 = 3,0 kW. */
export type Watt = number;

/** Energie in Kilowattstunden. Beispiel: 12.5 = 12,5 kWh. */
export type KiloWattHour = number;

/** Prozentwert im Bereich 0 bis 100, sofern fachlich nicht anders dokumentiert. */
export type Percent = number;

/** Temperatur in Grad Celsius. */
export type Celsius = number;

/** Zeitstempel in Millisekunden seit Unix-Epoch. */
export type TimestampMs = number;

/** Uhrzeit als HH:mm. Beispiel: "07:00". */
export type ClockTime = string;

/** ioBroker-State-ID oder kanonischer NexoWatt-State-Key. */
export type StateId = string;

/** Optionaler Zahlenwert: null bedeutet bewusst „nicht vorhanden / nicht berechenbar“. */
export type NullableNumber = number | null;
