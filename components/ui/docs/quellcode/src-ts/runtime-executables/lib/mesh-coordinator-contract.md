# src-ts/runtime-executables/lib/mesh-coordinator-contract.ts

Definiert Einheiten, Rollen, Identitäten und zulässige Budgets des EOS-Master/Slave-Verbunds.

**Daten und Wirkung:** Prüft Konfigurationen ohne Schreibzugriffe; Leistungen sind positive W-Beträge, Phasenströme positive A-Beträge. 0 ist eine wirksame Grenze.

**Bei Änderungen:** Rückfallsummen, Stränge, Reservierungen und Protokolltests gemeinsam prüfen; niemals fehlende Werte als Freigabe behandeln.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:crypto` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts)
- [src-ts/runtime-executables/lib/mesh-coordinator.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator.ts)
- [src-ts/runtime-executables/lib/mesh-energy-service.ts](../../../../../src-ts/runtime-executables/lib/mesh-energy-service.ts)
- [src-ts/runtime-executables/lib/mesh-transformer-allocation.ts](../../../../../src-ts/runtime-executables/lib/mesh-transformer-allocation.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clone`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L17) | value | JSON.parse, JSON.stringify |
| [`fail`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L18) | message | – |
| [`number`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L19) | value, name, min, max | Number.isFinite, fail |
| [`id`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L23) | value, name | fail |
| [`limits`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L27) | value, name, keys | Array.isArray, Object.fromEntries, fail, keys.map |
| [`minLimits`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L31) | items | LIMIT_KEYS.map, Object.fromEntries |
| [`maxLimits`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L32) | items | LIMIT_KEYS.map, Object.fromEntries |
| [`within`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L33) | actual, ceiling, keys, tolerance | keys.every |
| [`masterUrl`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L38) | value | String, fail, host.endsWith, host.split, ip.every, url.hostname.toLowerCase |
| [`member`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L49) | raw, label | String, fail, id, limits, number, within |
| [`defaultConfig`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L56) | – | NETWORK_KEYS.map, Object.fromEntries |
| [`validateConfig`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L69) | raw | Array.isArray, Number.isInteger, Object.fromEntries, Object.keys, Object.values, String, defaultConfig, fail, groupsOf, id, ids.add, ids.has, limits, masterUrl (weitere in der Quelle) |
| [`membersOf`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L130) | config | – |
| [`groupsOf`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L131) | config | – |
| [`sign`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L132) | payload, key | JSON.stringify, crypto.createHmac |
| [`verify`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts#L133) | packet, key | Buffer.from, crypto.timingSafeEqual, sign |
