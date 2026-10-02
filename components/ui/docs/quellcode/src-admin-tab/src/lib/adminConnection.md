# src-admin-tab/src/lib/adminConnection.ts

Kapselt die Verbindung zur Adapter-Instanz und die geschützten Anmelde-, Konfigurations- und SMTP-API-Aufrufe.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-admin-tab/src/lib/adminConnection.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-admin-tab/src/pages/InstallerPage.tsx](../../../../../src-admin-tab/src/pages/InstallerPage.tsx)
- [src-admin-tab/src/pages/MeshAccountingPanel.tsx](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx)
- [src-admin-tab/src/pages/MeshCoordinatorPage.tsx](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx)
- [src-admin-tab/src/pages/NotificationMailPage.tsx](../../../../../src-admin-tab/src/pages/NotificationMailPage.tsx)
- [src-admin-tab/src/pages/PageShell.tsx](../../../../../src-admin-tab/src/pages/PageShell.tsx)
- [src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx)
- [src-admin-tab/src/pages/RedirectPage.tsx](../../../../../src-admin-tab/src/pages/RedirectPage.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`withTimeout`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L44) | promise, ms, label | Promise.race |
| [`callbackPromise`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L59) | fn, label, ms | withTimeout |
| [`getInstance`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L75) | – | – |
| [`getAdapterObjectId`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L89) | instance | getInstance |
| [`buildRuntimeBaseUrl`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L99) | port | – |
| [`safeWindowAccess`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L110) | getter | getter |
| [`isErrorLike`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L123) | value | Object.prototype.hasOwnProperty.call |
| [`normalizeIoBrokerCallback`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L143) | cb | – |
| [`pickServConn`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L166) | – | safeWindowAccess |
| [`pickSocket`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L180) | – | safeWindowAccess |
| [`ensureSocketIo`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L195) | – | pickSocket, window.__nwSocketLoader |
| [`wrapServConn`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L216) | servConn | – |
| [`getObject`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L225) | id, cb | cb, normalizeIoBrokerCallback, servConn.getObject |
| [`getState`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L244) | id, cb | cb, normalizeIoBrokerCallback, servConn.getState |
| [`setObject`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L267) | id, obj, cb | cb, servConn.setObject |
| [`wrapSocket`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L282) | socket | – |
| [`getObject`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L291) | id, cb | cb, normalizeIoBrokerCallback, socket.emit |
| [`getState`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L310) | id, cb | cb, normalizeIoBrokerCallback, socket.emit |
| [`setObject`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L329) | id, obj, cb | cb, socket.emit |
| [`getAdminConnection`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L359) | – | ensureSocketIo, pickServConn, pickSocket, window.io.connect, withTimeout, wrapServConn, wrapSocket |
| [`extractUuid`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L394) | obj | scan |
| [`scan`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L404) | value, key | Object.entries, Object.prototype.hasOwnProperty.call, scan, seen.add, seen.has, uuidRe.test, value.trim |
| [`getObject`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L439) | id, conn | callbackPromise, getAdminConnection |
| [`getState`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L453) | id, conn | callbackPromise, getAdminConnection |
| [`setObject`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L467) | id, obj, conn | callbackPromise, getAdminConnection |
| [`readAdapterPort`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L481) | instance, conn | Number, Number.isFinite, getAdapterObjectId, getInstance, getObject |
| [`readSystemUuid`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L497) | conn, instance | String, extractUuid, getInstance, getObject, getState |
| [`fetchJsonWithTimeout`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L542) | url, ms, options | clearTimeout, fetch, response.json, setTimeout |
| [`postJsonWithTimeout`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L572) | url, payload, ms, options | JSON.stringify, clearTimeout, fetch, response.json, setTimeout |
| [`getRuntimePorts`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L603) | instance, conn | Number, getInstance, ports.filter, ports.push, readAdapterPort, window.location.pathname.startsWith, withTimeout |
| [`readRuntimeAuthStatus`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L616) | instance, conn | Date.now, buildRuntimeBaseUrl, encodeURIComponent, fetchJsonWithTimeout, getInstance, getRuntimePorts |
| [`loginRuntimeAuth`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L634) | instance, user, password, conn | Date.now, Number, String, buildRuntimeBaseUrl, encodeURIComponent, getInstance, getRuntimePorts, postJsonWithTimeout |
| [`logoutRuntimeAuth`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L654) | instance, conn | Date.now, buildRuntimeBaseUrl, encodeURIComponent, getInstance, getRuntimePorts, postJsonWithTimeout |
| [`readRuntimeLicenseInfo`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L680) | instance, conn | getInstance, readAdapterPort, tryPort, withTimeout |
| [`tryPort`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L696) | port | Date.now, Number, buildRuntimeBaseUrl, encodeURIComponent, fetchJsonWithTimeout, tried.add, tried.has |
| [`saveRuntimeLicenseKey`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L734) | instance, licenseKey, conn | Date.now, String, buildRuntimeBaseUrl, encodeURIComponent, getInstance, ports.filter, ports.push, postJsonWithTimeout, readAdapterPort |
| [`readLicenseStatus`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L768) | instance, conn | Number, Promise.all, String, getAdminConnection, getInstance, getState |
| [`openExternal`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L827) | url | – |
| [`notificationMailRequest`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L839) | payload | Number, buildRuntimeBaseUrl, fetchJsonWithTimeout, getRuntimePorts, postJsonWithTimeout |
| [`meshCoordinatorRequest`](../../../../../src-admin-tab/src/lib/adminConnection.ts#L857) | suffix, payload | Number, buildRuntimeBaseUrl, fetchJsonWithTimeout, getRuntimePorts, postJsonWithTimeout |
