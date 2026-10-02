# RC73 – EMS Live-Diagnose für NexoWatt EOS Admin

## Zweck

RC73 veröffentlicht einen kompakten, versionierten und ausschließlich lesenden Diagnosevertrag für die Cockpit-Übersicht des NexoWatt EOS Admin. Der EOS Admin muss dadurch nicht mehrere hundert technische Datenpunkte pollen und erhält trotzdem eine nachvollziehbare Übersicht darüber, wie das EMS arbeitet und welche Grenze aktuell bindet.

## Datenpunktvertrag

Der Adapter veröffentlicht unter `nexowatt-ui.<Instanz>.info.adminOverview`:

- `schemaVersion`
- `available`
- `status`
- `headline`
- `reason`
- `binding`
- `updatedAt`
- `summaryJson`
- `eventsJson`
- `eventCount`

`summaryJson` enthält folgende Bereiche:

- zentraler EMS-Status und Zyklusinformation;
- Gesamt-, Rest- und PV-Budgets;
- aktive bindende Begrenzung;
- Ladepunkte mit Soll, Ist, Modus und Entscheidungsgrund;
- Speicher beziehungsweise Speicherfarm;
- §14a einschließlich Kommunikationsfallback;
- Peak-Shaving;
- Tarifstatus;
- PV-Prognose;
- Verfügbarkeit optionaler Module.

## Ereignispuffer

Die Runtime hält höchstens 60 verdichtete Diagnoseereignisse im Arbeitsspeicher. Für das Cockpit werden maximal die letzten acht Ereignisse veröffentlicht. Doppelte Lademanagementereignisse werden anhand ihrer stabilen Ereignis-ID zusammengeführt.

## Aktualisierung

- Aktualisierungszyklus: höchstens alle fünf Sekunden;
- unveränderte Einzelstates werden nicht erneut geschrieben;
- bei Adapter-Shutdown werden Timer gestoppt;
- fehlende optionale Module erzeugen keine Fehler und werden in der Darstellung ausgeblendet.

## Sicherheitsvertrag

Der Dienst schreibt ausschließlich unter `info.adminOverview.*`. Er besitzt keinen Zugriff auf Wallbox-, Speicher-, Modbus-, OCPP-, §14a- oder sonstige Hardware-Sollwertpfade. Er ist kein zusätzlicher Regler und kein weiterer Writer.

Die bestehende Reihenfolge bleibt unverändert:

```text
EMS-Regelung
→ Netz / Station / Phasen / §14a / Safety
→ zentraler Single Writer
→ Hardware
```

## EOS-Admin-Anbindung

Der EOS Admin liest den Vertrag über `nexowatt-ui.*.info.adminOverview.*`, wählt eine verfügbare Instanz und zeigt eine responsive Live-Kachel. Der EOS Admin führt dabei keine State-Schreiboperation aus.
