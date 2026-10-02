# RC78-Validierungsbericht – NexoWatt UI 0.8.203

## Release-Ziel

RC78 korrigiert die Netzanschluss-Budgetierung für Anlagen, bei denen die konfigurierte Anschlussleistung ausschließlich den **Netzbezug** begrenzt. Der NVP bleibt in allen relevanten EMS- und Safety-Pfaden signiert:

- Netzbezug: positiver Wert
- Netzeinspeisung: negativer Wert

Eine reale Einspeisung erhöht dadurch die zulässige Lastfreigabe, statt vom Budget abgezogen oder durch einen pauschalen Anschlussleistungsdeckel verworfen zu werden.

## Verifizierte Fehlerursache

Bis RC77 enthielt die Budgetkette drei voneinander unabhängige Begrenzungen, die eine Einspeisung nicht korrekt abbildeten:

1. Das zentrale Core-Budget behandelte den Netzpfad im Ergebnis wie eine reine positive Bezugsgröße und klemmte das Gesamtbudget zusätzlich auf die konfigurierte Anschlussleistung.
2. Das direkte EVCS-Netzcap besaß einen eigenen harten Deckel auf die Anschlussleistung.
3. Die finale Safety-Prüfung unmittelbar vor dem Hardware-Write wandelte den NVP für die Headroom-Berechnung in einen nichtnegativen Importwert um.

Dadurch standen bei 30,0 kW Bezugsgrenze und 10,1 kW Einspeisung nicht die physikalisch möglichen 40,1 kW Gesamtzielbudget zur Verfügung.

## Einheitlicher RC78-Vertrag

Die zulässige zusätzliche Laständerung lautet:

```text
Inkrement-Headroom = Bezugsgrenze − signierter NVP
```

Da das zentrale Budget ein **Gesamtziel** für EOS-gesteuerte Verbraucher darstellt, wird die aktuell real laufende geregelte Istlast wieder addiert:

```text
Gesamtzielbudget = aktuelle geregelte Istlast + Bezugsgrenze − signierter NVP
```

Reservierungen und Sollwerte werden nicht als Istleistung zurückaddiert. Sie werden anschließend regulär aus dem Gesamtzielbudget reserviert beziehungsweise abgezogen.

## Feldfall aus der EMS-Diagnose

```text
Bezugsgrenze                         30,0 kW
NVP / reale Einspeisung             −10,1 kW
Aktuelle geregelte Istlast            0,0 kW
--------------------------------------------------
Zulässiges Gesamtzielbudget          40,1 kW
EVCS-Reservierung                   −11,0 kW
Speicher-Reservierung                −9,3 kW
--------------------------------------------------
Korrektes Restbudget                 19,8 kW
```

Der vorher angezeigte Wert von ungefähr 9,7 kW war für eine reine Bezugsgrenze fachlich falsch.

## Umgesetzte Produktionspfade

### Zentrales EMS-Budget

`core-limits` verwendet den signierten NVP und rekonstruiert das Gesamtziel aus frischen Istleistungen:

- EVCS-Istleistung;
- thermische Istleistung;
- Heizstab-Istleistung;
- Speicherladeleistung ausschließlich bei aktivem EOS-Speicherwriter.

Eine fremd geregelte Speicherladung wird nicht als EOS-Istlast zurückaddiert. Alte Reservierungen oder Sollwerte können dadurch keinen künstlichen Headroom erzeugen.

### EVCS-Netzcap

Das direkte Lademanagement berechnet das EVCS-Gesamtcap aus der frischen EVCS-Istleistung und dem signierten NVP-Headroom. Der bisherige harte Deckel `EVCS-Cap ≤ Anschlussleistung` wurde entfernt.

Unverändert übergeordnet bleiben Geräte-, Stations-, Leitungs-, Phasen-, §14a-, Parkregler-, Kommunikations- und Safety-Grenzen.

### Finale Safety-Prüfung

Unmittelbar vor jedem Hardware-Write wird der aktuelle NVP erneut signiert geprüft. Parallel geplante positive Laständerungen verwenden einen gemeinsamen Runtime-Headroom und können ihn nicht mehrfach vergeben.

Bei Überbezug bleibt der Schutz aktiv:

```text
Bezugsgrenze                         30,0 kW
Aktueller Netzbezug                  32,0 kW
Laufende geregelte Istlast           10,0 kW
--------------------------------------------------
Maximales neues Gesamtziel            8,0 kW
Erforderliche Reduktion               2,0 kW
```

### Diagnose und Oberfläche

Zusätzlich veröffentlicht beziehungsweise bezeichnet RC78:

- signierten Inkrement-Headroom;
- aktuelle EOS-geregelte Istlast;
- wirksames Gesamtzielbudget;
- frische EVCS-Istleistung für das Netz-Gate;
- bewusst ignorierte EVCS-Reservierung bei der Istlastrekonstruktion;
- „EVCS Cap (NVP / Importgrenze)“.

Der Browser-/Service-Worker-Cache wurde auf `nexowatt-cache-v484` angehoben.

## Dynamischer RC78-Regressionsverbund

Der neue Test führt die produktiven Module mit realistischen ioBroker-Stubs aus und prüft:

- Feldfall 30,0 kW / −10,1 kW mit 40,1 kW Gesamtziel;
- 19,8 kW Restbudget nach 11,0 kW EVCS und 9,3 kW Speicher;
- Rückaddition ausschließlich frischer geregelter Istleistung;
- externe Speicherladung ohne EOS-Writer;
- normalen Netzbezug mit laufender EVCS-Istleistung;
- aktive Reduktion bei Überbezug;
- EVCS-Netzcap mit signiertem NVP;
- parallele finale Hardware-Writer ohne doppelte Headroom-Nutzung;
- typisierte Core-Runtime und Legacy-Fallback-Vertrag;
- Synchronität von kanonischer TypeScript-Quelle und produktiver JavaScript-Runtime.

## Vollständiges Release-Gate

Der finale Stand hat alle **248 von 248** geordneten Release-Prüfungen bestanden:

```text
Gesamt:                         248 / 248 bestanden
Laufzeit des finalen Gates:     106,2 Sekunden
Fehler im finalen Gate:         0
```

Erneut geprüft wurden unter anderem:

- Speicher, Speicherfarm und FENECON;
- Auto-, PV-, Min+PV-, Boost- und Zeit-Ziel-Laden;
- OCPP/OCPP21, NexoWatt Devices und freie DP-Zuordnungen;
- Stations-, Infrastruktur-, Netzanschluss- und Phasenbudgets;
- §14a-/EEBUS-Kommunikationsfallback;
- Tarif-, NT-, Preis- und Betriebsstrategielogik;
- Safety-Envelope und finaler Hardware-Write;
- Wetter-/PV-Prognose einschließlich RC77-Neustart-/Cache-Härtung;
- Kunden-Dashboard, EOS Admin, Lizenz, SmartHome und NexoLogic;
- Paket-Runtime-Startkette und Chromium-Browserprüfungen.

Die fail-closed Release-Prüfungen fanden während der Vorbereitung zwei formale Punkte und blockierten die Freigabe korrekt:

1. Das `@ts-nocheck`-Zeilenbudget war zunächst überschritten. Die neue Logik wurde ohne Erhöhung der Baseline kompaktiert; final: 160.456 von maximal 160.472 Zeilen.
2. `io-package.json` enthielt nach dem neuen News-Eintrag acht statt maximal sieben Einträge. Der älteste Eintrag wurde entfernt; final: sieben Einträge.

Anschließend bestand das vollständige Gate ohne Fehler.

## TypeScript- und Runtime-Prüfung

```text
TypeScript-Quelldateien unter src-ts: 732
Produktive Runtimequellen:            117
Runtime-Spiegel:                      479
TypeScript-Typecheck:                 bestanden
Runtime-Executable-Synchronität:      bestanden
Runtime-Mirror-Synchronität:          bestanden
@ts-nocheck-Budget:                   60 Dateien / 160.456 Zeilen
Paket-Runtime-Startsmoke:             bestanden
```

## npm-Artefakt

```text
Paket:                       iobroker.nexowatt-ui
Version:                     0.8.203
package.json.files:          286 Produktdateien
npm-Tarball:                 287 Dateien inklusive package.json
Paketgröße:                  7.590.752 Byte
Ungepackte Größe:           17.085.700 Byte
npm-SHA1:                    ec1bfecb545878a93fea1f8522082cf862cd394a
publish:check:               bestanden
verify-publish.js:           bestanden
npm pack --dry-run:          bestanden
npm pack:                    bestanden
Frisch entpackter TGZ-Smoke: bestanden
RC78-Regressionsverbund:     bestanden
RC77-Prognoseregression:     bestanden
```

Ein lokaler `npm publish --dry-run --ignore-scripts` hat das identische Paket erfolgreich als Publish-Artefakt validiert. Der vollständige `npm publish --dry-run` wurde ausschließlich vom vorgesehenen fail-closed Registry-Guard blockiert, weil die Build-Umgebung `registry.npmjs.org` wegen `EAI_AGAIN` nicht auflösen konnte. Auf dem Zielrechner prüft `prepublishOnly` die Versionsfreiheit vor dem echten Publish erneut und bricht bei fehlender Registry-Verbindung sicher ab.

## Frisch entpacktes vollständiges Repository-ZIP

Das vollständige Repository-ZIP wurde in einen leeren Ordner entpackt und ausschließlich aus diesem Verzeichnis erneut geprüft:

```text
ZIP-Datei:                         NexoWatt-ui-0.8.203-RC78-GRID-IMPORT-ONLY-SIGNED-NVP-BUDGET-NPM-READY.zip
ZIP-Einträge inklusive Ordner:    1.784
Tatsächlich entpackte Dateien:    1.684
Release-Artefaktprüfung:          bestanden
Publish-Metadatenprüfung:         bestanden
Paket-Runtime-Startsmoke:         bestanden
RC78-Quell-/Runtime-Vertrag:      bestanden
RC78-Paket-Runtime-Vertrag:       bestanden
Vollständiger RC78-Testverbund:   bestanden
RC77-Prognoseregression:          bestanden
Unerwünschte Build-/Log-Artefakte: 0
```

Das ZIP enthält weder `node_modules` noch temporäre Buildverzeichnisse, alte ZIP-/TGZ-Dateien oder Testlogs. Enthalten sind die vollständigen kanonischen TypeScript-Quellen, generierten produktiven Runtimes, Tests, Release-Skripte, Paketmetadaten und RC78-Dokumentation.

## Freigabestatus

RC78 ist lokal vollständig gebaut, gepackt, frisch entpackt und automatisiert geprüft. Der konkrete Budgetfehler aus den Screenshots ist in allen drei entscheidenden Ebenen geschlossen: Core-Budget, EVCS-Netzcap und finaler Safety-Writer.

Die verbleibende Feldabnahme betrifft ausschließlich reale Eingangsdaten und Hardwarebedingungen, insbesondere korrektes NVP-Vorzeichen, Messwertfrische, externe Parkregler-/§14a-Vorgaben und Geräte-Readback. Bei der im Screenshot sichtbaren Vorzeichenkonvention muss RC78 im Einspeisefall ungefähr 40,1 kW Gesamtbudget und 19,8 kW Restbudget anzeigen.
