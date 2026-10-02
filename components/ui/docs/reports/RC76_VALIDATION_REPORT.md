# RC76-Validierungsbericht – NexoWatt UI 0.8.201

## Release-Ziel

RC76 ist der abschließende automatisierte Stable-Kandidat für die Open-Meteo-PV-Prognose und den vorhandenen forecastgestützten Auto-/Zeit-Ziel-Regler. Der Release beseitigt die beiden zuletzt im Feld sichtbaren Fehler:

1. fehlende beziehungsweise nicht erklärte Open-Meteo-Prognosewerte;
2. Überlagerungen zwischen Wechselrichtergrenze und Löschschaltfläche im PV-Flächeneditor.

## Umgesetzte Open-Meteo-Fallbackkette

Die PV-Prognose arbeitet jetzt in drei Stufen:

1. 15-Minuten-Global-Tilted-Irradiance je PV-Fläche;
2. stündliche Global-Tilted-Irradiance je fehlender PV-Fläche;
3. stündliche GHI-/DNI-/DHI-Werte mit lokaler Berechnung für weiterhin fehlende Flächen.

Erfolgreich geladene Flächen werden bei einem späteren Fallback nicht doppelt gezählt. Temporäre Transportfehler werden einmal wiederholt. Ist bereits eine gültige Prognose vorhanden, bleibt diese bei einem kurzfristigen Providerfehler nutzbar und wird als `stale-error` gekennzeichnet.

## Gültige Nullertragsprognose

Eine vollständige Prognosekurve mit 0 W bleibt gültig. Sie wird beispielsweise nachts angezeigt als:

```text
Prognose aktiv · aktuell 0 W erwartet
```

Sie wird nicht mehr mit „keine Prognosewerte“ verwechselt.

## Diagnose

Verbindlich veröffentlicht und in der Kundenoberfläche sichtbar sind:

- Abrufmodus;
- Abrufstatus;
- letzter Abrufversuch;
- letzte erfolgreiche Prognose;
- Prognosepunkte und positive Prognosepunkte;
- verwendeter Standortname und Standortquelle;
- Energie für 6, 12 und 24 Stunden;
- konkreter Provider- beziehungsweise Fallbackfehler.

## Standort

Der angezeigte Name wird vorrangig aus demselben aufgelösten Standort wie in der Wetter-App übernommen. Danach folgen der zentrale EOS-/ioBroker-Systemstandort, Geocoding von Ort oder Postleitzahl und schließlich Koordinaten als technische Rückfallebene.

## PV-Flächeneditor

Die Darstellung reagiert auf die tatsächliche Breite des PV-Bereichs:

- breite Fläche: Tabelle;
- schmale Fläche: einzelne PV-Flächenkarten;
- ein Eintrag: Löschspalte und Löschschaltfläche vollständig ausgeblendet;
- mehrere Einträge: eigene Aktionsspalte;
- keine Überlagerung zwischen WR-Grenze und Aktion;
- kein horizontaler Überlauf bei 930 px beziehungsweise 760 px Komponentenbreite im Chromium-Test.

## Sicherheits- und Regelvertrag

Die Prognose bleibt read-only und ist ausschließlich eine Optimierungsquelle. Unverändert übergeordnet bleiben:

- Netzanschluss- und Phasengrenzen;
- Stations- und Multi-Lademanagement;
- §14a und Netzbetreiber-/Parkreglervorgaben;
- RFID und Availability;
- Geräte- und Kommunikationsschutz;
- Safety-Envelope;
- zentraler Single Writer.

## Vollständiges Release-Gate

Die geordnete Releaseprüfung umfasst **246 Schritte**. Wegen der maximalen Laufzeit eines einzelnen Werkzeugprozesses wurde sie reproduzierbar in drei Abschnitten ausgeführt:

```text
Schritte 1–195:   bestanden
Schritte 196–244: bestanden
Schritte 245–246: bestanden
Gesamt:            246 von 246 bestanden
Fehler:            0
```

Erneut geprüft wurden unter anderem:

- Speicher, Speicherfarm und FENECON;
- Auto-, PV-, Min+PV-, Boost- und Zeit-Ziel-Laden;
- OCPP21, Alfen/Modbus und NexoWatt Devices;
- Stations- und Netzbudgets;
- §14a-Kommunikationsfallback;
- Tarif-/NT-/Preislogik;
- Betriebsstrategien;
- Safety-Envelope und finaler Hardware-Write;
- Wetter-/PV-Prognose und AppCenter-Fallback;
- Kunden-Dashboard und EOS-Admin-Diagnosevertrag;
- Lizenz-Bootstrap, SmartHome und NexoLogic;
- Paket-Runtime-Start.

## TypeScript- und Runtime-Prüfung

```text
TypeScript-/TSX-Dateien:          744
Produktive Runtimequellen:        117
Runtime-Spiegel:                  479
TypeScript-Typecheck:             bestanden
Runtime-Mirror-Typecheck:         bestanden
Runtime-Executable-Synchronität:  bestanden
Runtime-Mirror-Synchronität:      bestanden
@ts-nocheck-Budget:               60 Dateien / 160.344 Zeilen – bestanden
```

## npm-Artefakt

```text
Paket:                    iobroker.nexowatt-ui
Version:                  0.8.201
package.json.files:       284
Release-Manifest:         284 Produktdateien
npm-Paketinhalt:          285 Dateien inklusive package.json
npm-Paketgröße:           7.584.782 Byte
Ungepackte Größe:        17.060.213 Byte
publish:check:            bestanden
verify-publish.js:        bestanden
npm pack --dry-run:       bestanden
npm publish --dry-run:    bestanden
```

## Stable-Freigabe

RC76 ist der vollständig automatisiert geprüfte Stable-Kandidat. Vor der Kennzeichnung `1.0.0 Stable` wird ein letzter realer Anlagenfeldtest über mindestens einen Tageswechsel empfohlen: positive Tagesprognose, gültige 0-W-Nachtprognose, mindestens ein erzwungener Open-Meteo-Fallback, AppCenter-Fallback und ein aktives Zeit-Ziel-Laden.
