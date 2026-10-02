# RC66 Validierungsbericht

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.191`
- Release Candidate: `RC66`
- Schwerpunkt: responsive Multi-LP-Stationsseiten mit NexoWatt-EOS-Branding

## Änderungsgrenze

RC66 verändert ausschließlich die Stations-/Kioskdarstellung und das read-only Präsentationsmodell für verständliche Status-, Entscheidungs- und Warntexte. Die vorhandenen Regelpfade für Ladepunkte, Stationsbudgets, Netz-/Phasengrenzen, §14a, Tarif, Speicher und Speicherfarm wurden nicht ersetzt.

Bedienhandlungen der Stationsseite erzeugen weiterhin nur herstellerneutrale Charging-Management-Intents. Es wurde kein zusätzlicher OCPP-, Modbus-, MQTT- oder Hersteller-Writer eingeführt.

## Umgesetzte Oberfläche

- originales NexoWatt-EOS-Logo im Header;
- CSV-Schaltfläche aus der sichtbaren Stationsseite entfernt;
- kompakte Statusleiste für Modus, Ziel-Laden, Tarif, PV, Speicher, Stationslimit, Kommunikation und Warnstatus;
- Stationsübersicht mit Leistung, Solaranteil, Tagesenergie/Kosten, Modus, Kommunikation und Kurzentscheidung;
- responsives Multi-LP-Raster;
- vier LP-Karten nebeneinander bei üblichen 16:9-Kioskauflösungen;
- fünf und sechs LPs in drei Spalten und zwei Zeilen;
- sieben und acht LPs in vier Spalten und zwei Zeilen;
- kompakte LP-Karten mit Liveleistung, Fahrzeugstatus/SoC, Session, Kosten, Preis, Solar-/Netzanteil, Betriebsmodi, Ziel-Laden, Speicherwahl und AC-Phasenmodus;
- eigener Bereich „EOS Entscheidung – warum gerade so?“;
- eigener Bereich für Fehler, Warnungen und unbestätigte Hardwarebefehle;
- Portrait-/Tablet-Fallback mit scrollbarer, bedienbarer Darstellung.

## Codequalität

Die Ableitung von Warnungen und EOS-Entscheidungsgründen wurde aus dem großen Adapterkern in den neuen typgeprüften, read-only Helfer ausgelagert:

```text
src-ts/runtime-executables/lib/station-display-presentation.ts
→ lib/station-display-presentation.js
```

Der Helfer schreibt keine States und besitzt keinen Aktorpfad. Dadurch blieb das bestehende `@ts-nocheck`-Budget unverändert:

```text
60 Dateien / 160344 Zeilen
Maximal erlaubt: 160344 Zeilen
```

Weitere Prüfergebnisse:

```text
TypeScript-Quelldateien:        712
Produktive Runtime-Dateien:     110
Runtime-TS-/TSX-Spiegel:        466
Vollständiger Typecheck:        bestanden
Runtime-Identifier-Audit:       bestanden
Relative require()-Pfade:       vollständig
Paket-/Startketten-Smoke:       bestanden
```

## Chromium-Layoutprüfung

Die Seite wurde in echtem headless Chromium geprüft:

| Szenario | Erwartete Spalten | Ergebnis |
|---|---:|---|
| 4 LP · 1920×1080 | 4 | bestanden |
| 4 LP · 1600×900 | 4 | bestanden |
| 4 LP · 1366×768 | 4 | bestanden |
| 5 LP · 1920×1080 | 3 | bestanden |
| 6 LP · 1920×1080 | 3 | bestanden |
| 8 LP · 1920×1080 | 4 | bestanden |

Für alle Querformat-Szenarien wurden geprüft:

- kein horizontaler Seitenoverflow;
- kein vertikaler Seitenoverflow;
- kein interner Shell-Overflow;
- Footer vollständig im Viewport;
- alle LP-Karten vollständig im Viewport;
- Logo vollständig geladen;
- keine sichtbare CSV-Schaltfläche;
- Status-, Zusammenfassungs-, Entscheidungs- und Warnbereiche vorhanden;
- Offline-LP wird im Warnbereich angezeigt;
- Boost-Bedienung erzeugt ausschließlich den vorhandenen `set-mode`-Command-Intent.

## Funktions- und Regressionsprüfung

Der geordnete Publish-Plan enthält 236 Prüfungen. Auf dem finalen Produktstand wurden die Schritte 1–188 und 189–236 als zwei zusammenhängende, fail-closed Läufe erfolgreich abgeschlossen. Zusätzlich bestanden insbesondere:

- vollständiges Charging-Hardening;
- Alfen/NexoWatt Devices, NexoWatt OCPP21 und generische AC/DC-Ladepunkte;
- Auto, Boost, Min+PV, PV, Tarif und Zeit-Ziel;
- Stations- und Mehrladepunktbudget;
- §14a-, Netz- und Phasenbegrenzung;
- OCPP21-Bestätigung und sicherer 0-W-Vertrag;
- Speicher-Schutz und Speicherunterstützung;
- Speicherfarm Auto-Dispatch und Dispatch-Recovery;
- Heizstab-Nachtsperre;
- RC63 Availability/RFID;
- RC64/RC65 Speicher-Netzlade- und Zeit-Ziel-Vertrag;
- Cross-App-Identifier-Audit;
- Stationsdisplay-API, Watchdog und Wartungsmodus.

## Release-Artefakt

```text
Version:                       0.8.191
Release-Manifest:              268 geprüfte Produktdateien
npm-Paketinhalt:               269 Dateien
npm-Paketgröße:                7.523.901 Byte
Ungepackte npm-Größe:          16.812.712 Byte
publish:check:                 bestanden
verify-publish.js:             bestanden
npm pack --dry-run:            bestanden
```

Das npm-Dry-Run-Paket enthält den typisierten Präsentationshelfer, das NexoWatt-EOS-Logo, die responsive Stationsruntime und die RC66-Dokumentation.

Die finale Quell-ZIP wurde anschließend in einen leeren Ordner entpackt. Aus genau diesem Inhalt bestanden erneut:

- `publish:check`;
- `verify-publish.js`;
- RC66-Static- und Chromium-Test;
- bestehender Stationsdisplay-Vertrag;
- Paket-/Startketten-Smoke;
- Prüfung auf unerwünschte ZIP-/TGZ-Artefakte;
- Publish-Plan-Validierung mit 236 Schritten;
- `npm pack --dry-run` inklusive aller RC66-Pflichtdateien.

## Feldtestgrenze

RC66 ist als finaler Stationsseiten-Feldtestkandidat ausgelegt. Reale Displayhardware, Touchbedienung, Browser-Kioskmodus und kundenspezifische Stationen sollten weiterhin einmal je Zielauflösung geprüft werden. Die UI-Änderung ersetzt keinen realen Anlagen- und Dauerbetrieb vor der Stable-Freigabe.
