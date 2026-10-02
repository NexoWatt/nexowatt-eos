# NexoWatt UI 0.8.64 – Budget-Konsistenzmonitor / EVCS Ist vs. Reservierung

## Problem

Im Status konnte weiterhin ein positives PV-Budget oder ein EVCS-Istwert angezeigt werden, obwohl im Live-Energiefluss keine PV-Leistung oder keine aktuelle Ladeleistung vorhanden war.

Beispiele:

```text
PV Erzeugung: 0 W
PV Budget raw: > 0 W
EVCS Ist: 10.97 kW
Ladestation Live: 0 W
```

## Ursache

Zwei Werte wurden fachlich zu breit verwendet:

```text
PV-Budget
= teilweise rekonstruierter Rohwert aus Einspeisung + flexible Lasten + Speicherfluss

EVCS Ist
= teilweise Reservierung/Sollwert-Fallback statt frischer Messwert
```

## Fix

Ab 0.8.64 gilt:

```text
PV Budget wird physikalisch durch aktuelle PV-Erzeugung geklemmt.
EVCS Ist wird aus frischem Messwert / Grid-Gate-Ist genommen.
EVCS Reservierung bleibt getrennt sichtbar.
EVCS Soll bleibt getrennt sichtbar.
```

## Anzeige im Status

Unter Status / Budget & Gates sollte sichtbar sein:

```text
EVCS Ist
EVCS Reserviert
EVCS Soll
Ist-Quelle: frischer Messwert / Grid-Gate
```

Wenn Live `Ladestation 0 W` zeigt, darf `EVCS Ist` nicht aus einer Reservierung von 10.97 kW stammen.

## Keine Regelungsänderung

Diese Version ändert keine Hardware-Schreibpfade:

```text
kein direkter OCPP-Write
kein direkter Modbus-Write
kein direkter MQTT-Write
keine Änderung an Export Guard
keine Änderung an Speicherfarm
keine Änderung an Mesh/Microgrid
```
