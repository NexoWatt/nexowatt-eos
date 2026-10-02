# RC73 – NexoWatt EMS Live-Diagnose im EOS Admin

## Ziel

Die Cockpit-Übersicht des EOS Admin erhält eine große, responsive **NexoWatt EMS – Live-Diagnose**. Sie erklärt unmittelbar:

- ob das EMS aktiv und aktuell ist;
- welches Budget verfügbar ist und welche Grenze bindet;
- weshalb ein Ladepunkt lädt, wartet oder gestört ist;
- welche Speicherleistung angefordert und tatsächlich gemessen wird;
- ob §14a, Peak-Shaving, Tarif oder PV-Prognose eingreifen;
- welche relevanten EMS-Entscheidungen zuletzt getroffen wurden.

## Architektur

Die Funktion besteht aus zwei getrennten Teilen:

```text
NexoWatt UI 0.8.198
→ verdichtet vorhandene Diagnosewerte
→ veröffentlicht info.adminOverview.*

NexoWatt EOS Admin
→ liest den versionierten Vertrag
→ zeigt die read-only Cockpit-Kachel
```

Der EOS Admin liest damit nicht hunderte technische Datenpunkte einzeln. Der Adapter liefert einen kompakten, stabilen JSON-Vertrag.

## Cockpit-Inhalt

### Kopfstatus

- Normal, Information, begrenzt oder Störung;
- Adapterinstanz und Alter der Diagnose;
- zentrale Statusüberschrift und Entscheidungsgrund;
- Offline-/Stale-Erkennung nach 20 Sekunden.

### Kennzahlen

- EMS-Gesamtbudget und Restbudget;
- Ladeleistung Ist/Soll;
- aktive und wartende Ladepunkte;
- Speicher beziehungsweise PV-Budget;
- letzter Regeltick und Zyklusdauer.

### Aktive Grenzen

Als Statuschips erscheinen nur tatsächlich vorhandene beziehungsweise aktive Funktionen:

- bindende Netz-/Stations-/Phasengrenze;
- §14a und Kommunikationsfallback;
- Peak-Shaving;
- Tarif und aktueller Preis;
- Forecastquelle und Frische;
- EOS Safety.

### Entscheidungen und Ereignisse

- aktuelle Lade-, Speicher- und Budgetentscheidungen;
- maximal sechs sichtbare letzte EMS-Ereignisse;
- Link zur vollständigen Diagnose im NexoWatt UI.

## Rollen

- **Admin/Service und Installateur:** technische Soll-/Istwerte, Limiter, Zykluszeit und Ereignisse.
- **Endkunde:** reduzierte, verständliche Erklärung ohne technische Schreib- oder Expertenfunktion.

## Fehlende Module

| Situation | Anzeige |
|---|---|
| NexoWatt UI nicht installiert | EMS-Diagnose nicht verfügbar |
| Adapter offline/veraltet | rote Offline-/Stale-Warnung |
| keine Wallbox | Ladepunktbereich wird nicht als Fehler behandelt |
| kein Speicher | Speicherkennzahl wird durch PV-Budget ersetzt |
| kein Tarif | Tarifchip bleibt verborgen |
| keine Prognose | Forecastchip bleibt verborgen |
| §14a deaktiviert | §14a-Chip bleibt verborgen |

## Ressourcenschutz

- Publisher und Cockpit arbeiten höchstens alle fünf Sekunden.
- EOS Admin stoppt Polling bei unsichtbarem Browserreiter.
- Der Adapter hält maximal 60 verdichtete Diagnoseereignisse.
- Im Vertrag werden höchstens acht Ereignisse übertragen.
- Es gibt keinen zusätzlichen EMS- oder Hardware-Writer.

## Sicherheitsgrenze

Die Cockpit-Kachel und der Publisher sind vollständig read-only. Sie beschreiben Entscheidungen, verändern sie aber nicht.
