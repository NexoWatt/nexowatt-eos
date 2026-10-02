# NexoWatt UI 0.8.185 RC60 – Validierungsbericht

**Release:** `iobroker.nexowatt-ui@0.8.185`  
**Release-Kennung:** RC60 – Universal Wallbox Auto  
**Erstellt:** 13.08.2026

## Ziel der Version

RC60 vereinheitlicht den automatischen Ladepfad für:

- NexoWatt Devices / Modbus, einschließlich IEC-61851-/Mode-3-Zuständen wie Alfen B1/B2/C1/C2;
- NexoWatt OCPP21 über direkte native `ocpp21.*`-Datenpunkte;
- frei beziehungsweise manuell zugeordnete AC- und DC-Ladepunkte;
- die Betriebsarten Auto, PV-Überschuss, Min+PV, Zeit-Ziel und dynamischer Tarif.

Der zentrale Ladepfad bleibt Single Writer. Stations-, Netz-, Phasen-, §14a-, Parkregler-, Safety- und Speicherfarm-Schutz werden nicht umgangen.

## Fachlich geprüfte Kernfälle

### Universeller Fahrzeug- und Startzustand

Geprüft wurden unter anderem:

- IEC 61851: A/A1/A2, B1, B2, C1, C2, D1, D2, E und F;
- OCPP21: Available, Occupied, EVConnected, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Faulted und Unavailable;
- generische Herstellerzustände und explizite Fahrzeugkontakt-/Ladebedarfs-Datenpunkte;
- konkurrierende OCPP-Statusquellen wie `Idle + Occupied`, `EVConnected + Faulted` und `SuspendedEV + Occupied`;
- Startversuch, bestätigte Fahrzeugreaktion, Timeout und Cooldown;
- 1-phasige und 3-phasige AC-Mindestleistung sowie leistungsgeführte DC-Sollwerte.

### Auto-Varianten

Geprüft wurden:

- Auto mit Fahrzeug in Alfen B1/B2;
- Auto mit OCPP21 `EVConnected` beziehungsweise `Occupied` vor aktiver Transaktion;
- Min+PV mit technischer Mindestleistung;
- PV-Überschuss unterhalb und oberhalb der fahrbaren Mindestleistung;
- Zeit-Ziel-Start und anschließende Rampe nach bestätigter Fahrzeugreaktion;
- günstiger Tarif mit Standard- und Smart-Zielstrategie;
- teurer Tarif mit ausreichender Restzeit;
- dringendes Ziel mit tariflichem Ziel-Override;
- mehrere Ladepunkte und gemeinsame Stationsbudgets.

## Erfolgreich ausgeführte Prüfungen

### TypeScript und Runtime-Synchronität

- 702 TypeScript-Quelldateien syntaktisch geprüft;
- TypeScript-Typprüfung bestanden;
- 109 produktive Runtime-Dateien gegen die kanonischen TypeScript-Quellen geprüft;
- 457 Runtime-Spiegel geprüft;
- Frontend-, Backend-, Adapter-, EMS-, Energiefluss- und Wartungsskript-Spiegel geprüft;
- API-, Feature-Sichtbarkeits-, Smart-Home-, History-, AI-Advisor- und Haupt-Runtime-Typprüfungen bestanden.

Der sehr lange Sammelbefehl `test:types` überschritt in der Sandbox nach dem Frontend-Display-Abschnitt das einzelne Prozesszeitlimit. Alle bis dahin offenen nachfolgenden Teilprüfungen wurden anschließend in derselben Reihenfolge separat ausgeführt und bestanden.

### Lademanagement

`npm run test:charging-productive-hardening` bestand vollständig, darunter:

- produktive Allocation und Write-Plan;
- Single-Writer-/Safety-Handover;
- Stations- und Mehrladepunktbudget;
- Boost, Auto, Min+PV und PV-Grundreaktionen;
- NexoWatt-Devices-Zuordnung aus genau einer Gerätebasis;
- universelle Ladebedarfsnormalisierung;
- Zeit-Ziel- und Tarif-Szenarien;
- EVCS-/Speicherschutz und PV-Budgetfreigabe;
- RC60-Orchestrator- und vollständiger Wallbox-Regeltick.

### Speicherfarm und Safety

Bestanden haben:

- Speicherfarm Auto-Dispatch;
- Dispatch-Recovery;
- Ein-Sekunden-Regelkadenz;
- Speicherregelungs-Szenarien und funktionale Sicherheit;
- asynchrone Rückmeldungen für alle Speicherprofile;
- Zero-Write-Firewall;
- App-/Writer-Trennung;
- finaler Safety-Envelope;
- Aktor-Safety-Arbiter;
- Release- und Regression-Safety-Gates;
- §14a-EVCS-Start;
- Netz- und Phasencaps;
- RC57-OCPP-Stabilität;
- RC58-Migrationskompatibilität;
- RC59-OCPP21-/Speicherfarm-Recovery.

### Paket- und Publish-Prüfung

- `publish:check`: bestanden;
- `verify-publish.js`: bestanden;
- Paket-Runtime-Start-Smoke: bestanden;
- 161 JS-/MJS-Dateien syntaktisch geprüft;
- relative `require()`-Pfade vollständig;
- `main.js`-/EMS-/§14a-Startkette konstruierbar;
- Release-Artefaktmanifest: 260 freigegebene Produktdateien;
- `npm pack --dry-run`: bestanden;
- npm-Paket: 261 Dateien;
- gepackte Größe: 7.308.818 Byte;
- ungepackte Größe: 16.502.066 Byte.

## Nicht in dieser Umgebung prüfbar

Die Sandbox konnte `registry.npmjs.org` wegen DNS-Auflösung nicht erreichen. Daher konnte nicht bestätigt werden, ob `0.8.185` unmittelbar vor der Übergabe noch frei ist. Der vorhandene `prepublishOnly`-Guard arbeitet fail-closed und führt diese Prüfung bei `npm publish` erneut aus. Bei einer bereits belegten Version oder einem Registry-/Netzwerkfehler wird der Publish sicher abgebrochen.

## Bewertung

Die konkrete RC60-Änderung wurde über vollständige Regelticks und die vorhandenen Lade-, Speicherfarm-, §14a-, Netz-, Safety-, TypeScript- und Paketprüfungen abgesichert. Reale Unterschiede einzelner Wallbox-Firmwarestände, Fahrzeuge und Netzwerke können ausschließlich im Feldtest abschließend verifiziert werden; unbekannte Hardware ohne belastbaren Status und beschreibbaren Sollwert bleibt deshalb fail-closed.
