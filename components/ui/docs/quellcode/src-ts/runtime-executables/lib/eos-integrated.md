# src-ts/runtime-executables/lib/eos-integrated.ts

Feste Grenzen des integrierten EOS-Inbetriebnahmeprofils.

**Daten und Wirkung:** Liest ausschließlich root-geschützte TLS-Dateien, verweigert

**Bei Änderungen:** TLS-Dateirechte, echte TLS-Sockets, Lease-Ablauf und Schreibsperren gemeinsam prüfen.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:fs` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:path` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:crypto` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `node:net` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `../packages/eos-license-client` | [packages/eos-license-client/index.js](../../../../../packages/eos-license-client/index.js) |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`readProtectedFile`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L22) | filename, isPrivate, boundary | absolute.startsWith, fs.closeSync, fs.fstatSync, fs.lstatSync, fs.openSync, fs.readFileSync, path.dirname, path.resolve, st.isDirectory, st.isFile |
| [`validateTlsMaterial`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L46) | cert, key | Date.now, Date.parse, createPrivateKey, createPublicKey, leaf.publicKey.export, timingSafeEqual |
| [`loadUiTlsOptions`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L55) | – | readProtectedFile, validateTlsMaterial |
| [`listenerConfiguration`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L58) | config | Number.isSafeInteger, isIP |
| [`blocked`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L65) | – | Object.assign |
| [`passwordChangeRequired`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L67) | object, user | Number |
| [`accountRevision`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L75) | user, object | JSON.stringify, createHash, passwordChangeRequired |
| [`validAccountPassword`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L82) | value | Array.from, Buffer.byteLength |
| [`withAccountKdfBudget`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L96) | operation | operation |
| [`createAccountPasswordWriter`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L101) | adapter | adapter.extendForeignObjectAsync.bind |
| [`installPreviewWriteBoundary`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L135) | adapter | Object.defineProperty, adapter.sendTo.bind, createAccountPasswordWriter |
| [`denyAsync`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L137) | – | blocked |
| [`denyCallback`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L138) | args | args.at, blocked, queueMicrotask |
| [`ownObservation`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L147) | id, state | Array.isArray, id.startsWith |
| [`value`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L155) | args | denyCallback, original, ownObservation |
| [`value`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L159) | args | denyAsync, originalAsync, ownObservation |
| [`value`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L165) | target, command, message, callback | denyCallback, originalSend |
| [`value`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L169) | target, command, message | blocked |
| [`makeLicenseClient`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L183) | adapter | createLicenseGuard |
| [`onLost`](../../../../../src-ts/runtime-executables/lib/eos-integrated.ts#L184) | – | adapter._nwSseGuard?.closeAll |
