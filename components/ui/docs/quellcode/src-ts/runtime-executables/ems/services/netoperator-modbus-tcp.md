# src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts

Kapselt den Modbus-TCP-Transport der Netzbetreiber-Schnittstelle und die damit verbundenen Kommunikationsgrenzen.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./netoperator-canonical-model` | [src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-canonical-model.ts) |
| `./netoperator-driver-registry` | [src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts](../../../../../../src-ts/runtime-executables/ems/services/netoperator-driver-registry.ts) |
| `node:net` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/netoperator-interface.ts](../../../../../../src-ts/runtime-executables/ems/modules/netoperator-interface.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finite`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L42) | value, fallback | Number, Number.isFinite, value.trim |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L48) | value | Number, Number.isFinite, value.trim |
| [`descriptorMapped`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L54) | mapping | finiteOrNull |
| [`registerCount`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L58) | mapping | Math.round, Number, Number.isFinite, String |
| [`functionCode`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L67) | mapping | Math.round, Number, Number.isFinite, String |
| [`reorderBytes`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L76) | input, order | Array.from, Buffer.concat, Buffer.from, String, output.subarray |
| [`requireBytes`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L96) | data, minimum, type | – |
| [`safeBigIntNumber`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L100) | value | BigInt, Number, value.toString |
| [`decodeModbusValue`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L106) | data, mapping | Number, Number.isFinite, Object.prototype.hasOwnProperty.call, String, data.readUInt16BE, ordered.readBigInt64BE, ordered.readBigUInt64BE, ordered.readDoubleBE, ordered.readFloatBE, ordered.readInt16BE, ordered.readInt32BE, ordered.readUInt16BE, ordered.readUInt32BE, ordered.toString (weitere in der Quelle) |
| [`valueMatches`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L143) | candidate, expected | String |
| [`classifyQuality`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L149) | value, descriptor | Array.isArray, badValues.some, goodValues.some, staleValues.some |
| [`ModbusTcpClient.constructor`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L170) | options | Math.max, Math.min, Math.round, String, finite |
| [`ModbusTcpClient.connect`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L179) | – | – |
| [`onConnectError`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L184) | error | clearTimeout, reject, socket.off |
| [`onConnect`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L189) | – | clearTimeout, resolve, socket.off, socket.setNoDelay |
| [`ModbusTcpClient.close`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L206) | – | this.socket.destroy |
| [`ModbusTcpClient.request`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L213) | pdu | next.then, this.queue.then |
| [`run`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L214) | – | Buffer.alloc, frame.writeUInt16BE, frame.writeUInt8, pdu.copy, this.connect |
| [`cleanup`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L229) | – | clearTimeout, socket.off |
| [`onError`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L235) | error | cleanup, reject, this.close |
| [`onClose`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L236) | – | cleanup, reject, this.close |
| [`onData`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L237) | chunk | Buffer.concat, buffer.readUInt16BE, buffer.subarray, cleanup, reject, resolve, response.readUInt16BE, response.subarray, this.close |
| [`ModbusTcpClient.read`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L283) | mapping | Buffer.alloc, Math.round, finiteOrNull, functionCode, pdu.writeUInt16BE, pdu.writeUInt8, registerCount, response.subarray, this.request |
| [`NetOperatorModbusTcpConnector.constructor`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L310) | options, profile | – |
| [`NetOperatorModbusTcpConnector.close`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L316) | – | this.client.close |
| [`NetOperatorModbusTcpConnector.readDescriptor`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L320) | descriptor | bytes.toString, decodeModbusValue, this.client.read |
| [`NetOperatorModbusTcpConnector.poll`](../../../../../../src-ts/runtime-executables/ems/services/netoperator-modbus-tcp.ts#L325) | – | Date.now, Object.entries, Object.prototype.hasOwnProperty.call, REQUIRED_READ_KEYS.includes, String, classifyQuality, descriptorMapped, finiteOrNull, requiredErrors.join, this.close, this.readDescriptor |
