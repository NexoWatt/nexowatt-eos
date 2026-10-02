# RC72 – Wetter-/PV-Prognose und vorausschauender Auto-/Zeit-Ziel-Planer

## Release

- Adapter: `iobroker.nexowatt-ui`
- Version: `0.8.197`
- Release Candidate: RC72
- Schwerpunkt: sichtbare Kundenkonfiguration, Open-Meteo-/AppCenter-Quellenwahl und 15-Minuten-Zielplanung

## Kundenoberfläche

Die Einstellungen befinden sich fest unter:

```text
Einstellungen → Allgemein → Wetter-App → PV-Prognose
```

Die Oberfläche wird nicht mehr dynamisch an eine zufällige Stelle der Seite eingefügt. Alle Eingaben verwenden den normalen EOS-Vertrag `data-scope="settings"` / `data-key="…"` und werden über die bestehende `/api/set`-Route als `settings.*`-States gespeichert.

Konfigurierbar sind:

- Prognosequelle: Automatisch, nur Open-Meteo, nur AppCenter-Datenpunkte oder deaktiviert;
- Open-Meteo-PV-Prognose an/aus;
- AppCenter-Fallback an/aus;
- installierte PV-Leistung;
- Dachneigung und Azimut;
- Anlagenverluste und Wechselrichtergrenze;
- für flexible Verbraucher nutzbarer Sicherheitsanteil;
- optionale Koordinaten oder automatische Übernahme des Systemstandorts;
- Aktualisierungsintervall und Prognosehorizont;
- mehrere PV-Flächen als JSON-Experteneinstellung;
- aktueller Forecast-Status, Quelle, Zeitstempel und Energieprognose.

## Quellenlogik

### Automatisch

```text
Open-Meteo frisch und vollständig → Open-Meteo verwenden
Open-Meteo nicht nutzbar          → AppCenter-Datenpunkte verwenden
beide Quellen fehlen              → keine Zukunftsprognose, Latest-Start-Fallback
```

### Nur Open-Meteo

Die integrierte Wetter-/Einstrahlungsprognose wird verwendet. Bei Fehlern wird keine fremde Quelle aktiviert, sofern der Kunde nicht `Automatisch` gewählt hat.

### Nur AppCenter-Datenpunkte

Die vorhandenen Zuordnungen `pvForecastTodayJson` und `pvForecastTomorrowJson` bleiben unverändert nutzbar. Im AppCenter werden sie in einer eigenen Karte **PV-Prognose – Datenpunkt-Fallback** angezeigt.

### Deaktiviert

Es wird keine zukünftige PV-Prognose eingeplant. Reale PV-Leistung, PV-Überschussladen und alle anderen EMS-Regelungen bleiben aktiv.

## Open-Meteo-PV-Berechnung

Open-Meteo liefert Wetter- und Einstrahlungswerte. EOS berechnet daraus eine konservative anlagenspezifische PV-Leistung unter Berücksichtigung von:

- kWp;
- Neigung;
- Azimut;
- direkten, diffusen und globalen Strahlungswerten;
- Außentemperatur und angenäherter Zelltemperatur;
- Anlagenverlusten;
- Wechselrichterbegrenzung;
- kundenseitigem Planungssicherheitsfaktor.

Die Berechnung erzeugt normalisierte 15-Minuten-Slots. Die Forecast-Laufzeit ist read-only und schreibt keine Aktoren.

## Zeit-Ziel-Laden

Der neue Planer wird nur aktiv, wenn alle folgenden Bedingungen erfüllt sind:

```text
Ladepunktmodus = Auto
Zeit-Ziel      = An
gültige Zielzeit vorhanden
Fahrzeug-/Energiebedarf bestimmbar
```

Ist Zeit-Ziel aus, gibt es keine Fahrzeug-Zukunftsplanung, keinen Latest-Start und keinen Deadline-Override. Auto reagiert dann ausschließlich auf aktuelle PV-, Tarif-, Strategie-, Netz-, Stations-, Phasen-, §14a- und Fahrzeugbedingungen.

Bei aktivem Ziel erzeugt EOS einen gemeinsamen 15-Minuten-Plan:

1. nutzbare PV-Fenster;
2. günstige Preisfenster, sofern ein frischer Tarif-Forecast vorhanden ist;
3. verbleibende Energie in den spätesten sicheren Slots;
4. Deadline-Override, sobald weiteres Warten die Zielerreichung gefährdet.

Fehlen Preis- oder PV-Prognose, bleibt der Planer funktionsfähig und verwendet die jeweils verbleibende Quelle. Fehlen beide, wartet EOS konservativ bis zum spätesten sicheren Start.

## Betriebsstrategien

Betriebsstrategien bleiben Intents innerhalb derselben Auto-Arbitrierung:

- `MUSS` bleibt immer bindend;
- `SOLL` und `KANN` können bei einem echten Deadline-Override zurückstehen;
- es entsteht kein zweiter Wallbox-Writer.

## Mehrere Ladepunkte

Der Planer berücksichtigt gemeinsame Standort- und Stationscaps. Ein Slot wird nicht doppelt vergeben. Die endgültige Leistung wird anschließend weiterhin vom bestehenden Lademanagement durch Netz-, Stations-, Phasen-, §14a- und Safety-Grenzen begrenzt.

## Sicherheitsgrenzen

Unverändert übergeordnet bleiben:

- Wallbox-/Gerätefehler;
- RFID und Availability;
- §14a und Parkregler;
- Netzanschluss- und Stationslimit;
- Phasenlimit;
- Kommunikations- und Messwertfrische;
- Safety-Envelope;
- zentraler Single Writer.

Der Forecast-Planer darf eine wirtschaftlich wartende Auto-Anforderung zeitlich verschieben, aber niemals einen harten Leistungsgrenzwert erhöhen.

## Diagnose

Pro Ladepunkt werden unter anderem veröffentlicht:

```text
goalPlanAction
goalPlanReason
goalPlanSource
goalPlanTargetPowerW
goalPlanPlannedPvWh
goalPlanPlannedGridWh
goalPlanLatestStartTs
goalPlanNextWindowStartTs
goalPlanNextWindowEndTs
goalPlanDeadlineOverride
goalPlanTargetReachable
goalPlanPvForecastUsed
goalPlanPriceForecastUsed
goalPlanFallbackMode
```

Die wirksame Forecast-Quelle erscheint außerdem unter `forecast.pv.*` beziehungsweise `forecast.openMeteoPv.*`.

## Feldtest

Vor Stable sind mindestens zu prüfen:

- Open-Meteo mit Süd- und Ost-/West-Anlage;
- AppCenter-only und automatischer Fallback;
- fehlende Prognosequelle;
- manueller und automatischer Tarif;
- Speicher-/Auto-/Ladestationspriorität;
- ein und mehrere Ladepunkte;
- OCPP21 und Modbus/Devices;
- Kommunikationsabbruch und Neustart;
- §14a-, Netz-, Stations- und Phasenbegrenzung;
- Zielzeit erreichbar beziehungsweise nachweislich gefährdet.
