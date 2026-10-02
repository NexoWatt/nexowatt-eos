# NexoWatt UI 0.8.37 – App-Center Mesh/Microgrid Reiter

## Ziel

Der Reiter **Apps** bleibt ab dieser Version eine reine Übersicht für Funktionsapps. Detailkonfigurationen gehören nicht mehr dort hinein.

## Änderung

Die Mesh/Microgrid-Detailkonfiguration wurde in einen eigenen Reiter verschoben:

```text
App-Center → Mesh/Microgrid
```

Der Reiter wird nur angezeigt, wenn die EOS-App **EOS Mesh/Microgrid** installiert ist.

## Apps-Reiter

Im Reiter **Apps** bleibt nur:

```text
Installiert
Aktiv
Hinweis / Betreiberansicht-Link
```

Keine Cluster-ID, kein Gridlimit, keine Knotenliste und keine Mappingfelder.

## Schema

```text
Apps          = Funktionsmodule installieren/aktivieren
Zuordnung     = Länderprofil, P1/DSMR, Datenpunkt-Mapping
Ladepunkte    = LPs, Stationen, DC-Displayseiten
Mesh/Microgrid= eigene EOS-Modul-Konfiguration
Status        = Diagnose und Runtime
```

## Hinweis

Nach dem Update Browser-Cache/Service-Worker per Hard Reload leeren.
