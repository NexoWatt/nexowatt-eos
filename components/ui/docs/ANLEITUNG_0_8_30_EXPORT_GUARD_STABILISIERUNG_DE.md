# NexoWatt UI 0.8.30 – Export Guard Stabilisierung

## Zweck

Diese Version ergänzt die Einspeisebegrenzung um einen sicheren Diagnose/Testmodus und eine klarere Installer-Diagnose.

## Wichtige Bedienregel

Die Einspeisebegrenzung bleibt eine Installateurfunktion. Kunden können sie nicht im normalen Frontend aktivieren oder verändern.

## Betriebsarten

Im Installer/App-Center unter **EVU / PV Regelung** gibt es für die Einspeisebegrenzung jetzt:

- **Diagnose/Testmodus**: NexoWatt berechnet Limit, Überschreitung und geplante Aktion, schreibt aber keine WR-/PV-Setpoints.
- **Aktiv**: NexoWatt darf die vorhandene WR-/PV-Schreibbrücke nutzen.

Empfehlung: Neue Anlagen zuerst im Diagnose/Testmodus prüfen. Erst nach plausibler Messrichtung, korrektem Einspeiselimit und vorhandenen WR-Write-Datenpunkten auf **Aktiv** stellen.

## Runtime-Diagnose

Die Diagnose zeigt im App-Center:

- aktuelle Einspeisung
- erlaubtes Einspeiselimit
- Überschreitung
- Rest bis Limit
- geschätzte Abregelung
- Betriebsart
- geplante Aktion
- WR-Schreibfähigkeit
- Negative-Preis-Strategie

## Neue States

```text
gridConstraints.exportLimit.runMode
gridConstraints.exportLimit.diagnosticOnly
gridConstraints.exportLimit.plannedAction
gridConstraints.exportLimit.installerMessage
gridConstraints.exportLimit.installerChecklistJson
```

## Keine doppelten Artefakte

ZIP- und TGZ-Dateien gehören nicht in das Repository oder Adapterpaket. `.npmignore` schließt `*.zip` und `*.tgz` aus.
