# Testbericht – NexoWatt UI 0.8.159 RC35

## Anlass

Bei einer FENECON-Hybridanlage war im AppCenter der lesende Alias `aliases.r.gridPower` im Feld **FENECON FEMS-NVP-Ziel** eingetragen. Die Automatik interpretierte jedes belegte Feld als nativen FEMS-Schreibpfad und ignorierte dadurch den korrekt zugeordneten signed ESS-Sollwert. FENECON zeigte folgerichtig „Keine externe Vorgabe vorhanden“.

## Korrektur

- bekannte Netzleistungs-Messwerte werden als Messung klassifiziert und niemals als FEMS-NVP-Schreibziel verwendet;
- Auto fällt bei vorhandenem signed/Split-Sollwert auf direkte ESS-Regelung zurück;
- expliziter FEMS-NVP-Modus blockiert eine solche Fehlzuordnung;
- AppCenter entfernt die bekannte Fehlzuordnung beim Quick-Setup beziehungsweise nächsten Speichern;
- echte `ctrlBalancing*/SetGridActivePower`-Ziele bleiben unverändert aktiv.

## Feldregression

Konfiguration:

- `feneconGridSetpointObjectId = ...aliases.r.gridPower`;
- `targetPowerObjectId = ...aliases.ctrl.powerSetpointW`;
- `feneconEssActualPowerObjectId = ...aliases.r.powerAc`;
- FENECON-Modus `auto`, Kopplung `dc`.

Erwartung und Testergebnis:

- Auflösung: `direct-ess`;
- Grund: `auto-grid-measurement-ignored-direct-ess`;
- Kommandofamilie: `signed`;
- signed Sollwert wird geschrieben;
- `aliases.r.gridPower` erhält keinen Schreibzugriff.

## Bestandsschutz

Die Korrektur baut auf 0.8.158 auf. FENECON-706-Sollwertfeedback, EVCS-Input-Refresh, §14a, EEBUS, Speicherfarm und andere Herstellerprofile wurden nicht fachlich verändert.
