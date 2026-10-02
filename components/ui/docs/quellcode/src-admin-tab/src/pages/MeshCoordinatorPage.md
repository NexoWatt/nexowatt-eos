# src-admin-tab/src/pages/MeshCoordinatorPage.tsx

Führt Installer/Admin durch Master-, Slave-, Grenz- und Paarungseinstellungen.

**Daten und Wirkung:** Liest geschützte Diagnosen und speichert geprüfte Konfigurationen. Paarungsschlüssel bleiben nur vorübergehend im Formular, niemals im Browser-Speicher.

**Bei Änderungen:** Rollen, 99-Knoten-Limit, Nullgrenzen und Backend-Prüfungen gemeinsam testen.

[Originalquelle](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `react` | Node-Bordmittel oder externe Paketabhängigkeit. |
| `./PageShell` | [src-admin-tab/src/pages/PageShell.tsx](../../../../../src-admin-tab/src/pages/PageShell.tsx) |
| `./MeshAccountingPanel` | [src-admin-tab/src/pages/MeshAccountingPanel.tsx](../../../../../src-admin-tab/src/pages/MeshAccountingPanel.tsx) |
| `../lib/adminConnection` | [src-admin-tab/src/lib/adminConnection.ts](../../../../../src-admin-tab/src/lib/adminConnection.ts) |

**Direkt importiert von:**

- [src-admin-tab/src/App.tsx](../../../../../src-admin-tab/src/App.tsx)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`zeros`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L14) | – | Object.fromEntries, Object.keys |
| [`blankNode`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L15) | id | zeros |
| [`NumberField`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L16) | { label, value, onChange } | – |
| [`GroupLimits`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L17) | { value, onChange } | Object.keys |
| [`NodeEditor`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L20) | { value, onChange, local = false } | Object.keys |
| [`set`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L21) | key, next | onChange |
| [`MeshCoordinatorPage`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L34) | – | Math.round, Number.isFinite, config.branches.map, config.nodes.map, status.master.nodes.map, status.master.siteMeasurement.phaseA?.map, useEffect, useState |
| [`poll`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L41) | first | Number, meshCoordinatorRequest, setApp, setBundle, setConfig, setLocked, setMessage, setPaired, setStatus, setTimeout, setUnavailable |
| [`update`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L44) | key, value | setConfig |
| [`save`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L45) | event | event.preventDefault, meshCoordinatorRequest, setBundle, setBusy, setConfig, setLocked, setMessage, setPaired, setPairingKey |
| [`pair`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L50) | – | JSON.stringify, meshCoordinatorRequest, setBundle, setBusy, setMessage |
| [`loadBundle`](../../../../../src-admin-tab/src/pages/MeshCoordinatorPage.tsx#L51) | – | JSON.parse, setConfig, setImportBundle, setMessage, setPairingKey |
