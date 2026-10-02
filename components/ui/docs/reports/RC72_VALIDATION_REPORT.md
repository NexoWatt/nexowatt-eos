# RC72 – Validierungsbericht

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.197`
- Release Candidate: RC72
- Datum: 22.08.2026
- Schwerpunkt: sichtbare Wetter-/PV-Prognose, AppCenter-Fallback und forecast-aware Auto-/Zeit-Ziel-Planung

## Behobener Ausgangsfehler

Die frühere RC71-Paketierung verwendete ein Release-Manifest, das Repository-Dateien statt ausschließlich der npm-freigegebenen Produktdateien erwartete. Dadurch brach `npm publish` unter anderem wegen vermeintlich fehlender Dateien wie `PUBLISH_NOW.txt`, älterer Validierungsberichte, `.npmignore` und `tsconfig.ems-mirrors.json` ab.

RC72 erzeugt das Release-Manifest deterministisch und ausschließlich aus `package.json.files`. Repository-, Build- und Berichtdateien können dadurch nicht mehr versehentlich Teil des npm-Artefaktvertrags werden.

## Umgesetzte Funktionen

### Sichtbare Kundenkonfiguration

Die PV-Prognose befindet sich fest unter:

```text
Einstellungen → Allgemein → Wetter-App → PV-Prognose
```

Alle Eingaben werden über den bestehenden EOS-Vertrag `data-scope="settings"` und `data-key="…"` gespeichert. Die frühere fehleranfällige dynamische Einfügung ist nicht Bestandteil von RC72.

Einstellbar sind:

- Quelle: Automatisch, nur Open-Meteo, nur AppCenter-Datenpunkte oder deaktiviert;
- Open-Meteo-PV-Prognose an/aus;
- AppCenter-Fallback an/aus;
- Standort oder automatische Übernahme des Systemstandorts;
- kWp, Neigung, Azimut, Verluste und Wechselrichterlimit;
- Planungssicherheit, Aktualisierung und Prognosehorizont;
- mehrere PV-Flächen als Experten-JSON;
- aktueller Forecast-Status und Energieprognose.

### Open-Meteo und AppCenter

- Open-Meteo-Einstrahlung wird in konservative 15-Minuten-PV-Leistung umgerechnet.
- Die vorhandenen AppCenter-Zuordnungen `pvForecastTodayJson` und `pvForecastTomorrowJson` bleiben erhalten.
- Automatik bevorzugt eine frische Open-Meteo-Prognose und verwendet bei Bedarf den AppCenter-Fallback.
- Fehlen beide Quellen, bleibt Auto aktiv und Zeit-Ziel verwendet den Latest-Start-Fallback.

### Auto-/Zeit-Ziel-Planer

- Planung nur bei `Auto + Zeit-Ziel aktiv`;
- keine Fahrzeug-Zukunftsplanung bei deaktiviertem Zeit-Ziel;
- exakte Zielzeit einschließlich Teilslot;
- PV-Slots zuerst;
- anschließend günstige Preis-Slots;
- verbleibende Energie in spätesten sicheren Slots;
- manueller und automatischer Tarifmodus;
- Speicher-/Auto-/Ladestationspriorität;
- gemeinsames Standort- und Stationsbudget bei mehreren Ladepunkten;
- MUSS/SOLL/KANN-Betriebsstrategien;
- Deadline-Override nur für wirtschaftliche Wartebedingungen;
- keine Umgehung von Netz-, Stations-, Phasen-, §14a-, RFID- oder Safety-Grenzen;
- weiterhin genau ein Hardware-Writer.

## Regressionsprüfungen

Der geordnete Publish-Plan enthält **242 Prüfungen**. Alle Schritte wurden in kontrollierten Teilbereichen ausgeführt und jeder einzelne Schritt besitzt ein erfolgreiches `OK`-Ergebnis.

```text
Bestanden:     242
Fehlgeschlagen:  0
```

Besonders geprüft wurden:

- RC72 Wetter-/PV-Konfiguration und Browserdarstellung;
- Open-Meteo-PV-Berechnung;
- AppCenter-only und automatischer Fallback;
- fehlende optionale Prognosemodule;
- Zeit-Ziel aus;
- exakte Zielzeit;
- PV-Fenster und günstigere Preisfenster;
- Latest-Start und Zielgefährdung;
- manueller/automatischer Tarif und Tarifpriorität;
- mehrere Ladepunkte und gemeinsame Caps;
- Betriebsstrategien MUSS/SOLL/KANN;
- OCPP21, Alfen/Modbus und generische Zuordnungen;
- §14a-Kommunikationsfallback;
- Netz-, Stations-, Phasen- und Safety-Grenzen;
- Speicherregelung und Speicherfarm;
- Lizenz-Bootstrap, SmartHome und NexoLogic;
- Dashboard- und Stationsseiten;
- Paket-Runtime-Start.

## TypeScript- und Runtime-Prüfung

```text
TypeScript-/TSX-Dateien im Projekt: 741
Produktive Runtimequellen:          116
Runtime-TS-/TSX-Spiegel:            477
@ts-nocheck-Budget:                 60 Dateien / 160.344 Zeilen
Typecheck:                           bestanden
Runtime-Executable-Synchronität:    bestanden
Runtime-Mirror-Synchronität:        bestanden
Runtime-Mirror-Typecheck:           bestanden
```

## npm-Artefakt

```text
Version:                    0.8.197
package.json.files:         279 Produktdateien
Release-Manifest:           279 Produktdateien
npm-Paketinhalt:            280 Dateien einschließlich package.json
npm-Paketgröße:             7.557.048 Byte
Ungepackte npm-Größe:      16.944.857 Byte
publish:check:              bestanden
verify-publish.js:          bestanden
npm pack --dry-run:         bestanden
npm publish --dry-run:      bestanden
```

## Feldteststatus

RC72 ist ein paket- und regressionsgeprüfter Feldtestkandidat. Vor `1.0.0 Stable` sollten reale Anlagen mit Open-Meteo, AppCenter-Fallback, OCPP21, Modbus, mehreren Ladepunkten, Speicherpriorität, §14a und einem mehrtägigen Dauerbetrieb bestätigt werden.
