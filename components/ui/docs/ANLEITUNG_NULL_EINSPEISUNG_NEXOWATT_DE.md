# NexoWatt – 0-Einspeise Anlage mit Export Guard einrichten

## Ja, das geht grundsätzlich

NexoWatt kann 0-Einspeise-Anlagen steuern, wenn der Installer die passenden Mess- und Write-Datenpunkte zuordnet.

## Benötigt

1. Netzanschlusspunkt / Smartmeter Leistung:

```text
Grid Power W, Bezug positiv / Einspeisung negativ
```

2. Wechselrichter-Write-Datenpunkt, mindestens einer:

```text
Feed-in Limit W
PV Limit W
PV Limit %
```

3. Optional Speicher-Write-Datenpunkte:

```text
Battery Charge Power W
Battery Discharge Limit W
Battery SoC %
Battery Enable / Mode optional
```

## Einstellung

Pfad:

```text
EMS Apps → Netzlimits / Export Guard
```

Empfohlen für 0-Einspeisung:

```text
Export Guard installieren = Ja
Export Guard aktiv = Ja
Installerfreigabe = Ja
RunMode = zuerst Testmodus, danach Aktiv
Max. Einspeisung = 0 W
Import-Bias = 80 bis 150 W
Deadband = 50 bis 100 W
```

## Reihenfolge im Betrieb

NexoWatt sollte zuerst lokale Senken nutzen:

```text
PV-Überschuss
→ Speicher laden
→ Ladepunkte / Verbraucher / Mesh-Zielgruppen
→ erst danach WR abregeln
```

## Wichtig

Ohne schreibfähige WR-/Speicher-Datenpunkte kann NexoWatt nur anzeigen, aber nicht regeln.

Die Diagnose ist unter:

```text
gridConstraints.exportLimit.*
gridConstraints.pvCurtail.*
```

Wichtige States:

```text
gridConstraints.exportLimit.currentExportW
gridConstraints.exportLimit.effectiveMaxFeedInW
gridConstraints.exportLimit.exportOverLimitW
gridConstraints.exportLimit.writeCapable
gridConstraints.exportLimit.missingWriteDatapointsJson
```
