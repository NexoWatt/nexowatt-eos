# RC75-Validierungsbericht – NexoWatt UI 0.8.200

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.200`
- Release Candidate: **RC75**
- Schwerpunkt: zentrale EOS-Standortquelle, belastbare Open-Meteo-PV-Prognose und einfache PV-Flächenverwaltung
- Prüfdatum: 22.08.2026

## Behobene Fehler

RC75 korrigiert den zuletzt gemeldeten Zustand, bei dem die Oberfläche zwar „Prognose aktiv“ meldete, aber keinen Standort, keine Prognosepunkte und ausschließlich `0,00 kWh` anzeigte.

Korrigiert wurden insbesondere:

1. Der Anlagenstandort wird zentral aus EOS Admin beziehungsweise der zentralen EOS-Systemkonfiguration übernommen.
2. Sind dort nur Ort oder Postleitzahl vorhanden, werden die Koordinaten über die Open-Meteo-Geocoding-API aufgelöst.
3. Alte manuelle Forecast-Koordinaten werden nur noch als Migrationsfallback berücksichtigt.
4. Die PV-Flächentabelle bleibt im Kundenbereich immer sichtbar und wird nicht mehr durch verzögerte State-Hydrierung ausgeblendet.
5. Mehrere PV-Flächen werden über Tabelle und Plus-Schaltfläche gepflegt; eine JSON-Eingabe ist für Endkunden nicht erforderlich.
6. Open-Meteo gilt erst dann als aktive PV-Prognose, wenn eine zukünftige Kurve mit positiven Leistungspunkten vorhanden ist.
7. Standort, Quelle, letzter Abruf, letzter erfolgreicher Abruf, Prognosepunkte, Leistung und Energie werden direkt aus dem aktuellen Open-Meteo-Snapshot dargestellt.
8. Open-Meteo- und AppCenter-Prognosen werden auf denselben zentralen Forecast-Vertrag normalisiert.

## Zentrale EMS-Verknüpfung

Die Forecastquelle schreibt keine Hardware-Sollwerte. Sie stellt ausschließlich normalisierte Prognosedaten bereit:

```text
forecast.openMeteoPv.*
forecast.pv.*
adapter._pvForecast
```

Dieser zentrale Vertrag wird von den bestehenden Logiken verwendet:

- Auto- und Zeit-Ziel-Lademanagement;
- zentrale Budget- und Forecast-Gates;
- Speicher- und Speicherfarmregelung;
- Thermik- und Heizstablogik;
- Betriebsstrategien;
- KI-/Hinweislogik;
- EOS-Admin-Livediagnose.

Reale Messwerte und folgende Schutzebenen bleiben stets übergeordnet:

- Netzanschlusslimit;
- Stations- und Phasenlimit;
- §14a und Parkregler;
- RFID-/Verfügbarkeitssperren;
- Gerätefehler und Kommunikation;
- Safety-Envelope;
- zentraler Single Writer.

## Vollständiges Release-Gate

Der geordnete Publish-Plan umfasst **245 Prüfungen**. Die Ausführung wurde wegen des maximalen Werkzeug-Zeitfensters in zwei deterministischen Bereichen abgeschlossen:

```text
Schritte 1–194:   bestanden
Schritte 195–245: bestanden
Gesamt:            245 von 245 bestanden
Fehlgeschlagen:    0
```

Zu den erneut geprüften Bereichen gehören unter anderem:

- RC75 zentrale Standortauflösung und Open-Meteo-GTI-Prognose;
- RC74 PV-Flächentabelle und Kundenoberfläche im Chromium-Browser;
- RC72 Forecast-/Auto-/Zeit-Ziel-Regression;
- RC73 EMS-Admin-Overview;
- Open-Meteo- und AppCenter-Fallback;
- Auto-/Zeit-Ziel-Planung mit fehlenden optionalen Modulen;
- dynamische Tarife, NT-Logik und Deadline-Override;
- mehrere Ladepunkte und Stationsbudgets;
- OCPP21 und generische Gerätepfade;
- §14a-Kommunikationsfallback;
- Speicher und Speicherfarm;
- Betriebsstrategien;
- Safety-Envelope und finaler Single Writer;
- Lizenz-Bootstrap;
- SmartHome, NexoLogic und Energie-Ledger;
- Stationsdisplay und Browserlayout;
- Package-Runtime-Startprüfung.

## TypeScript- und Runtime-Prüfung

```text
TypeScript-/TSX-Dateien im Repo:  744
Produktive Runtimequellen:        117
Runtime-Spiegel:                  479
@ts-nocheck-Budget:               60 Dateien / 160.344 Zeilen
Erlaubtes Budget:                 maximal 160.344 Zeilen
Typecheck:                        bestanden
Runtime-Mirror-Typecheck:         bestanden
Runtime-Synchronität:             bestanden
```

## Release-Artefakt

```text
package.json.files:               283 Produktdateien
Release-Manifest:                 283 Produktdateien
npm-Paketinhalt:                  284 Dateien einschließlich package.json
npm-Paketgröße:                   7.579.501 Byte
Ungepackte npm-Größe:            17.037.815 Byte
publish:check:                    bestanden
verify-publish.js:                bestanden
npm pack --dry-run:               bestanden
npm publish --dry-run:            bestanden (`--ignore-scripts`)
```

Der Dry-Run meldete lediglich erwartungsgemäß, dass für eine echte Veröffentlichung eine npm-Anmeldung erforderlich ist.

## Registry-Hinweis

Die Live-Verfügbarkeit von Version `0.8.200` konnte in der isolierten Build-Umgebung wegen DNS-/Registry-Zeitüberschreitungen nicht unabhängig bestätigt werden. Der vorhandene `prepublishOnly`-Guard fragt die npm-Registry auf dem Veröffentlichungsrechner fail-closed ab und bricht ab, falls die Version bereits existiert oder der Registry-Status nicht eindeutig ermittelt werden kann.

## Stable-Einordnung

RC75 ist der automatisiert vollständig geprüfte Stable-Kandidat. Vor der Kennzeichnung als `1.0.0 Stable` bleibt ein kontrollierter Anlagenfeldtest über mindestens einen Tageswechsel erforderlich:

- Open-Meteo-Abruf mit realem EOS-Admin-Standort;
- mindestens eine reale PV-Fläche, optional mehrere Dachausrichtungen;
- Prognosewerte bei Tag und Nacht;
- AppCenter-Fallback bei unterbrochener Open-Meteo-Verbindung;
- aktives Zeit-Ziel-Laden mit PV-/Preisplanung;
- keine ungeklärten Tick-, Writer- oder Safety-Fehler.
