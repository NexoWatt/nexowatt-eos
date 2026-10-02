# src-ts/runtime-executables/lib/notification-policy.ts

Verwaltet Störungszustände, Versandintervalle, Entwarnungen und Wiederholschutz unabhängig vom SMTP-Transport.

**Daten und Wirkung:** Erhält Ereignisse und Zeitstempel; liefert versandfähige Gruppen sowie einen speicherbaren Status. Kritische Fehler werden bei Erkennung fällig, normale im 30-Minuten-Fenster, Hinweise/Erinnerungen täglich.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/notification-policy.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/lib/notification-mail.ts](../../../../../src-ts/runtime-executables/lib/notification-mail.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clean`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L14) | value | String |
| [`NotificationPolicy.constructor`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L21) | saved | Array.isArray, Number, String, saved.records.slice, saved.sent.filter |
| [`NotificationPolicy.setRecipient`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L34) | hash | this.records.clear |
| [`NotificationPolicy.observe`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L40) | events, now, categories | categories.has, clean, events.slice, seen.add, seen.has, this.records.delete, this.records.get, this.records.set |
| [`NotificationPolicy.quota`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L74) | now, test | this.sent.filter |
| [`NotificationPolicy.batch`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L83) | now, recovery | daily.push, immediate.concat, immediate.push, immediate.some, immediate.sort, this.quota |
| [`NotificationPolicy.reserve`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L116) | now, test | – |
| [`NotificationPolicy.complete`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L123) | batch, now, accepted | Math.min, batch.some, this.records.get, this.sent.push, this.sent.slice |
| [`NotificationPolicy.snapshot`](../../../../../src-ts/runtime-executables/lib/notification-policy.ts#L145) | – | Array.from, this.records.entries |
