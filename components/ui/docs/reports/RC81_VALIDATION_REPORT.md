# RC81-Validierungsbericht – NVP-Zuordnung als Single Source of Truth

## Release

- Adapter: `iobroker.nexowatt-ui`
- Version: `0.8.206`
- Release-Kandidat: `RC81`
- Datum: `2026-08-24`

## Fachliche Korrektur

RC81 verwendet ausschließlich **AppCenter → Zuordnung → Allgemein** für:

- `installerConfig.gridConnectionPower` als statische Netzanschluss-/Hard-Grenze,
- `datapoints.gridPointPower` als signierte NVP-Messung (`Import + / Export −`).

Das Soft-Limit beträgt automatisch 90 % der wirksamen Hard-Grenze; die Reserve beträgt exakt 10 %. Netzlimits enthält kein zweites editierbares Hard-Limit und keinen zweiten NVP-Datenpunkt.

Alte Werte in `gridConstraints.importHardLimitW`, `gridConstraints.gridImportHardLimitW`, `gridConstraints.gridPowerId` und der Legacy-Fallback über `peakShaving.maxPowerW` werden ignoriert. RLM darf eine vorhandene Anschlussgrenze nur absenken.

## Geprüfte Feldfälle

| Fall | Erwartung | Ergebnis |
|---|---:|---:|
| Zuordnung 30.000 W, Legacy-Hard 5.000 W | Hard 30.000 W | bestanden |
| Zuordnung 30.000 W | Soft 27.000 W / Reserve 3.000 W | bestanden |
| NVP −10.100 W | Hard-Headroom 40.100 W / Soft-Headroom 37.100 W | bestanden |
| RLM 25.000 W bei Zuordnung 30.000 W | Hard 25.000 W / Soft 22.500 W | bestanden |
| Keine Zuordnung, Legacy/RLM vorhanden | kein verborgenes Ersatzlimit | bestanden |
| 0-Einspeisung | zentraler signierter NVP bleibt Führungsgröße | bestanden |

## Ausgeführte Regressionen

- RC81 Single-Source-Test: bestanden
- RC80 feste 10-%-Reserve: bestanden
- RC79 Soft-/Hard-Limit und 0-Einspeisung: bestanden
- RC78 signed-NVP Import-only Budget: bestanden
- RC77 PV-Prognose-Statecache: bestanden
- Safety-Envelope Final-Write: bestanden
- 0-Einspeise-Senkenpriorität, Inbetriebnahme, Fast-Path und ACK-Historie: bestanden
- Runtime-Executables: 118 Dateien synchron
- Runtime-Mirrors: 480 Dateien synchron
- AppCenter-Runtime-Typvertrag: bestanden
- Paket-Start-Smoke: 171 JS/MJS-Dateien und Startkette geprüft
- frisch entpacktes npm-TGZ: RC81-Test und 170 JS/MJS-Syntaxprüfungen bestanden
- `npm publish --dry-run --ignore-scripts`: bestanden

## Release-Artefakt

Der Release-Manifest- und Publish-Check wurde nach jeder relevanten Änderung neu erzeugt und geprüft. Die TypeScript-Abhängigkeiten konnten in dieser Build-Umgebung wegen eines DNS-Fehlers (`EAI_AGAIN` beim npm-Registry) nicht neu installiert werden. Die vorhandenen dependency-freien Release-, Runtime-, Spiegel-, Paket- und Fachprüfungen wurden vollständig ausgeführt; der echte Publish-Guard prüft die npm-Versionsfreiheit auf dem Veröffentlichungsrechner erneut.
