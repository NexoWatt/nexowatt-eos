# nexowatt-devices (ioBroker Adapter)

**nexowatt-devices** ist der Multi‑Protokoll‑Geräteadapter für NexoWatt EOS.
Der Betrieb erfordert ein geprüftes EOS-System und die zentrale Home-/Pro-Lizenz in `eos-admin.0`; separate Adapter-Lizenzschlüssel gibt es nicht.
Er bietet eine **Kategorien → Hersteller → Treiber/Template**‑Konfiguration und erzeugt die
zugehörigen Datenpunkte automatisch in ioBroker.


## Dokumentation

Die technische Dokumentation ist gebündelt im Ordner [`docs/`](docs/README.md):

- [Zentrale EOS-Lizenz: Betrieb, Grenzen und Prüfbelege](docs/EOS_CENTRAL_LICENSE_2026-10-05.md)
- [Dokumentationsübersicht](docs/README.md)
- [VARTA Extended 14 – zusätzliche Register, Grenzen, Pextra und Freigaben](docs/VARTA_MODBUS_EXTENDED14_0.5.167.md)
- [DEYE-Teststart und Veröffentlichung – Korrektur 0.5.166](docs/DEYE_TEST_STARTUP_0.5.166.md)
- [DEYE Hybrid – drei vorläufige RTU-Profile und Einrichtung](docs/DEYE_MODBUS_RTU_0.5.165.md)
- [DEYE-Herstelleranfrage – Englisch und Deutsch](docs/DEYE_MANUFACTURER_INQUIRY_EN_DE.md)
- [Technische Versionshinweise](docs/CHANGELOG.md)
- [Alias Contract v1](docs/ALIAS_CONTRACT_V1_0.5.144.md)
- [Bestandsanlagen-Kompatibilität](docs/LEGACY_COMPATIBILITY_0.5.146.md)
- [Ladepunkte – regelmäßige Live-Status-/Messwertfrische](docs/EV_CHARGER_LIVE_FRESHNESS_0.5.154.md)
- [VARTA Public 14 – acht Modelle und Funktionsgrenzen](docs/VARTA_MODBUS_PUBLIC14_0.5.162.md)
- [DEPower – Sollwerte, Rücklesen und Energieauflösung](docs/DEPOWER_POWER_ENERGY_0.5.164.md)
- [TESVOLT IoT Gateway – aktuelle Einrichtung, EMS / V2 und paralleles Lesen](docs/TESVOLT_EMS_TOPICS_0.5.163.md)
- [TESVOLT IoT Gateway – MQTT EMS Interface V2](docs/TESVOLT_IOT_GATEWAY_MQTT_V2_0.5.153.md)
- [ABL eMH1 – Live-Strom- und Leistungs-Failsafe](docs/ABL_LIVE_POWER_FAILSAFE_0.5.148.md)
- [Alfen ACE – adaptive Schreibadressierung](docs/ALFEN_ADDRESS_COMPATIBILITY_0.5.147.md)
- [Release-Sicherheit](docs/RELEASE_SAFETY.md)
- [Drittanbieterhinweise](docs/THIRD_PARTY_NOTICES.md)

Unterstützte Protokolle:

- **Modbus TCP**
- **Modbus RTU (Serial)**
- **MQTT** (event‑basiert)
- **HTTP/JSON** (Polling)
- **UDP** (Text-Command/JSON, z.B. KEBA KeContact)

---

## Lizenz

Dieses Projekt ist **proprietär** lizenziert und darf nur gemäß der Datei `LICENSE`
verwendet werden. Drittanbieter-Komponenten unterliegen ihren jeweiligen Lizenzen
(siehe `docs/THIRD_PARTY_NOTICES.md`).

---

## 1) Installation aus GitHub (empfohlen)

Dieser Adapter ist **nicht** im offiziellen ioBroker‑Repository. Daher funktioniert `iobroker add ...` nicht.

Installiere ihn aus GitHub per `iobroker url` (Tarball):

```bash
# Beispiel (ersetze USER/REPO/BRANCH):
iobroker url https://github.com/USER/ioBroker.nexowatt-devices/tarball/main
```

Danach kannst du im Admin wie gewohnt eine Instanz anlegen.

### Hinweis: Admin‑Fehler „adminUI ist string“
Falls in deiner Installation alte Adapter‑Objekte existieren, bei denen `common.adminUI` fälschlich als String gespeichert ist (z.B. `"materialize"`),
kann der Admin beim Laden eine Exception werfen. Der Adapter enthält eine **automatische Migration**,
die solche Objekte beim Start in das neue Format konvertiert (`{ config: "materialize" }`).

---

## 2) Installation lokal (Alternative)

1. Repository/Ordner nach `/opt/iobroker/node_modules/iobroker.nexowatt-devices` kopieren
2. Dependencies installieren:
   ```bash
   cd /opt/iobroker/node_modules/iobroker.nexowatt-devices
   npm install --omit=dev
   ```
3. Admin‑Dateien hochladen:
   ```bash
   iobroker upload nexowatt-devices
   ```
4. Instanz im Admin anlegen.

---

## 3) Admin‑Konzept (Kategorien → Hersteller → Treiber)

Im Admin kannst du Geräte hinzufügen:

- **Kategorie** (z.B. EVCS, METER, BATTERY, HEAT …)
- **Hersteller**
- **Treiber/Template** (liefert Datenpunkte + Default‑Protokolle)
- **Protokoll** (Modbus TCP / Modbus RTU / MQTT / HTTP)
- Verbindungseinstellungen je Protokoll (z.B. IP/Port/Unit‑ID)

Die Datenpunkte des Templates werden im Modal unten als Tabelle angezeigt.

### RS485 / Modbus RTU auf ED-IPC3020

Auf der ED-IPC3020-Hardware ist die RS485-Schnittstelle typischerweise als **/dev/com2** verfügbar (COM2).
Trage diesen Pfad bei **Modbus RTU → Serial Port** ein und achte darauf, dass der ioBroker-User Zugriff auf das Gerät hat (z.B. Gruppe `dialout`).

---

## 4) Objektstruktur in ioBroker

Für jedes Gerät `<id>`:

- `nexowatt-devices.0.devices.<id>.info.connection`
- `nexowatt-devices.0.devices.<id>.info.lastError`
- `nexowatt-devices.0.devices.<id>.<datapointId>`

Zusätzlich erzeugt der Adapter (best‑effort) eine **stabile Alias‑API** unter:

- `nexowatt-devices.0.devices.<id>.aliases.*`

Schreibbare Datenpunkte werden als `write=true` angelegt. Wenn du einen State änderst (`ack=false`),
schreibt der Adapter über das passende Protokoll.

---

## 4a) Aliases (stabile Namen für andere Adapter)

### Alias Contract v1 für neue automatische Integrationen

Für den NexoWatt-UI-Adapter und alle neuen Module ist ab Version `0.5.144` der
versionierte Namensraum verbindlich:

```text
devices.<id>.aliases.v1.*
```

Die automatische Erkennung beginnt beim Manifest:

```text
devices.<id>.aliases.meta.manifest
```

Das Manifest enthält mindestens:

```json
{
  "schemaVersion": 1,
  "namespace": "v1",
  "deviceClass": "evCharger",
  "capabilities": ["read.power", "write.currentLimitA"],
  "missingRequired": []
}
```

Der UI-Adapter ordnet Geräte über `deviceClass` zu und bindet nur die in
`capabilities` aufgeführten Funktionen. Die möglichen Geräteklassen sind:

```text
evCharger, meter, pvInverter, storageSystem, battery,
batteryInverter, heat, io, solarCharger, generic
```

Im v1-Namensraum sind die Einheiten verbindlich normiert: Leistung in `W`,
Energie in `Wh`, Strom in `A`, Spannung in `V`, Temperatur in `°C`, Zeitdauer in
`s`, Prozentwerte in `%` und Frequenz in `Hz`.

Die vollständige Spezifikation steht in `docs/ALIAS_CONTRACT_V1_0.5.144.md` sowie in
`lib/alias-contract-v1.json`.

Seit Version `0.5.146` ist diese Standardisierung technisch strikt additiv:
Bestehende Rohdatenpunkte und `aliases.*`-Pfade bleiben gegen den Produktionsstand
`0.5.143` geprüft identisch. Neue Standardobjekte entstehen ausschließlich unter
`aliases.v1.*` und `aliases.meta.*`.

### Rückwärtskompatible Aliase

Damit nachgelagerte Adapter/Logiken (z.B. Steuer‑ oder Benachrichtigungsadapter) **nicht**
für jeden Hersteller unterschiedliche Datenpunkt‑IDs kennen müssen, legt der Adapter
pro Gerät eine Alias‑Struktur unter `devices.<id>.aliases` an.

Diese Alias‑States sind bewusst **kategorienübergreifend ähnlich** und werden – sofern ein
passender Datenpunkt im Template vorhanden ist – automatisch erstellt.

### Standard (alle Geräte)

- `aliases.comm.connected` (bool) – Kommunikationsstatus zum Gerät
- `aliases.comm.lastError` (string) – letzter Kommunikationsfehler
- `aliases.alarm.offline` (bool) – `true`, wenn das Gerät nicht erreichbar ist

### PV_INVERTER (Wechselrichter)

Lesen:

- `aliases.r.power` (W) – aktuelle Wirkleistung
- `aliases.r.energyTotal` (Wh) – Gesamtertrag/Energiezähler
- `aliases.r.statusCode` (number) – Statuscode (vendor‑spezifisch, aber stabiler Ort)
- `aliases.r.gridConnectionState` (number) – Netzstatus roh (falls verfügbar)
- `aliases.r.gridConnected` (bool) – Netz verbunden (best‑effort Berechnung)

Steuern (falls Template/WR unterstützt):

- `aliases.ctrl.run` (bool) – Start/Stop bzw. Connect/Disconnect (Template‑abhängig)
- `aliases.ctrl.powerLimitPct` (number, %) – Wirkleistungsbegrenzung in %
- `aliases.ctrl.powerLimitEnable` (bool) – Begrenzung aktivieren (falls vorhanden)

Alarme/Benachrichtigungen (best‑effort):

- `aliases.alarm.fault` (bool) – Fehler aktiv
- `aliases.alarm.warning` (bool) – Warnung aktiv

> Hinweis: Einige Geräte liefern Setpoints nur **write‑only**. In diesem Fall bleibt
> `aliases.ctrl.powerLimitPct` auf dem **zuletzt geschriebenen Wert**, bis das Gerät
> einen lesbaren Feedback‑Registerwert bereitstellt.


### METER (Zähler)

Lesen (best‑effort, je nach Template verfügbar):

- `aliases.r.power` (W) – Netto‑Wirkleistung (Import positiv / Export negativ oder berechnet)
- `aliases.r.powerImport` (W) – Importleistung (Bezug)
- `aliases.r.powerExport` (W) – Exportleistung (Einspeisung)
- `aliases.r.energyImport` (Wh) – Importenergie (Bezug)
- `aliases.r.energyExport` (Wh) – Exportenergie (Einspeisung)
- `aliases.r.voltageL1/L2/L3` (V) – Spannung je Phase (bei 1‑phasigen Zählern i.d.R. nur L1)
- `aliases.r.currentL1/L2/L3` (A) – Strom je Phase (bei 1‑phasigen Zählern i.d.R. nur L1)
- `aliases.r.frequency` (Hz) – Netzfrequenz

### EVCS / EVSE (Ladestationen / Wallboxen)

Lesen (best‑effort, je nach Template verfügbar):

- `aliases.r.power` (W) – aktuelle Ladeleistung
- `aliases.r.energySession` (Wh/kWh) – Energie in der aktuellen Sitzung
- `aliases.r.energyTotal` (Wh/kWh) – Gesamtenergie (falls verfügbar)
- `aliases.r.statusCode` (number) – Statuscode (herstellerabhängig, aber stabiler Ort)
- `aliases.r.errorCode` (number) – Fehlercode (falls verfügbar)

Steuern (falls Template/Ladestation unterstützt):

- `aliases.ctrl.run` (bool) – Laden aktivieren/stoppen (Enable/Start)
- `aliases.ctrl.currentLimitA` (A) – Stromlimit (A; bei Geräten mit mA‑Registern erfolgt die Umrechnung automatisch)
- `aliases.ctrl.powerLimitW` (W) – Leistungsbegrenzung (W; sofern unterstützt)
- `aliases.ctrl.unlockPlug` (bool) – Stecker entriegeln (sofern unterstützt)

Alarme/Benachrichtigungen (best‑effort):

- `aliases.alarm.fault` (bool) – Fehler aktiv (z.B. `errorCode != 0`)

### CHARGER / DC_CHARGER (Solar- und Batterie-Laderegler)

Diese Kategorien sind ausdrücklich **keine EV-Ladepunkte**. Im Alias Contract v1
werden sie als `solarCharger` klassifiziert. Typische Rückmeldungen sind:

- `aliases.v1.r.power` (W)
- `aliases.v1.r.energyTotal` (Wh)
- `aliases.v1.r.voltage` (V)
- `aliases.v1.r.current` (A)
- `aliases.v1.r.temperature` (°C)
- `aliases.v1.r.statusCode` und `aliases.v1.r.errorCode` (falls vorhanden)

### BATTERY / ESS / BATTERY_INVERTER (Batteriesysteme)

Lesen (best‑effort, je nach Template verfügbar):

- `aliases.r.soc` (%) – State of Charge
- `aliases.r.soh` (%) – State of Health (falls vorhanden)
- `aliases.r.voltage` (V) – Batteriespannung
- `aliases.r.current` (A) – Batteriestrom
- `aliases.r.temperature` (°C) – Batterietemperatur (falls vorhanden)
- `aliases.r.power` (W) – Batterieleistung netto (**Konvention:** Entladen positiv, Laden negativ; best‑effort)
- `aliases.r.powerCharge` (W) – Ladeleistung (absolut, ≥0)
- `aliases.r.powerDischarge` (W) – Entladeleistung (absolut, ≥0)
- `aliases.r.energyCharge` (Wh) – Ladeenergie gesamt (falls vorhanden)
- `aliases.r.energyDischarge` (Wh) – Entladeenergie gesamt (falls vorhanden)
- `aliases.r.allowCharge` (bool) – BMS erlaubt Laden (falls vorhanden)
- `aliases.r.allowDischarge` (bool) – BMS erlaubt Entladen (falls vorhanden)
- `aliases.r.allowedChargePower` (W) – erlaubte Ladeleistung (falls vorhanden)
- `aliases.r.allowedDischargePower` (W) – erlaubte Entladeleistung (falls vorhanden)

Steuern (falls Template/Batteriesystem unterstützt):

- `aliases.ctrl.powerSetpointW` (W) – Wirkleistungs-Setpoint (batterieseitig/ESS, herstellerabhängige Semantik)
- `aliases.ctrl.powerSetpointL1/L2/L3` (W) – Setpoints je Phase (falls vorhanden)
- `aliases.ctrl.controlMode` (number) – Control Mode (vendor-spezifisch; stabiler Ort)
- `aliases.ctrl.chargeEnable` (bool) – Laden erlauben/sperren (falls vorhanden; z.B. Victron → DISABLE-Flag invertiert)

Alarme/Benachrichtigungen (best‑effort, konservativ):

- `aliases.alarm.fault` (bool) – Fehler aktiv (z.B. Error-Codes oder Alarm/Protect-Flag-Register ≠ 0)
- `aliases.alarm.warning` (bool) – Warnung aktiv (falls passende Warn-Register vorhanden)

### TESVOLT IoT Gateway (MQTT EMS / V2)

Das separate Template `ess.tesvolt.iotGateway.mqttV2` verbindet NexoWatt als
Third-Party-EMS mit dem MQTT-Broker des TESVOLT IoT Gateways. Konfiguration:

```text
URL:      mqtt://<Gateway-IP>:1884
Login:    TESVOLT-Zugang
Passwort: TESVOLT-Zugang
```

Für die vorhandene Anlage mit unversionierten Topics `EMS/... (ohne V2)`
wählen; alternativ erkennt die Automatik das Format anhand aktueller,
auswertbarer Telemetrie. Standard ist reines Lesen ohne MQTT-Publishes.
Die Leistungssteuerung für paralleles Auslesen mit dem bestehenden TEM ausgeschaltet lassen.
Vollständige empfangene Nachrichten sind zusätzlich in den `*_JSON`-Datenpunkten
sichtbar; sie dienen der Diagnose und bestätigen keine Datenfrische.

Nach abgestimmter Übergabe der Regelung und expliziter Steuerfreigabe erfolgt
die Leistungssteuerung über `aliases.v1.ctrl.powerSetpointW` mit der
NexoWatt-Konvention `+ Entladen / - Laden`. Der Treiber invertiert den Wert für
TESVOLT und prüft Format, Fähigkeiten, Zustände und dynamische AC-Grenzen.
Einrichtung: [TESVOLT EMS / V2](docs/TESVOLT_EMS_TOPICS_0.5.163.md).
Aktueller Prüfbericht: [Fehlerprüfung 0.5.169](docs/IMPLEMENTATION_AUDIT_0.5.169.md).

---

## 4b) SMA PV‑Wechselrichter (Modbus) – Templates & wichtige Datenpunkte

Im Adapter sind (u.a.) folgende **PV_INVERTER**‑Templates integriert:

- **SMA STP125‑70 (SunSpec Modbus) – Minimal**
  - `templateId`: `pv_inverter.sma.SmaStp12570SunSpecMinimal`
  - **Lesen (wichtig):**
    - `W` (aktuelle Wirkleistung, W)
    - `WH` (Energiezähler, Wh)
    - `St` (Betriebszustand / Operating State)
    - `PVConn` (PV‑Netzverbindung)
    - `Evt1` (Event‑Flags – für Fehler/Warnungen)
  - **Steuern (wichtig):**
    - `Conn` (Verbinden/Trennen, bool)
    - `WMaxLim_Ena` (Leistungsbegrenzung aktiv, bool)
    - `WMaxLimPct` (Leistungsbegrenzung in %, 0…100)
  - **Wechselrichter‑Ausfall / Benachrichtigungen:**
    - Alias (empfohlen):
      - Offline: `...aliases.alarm.offline=true`
      - Fault: `...aliases.alarm.fault=true`
    - Rohdaten (optional): `St` und `Evt1` (z.B. `St==7` → Fault; `Evt1!=0` → Ereignis)

- **SMA Sunny Tripower X (SMA Modbus) – Minimal**
  - `templateId`: `pv_inverter.sma.SmaSunnyTripowerXMinimal`
  - **Lesen (wichtig):**
    - `W` (aktuelle Wirkleistung, W)
    - `TotWhOut` (Gesamtertrag, Wh)
    - `Health` (Zustand: `35=Fehler`, `303=Aus`, `307=Ok`, `455=Warnung`)
    - `PvGriConn` (Netzanbindung der Anlage)
  - **Steuern (wichtig):**
    - `OpMod` (Allgemeine Betriebsart: `381=Stopp`, `1467=Start`)
    - `WLimPct` (Wirkleistungsbegrenzung über Anlagensteuerung in %, write‑only)
  - **Wechselrichter‑Ausfall / Benachrichtigungen:**
    - Alias (empfohlen):
      - Offline: `...aliases.alarm.offline=true`
      - Fault: `...aliases.alarm.fault=true`
      - Warning: `...aliases.alarm.warning=true`
    - Rohdaten (optional): `Health==35` (Fehler) bzw. `Health==455` (Warnung)

## 4c) Sungrow Modbus – Templates & wichtige Datenpunkte

Der Adapter enthält zusätzliche Sungrow-Templates für direkte Wechselrichter-Kommunikation und für System-Gateways:

- **Sungrow Grid-Connected CX/RS/RT (Modbus)**
  - `templateId`: `pv_inverter.sungrow.GridConnectedCxRsRtModbus`
  - Kategorie: `PV_INVERTER`
  - Wichtig: `W` (Wirkleistung), `pV_POWER` (PV/DC-Leistung), `TotWhOut` (Gesamtertrag), `St` (Betriebszustand), `Evt1` (Fehlercode), `WMaxLim_Ena`, `WMaxLimPct`, `WMaxLim`
  - Schreiblogik: Beim Schreiben von `WMaxLimPct` oder `WMaxLim` wird der Sungrow-Leistungsbegrenzungs-Schalter automatisch aktiviert.

- **Sungrow Residential Hybrid V1.1.11 (Modbus)**
  - `templateId`: `ess.sungrow.ResidentialHybridV119`
  - Kategorie: `ESS`
  - Wichtig: `pV_POWER`, `W`, `gRID_POWER`, `lOAD_POWER`, `bATTERY_POWER`, `Soc`, Energiewerte, Fehler-Bitfelder, Firmware-Versionen, PV power limitation und MG8RL/MG10RL-Modellcodes
  - Steuerung: `aliases.ctrl.powerSetpointW` schreibt als signierter Leistungs-Sollwert: positiv = Entladen, negativ = Laden, `0` = Stop. Der Adapter setzt dabei automatisch External EMS Mode (`13050=3`), Lade-/Entlade-Kommando `13051`, Leistungsregister `13052` und hält den External-EMS-Heartbeat `13080` mit `20 s` aktiv.

- **Sungrow Logger1000/3000/4000 (Modbus)**
  - `templateId`: `ess.sungrow.Logger1000_3000_4000`
  - Kategorie: `ESS`, Default Unit-ID: `247`
  - System-/Array-Daten inkl. PV-/Netz-/Last-/Batterie-Leistung sowie Schreibwerte für EMS, Laden/Entladen, Einspeisebegrenzung und PV-Leistungsbegrenzung.

- **Sungrow iHomeManager V1.0.1 (Modbus)**
  - `templateId`: `ess.sungrow.iHomeManagerV101`
  - Kategorie: `ESS`, Default Unit-ID: `247`
  - Systemweite EMS-Daten und Steuerung; keine Einzelwechselrichter-Weiterleitung über iHomeManager.

Hinweis: Die Sungrow-Dokumentation verwendet 1-basierte Registeradressen; die Templates sind bereits mit den tatsächlich zu sendenden Modbus-Adressen (`Register - 1`) hinterlegt.

Stabilitäts-Hinweis ab `0.5.93`: Das Residential-Hybrid-Template pollt standardmäßig nur die stabilen Live-/Kernregister schnell und verschiebt optionale, modell-/Gateway-abhängige Register in einen reduzierten Slow-Poll. Kurze Modbus-Unterbrechungen setzen Daten-Aliase wie `aliases.r.soc` nicht mehr auf `null`; der Verbindungsstatus wird weiterhin über `aliases.comm.connected`, `aliases.comm.lastError` und `aliases.alarm.offline` aktualisiert.


## 4d) MENNEKES AMTRON 4You 500 / 4Business 700 Modbus TCP

Neu integriert ist ein vollständiges Modbus-TCP-Template für die MENNEKES AMTRON 4You 500 / 4Business 700 Serie:

- `templateId`: `evcs.mennekes.amtron4you500.4business700.modbusTcp`
- Kategorie: `EVCS`
- Modbus TCP Port: `502`
- Unit-ID Default: `1`
- Registertyp: Holding Register / FC03 für Lesen, FC06 bzw. FC16 für Schreiben

Wichtige Lese-Datenpunkte:

- Status: `cHARGE_POINT_STATE`, `vEHICLE_STATE`, `cHARGE_POINT_AVAILABILITY`, `rELAY_STATE`, `pLUG_LOCK_STATUS`
- Fehler: `eRROR_CODE`, `eRROR_CODE_2`, `eRROR_CODE_3`, `eRROR_CODE_4`
- Messwerte: `aCTIVE_POWER`, `aCTIVE_PRODUCTION_ENERGY`, `mETER_POWER_L1..L3`, `cURRENT_L1..L3`, `vOLTAGE_L1..L3`
- Ladesession: `eNERGY_SESSION`, `cHARGING_DURATION`, `cHARGING_START_TIME`, `cHARGING_END_TIME`, `sIGNALED_CURRENT_TO_EV`
- HEMS/Phasen: `hEMS_CONFIGURATION`, `hEMS_COMMUNICATION_STATUS`, `hEMS_POWER_LIMIT_MINIMUM`, `hEMS_POWER_LIMIT_MAXIMUM`, `pHASE_SWITCH_MODE`, `aSSIGNED_PHASES`
- Charging-Point-Network: `cHARGING_POINT_NETWORK_*`

Wichtige Schreib-Datenpunkte und Aliases:

- `sET_CHARGING_CURRENT` bzw. Alias `aliases.ctrl.currentLimitA` – HEMS-Stromlimit in A, intern über das 0,1-A-Register
- `eV_SET_CHARGE_POWER_LIMIT` bzw. Alias `aliases.ctrl.powerLimitW` – HEMS-Leistungslimit in W
- `sAFE_CURRENT` bzw. Alias `aliases.ctrl.safeCurrentA` – Fallback-Strom bei HEMS-Kommunikationsverlust
- `cOMMUNICATION_TIMEOUT` bzw. Alias `aliases.ctrl.communicationTimeoutS` – HEMS-Kommunikationstimeout in Sekunden
- `cHARGING_POINT_NETWORK_EMS_CURRENT_LIMIT` bzw. Alias `aliases.ctrl.networkCurrentLimitA` – schreibt automatisch L1/L2/L3 gemeinsam per FC16

Hinweis: Für HEMS-Steuerung muss die Wallbox-seitige Modbus-TCP-/HEMS-Konfiguration auf Read/Write stehen (`hEMS_CONFIGURATION == 2`).

Stabilitäts-Hinweis ab `0.5.94`: Das AMTRON-Template pollt Live-/Kernregister schnell und verschiebt Firmware-/Info-/Netzwerk-Zusatzregister in einen langsamen 5-Minuten-Poll. Zusätzlich setzt der Modbus-Treiber harte Operation-/Connect-Timeouts, schließt hängende TCP-Sockets aktiv und baut die Verbindung nach Timeouts sauber neu auf. Bereits geschriebene HEMS-Sollwerte werden periodisch aufgefrischt, damit die Wallbox nicht wegen auslaufender HEMS-Kommunikation in den Safe-Current-Fallback fällt.


## 4e) Weidmüller Charge Wallbox Business CH-W-B Modbus TCP

Neu integriert ist das offizielle Modbus-TCP-Profil der Weidmüller Charge Wallbox Business für die Varianten A3.7/11 und A7.4/22:

- `templateId`: `evcs.weidmueller.chargeWallboxBusiness.modbusTcp`
- Kategorie: `EVCS`
- Port: `502`
- feste Unit-ID / Modbus-Adresse: `255`
- Registeradressen werden exakt wie in Anleitung `2759890000/00/03.2021` verwendet
- für Modbus TCP muss an der Wallbox DIP-Schalter `DP10` aktiviert sein

Wichtige Datenpunkte und Aliases:

- `eVSE_STATE` / `aliases.r.statusCode` / `aliases.r.statusText` - IEC-61851-Zustand A bis F
- `aCTIVE_POWER` / `aliases.r.power` - aktuelle Ladeleistung in W
- `eNERGY_SESSION` / `aliases.r.energySession` - Energie des aktuellen Ladevorgangs
- `vOLTAGE_L1..L3`, `cURRENT_L1..L3` - Phasenmesswerte
- `cHARGING_TIME` / `aliases.r.sessionTimeS` - Ladezeit in Sekunden
- `sET_ENABLE` / `aliases.ctrl.run` / `aliases.ctrl.chargeEnable` - Ladefreigabe über Coil 400
- `cHARGING_RELEASED` / `aliases.r.chargingReleased` - tatsächliche Freigabe über Coil 436
- `sET_CHARGING_CURRENT` / `aliases.ctrl.currentLimitA` - Stromvorgabe über Holding 528; das Rohregister `A x 10` wird als Ampere dargestellt
- `rFID_READER_ENABLE` und `rFID_CARD_UID` - RFID-Steuerung und Diagnose

32-Bit-Werte und die herstellerspezifischen ASCII-/RFID-Felder werden Low-Word-First dekodiert. Netzwerkregister werden absichtlich nur gelesen, damit ein EMS nicht versehentlich IP-Adresse, Subnetz oder Gateway verändert. Alte Sollwerte werden nach Neustart nicht automatisch wiederhergestellt.


## 4f) Alfen NG9xx / ACE Modbus TCP

Die ACE-Register sind auf mehrere feste Modbus-Serveradressen/Unit-IDs verteilt. Deshalb gibt es bewusst getrennte Profile:

- `evcs.alfen.ng9xx.ace.socket1.modbusTcp` – **Socket-Modus**, Socket 1 / linke Dose, Unit-ID `1`
- `evcs.alfen.ng9xx.ace.socket2.modbusTcp` – **Socket-Modus**, Socket 2 / rechte Dose, Unit-ID `2`
- `evcs.alfen.ng9xx.ace.station.modbusTcp` – **SCN-Modus**, Station/Smart Charging Network auf Unit-ID `200`; Socket-1-Werte bleiben zusätzlich als Diagnose sichtbar

### Verbindungs- und Adressierungsregeln

- Modbus TCP, Port `502`
- Dokumentregister sind 1-basiert; im Telegramm wird immer `Dokumentregister - 1` verwendet. Ein manueller `addressOffset` wird für die Alfen-Profile deshalb ignoriert.
- 16-Bit-Register werden in Network Byte Order übertragen. Bei 32-Bit-Werten ist die Wortreihenfolge Low-Word-First; im Template entspricht das `wordOrder: le`, `byteOrder: be`.
- Mehrregisterwerte werden vollständig in **einer** FC16-Anfrage geschrieben. Es gibt keinen `+1`-Fallback und kein Aufteilen eines FLOAT32 auf zwei Einzelzugriffe.

### Socket-Steuerung

`aliases.ctrl.currentLimitA` beziehungsweise `sET_CHARGING_CURRENT` schreibt:

- Socket 1: Unit-ID `1`
- Socket 2: Unit-ID `2`
- FC16, Protokolladresse `1209`, Länge `2`
- Beispiel `16 A`: Register `[0x0000, 0x4180]`; Unit-ID + PDU für Socket 1: `01 10 04 B9 00 02 04 00 00 41 80`

`0 A` ist Stop. Positive Werte unter `6 A` werden auf `6 A` normalisiert. `cHARGE_USING_PHASES` schreibt ausschließlich `1` oder `3` auf Protokolladresse `1214`.

### Station-/SCN-Steuerung

Im SCN-Profil schreibt `aliases.ctrl.currentLimitA` auf den kombinierten Datenpunkt `sCN_MAX_CURRENT`. Derselbe FLOAT32-Stromwert wird für L1, L2 und L3 in **einem** Telegramm übertragen:

- Unit-ID `200`
- FC16, Protokolladresse `1416`, Länge `6`
- Beispiel `16 A`: `[0x0000,0x4180, 0x0000,0x4180, 0x0000,0x4180]`

Die Einzel-Datenpunkte `sCN_MAX_CURRENT_L1`, `sCN_MAX_CURRENT_L2` und `sCN_MAX_CURRENT_L3` bleiben für gezielte Tests verfügbar; der stabile EMS-Alias verwendet jedoch die atomare Drei-Phasen-Anfrage. Entsprechend der dokumentierten Schrittweite werden SCN-Stromwerte auf volle Ampere gerundet; `0 A` bleibt Stop und positive Werte unter `6 A` werden auf `6 A` normalisiert.

### Erforderliche ACE-Konfiguration

Der Alfen-Leitfaden v1.0 gilt für ACE Service Installer `3.4.10-130` und Firmware `4.10`. Für Schreibzugriffe müssen Active Load Balancing und die EMS-Schnittstelle freigeschaltet und passend konfiguriert sein:

- **Allow reading** aktiv
- **Allow writing maximum currents** aktiv
- **Active Load Balancing** aktiv und lizenziert
- Data Source = **Energy Management System**
- Protocol Selection = **Modbus TCP/IP**
- Safe Current gesetzt
- TCP/IP EMS Control Mode = **Socket** für die Socket-Profile oder **SCN** für das Station/SCN-Profil
- im Socket-Modus zusätzlich **Enable sockets** aktiv
- Validity Time größer als das 5-s-Refreshintervall

### Diagnose nach einem Schreibtest

Ein normaler FC16-Response bedeutet nur, dass der Modbus-Server das Telegramm angenommen hat. Ob ACE den Sollwert tatsächlich verwendet, zeigen die Rückmeldungen:

- `aliases.r.currentLimitValidTimeS` muss nach einem Strombefehl auf einen hohen Wert springen und anschließend herunterzählen.
- `aliases.r.setpointAccountedFor` muss im aktiven Modus `true` werden. Im Socket-Profil entspricht das Register 1214; im SCN-Profil dem SCN-Max-Current-Enable-Register 1431.
- `aliases.r.appliedCurrentLimitA` zeigt den tatsächlich angewendeten Grenzwert; Fahrzeugreaktion und andere interne Limits können die Änderung verzögern oder weiter begrenzen.
- Bei Modbus Exception 2/3 wird der manuelle Fehler ab `0.5.140` in `info.lastError` sichtbar, statt still verworfen zu werden.

Der letzte Strombefehl wird nach dem ersten expliziten Schreibzugriff alle `5 s` erneuert. Die Phasenwahl wird nur auf Kommando und einmal zur Bestätigung wiederholt.

### Hinweis zu Register‑Offsets
Viele Herstellerdokumentationen verwenden 1‑basierte Registeradressen (z.B. `40001`).
Wenn dein Gerät mit den im Template hinterlegten Adressen „um 1 daneben“ liegt, setze im Gerät:

- `addressOffset: -1`

**Ausnahme Alfen ACE:** Die Alfen-Templates enthalten bereits die Protokolladressen und erzwingen Offset `0`; dort keinen manuellen Offset setzen.

### SunSpec Auto-Discovery (ab v0.5.6)

Bei **SunSpec-Modbus** Templates (z.B. **SMA STP125‑70**) versucht der Adapter beim Connect **automatisch** die
SunSpec-Signatur **`SunS`** zu finden und setzt intern einen passenden **Offset** (und bei Bedarf auch die **Unit-ID**).

Das hilft insbesondere bei Installationen, bei denen der SunSpec-Block nicht exakt bei `40000` beginnt (z.B. `39999` oder `0`).

Wenn du die Auto-Erkennung deaktivieren oder übersteuern willst, kannst du im Device-Connection-Block (best-effort) setzen:

- `autoSunSpec: false`
- `sunSpecTemplateBase: 40000` (nur wenn du ein anderes Template-Base-Layout verwendest)

---

## 5) Geräte‑Konfiguration (devicesJson)

Die Geräte werden intern als JSON gespeichert. Beispiel:

```json
[
  {
    "id": "evcs_garage",
    "name": "Wallbox Garage",
    "enabled": true,
    "category": "EVCS",
    "manufacturer": "go-e",
    "templateId": "evcs.goe.EvcsGoeModbusImpl",
    "protocol": "modbusTcp",
    "pollIntervalMs": 1000,
    "connection": {
      "host": "192.168.1.50",
      "port": 502,
      "unitId": 1,
      "timeoutMs": 2000,
      "addressOffset": 0
    }
  }
]
```

### Wichtige Felder
- `pollIntervalMs`: optional pro Gerät; sonst globales Polling
- `addressOffset`: um 1‑basierte Registerangaben (40001‑Style) zu korrigieren, z.B. `-1`

---

## Lizenz
MIT

### 0.5.99 - Alfen NG9xx/ACE profile hardening

- Alfen addresses re-audited against the ACE Modbus v1.0 table. The adapter keeps protocol addresses as `documentation register - 1`, as required by Alfen.
- Default Alfen polling now focuses on stable socket live meter values; optional Station/SCN UID200 blocks and the optional Socket control/status block are no longer default-critical.
- The mixed Station template is a safe Socket-1 default: Socket-1 live/control remains usable even when Station/SCN is not enabled in ACE.
- Socket write values are refreshed every 10 seconds after a successful user/script write.
- Added derived Alfen charging/status aliases from measured power and connection state when the optional Mode-3/status block is not exposed by the charger.
- Unsupported Alfen read/write attempts now cool down instead of being retried aggressively.



## MENNEKES AMTRON safety note (0.5.100)

The AMTRON HEMS watchdog is kept alive by regular Modbus polling. The adapter therefore no longer restores or periodically rewrites all writable MENNEKES HEMS/configuration registers on reconnect. Writable datapoints and aliases remain available.

### 0.5.100 - MENNEKES AMTRON HEMS watchdog/profile cleanup

MENNEKES AMTRON HEMS communication timeout is reset by regular Modbus read or write traffic. The AMTRON template therefore no longer performs a periodic write keepalive for all writable HEMS/network registers. On reconnect, only explicitly stored modern HEMS setpoints (`sET_CHARGING_CURRENT`, `eV_SET_CHARGE_POWER_LIMIT`) are restored. Configuration registers such as safe current, communication timeout and charging-point-network EMS limits are no longer auto-restored by default. Integer-only MENNEKES write registers are rounded before Modbus encoding so values such as `15.9 A` do not get sent to whole-ampere registers.



### Version 0.5.100

- MENNEKES AMTRON HEMS restore/keepalive hardened: the adapter no longer performs cyclic writes for Mennekes setpoints, because regular Modbus reads already reset the HEMS communication timeout. On reconnect it restores only the last explicitly written current/power control setpoint and no longer rewrites safe-current, communication-timeout, deprecated legacy, or network registers automatically.

### Alfen NG9xx / ACE Modbus note

The Alfen ACE template uses the protocol addresses required by the Alfen documentation: document register minus 1, fixed Unit-ID 1 for socket 1, Unit-ID 2 for socket 2, and Unit-ID 200 for station/SCN. The socket EMS control block around document registers 1200..1215 is optional in practice and is only writable when Active Load Balancing / Energy Management System mode, Socket control, Enable sockets, and Allow writing maximum currents are enabled in ACE Service Installer. The adapter does not perform unsafe off-by-one write fallback for these control registers.

### Version 0.5.101

- Alfen NG9xx / ACE Modbus hardening: removed the unsafe off-by-one fallback for Alfen read/write operations. The adapter now keeps the documented protocol addressing only (`documentation register - 1`) and will no longer retry `sET_CHARGING_CURRENT` on the shifted address `1210` when the correct address `1209` is rejected.
- Alfen maximum-current setpoints are rounded to whole amperes before encoding because the Alfen table specifies a `1 A` step size for `FLOAT32` maximum-current registers. Values such as `13.3 A` are sent as `13 A`, while the 10-second watchdog refresh remains active after a successful write.

### 0.5.102 - Alfen ACE write/address hardening

- Fixes a crash in alias write error handling (`Cannot access dp before initialization`).
- Forces Alfen ACE templates to use protocol address offset `0` even when stale device/global settings contain an address offset.
- Disables unsafe off-by-one write retries for Alfen 32-bit control registers.
- Keeps unexpected state-change errors from terminating the adapter instance.



### 0.5.104 Alfen ACE adaptive control addressing

The Alfen ACE socket/SCN EMS control block is now probed safely with both documented protocol addressing and the table-address variant observed on field devices. The adapter caches the accepted address for read/write and refreshes accepted setpoints every 10 seconds for the Alfen watchdog.

### 0.5.105 Alfen ACE command/readback cleanup

- Caches the accepted adaptive Alfen control address not only for the written datapoint, but for the complete socket-control readback block. This avoids decoding adjacent registers as false readback values.
- Alfen control aliases (`aliases.ctrl.currentLimitA`, `aliases.ctrl.phaseMode`, `aliases.ctrl.run`, `aliases.ctrl.chargeEnable`) now keep the last successfully commanded value instead of being overwritten by volatile readback values such as `0 A` or `1 phase`.
- The Alfen watchdog refresh repeats only the Max Current command every 10 seconds. Phase switching is a command, not a watchdog current setpoint, and is no longer cyclically rewritten.

### 0.5.106 Alfen ACE status text cleanup

- Alfen Mode-3 aliases now expose human-readable status text first, e.g. `No vehicle (A)` instead of only the raw IEC code `A`.
- Added `aliases.r.mode3Code` for the raw Alfen/IEC Mode-3 code (`A`, `B1`, `C2`, ...), while `aliases.r.mode3State`, `aliases.r.statusText` and `aliases.r.status` are intended for frontends.
- Added status labels for `aliases.r.statusCode` so dashboards can map `0..8` to useful texts.
- Normalizes Alfen current-limit valid-time readback variants where field devices expose UINT32 valid time with swapped word order.

### 0.5.107 Modbus runtime and KEBA P40 stabilization

- Modbus TCP/RTU/ASCII reads now default to conservative contiguous register groups with a lower default maximum span. This avoids requests across reserved register gaps on sensitive devices.
- Added adaptive read recovery: when a device rejects a grouped read with Modbus exception 2/3, the adapter temporarily splits that group into per-datapoint reads and keeps all supported values instead of dropping the whole device offline.
- Unsupported optional Modbus registers are skipped temporarily and throttled in the log. If every requested group fails, the poll still fails so wrong IP/template/Unit-ID cases remain visible.
- KEBA KeContact P40 Modbus profile hardened: fixed default Unit-ID to 255, enforced address offset 0, added safe polling hints, and added charging/cable state datapoints at 1000/1004 for status aliases.



### KEBA KeContact P40 / P40 Pro Modbus TCP

Das Template `evcs.keba.EvcsKebaModbusImpl` ist gegen den KEBA *Modbus TCP Programmers Guide V1.02* umgesetzt.

Wichtige Verbindungswerte:

- Protokoll: `modbusTcp`
- Port: `502`
- Unit-ID: `255`
- Address Offset: `0`
- Lesen: `FC3`, pro Anfrage genau ein Registerwert mit maximal `2` Modbus-Wörtern
- Schreiben: `FC6`, keine FC16-Blockschreibzugriffe

Die KEBA liefert Ströme intern in `mA`; im Adapter werden alle relevanten Stromwerte als `A` geführt. Das gilt auch für Schreibwerte wie `aliases.ctrl.currentLimitA`, `sET_CHARGING_CURRENT`, `sET_FAILSAFE_CURRENT` und die Readbacks `currentL1/L2/L3`, `mAX_CHARGING_CURRENT`, `mAX_SUPPORTED_CURRENT`, `fAILSAFE_CURRENT_SETTING`.

Wichtige Aliase:

- `aliases.ctrl.currentLimitA`: 0 A = Laden pausieren, 6…32 A = Ladestrom setzen
- `aliases.ctrl.run` / `aliases.ctrl.chargeEnable`: `true` schreibt den Default-Freigabestrom, `false` schreibt 0 A
- `aliases.ctrl.failsafeCurrentA`: Failsafe-Strom in A
- `aliases.ctrl.failsafeTimeoutS`: Failsafe-Timeout in Sekunden
- `aliases.r.power`: Ladeleistung in W
- `aliases.r.currentL1/L2/L3`: Phasenströme in A
- `aliases.r.voltageL1/L2/L3`: Phasenspannungen in V
- `aliases.r.energyTotal`: Gesamtenergie in Wh
- `aliases.r.energySession`: Session-Energie in Wh
- `aliases.r.statusText`: verständlicher Ladestationsstatus

### 0.5.110 MENNEKES AMTRON energy/heartbeat cleanup

- EVCS energy aliases are normalized to kWh so dashboards do not display Wh counters as kWh.
- MENNEKES AMTRON meter/session energy datapoints are exposed in kWh.
- MENNEKES AMTRON heartbeat/read-error grace prevents online/offline flapping on slower units while real TCP/transport failures still go offline immediately.


### 0.5.112 Alfen ACE strict write address + watchdog

- Alfen Max Current is now written only to the audited protocol address `1209` (`document register 1210..1211`, FC16 length 2). The previous adaptive `+1`/table-address write fallback is disabled because `FC16@1210 len=2` shifts the 32-bit value into the neighbouring register pair.
- Alfen current readback uses the separate Actual Applied Max Current register (`document 1206..1207`) where available; command aliases keep the last commanded value.
- Alfen write commands are confirmed once after 5 seconds without a newer write. Max Current is additionally refreshed every 5 seconds from the last commanded value for the charger watchdog.

### 0.5.113 - Alfen ACE phase watchdog

- Alfen ACE `Charge Using Phases` is now handled like an EMS write command: after the first command it is repeated once after 5 s idle and then kept alive every 5 s from the last commanded value.
- `sET_CHARGING_CURRENT` remains fixed on protocol address 1209 (`doc 1210..1211`); `cHARGE_USING_PHASES` remains fixed on protocol address 1214 (`doc 1215`) and is written via FC06.


### 0.5.113 Alfen ACE phase-command watchdog

- Alfen phase switching (`aliases.ctrl.phaseMode` / `cHARGE_USING_PHASES`) is now treated as a watchdog-managed EMS command too.
- The phase command is written as a single-register FC6 command to protocol address `1214` (Alfen document register `1215`).
- After a successful phase command the adapter repeats it once after 5 seconds of command-idle time and then refreshes the last successful phase command every 5 seconds, just like the Max Current command.
- Max Current remains a 2-register FC16 write at protocol address `1209` (Alfen document registers `1210..1211`); no unsafe shifted write fallback is used.

### 0.5.114 - Alfen ACE safe phase confirmation

- Alfen ACE Max Current remains refreshed every 5 seconds from the last commanded value.
- Alfen ACE Charge Using Phases is written strictly to protocol address 1214 via FC06 and confirmed once after 5 seconds idle, but is no longer cyclically refreshed to avoid unintended charger state transitions.

### 0.5.115 - Alfen ACE address audit

- Re-audited the Alfen ACE socket control block against the vendor table and kept strict protocol addresses (`document register - 1`) with no +1 fallback.
- Fixed `mODBUS_MAX_CURRENT_VALID_TIME` word order to little-word-endian: document `1208..1209` => protocol `1207`, UINT32 seconds.
- Max Current: document `1210..1211` => protocol `1209`, FC16 length 2, refreshed every 5 seconds from the last commanded current.
- Charge Using Phases: document `1215` => protocol `1214`, FC06 length 1, confirmed once after 5 seconds; it is intentionally not cyclically refreshed because the Alfen validity timer applies to maximum-current setpoints.



### Alfen ACE Modbus v1.0 audit (0.5.116)

Alfen ACE templates are aligned with `configuration_guide_modbus_ace_v1.pdf` / Configuration Guide Modbus for ACE v1.0 EN 05/2025.
The templates store Modbus protocol addresses (`documentation register - 1`): Max Current document `1210..1211` is written as `FC16@1209`, and Charge using phases document `1215` is written as `FC6@1214`. Socket 1 uses Unit-ID 1, Socket 2 uses Unit-ID 2, and Station/SCN uses Unit-ID 200.
Alfen Max Current values are refreshed every 5 seconds from the last commanded value. Charge Using Phases is also kept in sync every 5 seconds while a positive Max Current command is active and is confirmed once after each phase write. Energy counters documented as Wh/VAh/VArh are exposed by the adapter as kWh/kVAh/kVArh.

### 0.5.119 - Alfen ACE phase/current command clean-up

- Alfen `cHARGE_USING_PHASES` now writes the audited ACE register `1215` as Modbus protocol address `1214` using FC16 length 1.
- Alfen command aliases parse UI values such as `16 A` and `3 phases`, not only plain numbers.
- Alfen phase keepalive is seeded from `aliases.ctrl.phaseMode` before older persistent setpoint memory, preventing an old `1 phase` value from overriding a manual/EMS `3 phases` command after restart.
- Added Alfen `aliases.r.phaseMode` readback alias so dashboards can distinguish commanded phase mode from charger readback.

### 0.5.122 - Alfen ACE All-IDs control follow-up

The Alfen ACE Station/All-IDs template now treats SCN current as the primary control path and mirrors the same current command to Socket 1 and Socket 2 where supported. This matches installations configured for TCP/IP EMS Control Mode = SCN, while still keeping socket writes available. Mirror write results are surfaced in the log for the first attempts so integrators can see which Unit-ID actually accepts control. The `chargingReleased` alias now reflects charger-side accounted/valid-time readback instead of only the requested command value.

### Sungrow hybrid ESS control stability (0.5.125)

The Sungrow residential hybrid/Logger/iHomeManager templates refresh signed battery power commands periodically.  A write to `aliases.ctrl.powerSetpointW` / `sET_ACTIVE_POWER` writes the required EMS mode, charge/discharge command and power helper registers together where possible, refreshes the command for the EMS watchdog, restores the last setpoint after reconnect, writes the external EMS/VPP heartbeat when available, and falls back to the wide-range power helper register for larger systems.


### 0.5.126

- Sungrow hybrid battery control: corrected charge/discharge command mapping for signed power setpoints. Positive `aliases.ctrl.powerSetpointW` values now command discharge; negative values command charge.

### Sungrow direction correction (0.5.127)

Sungrow hybrid ESS signed power commands now use the documented command mapping again: `0xAA`/`170` = charge and `0xBB`/`187` = discharge, while the adapter/EOS convention remains unchanged: positive `aliases.ctrl.powerSetpointW` discharges the battery, negative values charge it. The convenience aliases `aliases.ctrl.chargePowerW` and `aliases.ctrl.dischargePowerW` therefore map to the correct physical direction.

### Sungrow Residential Hybrid protocol V1.1.11 (0.5.131)

The residential hybrid template is aligned with **Communication Protocol of Residential Hybrid Inverter V1.1.11 EN (2025-11-17)**. Template addresses remain protocol addresses (`documentation register - 1`), U32/S32 values use low-word-first order, and signed ESS control now uses **External EMS Mode** (`EMS mode selection` register 13050 = `3`) with a fixed `External EMS heartbeat` value of `20 s` on register 13080. `sET_ACTIVE_POWER` keeps the EOS convention: positive values discharge, negative values charge, zero stops.

The V1.1.10/V1.1.11 additions are included: `PVPowerLimitation` (document register 13018 / protocol address 13017), firmware information registers, Channel 2 meter registers, and device type states for `MG8RL`/`MG10RL`. Fast polling is intentionally limited to live read-only values; RW setting registers are no longer polled every 2 seconds to avoid stressing WiNet/Logger forwarding.

## Alfen ACE EMS control note (0.5.129)

The Alfen NG9xx ACE templates are intentionally reduced to control-critical registers.
Use the Socket 1 control-only template for normal single-socket installations. The adapter writes **Modbus Server Max Current** every 5 seconds after a command so that the charger does not fall back to Safe Current before the Alfen validity timer expires. Positive current commands below 6 A are normalized to 6 A; 0 A remains the stop command. Phase switching is written only on explicit phase commands and once again after 5 seconds, not on every watchdog tick.

For the charger to accept writes, ACE Service Installer / Eve Install must be configured for Active Load Balancing with Data Source **Energy Management System**, TCP/IP EMS mode **Socket**, Safe Current set, and writing maximum currents enabled. `aliases.r.setpointAccountedFor=true` confirms that the charger is accounting the written Socket Max Current.

## Alfen ACE Control Fix 0.5.129

Diese Version enthält ein reduziertes Alfen-Control-only-Profil für den EMS-Socket-Modus. Der steuernde Pfad ist bewusst klein gehalten: Socket Unit-ID 1/2, `sET_CHARGING_CURRENT` über FC16 auf Protokolladresse 1209 und ein 5-s-Watchdog, der den letzten Strombefehl erneuert. Positive Strombefehle unter 6 A werden auf 6 A normalisiert; 0 A bleibt Stop. Die Phasenumschaltung wird nicht zyklisch gespammt, sondern nur bei explizitem Kommando und einmaliger Wiederholung geschrieben.


### Sungrow EMS single-write datapoints (0.5.132)

Sungrow Residential Hybrid control now exposes EMS-friendly virtual write datapoints.  EMS integrations only need to write a power datapoint; the Modbus driver internally translates that value into the Sungrow V1.1.11 control sequence: ensure `EMS mode selection` 13050 = `3` (External EMS), write `Charge/discharge command` 13051 and `Charge/discharge power` 13052 together via one FC16 block, and keep `External EMS heartbeat` 13080 refreshed as fixed `20 s` timeout value.

Available EMS write points:

- `sET_ACTIVE_POWER` / `aliases.ctrl.powerSetpointW`: signed W, positive = discharge, negative = charge, `0` = stop.
- `sET_CHARGE_POWER`: positive W charge command, `0` = stop.
- `sET_DISCHARGE_POWER`: positive W discharge command, `0` = stop.

Helper registers such as `eMS_MODE_SELECTION`, `cHARGE_DISCHARGE_COMMAND`, `cHARGE_DISCHARGE_POWER`, and `ExternalEMSHeartbeat` do not have to be assigned by EMS logic.  They remain visible for diagnostics/manual tests, but the adapter writes them automatically from the public power setpoint.


### 0.5.137 - Weidmüller Charge Wallbox Business

- Neues Modbus-TCP-Template für CH-W-B-A3.7/11 und CH-W-B-A7.4/22.
- Unit-ID 255, direkte Herstelleradressen, Low-Word-First-Dekodierung.
- Ladefreigabe über Coil 400, echte Freigaberückmeldung über Coil 436 und Stromvorgabe über Holding 528 (`A x 10`).
- Stabile EVCS-Aliase für Status, Fahrzeug/Laden, Leistung, Sitzungsenergie, Stromlimit und Ladefreigabe.

### 0.5.138 - Sungrow Residential Hybrid 1-second control telemetry

- Critical Sungrow live datapoints use an enforced fixed `1000 ms` start-to-start polling target.
- The four Modbus TCP fast-read groups use a `200 ms` minimum command gap so a healthy LAN/WiNet path can complete the full control snapshot inside approximately one second.
- A battery-power readback is triggered once immediately after each EMS power command; continuous duplicate priority polling is disabled because the normal fast cycle now runs every second.
- Per-device or global poll settings slower than one second no longer override this Sungrow control profile.
- Charge/discharge direction remains exactly as in `0.5.133`: positive `aliases.ctrl.powerSetpointW` discharges, negative values charge, and `0 W` stops.

### 0.5.139 - Technische Alternative CMI / CMI-S

- Neues Template `heat.ta.cmi` mit Protokoll `taCmi`.
- Dynamisches Lesen aller unterstützten Werte der konfigurierten CAN-Knoten über die offizielle CMI JSON API v8, einschließlich TA-Bezeichnungen, Einheiten, Analog-/Digitaltyp, Ausgangsstatus und RAS-Zustand.
- Automatischer Scan von CAN-Knoten 1…62 oder gezielte Knotenliste für schnellere Aktualisierung.
- Bidirektionale Heizungssteuerung über einen integrierten Modbus-TCP-Server, da das CMI als Modbus-Master arbeitet.
- Je Richtung bis zu 64 analoge und 64 digitale Kanäle. Standardkarte: Holding/Coils 0…63 NexoWatt→CMI und 100…163 CMI→NexoWatt.
- Frei definierbare Kanalnamen, Einheiten, Faktoren, Grenzwerte und stabile Aliase über `bridgeMap`.
- Die offizielle JSON API bleibt read-only und auf eine Anfrage pro Minute begrenzt; schnelle Regelwerte laufen unabhängig davon über die Modbus-Brücke.

### 0.5.140 - Alfen ACE write-logic audit

- Revalidated the Socket control frame against Alfen Modbus for ACE v1.0: UID1/2, FC16 at protocol address 1209, complete FLOAT32, low word first and network byte order.
- Replaced the misleading Station+Socket fallback with an actual UID200 Station/SCN profile. `sCN_MAX_CURRENT` writes all three phase limits atomically via FC16 at protocol address 1416, length 6.
- Manual Alfen Modbus exception 2/3 write failures now populate `info.lastError` instead of being silently consumed.
- Added exact accepted-write diagnostics with Unit-ID, function code, address, register words and data bytes; charger-side accounted/enabled and valid-time readbacks remain authoritative.
- Removed the duplicate current post-write repeat; only the 5-second validity watchdog refreshes the last explicit current command.
- Added packet-level regression tests for Socket 1, Socket 2 and SCN writes.
