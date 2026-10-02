# RC77-Validierungsbericht – NexoWatt UI 0.8.202

## Release-Ziel

RC77 behebt den Fehler, durch den die Wetter-App trotz vorhandener Open-Meteo-/EMS-Daten dauerhaft `0.00 kWh`, `0 Prognosepunkte` sowie fehlende Abrufzeiten anzeigen konnte. Der Release schließt die vollständige Kette zwischen Provider, ioBroker-States, EMS-Prognose, internem UI-`stateCache`, `/api/state`, SSE und Browser-Cache.

## Verifizierte Fehlerursache

Die Open-Meteo-Laufzeit schrieb `forecast.openMeteoPv.*`, und das EMS veröffentlichte den wirksamen Vertrag unter `forecast.pv.*`. Die Kundenoberfläche liest diese Werte jedoch nicht unmittelbar aus der ioBroker-Datenbank, sondern aus dem internen `stateCache`.

Bis RC76 fehlten in dieser Kette mehrere Verbindungen:

1. `forecast.*` wurde beim Start nicht zuverlässig abonniert und nicht vollständig in den UI-Cache eingelesen;
2. `keyFromId()` ordnete lokale Forecast-States keinem öffentlichen `forecast.*`-Schlüssel zu;
3. unveränderte persistierte Werte wurden nach einem Adapterneustart nicht erneut geschrieben und blieben dadurch im neu aufgebauten UI-Cache unsichtbar;
4. Browser und Service Worker konnten noch RC76-Dateien ausliefern.

## RC77-Korrekturen

### State-Subscription und Startreihenfolge

- lokale Subscription über `subscribeStatesAsync('forecast.*')`;
- kompatibler Fallback über `subscribeForeignStatesAsync(<namespace>.forecast.*)`;
- Wildcard-Priming über `getForeignStatesAsync(<namespace>.forecast.*)`;
- statischer Fallback für Provider- und EMS-Diagnosewerte;
- erstes Priming vor dem ersten Open-Meteo-Abruf;
- zweites idempotentes Priming nach Initialisierung des EMS-Prognosemoduls.

### Direkte UI-Cache-Spiegelung

Provider- und EMS-Writes werden unmittelbar über `updateValue()` in den öffentlichen Cache übernommen. Das umfasst insbesondere:

- letzten Abrufversuch und letzten Erfolg;
- Abrufmodus und Abrufstatus;
- Standort und Standortquelle;
- Fehlertext;
- Punkte und positive Ertragspunkte;
- Leistung, Peak und Energie für 6/12/24 Stunden;
- Prognosekurve und Quellenstatus.

### Neustart- und Providerausfall-Härtung

- eine höchstens zwei Stunden alte letzte erfolgreiche Kurve wird beim Start rekonstruiert;
- nur noch zukünftige Segmente bleiben erhalten;
- 6-/12-/24-Stunden-Ertrag und Peak werden aus der verbleibenden Kurve neu berechnet;
- bei kurzfristigem Provider-/DNS-/Netzfehler bleibt die Kurve als `stale-error` sichtbar;
- abgelaufene, leere oder vollständig vergangene Kurven werden nicht als gültige Planung verwendet;
- unveränderte persistierte EMS-Werte füllen den UI-Cache, ohne unnötige ioBroker-Writes zu erzeugen.

### Diagnose und Browser

- Forecast-Statewrite-Fehler werden gesammelt und auf höchstens eine Warnung pro Minute gedrosselt;
- Änderungen an Quelle, Aktivierung, Standort, Intervall und PV-Flächen lösen sofort einen neuen Abruf aus;
- Service-Worker-Cache wurde auf `nexowatt-cache-v483` angehoben;
- `forecast-settings.js` wird mit `0.8.202-rc77` cache-busted;
- die Anzeige berechnet Datenalter zusätzlich aus den tatsächlichen Zeitstempeln.

## Dynamischer RC77-Regressionsverbund

Der neue RC77-Test führt reale Modulaufrufe mit ioBroker-Stubs aus und prüft:

- Loading-, Success- und Error-Publikation;
- direkte Provider-/EMS-Cache-Spiegelung;
- Open-Meteo-Requestparameter und Mehrflächenverarbeitung;
- persistierte Neustartwiederherstellung;
- Entfernung abgelaufener Segmente;
- harte Zwei-Stunden-Ablaufgrenze;
- vollständig erschöpfte Kurven;
- Quellalias- und String-Boolean-Kompatibilität;
- unveränderte Statewerte nach Neustart;
- lokale und Foreign-Subscription-Fallbacks;
- dynamisches Wildcard-Priming;
- Forecast-Zuordnung in `keyFromId()`;
- Frontend-Altersermittlung und Browser-Cachevertrag;
- Synchronität der generierten produktiven Runtime.

## Vollständiges Release-Gate

Alle **247 eindeutigen Release-Schritte** wurden erfolgreich ausgeführt:

```text
Schritte 1–75:    bestanden
Schritte 76–100:  bestanden
Schritte 101–200: bestanden
Schritte 201–245: bestanden
Schritte 246–247: bestanden
Gesamt:            247 von 247 bestanden
Fehler im finalen Stand: 0
```

Eine erste Ausführung stoppte am absichtlich fail-closed ausgelegten `@ts-nocheck`-Budget, weil die neue Forecast-Laufzeit 128 dokumentierte Zeilen ergänzt hatte. Die Baseline wurde explizit auf Version 0.8.202 aktualisiert; anschließend bestand das Gate vollständig.

Erneut geprüft wurden unter anderem:

- Speicher, Speicherfarm und FENECON;
- Auto-, PV-, Min+PV-, Boost- und Zeit-Ziel-Laden;
- OCPP/OCPP21, NexoWatt Devices und freie Zuordnungen;
- Stations-, Netzanschluss- und Phasenbudgets;
- §14a-/EEBUS-Kommunikationsfallback;
- Tarif-, NT-, Preis- und Betriebsstrategielogik;
- Safety-Envelope und finaler Hardware-Write;
- Wetter-/PV-Prognose und AppCenter-Fallback;
- Kunden-Dashboard, EOS Admin, Lizenz, SmartHome und NexoLogic;
- Paket-Runtime-Startkette und Browserprüfungen in Chromium.

## TypeScript- und Runtime-Prüfung

```text
TypeScript-Quelldateien:          732
Produktive Runtimequellen:        117
Runtime-Spiegel:                  479
TypeScript-Typecheck:             bestanden
Runtime-Mirror-Typecheck:         bestanden
Runtime-Executable-Synchronität:  bestanden
Runtime-Mirror-Synchronität:      bestanden
@ts-nocheck-Budget:               60 Dateien / 160.472 Zeilen – bestanden
Paket-Runtime-Startsmoke:         bestanden
```

## npm-Artefakt

```text
Paket:                     iobroker.nexowatt-ui
Version:                   0.8.202
package.json.files:        285
Release-Manifest:          285 Produktdateien
npm-Tarball:               286 Dateien inklusive package.json
Paketgröße:                7.589.331 Byte
Ungepackte Größe:         17.078.342 Byte
publish:check:             bestanden
verify-publish.js:         bestanden
npm pack --dry-run:        bestanden
npm pack:                  bestanden
npm publish --dry-run:     bestanden
Frisch entpackter TGZ-Smoke: bestanden
RC77 gegen entpackte Runtime: bestanden
```

## Sicherheits- und Regelvertrag

Die Änderung erweitert ausschließlich Prognosebeschaffung, Diagnose und Veröffentlichung. Die Prognose bleibt read-only. Unverändert übergeordnet bleiben:

- Netzanschluss- und Phasengrenzen;
- Stations- und Multi-Lademanagement;
- §14a, EEBUS und Netzbetreiber-/Parkreglervorgaben;
- RFID und Availability;
- Geräte- und Kommunikationsschutz;
- Safety-Envelope;
- zentraler Single Writer.

## Freigabestatus

RC77 ist der vollständig automatisiert geprüfte NPM-ready Stable-Kandidat für die korrigierte PV-Prognosekette. Eine absolute Feldgarantie für externe DNS-, Internet-, Provider-, Zeit-, Standort- und Anlagendaten kann erst durch den realen Anlagenbetrieb bestätigt werden. Der verbleibende Abnahmepunkt ist deshalb ein echter Tages-/Nachtwechsel auf dem Ziel-EOS; im Fehlerfall liefert RC77 nun jedoch konkrete Diagnosewerte statt einer stillen Nullanzeige.
