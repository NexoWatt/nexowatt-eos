# src-admin-tab/src/pages/MeshAccountingPanel.tsx

Betreiberansicht für optionale Zählerarchive und Abrechnungsentwürfe.

**Daten und Wirkung:** Geschützte API, lokale Dateiexporte und Druck; kein automatischer

**Bei Änderungen:** Rollen, Zählerqualität, echte Randzeitpunkte und CSV-/Druckausgabe gemeinsam prüfen.

[Originalquelle](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `../lib/adminConnection` | [src-admin-tab/src/lib/adminConnection.ts](../../../../../src-admin-tab/src/lib/adminConnection.ts) |

**Direkt importiert von:**

- [src-admin-tab/src/pages/MeshCoordinatorPage.tsx](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`stamp`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L12) | value | – |
| [`localStamp`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L13) | value | d.getTime, d.getTimezoneOffset |
| [`money`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L14) | cents | – |
| [`download`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L15) | name, text, mime | URL.createObjectURL, a.click, document.createElement, setTimeout |
| [`csvCell`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L19) | v | Number.isFinite, String |
| [`MeshAccountingPanel`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L20) | { meshConfig, status } | Date.now, localStamp, money, nodes.map, stamp, status?.accounting?.nodes?.map, useEffect, useState |
| [`change`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L28) | key, value | setConfig |
| [`run`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L29) | fn | fn, setBusy, setMessage |
| [`save`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L30) | e | e.preventDefault, run |
| [`calculate`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L31) | e | e.preventDefault, run |
| [`exportRecords`](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx#L32) | – | run |
