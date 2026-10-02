# RC76 – Open-Meteo-PV-Prognose: Fallbackkette, Diagnose und responsive PV-Flächen

## Ziel

RC76 stabilisiert die kundenseitige PV-Prognose und beseitigt zwei konkrete Feldfehler:

1. Open-Meteo lieferte je nach Wettermodell keine nutzbare 15-Minuten-GTI-Kurve; die Oberfläche blieb trotzdem ohne verständlichen Fehler auf „Prognose noch ohne Werte“.
2. Die PV-Flächentabelle richtete sich nach der Browserbreite statt nach ihrer tatsächlichen Inhaltsbreite. Dadurch konnten Wechselrichterfeld und Löschschaltfläche überlappen.

## Robuste Open-Meteo-Abfrage

EOS verwendet nun eine dreistufige, vollständig read-only Prognosekette:

1. 15-Minuten-Global-Tilted-Irradiance je PV-Fläche;
2. stündliche Global-Tilted-Irradiance je PV-Fläche;
3. stündliche GHI-/DNI-/DHI-Komponenten und lokale Berechnung der geneigten PV-Flächen.

Jeder Abruf wird bei temporären Transportfehlern einmal wiederholt. Ist bereits eine gültige Prognose vorhanden, wird sie bei einem vorübergehenden Fehler weiterverwendet und ausdrücklich als veraltet markiert.

Eine vollständige Kurve mit 0 W ist gültig. Sie bedeutet beispielsweise Nacht oder keinen erwarteten Ertrag und darf nicht als fehlende Prognose behandelt werden.

## Standort

Die Standortanzeige verwendet in dieser Reihenfolge:

1. denselben aufgelösten Standortnamen wie die Wetter-App;
2. den zentralen EOS-/ioBroker-Systemstandort;
3. Ort/Postleitzahl mit Open-Meteo-Geocoding;
4. Koordinaten als technische Rückfallebene.

## Diagnose

Neu beziehungsweise verbindlich veröffentlicht werden:

- `forecast.openMeteoPv.requestMode`
- `forecast.openMeteoPv.requestStatus`
- `forecast.openMeteoPv.lastAttemptAt`
- `forecast.openMeteoPv.lastSuccessAt`
- `forecast.openMeteoPv.positivePoints`
- `forecast.openMeteoPv.locationText`
- `forecast.openMeteoPv.error`

Die Kundenoberfläche zeigt Abrufmodus, letzten Versuch, letzte erfolgreiche Prognose, Standort und verständliche Fehlerursache.

## PV-Flächenoberfläche

Die Oberfläche verwendet eine Container Query. Maßgeblich ist damit die tatsächliche Breite des PV-Bereichs und nicht die Gesamtbreite des Browserfensters.

- breite Fläche: kompakte Tabelle;
- schmale Fläche: jede PV-Fläche als eigene Karte;
- genau eine Fläche: Löschschaltfläche vollständig ausgeblendet;
- mehrere Flächen: getrennte Aktionsspalte ohne Überlappung;
- keine horizontale Überlagerung zwischen WR-Grenze und Aktion.

## Unveränderte Sicherheitsgrenzen

Die Prognose bleibt eine reine Optimierungsquelle. Sie kann keine Netz-, Stations-, Phasen-, §14a-, Parkregler-, RFID-, Geräte- oder Safety-Grenze übersteuern. Die Hardware wird weiterhin ausschließlich über den vorhandenen Single Writer angesteuert.
