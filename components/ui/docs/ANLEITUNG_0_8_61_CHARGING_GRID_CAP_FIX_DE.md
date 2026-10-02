# NexoWatt UI 0.8.61 – Lastmanagement EVCS-Netzcap Fix

## Problem

Im Statusbereich des EMS App-Centers konnte bei aktivem Speicher/PV-Support folgendes angezeigt werden:

```text
Netzlimit: 40 kW
Grundlast (est.): -10.94 kW
EVCS Cap (Netz): 50.94 kW
```

Das ist für Kundenanlagen gefährlich und verwirrend, weil das Netz-Gate damit ein EVCS-Cap oberhalb des konfigurierten Netzanschlusses darstellen konnte.

## Ursache

Die bisherige Gate-A-Logik hat die Grundlast für EVCS näherungsweise so berechnet:

```text
gridW - EVCS-Istleistung
```

Wenn Speicher oder PV die Ladestation gerade lokal stützen, kann dieser Wert negativ werden. Diese negative Grundlast wurde dann als wirksame Netzlast benutzt und hat das EVCS-Netzcap künstlich über den Netzanschluss gehoben.

## Fix

Ab 0.8.61 gilt:

```text
rawBaseLoad = gridW - EVCS
wirksameGrundlast = max(0, rawBaseLoad)
EVCS Cap Netz = min(Netzlimit effektiv, Netzlimit effektiv - wirksameGrundlast)
```

Lokale Deckung durch Speicher/PV bleibt sichtbar, erhöht aber nicht mehr das harte Netz-Gate.

## Neue/angepasste Diagnose

```text
chargingManagement.control.gridBaseLoadW
chargingManagement.control.gridBaseLoadRawW
chargingManagement.control.gridLocalSupportW
chargingManagement.control.gridCapEvcsW
```

Im App-Center steht jetzt:

```text
Grundlast (wirksam)
Lokale Deckung
EVCS Cap (Netz sicher)
```

## Wichtig

Der Fix betrifft nur das Lastmanagement-Netzgate für Ladepunkte. Es wurden nicht verändert:

```text
Speicherfarm-Regelung
Export Guard / 0-Einspeisung
Mesh/Microgrid
Hardware-Schreibpfade
```
