# NexoWatt UI 0.8.59 – Release-Schutz / Regression Safety Gate

## Zweck

Diese Version ergänzt einen technischen Schutz, damit neue Funktionen nicht wieder bestehende Kernbereiche im App-Center leer speichern oder unsichtbar machen.

Geschützt werden besonders:

```text
Speicherfarm
Speicherfarm-Gruppen
DC-Stationen / Charge-Kiosk
Mesh/Microgrid-Knoten
Mesh/Microgrid-Zielgruppen
Mesh/Microgrid Local-Bridge-Mappings
```

## Warum das wichtig ist

Wenn eine UI-Ansicht stale, leer oder durch einen Renderfehler beschädigt ist, darf der Speichern-Button keine produktive Konfiguration überschreiben.

Beispiel:

```text
Runtime kennt 2 Speicher
App-Center zeigt durch Fehler 0 Speicher
Speichern darf die 2 Speicher nicht löschen
```

## Frontend-Schutz

Vor dem Speichern läuft jetzt:

```text
applyReleaseSafetyGateToPatch(...)
```

Wenn eine kritische Liste leer ist, die aktuelle Konfiguration aber noch Einträge enthält, wird die bestehende Liste wiederhergestellt und der Payload markiert:

```text
__releaseSafetyGate = true
__releaseSafetyGateVersion = 0.8.59
```

## Backend-Schutz

Der Backend-Schutz für die Speicherfarm bleibt aktiv:

```text
storageFarm.configJson
storageFarm.storagesStatusJson
storageFarm.storagesTotal
```

Damit kann die Speicherfarm-Konfiguration weiterhin aus Runtime-States wiederhergestellt werden.

## Erlaubtes bewusstes Löschen

Ein bewusstes komplettes Löschen muss später explizit über einen eigenen Lösch-/Reset-Dialog erfolgen. Ein leeres App-Center-Formular reicht nicht mehr aus, um Kernlisten versehentlich zu löschen.

## Keine fachliche Regeländerung

Diese Version ändert nicht:

```text
Export Guard
0-Einspeisung
Mesh/Microgrid-Regelung
Speicherfarm-Regelung
Ladepunkt-Regelung
```

Es ist nur ein Release-/Regression-Schutz.
