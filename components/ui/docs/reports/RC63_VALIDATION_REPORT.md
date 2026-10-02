# RC63-Validierungsbericht

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.188`
- Kennzeichnung: `RC63 – EVCS Availability & Storage Grid-Charge Gate`
- Basis: RC62 (`0.8.187`)
- Ziel: zwei im Feld reproduzierte Regelungsfehler ohne Funktionsausbau korrigieren.

## Behobene Fehler

### Ladepunkte / OCPP21

Ladeleistung und Stationszugang sind getrennt. Eine normale 0-W-Anforderung setzt eine Wallbox nicht mehr auf `Inoperative`.

`availability=false` darf nur entstehen durch:

1. den ausdrücklichen Kundenschalter „Ladestation Aus“, oder
2. eine aktive RFID-Whitelist mit nicht autorisiertem Benutzer.

Ladeende, volles Fahrzeug, Steckerziehen, PV-/Tarifpause, §14a-, Netz-, Stations- und Safety-Begrenzungen setzen nur die Ladeleistung auf 0 W. Eine durch ältere Versionen verriegelte OCPP21-Station wird bei Kundenfreigabe und ohne RFID-Sperre wieder `Operative` angefordert.

### Speicher / Speicherfarm

Speicher-Netzladen ist fail-closed und wird nur freigegeben, wenn alle Bedingungen gleichzeitig erfüllt sind:

- AppCenter-/Speicherfreigabe für Netzladen,
- dynamischer Tarif aktiv,
- aktueller Preis frisch,
- Tarifzustand exakt `guenstig`,
- zeitvariables Netzentgelt aktiv,
- manuell gepflegtes NT-Fenster des aktuellen Modells/Quartals aktiv,
- Tarifpriorität erlaubt Speicherladen,
- beschreibbarer Speicher- oder Farm-Ausgang vorhanden,
- positive konfigurierte Speicher-Netzladeleistung.

NT allein, ein Negativpreis außerhalb des NT-Fensters, ein neutraler Tarif in NT, ein veralteter Preis oder fehlende HT/NT-/Quartalszeiten reichen nicht. Eine letzte Firewall unmittelbar vor dem Speicher-Writer blockiert unzulässige Tarif-, Reserve- und Refill-Netzladequellen. PV-/NVP-basiertes Laden bleibt davon unberührt.

## Ausgeführte Prüfungen

### Typ- und Quellprüfung

- 706 TypeScript-/TSX-Quelldateien syntaktisch geprüft.
- Projekt-Typecheck bestanden.
- 461 Runtime-TS-/TSX-Spiegel synchron geprüft.
- TypeScript-`nocheck`-Budget unverändert eingehalten: 60 Dateien / 160.344 Zeilen.
- Produktive Runtime und Mirrors synchron.

### RC63-Fokusprüfung

`test:rc63-availability-storage-grid-gate` bestand unter anderem:

- Kundenfreigabe hält Availability bei 0-W-Situationen `true`.
- expliziter Kundenschalter setzt Availability `false`.
- RFID-Sperre besitzt die Zugangshoheit.
- positive RFID-Autorisierung überschreibt keine Kundensperre.
- Deaktivierung der Ladeleistungsregelung schreibt 0 A/W, aber sperrt die Station nicht.
- OCPP21-Altverriegelung wird bei erlaubtem Zugang auf `Operative` angefordert.
- Speicher-Netzlade-Matrix für günstig/neutral/teuer, frisch/veraltet, NT/HT, Priorität, AppCenter und Writer.
- fehlende Zeiten im einfachen HT/NT- und im Quartalsmodell sperren fail-closed.
- Negativpreis außerhalb des manuellen NT-Fensters sperrt.
- PV-/NVP-Laden bleibt erlaubt.
- finale Storage-Writer-Firewall blockiert unzulässige Netzladequellen.

### Lade-Regressionen

Der vollständige produktive Charging-Hardening-Verbund bestand, darunter:

- Auto, Boost, PV-Überschuss, Min+PV, Zeit-Ziel und Tarif,
- Alfen/Modbus, NexoWatt Devices, OCPP21 und generische Ladepunkte,
- Stations- und Mehrladepunktverteilung,
- Infrastruktur-, Netz-, Phasen- und §14a-Grenzen,
- OCPP-Bestätigung und Safe-Zero-Vertrag,
- EVCS-/Speicher-Schutzinteraktion,
- Single-Writer- und Safety-Handover.

### Speicher-Regressionen

Bestanden wurden unter anderem:

- funktionale Speicherregelung,
- tatsächliche Speicherleistung und NVP-Balancing,
- Speicherfarm Auto-Dispatch,
- Farm-Dispatch-Recovery,
- 1-Sekunden-Regelkadenz,
- Tarif-Freshness-Sicherheit,
- Safety- und Modul-Deaktivierung.

### Paket- und Releaseprüfung

- `publish:check`: bestanden.
- `verify-publish.js`: bestanden.
- Paket-Runtime-Startprüfung: 161 JS-/MJS-Dateien syntaktisch geprüft; relative `require()`-Pfade vollständig; Startkette konstruierbar.
- Geplantes Release-Gate: alle 231 Prüfschritte bestanden. Aufgrund des Ausführungszeitlimits wurden sie in deterministischen Teilgruppen ausgeführt; der abschließende Runtime-Identifier-Audit wurde separat bestanden.
- Release-Manifest: 263 explizit geprüfte Produktdateien.
- `npm pack --dry-run`: bestanden.
- npm-Paketinhalt: 264 Einträge.
- npm-Paketgröße: 7.322.256 Byte.
- ungepackte npm-Größe: 16.560.526 Byte.

## Release-Grenzen

Die automatisierten Tests prüfen Code, Datenpunktverträge, Regelticks, Safety-Gates und Paketinhalt. Sie ersetzen keinen realen Hardwaretest mit der jeweiligen Wallbox-, Fahrzeug-, Speicher- und Firmwarekombination.

Die npm-Registry-Abfrage für `0.8.188` lief in der isolierten Umgebung in einen Timeout. Der vorhandene `prepublishOnly`-Guard prüft die Versionsfreiheit beim realen `npm publish` erneut und bricht fail-closed ab, falls die Registry nicht erreichbar oder die Version bereits vergeben ist.

## Freigabe

RC63 ist paket- und manifestkonform und für den kontrollierten Anlagenfeldtest vorbereitet. Die zwei konkreten Fehlerpfade sind durch fokussierte und übergreifende Regressionstests abgesichert. Eine allgemeine Stable-Freigabe folgt erst nach erfolgreichem realem Dauer- und Hardwaretest.
