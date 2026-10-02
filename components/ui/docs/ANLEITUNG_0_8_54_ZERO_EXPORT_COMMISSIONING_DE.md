# NexoWatt UI 0.8.54 – 0-Einspeise Inbetriebnahme-Assistent

## Zweck

Version 0.8.54 ergänzt einen Inbetriebnahme-Assistenten für echte 0-Einspeise-Anlagen.

Wichtig: Es wurde keine zweite 0-Einspeise-Regelung und kein zweiter Export Guard gebaut. Der Assistent bewertet nur die vorhandene Export-Guard-/Grid-Constraints-Logik.

## Prüfumfang

Der Assistent prüft:

- Export Guard aktiv
- Installateurfreigabe gesetzt
- maximale Einspeisung = 0 W
- Smartmeter / Netzpunkt plausibel
- Betriebsart Diagnose oder Aktiv
- WR-/PV-Write-Datenpunkte vorhanden
- Senkenreihenfolge korrekt
- Speicher-Lade-Command-State optional vorhanden
- Ladepunkt-Command-State optional vorhanden
- flexible Verbraucher optional vorhanden
- Mesh/Microgrid optional vorhanden

## Richtige Reihenfolge

Die 0-Einspeise-Kaskade bleibt:

```text
1. Verbrauch zuerst
2. Speicher laden
3. Ladepunkte / Ladestationen
4. flexible Verbraucher
5. Mesh/Microgrid
6. WR-/PV-Abregelung zuletzt
```

## Neue States

```text
gridConstraints.exportLimit.commissioning.status
gridConstraints.exportLimit.commissioning.stage
gridConstraints.exportLimit.commissioning.ready
gridConstraints.exportLimit.commissioning.scorePercent
gridConstraints.exportLimit.commissioning.nextStep
gridConstraints.exportLimit.commissioning.lastReason
gridConstraints.exportLimit.commissioning.checklistJson
gridConstraints.exportLimit.commissioning.writeTestPreviewJson
gridConstraints.exportLimit.commissioning.sinkStatusJson
gridConstraints.exportLimit.commissioning.reportJson
```

## Field Workflow

1. Netzpunkt / Smartmeter zuordnen.
2. Export Guard aktivieren.
3. Max. Einspeisung auf `0 W` setzen.
4. Betriebsart zuerst auf Diagnose/Testmodus setzen.
5. WR-/PV-Write-Datenpunkte prüfen.
6. Speicher-/Ladepunkt-/flexible Senken optional zuordnen.
7. Inbetriebnahme-Score und Checkliste prüfen.
8. Erst dann auf Aktiv stellen.

## Sicherheit

- keine neue Regelstrecke
- keine direkte Hardwaresteuerung aus dem Assistenten
- keine OCPP-/Modbus-/MQTT-Rohbefehle
- WR-Abregelung bleibt letzte Stufe
