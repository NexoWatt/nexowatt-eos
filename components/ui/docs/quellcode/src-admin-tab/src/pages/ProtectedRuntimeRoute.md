# src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx

Rendert geschützte React-Inhalte erst nach erfolgreicher EOS-Sitzungs- und Rollenprüfung und sperrt sie bei Sitzungsverlust erneut.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./PageShell` | [src-admin-tab/src/pages/PageShell.tsx](../../../../../src-admin-tab/src/pages/PageShell.tsx) |
| `../lib/adminConnection` | [src-admin-tab/src/lib/adminConnection.ts](../../../../../src-admin-tab/src/lib/adminConnection.ts) |

**Direkt importiert von:**

- [src-admin-tab/src/App.tsx](../../../../../src-admin-tab/src/App.tsx)
- [src-admin-tab/src/pages/InstallerPage.tsx](../../../../../src-admin-tab/src/pages/InstallerPage.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`useRuntimeAccess`](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx#L26) | – | useContext |
| [`hasCapability`](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx#L31) | status, capability | Array.isArray, String, capabilities.includes, status.capabilities.map |
| [`ProtectedRuntimeRoute`](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx#L41) | { capability, title, requiredRole = 'Installer oder Admin', children, } | getInstance, useCallback, useEffect, useMemo, useState |
| [`submitLogin`](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx#L106) | event | Number, String, event?.preventDefault, loginRuntimeAuth, refresh, setBusy, setMessage, setPassword, setPhase, window.localStorage.setItem |
| [`logout`](../../../../../src-admin-tab/src/pages/ProtectedRuntimeRoute.tsx#L134) | – | logoutRuntimeAuth, setBusy, setMessage, setPassword, setPhase, setStatus |
