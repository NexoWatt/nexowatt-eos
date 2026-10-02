# src-ts/runtime-executables/lib/os-update-status.ts

Liest den nicht geheimen Status des getrennten Betriebssystem-Updaters für angemeldete EOS-Benutzer.

**Daten und Wirkung:** Öffnet nur eine feste root-geschützte JSON-Datei, begrenzt die Lesemenge und gibt ausschließlich geprüfte Statusfelder zurück; führt keine Kommandos aus.

**Bei Änderungen:** Vertrag, Vertrauenspfad, Uhrzeitfehler, Fehlzustände und Authentifizierung der HTTP-Route gemeinsam prüfen.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/os-update-status.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:fs` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`record`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L18) | value | Array.isArray |
| [`count`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L19) | value | Number.isSafeInteger |
| [`triState`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L20) | value | – |
| [`nullableBoolean`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L21) | value | – |
| [`timestamp`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L22) | value, nullable | Date.parse, Number.isFinite, value.slice |
| [`unavailable`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L28) | availability | – |
| [`sanitizeStatus`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L35) | data, now | Array.isArray, Date.now, Date.parse, ERROR_CODES.has, count, data.coverage.gaps.every, nullableBoolean, record, times.some, timestamp, triState, unavailable |
| [`readStatusFile`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L86) | – | Buffer.alloc, JSON.parse, before.isFile, buffer.subarray, fs.promises.lstat, fs.promises.open, handle.close, handle.read, handle.stat, info.isDirectory |
| [`getOsUpdateStatus`](../../../../../src-ts/runtime-executables/lib/os-update-status.ts#L115) | – | Date.now, readStatusFile, sanitizeStatus, unavailable |
