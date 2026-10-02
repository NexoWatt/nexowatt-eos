# RC58 Validierungsbericht – NexoWatt OCPP 0.4 kompakter Datenpunktvertrag

**Paket:** `iobroker.nexowatt-ui`  
**Version:** `0.8.182`  
**Release:** RC58  
**Prüfdatum:** 12.08.2026

## Prüfgrundlage

Die Zuordnung wurde gegen den vom Nutzer bereitgestellten Adapter `NexoWatt-OCPP-0.4.0.zip` geprüft.

- OCPP-Adapter-Version: `0.4.0`
- SHA-256 des geprüften Uploads: `b02169dbcb7dfed590596f68abd3ae2b188438d47cacd65c1b9524b267e1aafe`
- Bevorzugter öffentlicher Vertrag: `alias.0.nexowatt.ocpp.<Instanz>.<Station>`
- Nativer kompakter Vertrag: `ocpp21.<Instanz>.<Station>`
- Optionaler technischer Alias: `alias.0.ocpp21.<Instanz>.<Station>`

## Umgesetzte Zuordnungen

Automatisch erkannt beziehungsweise sicher migriert werden:

- Istleistung: `powerW` / `measurements.powerW`
- Gesamtenergie: `energyKWh`, ersatzweise `energyWh`
- Stationsstatus: `status` / `info.status`
- Transaktion aktiv: `txActive` / `transactions.transactionActive`
- physische WebSocket-Verbindung: `socketConnected` / `info.socketConnected`
- Datenaktualität: `dataFresh` / `health.dataFresh`
- letzte Aktivität: `health.lastSeenMs`
- Fahrzeug-SoC: `soc` / `measurements.socPercent`, ersatzweise `vehicle.socPercent`
- RFID: `rfid` / `info.rfid`
- Leistungsvorgabe: `chargeLimit` / `control.chargeLimit`
- optionale Stationsfreigabe: `availability` / `control.availability`

Bekannte ältere OCPP-0.3-Pfade werden nur innerhalb derselben eindeutig erkannten Station auf den kompakten Vertrag umgesetzt. Fremde MQTT-, Modbus-, HTTP- oder Geräteadapter-Zuordnungen sowie Pfade anderer OCPP-Stationen bleiben unverändert.

## Sicherheitsvertrag

- `socketConnected` ist die physische Online-Wahrheit.
- `dataFresh` beschreibt nur die Verwendbarkeit der Leistungstelemetrie.
- Ein langsamer Heartbeat oder ein unveränderter Messwert darf die Station nicht als physisch offline behandeln.
- Die Betriebsarten Boost, Auto, Min+PV, PV-Überschuss, Manuell und Zeit-Ziel bleiben bestehen.
- Das Lademanagement bleibt der fachliche Single Writer.
- §14a, Parkregler, Stations-, Netz-, Phasen- und Safety-Grenzen bleiben übergeordnet.
- RC58 erzeugt keinen zweiten direkten OCPP-Schreibpfad.

## Erfolgreich ausgeführte Prüfungen

### OCPP-spezifisch

- `test:rc58-ocpp-compact-mapping`
- `test:rc57-ocpp-stability`
- `test:rc51-ocpp-telemetry`
- NexoWatt-OCPP-0.4-Kernprüfung: 25 von 25 Tests bestanden

### Lade- und Safety-Regressionsprüfungen

- vollständige `test:charging-productive-hardening`-Gruppe
- Mehrladepunkt- und Stationsbudget
- Min+PV-, PV- und Boost-Grundreaktion
- Infrastruktur- und NVP-Budget
- §14a-EVCS-Startstabilität
- EVCS-Single-Writer- und Safety-Handover
- Speicher-Schutz-/Assist-Interaktion
- Lademanagement-Diagnose und Browserdarstellung

### TypeScript und Runtime

- 698 TypeScript-Quelldateien syntaktisch geprüft
- vollständige `test:types`-Kette bestanden
- 109 produktive Runtime-Dateien synchron
- 453 Runtime-TS-/TSX-Parallelspiegel synchron
- 60 bestehende `@ts-nocheck`-Runtime-Dateien innerhalb des festgeschriebenen Budgets
- Betriebsstrategien-Feldtestvertrag und Thermik-/Heizstab-Aktorprüfung bestanden

### Release und Publish

- `publish:check`: 258 freigegebene Paketdateien geprüft
- `verify-publish.js`: Metadaten, Konfliktmarker und JavaScript-Syntax bestanden
- `npm pack --dry-run`: Version `0.8.182`, 259 npm-Dateien, Paketgröße ca. 7,3 MB
- Versionsstände in `package.json`, `package-lock.json`, `io-package.json`, Webmanifest und Runtime-Markern synchron

Der sehr große Sammelrunner `test:all` erreichte in der isolierten Prüfumgebung nach Ablauf der maximalen Werkzeuglaufzeit das Ende nicht in einem einzigen Prozess. Die darin enthaltene vollständige TypeScript-Prüfkette war bereits erfolgreich abgeschlossen; die danach vorgesehenen OCPP- und Runtime-Prüfungen wurden separat erfolgreich ausgeführt.

## Feldtestgrenze

Die statischen, Runtime- und Regressionsprüfungen ersetzen keinen Dauerlauf mit der konkreten Ladestations-Firmware. Vor Freigabe als stabile Produktversion sind mindestens zu prüfen:

1. Boost über mindestens 10 Minuten ohne falsches Offline-Pendeln.
2. Min+PV mit verzögerter OCPP-Telemetrie.
3. PV-Überschuss mit Start, Rampe, Sollwertänderung und kontrollierter Pause.
4. echtes WebSocket-Trennen und sichere Offline-Erkennung.
5. Ladeschluss und sichere 0-W-Rückmeldung.
6. §14a-, Stations- und Netzbegrenzung.
7. mehrstündiger Dauerlauf.

## Hinweis zum 0-W-Verhalten

Der OCPP-Adapter 0.4 besitzt die eigene Einstellung `zeroLimitBehavior`. Standardmäßig ist `keepLast` hinterlegt. Damit hält der Adapter bei einer EOS-Vorgabe von 0 W die letzte gültige OCPP-Ladegrenze, um unbeabsichtigte Unterbrechungen zu vermeiden. Für PV-Überschuss und Min+PV muss im Feldtest eine zur konkreten Station passende Einstellung gewählt werden. RC58 ändert diese Adaptereinstellung nicht automatisch.
