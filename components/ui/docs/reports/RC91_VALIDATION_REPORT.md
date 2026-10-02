# RC91 Validierungsbericht – NexoWatt UI 0.8.216

## Prüfumfang

RC91 wurde als Cross-App-Stabilitätsstand geprüft. Ziel war, Konfigurationsverlust, widersprüchliche Aktivzustände, Startfehler der ausgelieferten Runtime und Regressionen in den vorhandenen EMS-Apps vor der Stable-Phase zu erkennen.

## Behobene Fehler

1. **AppCenter-Katalogparität:** `energyLedger`, `meshMicrogrid` und der absichtlich verborgene Zustand `chargeKiosk` bleiben über Adapterstart, Installer-GET, Save und Backup erhalten.
2. **Aktivzustände:** `emsApps`, Legacy-Flags und verschachtelte `.enabled`-Schalter werden für die betroffenen Apps gemeinsam synchronisiert.
3. **Runtime-Start:** Die textstabil erzeugte `main.js` kann nicht mehr durch TypeScript-only Syntax aus `main.ts` beschädigt werden.
4. **Home-Lizenzfallback:** Der lokale Modulmanager-Fallback entspricht wieder der zentralen `HOME_APP_IDS`-Matrix und enthält Netzschutz, Energy Ledger sowie NL-P1. Der Regressionstest vergleicht beide Mengen semantisch.
5. **Veraltete Tests:** Prüfungen für den dauerhaft aktiven Netzschutz, watchdog-isolierte Ladepunkt-Schreibzugriffe und aktuelle Versionsmetadaten wurden auf die produktiven Sicherheitsverträge angehoben.

## Abgedeckte App- und Funktionsgruppen

- Lademanagement einschließlich Auto, PV, Min+PV, Boost, Zeit-Ziel, OCPP, Stationsbudgets und Offline-Isolation
- Speicherregelung, Speicherfarm, MultiUse, Eigenverbrauch, Tarif-Netzladen und Readback
- NVP, Import-Soft-/Hard-Limit, Export-Limit, 0-Einspeisung und finaler Safety-Writer
- §14a und EEBUS-Kommunikationsfallback
- Thermik, Heizstab, Threshold/Relais, BHKW und Generator
- Peak-Shaving und Netzbetreiber-Schnittstelle
- dynamische Tarife, Tariffrische und Statuswahrheit
- PV-Prognose einschließlich Open-Meteo, Standort, Cache und Restart-Fallback
- Energy Wallet, Energy Ledger und Energieherkunft
- Mesh/Microgrid einschließlich Bridge, ACK, Zielgruppen und Fail-closed-Verträgen
- SmartHome und NexoLogic einschließlich Browser-, Layout-, Rollen- und Simulationsprüfungen
- Lizenzmodell Home/Pro, Lizenz-Bootstrap und geschützte Bereiche
- DC-Stationsdisplay, Ladepunktdiagnose und Berichtsseiten
- SSE-/Heap-Härtung, Diagnose-Heartbeat und Runtime-Watchdogs

## Technische Gates

- 738 TypeScript-Quelldateien syntaktisch geprüft
- 120 produktive Runtime-Dateien aus kanonischen Quellen synchronisiert
- 483 Runtime-TS-/TSX-Spiegel synchronisiert und geprüft
- 179 ausgelieferte JS-/MJS-Dateien im Start-/Syntax-Smoke geprüft
- RC91-Katalogtest: 20 sichtbare Apps, 21 Backend-Apps, keine Duplikate
- Publish-Plan: 250 geordnete Prüfschritte vollständig abgedeckt
- `node --check` für die ausgelieferte `main.js` und die geänderten Runtimes bestanden
- Release-, Paket- und npm-Dry-Run-Prüfungen werden nach Erzeugung des finalen Artefaktmanifests erneut aus dem frischen ZIP ausgeführt

Der monolithische Publish-Runner wurde wegen Laufzeitgrenzen der Prüfumgebung in geordnete Teilbereiche aufgeteilt. Jeder der 250 im Plan definierten Schritte wurde entweder im jeweiligen Teilbereich oder unmittelbar einzeln ausgeführt und bestand. Der Plan selbst wurde zusätzlich mit `--verify` validiert.

## Fachliche Abgrenzung

RC91 führt keine neue Leistungsstrategie ein. NVP-, Lade-, Speicher-, Tarif-, §14a-, Forecast- und Hardware-Sollwertentscheidungen bleiben fachlich auf dem RC90-Stand. Die einzige Runtime-Ergänzung außerhalb der AppCenter-Konsistenz ist ein korrigierter Lizenz-Notfallfallback, der ausschließlich bei Ausfall des zentralen Feature-Services verwendet würde.

## Stable-Freigabe

Die Software-Gates sind die Voraussetzung, ersetzen aber keinen Anlagen-Dauerlauf. Für Stable soll exakt derselbe Quellstand ohne weitere Funktionsänderung mindestens 24 bis 48 Stunden auf zwei unterschiedlichen Anlagen laufen. Zu beobachten sind insbesondere Heap-Plateau, SSE-Verbindungsstabilität, aktuelle EMS-Ticks, App-Aktivzustände nach Save/Neustart sowie unveränderte NVP-, Lade- und Speicherregelung.
