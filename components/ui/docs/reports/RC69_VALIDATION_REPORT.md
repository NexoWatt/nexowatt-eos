# RC69 Validierungsbericht – Dashboard-Ladepunkt-Feedback

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.194`
- Release Candidate: RC69
- Schwerpunkt: verständliches Ladepunkt-Feedback im LIVE-Dashboard unter **Systemstatus**

## Umgesetzter Funktionsumfang

RC69 zeigt für jeden aktuell aktiven Ladepunkt direkt im Systemstatus, ob er:

- lädt oder begrenzt lädt;
- auf Fahrzeug, PV, Tarif, Zeit-Ziel oder Betriebsstrategie wartet;
- durch §14a, Netzanschluss, Station, Phasenlimit oder Peak-Shaving begrenzt wird;
- durch EOS Safety gestoppt wurde;
- offline, gestört, nicht verfügbar oder falsch zugeordnet ist;
- wegen RFID beziehungsweise einer manuellen Stationssperre nicht laden darf;
- veraltete Messwerte oder einen nicht bestätigten Hardwarebefehl besitzt.

Der RC68-§14a-Kommunikationsfallback wird bewusst als begrenzter Warnbetrieb mit wirksamem EVCS-Fallbackbudget dargestellt und nicht als vollständiger Safety-Stopp.

## Sicherheits- und Architekturvertrag

Die Erweiterung ist ausschließlich lesend:

```text
Charging Management / §14a / Safety
        ↓
vorhandene Diagnose- und Runtimewerte
        ↓
streng typisiertes Präsentationsmodul
        ↓
Dashboard-Systemstatus
```

RC69 erzeugt keine Steuerintents und beschreibt keine Wallbox-, Speicher-, §14a-, Konfigurations- oder Hardware-Datenpunkte. Lade-, Speicher-, Safety- und Single-Writer-Pfade wurden nicht verändert.

Die neue Browserlogik liegt in einem separaten, streng typgeprüften Modul:

```text
src-ts/runtime-executables/www/dashboard-lp-status.ts
→ www/dashboard-lp-status.js
```

Die bestehende große `app.ts` wurde nur um den kontrollierten Presenter-Aufruf ergänzt. Das `@ts-nocheck`-Budget ist nicht gewachsen.

## Ausgeführte Prüfungen

### Geordnetes Release-Gate

Alle **240 von 240** geplanten Release-Prüfschritte wurden erfolgreich ausgeführt. Wegen der maximalen Laufzeit eines einzelnen Containerprozesses wurden die identischen Schritte in deterministischen Bereichen abgeschlossen. Es blieb kein fehlgeschlagener Prüfschritt zurück.

Abgedeckt wurden unter anderem:

- vollständiger TypeScript-Projektcheck;
- strikter Typecheck des neuen Ladepunkt-Statusmoduls;
- TypeScript-Quellsyntax und kanonische Runtimequellen;
- Runtime-Executable- und Runtime-Mirror-Synchronität;
- `@ts-nocheck`-Budget;
- Chromium-Browsertest der neuen Statusdarstellung;
- §14a-Kommunikationsfallback und zentraler §14a-Constraint;
- Lade-, Stations-, Netz-, Phasen- und Safety-Grenzen;
- OCPP21, NexoWatt Devices, Alfen/Modbus und generische Ladepunkte;
- Auto, Boost, PV, Min+PV, Tarif und Zeit-Ziel-Regressionspfade;
- Speicherregelung und Speicherfarm;
- Betriebsstrategien;
- Lizenz-Bootstrap;
- Stationsdisplay und Mehr-LP-Layout;
- Paket-Runtime-Startprüfung;
- Publish- und Paketprüfung.

### Browserprüfung

Der Chromium-Test verifiziert insbesondere:

1. **EOS Safety + §14a-Fehler:** roter Status, verständlicher Safety-Grund und sichtbare aktuelle Ladeleistung;
2. **§14a-Kommunikationsfallback:** gelber Status mit wirksamem 4,2-kW-Fallbackbudget;
3. **aktive Gerätefilterung:** deaktivierte und alte Runtime-Ladepunkte werden ausgeblendet;
4. **gemischter Betrieb:** Laden begrenzt, kein Fahrzeug und Warten auf PV werden getrennt dargestellt.

### TypeScript- und Runtimeumfang

```text
TypeScript-/TSX-Quelldateien:       719
Produktive Runtimequellen:          112
Runtime-TS-/TSX-Spiegel:            471
@ts-nocheck-Budget:                  60 Dateien / 160.329 Zeilen
Maximal erlaubtes Budget:            160.344 Zeilen
```

### Release-Artefakt

```text
Paketversion:                        0.8.194
Geprüfte Produktdateien:             273
npm-Paketdateien inkl. package.json: 274
npm-Paketgröße:                      7.538.051 Byte
Ungepackte npm-Größe:               16.865.221 Byte
publish:check:                       bestanden
verify-publish.js:                   bestanden
npm pack --dry-run:                  bestanden
```

Das npm-Paket enthält ausdrücklich:

```text
www/dashboard-lp-status.js
docs/RC69_DASHBOARD_LADEPUNKT_FEEDBACK_DE.md
www/index.html
www/styles.css
```

## Behobene Prüfrobustheit

Der vorhandene RC66-Stationsdisplaytest erwartete fest die historische Service-Worker-Kennung `v481`. RC69 verwendet korrekt eine neuere Cachekennung. Der Test wurde deshalb fachlich gehärtet und akzeptiert nun `v481` oder neuer, statt künftige notwendige Cache-Inkremente fälschlich zu blockieren.

## Feldtest vor 1.0.0 Stable

Vor der Stable-Freigabe sind auf realen Anlagen mindestens zu bestätigen:

- Anzeige nur der tatsächlich aktiven Ladepunkte;
- korrekter Grund bei Fahrzeug nicht verbunden;
- korrekter Grund bei PV-, Tarif- und Zeit-Ziel-Wartezuständen;
- korrekte Darstellung eines echten EOS-Safety-Stopps;
- korrekte Darstellung des §14a-Kommunikationsfallbacks;
- Offline-, Fehler-, RFID-, Mapping- und Befehlsbestätigungszustände;
- Sprachwechsel Deutsch/Niederländisch;
- unverändertes Regelverhalten gegenüber RC68.

RC69 ist damit paket- und automatisiert geprüft. Die reale Feldbestätigung bleibt Voraussetzung für die Kennzeichnung als `1.0.0 Stable`.
