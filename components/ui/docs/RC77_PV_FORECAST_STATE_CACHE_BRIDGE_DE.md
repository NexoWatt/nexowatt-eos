# RC77 – PV-Prognose: zuverlässige State-Cache-Brücke und Neustart-Fallback

## Fehlerursache

Die Open-Meteo-Laufzeit und das effektive EMS-Prognosemodul haben ihre Werte korrekt als ioBroker-Datenpunkte unter `forecast.openMeteoPv.*` beziehungsweise `forecast.pv.*` geschrieben. Die Kundenoberfläche liest ihre Livewerte jedoch nicht direkt aus der ioBroker-Datenbank, sondern ausschließlich aus dem internen `stateCache`, der über `/api/state` und SSE veröffentlicht wird.

Für die Forecast-Namespaces fehlten drei Verbindungen:

1. `forecast.*` wurde beim Adapterstart nicht abonniert und nicht in den UI-Cache eingelesen;
2. `keyFromId()` konnte lokale Forecast-Datenpunkte nicht in öffentliche Cache-Schlüssel übersetzen;
3. bei unveränderten, bereits persistierten Werten beendete das EMS-Modul den Schreibvorgang, ohne den leeren Cache nach einem Neustart zu füllen.

Dadurch konnten Backend-Daten vorhanden sein, während die Wetter-App weiterhin `0.00 kWh`, `0 Prognosepunkte` und fehlende Abrufzeiten anzeigte.

## RC77-Korrektur

### Explizite Forecast-Subscription

Der Adapter abonniert einmalig den eigenen Namespace `forecast.*` und liest alle Provider- sowie EMS-Diagnosezustände beim Start in den `stateCache` ein. Nach Initialisierung des EMS wird die Cache-Befüllung idempotent wiederholt, damit neu angelegte Upgrade-States sofort sichtbar sind.

### Direkte Cache-Spiegelung

Jeder erfolgreiche Provider-Statewrite wird direkt über `updateValue()` in den Kunden-Cache gespiegelt. Das gilt für:

- Lade-/Abrufstatus;
- letzten Abrufversuch und letzten Erfolg;
- Abrufmodus und Fehlertext;
- Standort;
- Prognosepunkte und positive Punkte;
- 6-/12-/24-Stunden-Energie;
- Kurve und Providerstatus.

Ein fehlgeschlagener Statewrite wird nicht mehr vollständig verschluckt. Mehrere Fehler werden zu einer gedrosselten Warnung zusammengefasst, damit die Diagnose sichtbar bleibt, ohne das Log zu überfüllen.

### Effektive EMS-Prognose

`forecast.pv.*` wird ebenfalls unmittelbar gespiegelt. Ist ein persistierter Wert nach einem Neustart unverändert, wird er nicht unnötig erneut geschrieben, aber dennoch in den UI-Cache übernommen.

### Neustart bei vorübergehendem Providerausfall

Vor dem ersten Netzabruf wird eine höchstens zwei Stunden alte, weiterhin in die Zukunft reichende letzte erfolgreiche Open-Meteo-Kurve aus den persistierten States wiederhergestellt. Schlägt der neue Abruf kurzfristig fehl, bleibt diese Kurve als `stale-error` verfügbar. Energie und Peak werden aus der verbleibenden Zukunftskurve neu berechnet; abgelaufene oder leere Kurven werden nicht verwendet.

## Open-Meteo-Vertrag

Unverändert verwendet EOS zuerst die anlagenspezifische 15-Minuten-Abfrage mit:

- `global_tilted_irradiance`;
- `temperature_2m`;
- Neigung und Azimut je PV-Fläche;
- Unix-Zeitstempeln und GMT;
- stündlicher GTI sowie GHI/DNI/DHI als Fallback.

## Sicherheitsvertrag

Die Änderung betrifft ausschließlich Datenbeschaffung, Diagnose und Cache-Veröffentlichung. Die Prognose bleibt read-only. Netzanschluss-, Stations-, Phasen-, §14a-, Parkregler-, RFID-, Geräte- und Safety-Grenzen sowie der zentrale Single Writer bleiben unverändert übergeordnet.
