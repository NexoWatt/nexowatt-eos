# NexoWatt EOS EEBUS Adapter - Anwendung und Feldtest

Diese Anleitung beschreibt die Nutzung von `iobroker.eebus` ab Version `0.2.2` auf NexoWatt EOS.

> **Status:** Feldtest-Core. Discovery, lokale SHIP-Identität, Pairing-/Trust-Zustände und SPINE-Discovery sind implementiert. Das Lesen und insbesondere das Schreiben müssen mit jedem realen Gerät und dessen unterstützten EEBUS Use Cases geprüft werden, bevor die Funktion produktiv genutzt wird.

## 1. Lokale EEBUS-Identität von NexoWatt EOS

Der Adapter kündigt NexoWatt EOS mit folgenden festen Werten an:

```text
Sichtbarer Kopplungsname: NexoWatt EOS
Marke:                   NexoWatt
Modell:                  EOS
Gerätetyp:               EnergyManagementSystem
EEBUS-Gerätekategorie:   2 (Energy Management System)
SHIP-Service:            _ship._tcp
Standard-Port:           4712
Standard-Pfad:           /ship/
```

Alte Instanzwerte wie `EEBUS Adapter` oder `EnergyOperationSystem` werden beim ersten Start der Version `0.2.2` automatisch auf `EOS` beziehungsweise `EnergyManagementSystem` migriert und in der Instanz gespeichert.

## 2. Wichtige Identitätsregel

Beim ersten Start erzeugt der Adapter:

- einen privaten EC-Schlüssel,
- ein lokales TLS-Zertifikat,
- die lokale SKI,
- eine SHIP-ID,
- einen Zertifikat-Fingerabdruck.

Diese Werte bilden die langfristige Vertrauensidentität des EOS. Nach erfolgreichem Pairing dürfen Zertifikat, privater Schlüssel, SKI und SHIP-ID nicht gelöscht oder beliebig ersetzt werden, weil gekoppelte Geräte die alte Identität sonst nicht mehr als vertrauenswürdig erkennen.

Die wirksamen Werte können unter `eebus.0.identity.*` kontrolliert werden, insbesondere:

```text
identity.serviceName
identity.brand
identity.model
identity.deviceType
identity.deviceCategories
identity.ianaPen
identity.ianaPenPlaceholder
identity.localSki
identity.shipId
identity.announcementActive
```

### IANA PEN

`999999` ist nur ein Feldtest-Platzhalter. Vor einer neuen produktiven SHIP-Identität muss die offiziell für NexoWatt zugewiesene IANA Private Enterprise Number eingetragen werden. Eine spätere Änderung des Feldes verändert eine bereits erzeugte SHIP-ID nicht automatisch.

## 3. Empfohlene Grundeinstellungen

### Allgemein

```text
EEBUS-mDNS-Discovery:                 ein
Automatisch mit gefundenen Geräten verbinden: ein
Messwertintervall:                    10 Sekunden
Metadatenintervall:                   60 Sekunden
```

### Lokaler SHIP-Endpunkt

```text
Lokalen TLS/WebSocket-SHIP-Endpunkt aktivieren: ein
Lokalen SHIP-Dienst über mDNS ankündigen:        ein
SHIP-Handshake-Zustandsmaschine:                 ein
SPINE-NodeManagement-Erkennung:                  ein
Port:                                            4712
Pfad:                                            /ship/
Kopplungsname:                                   NexoWatt EOS
```

### Sicherheit für den ersten Test

```text
Neue Geräte automatisch akzeptieren: aus
Befehle an nicht vertrauenswürdige Geräte: aus
Befehle nur simulieren (Command dry run): ein
Rohdaten-Diagnose: aus
```

`Command dry run` bleibt beim ersten Test eingeschaltet. Damit werden vorbereitete Schreibtelegramme nur unter `raw.lastCommand` protokolliert und noch nicht an das Gerät gesendet.

## 4. Netzwerkvoraussetzungen

NexoWatt EOS und das EEBUS-Gerät müssen sich im selben lokalen Netz befinden oder mDNS muss zwischen den Netzen gezielt weitergeleitet werden.

Erforderlich sind insbesondere:

```text
UDP 5353 Multicast/DNS-SD
TCP 4712 zum EOS
keine WLAN-Client-Isolation
kein Gastnetz ohne Multicast
keine Firewall-Sperre zwischen Gerät und EOS
```

Netzwerkprüfung auf EOS:

```bash
sudo apt install avahi-utils
avahi-browse -rt _ship._tcp
```

Erwartete lokale Instanz:

```text
NexoWatt EOS._ship._tcp.local
```

Der TXT-Eintrag sollte unter anderem enthalten:

```text
id=<SHIP-ID>
path=/ship/
ski=<lokale SKI>
register=true
brand=NexoWatt
model=EOS
type=EnergyManagementSystem
cat=2
```

## 5. Gerät koppeln

1. Adapterinstanz starten.
2. Im Gerät die Funktion **EEBUS**, **HEMS**, **Energiemanagementsystem** oder **Pairing** öffnen.
3. Suche starten.
4. Im Gerät **NexoWatt EOS** auswählen.
5. In den EOS-Datenpunkten zu folgendem Bereich wechseln:

```text
eebus.0.devices.<deviceId>.pairing
```

6. Pairing-Anfrage prüfen:

```text
pairingState = pending-local-approval
remoteSki
remoteShipId
remoteFingerprint
```

7. Das richtige Gerät freigeben:

```text
approve = true
```

Alternativ kann gezielt gesetzt werden:

```text
trusted = true
```

8. Erfolgreiche Verbindung erkennen:

```text
connection.connected = true
connection.dataExchangeReady = true
connection.shipState = data-exchange
pairing.pairingState = paired-data-exchange
```

### Automatisches Akzeptieren

`pairing.autoAcceptNewDevices` darf nur während eines kontrollierten Feldtests kurzzeitig aktiviert werden. Danach wieder ausschalten, damit sich keine unbekannten Geräte automatisch als vertrauenswürdig eintragen.

## 6. Gerätedaten lesen

Nach erfolgreichem SHIP-Datenaustausch fordert der Adapter eine SPINE-NodeManagement-Beschreibung an.

Prüfen:

```text
eebus.0.devices.<deviceId>.info.deviceClass
eebus.0.devices.<deviceId>.useCases.detected
eebus.0.devices.<deviceId>.useCases.features
eebus.0.devices.<deviceId>.useCases.functions
eebus.0.devices.<deviceId>.useCases.nodeManagement
eebus.0.devices.<deviceId>.raw.lastSpineFrame
```

Messwerte werden - soweit das Gerät und das aktuelle Mapping sie liefern - unter folgendem Kanal angelegt:

```text
eebus.0.devices.<deviceId>.measurements.*
```

Beispiele:

```text
power
energy
voltage
current
frequency
soc
chargingState
gridPower
pvPower
batteryPower
temperature
operatingState
```

Nicht jedes EEBUS-Gerät stellt alle Werte bereit. Entscheidend sind die vom Gerät gemeldeten Use Cases, Features und Funktionen.

## 7. Schreibbefehle testen

Schreibbare Test-Datenpunkte liegen unter:

```text
eebus.0.devices.<deviceId>.control.*
eebus.0.devices.<deviceId>.limits.*
```

Beispiele:

```text
control.enableCharging
control.maxChargingPower
control.maxChargingCurrent
control.targetTemperature
control.hvacMode
limits.activePowerLimit
limits.consumptionLimit
limits.productionLimit
limits.gridImportLimit
limits.gridExportLimit
limits.heatPumpPowerLimit
```

### Sichere Reihenfolge

1. Pairing muss erfolgreich sein.
2. `pairing.trusted` muss `true` sein.
3. Zunächst `commandDryRun = true` lassen.
4. Einen Sollwert schreiben und `raw.lastCommand` prüfen.
5. Prüfen, ob der erzeugte SPINE-Befehl zum gemeldeten Use Case und zur Feature-Adresse des Geräts passt.
6. Erst im kontrollierten Test `commandDryRun = false` setzen.
7. Nur einen einzelnen Befehl mit ungefährlichem Wert testen.
8. Geräteantwort, Istwert und Adapterlog prüfen.
9. Bei Fehlern `commandDryRun` sofort wieder einschalten.

> Die vorhandenen Schreib-Mappings sind noch Feldtest-Mappings. Hersteller- oder gerätespezifische Feature-Adressen, Selector-Werte, Limit-IDs und Bindings können nach dem ersten echten NodeManagement-Datensatz angepasst werden müssen.

## 8. Diagnose bei Problemen

### Gerät findet NexoWatt EOS nicht

Prüfen:

```text
identity.announcementActive = true
Adapterlog enthält die Ankündigung von "NexoWatt EOS"
avahi-browse zeigt NexoWatt EOS._ship._tcp.local
UDP 5353 ist nicht blockiert
TCP 4712 ist erreichbar
```

### Gerät wird gefunden, Pairing schlägt aber fehl

Sichern:

```text
pairing.lastPairingRequest
devices.<id>.pairing.*
devices.<id>.connection.*
devices.<id>.raw.lastShipFrame
devices.<id>.raw.lastError
ioBroker-Log mit Zeitstempel
Meldung oder Foto vom Gerät
```

### Pairing erfolgreich, aber keine Messwerte

Sichern:

```text
devices.<id>.raw.lastSpineFrame
devices.<id>.useCases.*
devices.<id>.raw.lastDataPayload
devices.<id>.info.deviceClass
```

### Schreibbefehl ohne Wirkung

Sichern:

```text
devices.<id>.raw.lastCommand
devices.<id>.raw.lastSpineFrame
devices.<id>.raw.lastError
gewählter Datenpunkt und Sollwert
Gerätehersteller, Modell und Firmware
```

## 9. Aktueller Reifegrad

Implementiert:

- lokale EOS-SHIP-Identität,
- mDNS/DNS-SD-Ankündigung als `NexoWatt EOS`,
- Discovery anderer SHIP-Geräte,
- TLS/WebSocket-SHIP-Grundlage,
- Pairing-/Trust-Datenpunkte,
- SPINE-NodeManagement-Anfrage,
- Use-Case-/Feature-Diagnose,
- vorbereitete Lese- und Schreibdatenpunkte.

Noch mit realen Geräten zu validieren:

- vollständige SHIP-Interoperabilität je Hersteller,
- alle SPINE-Datentypen und Subscription-Abläufe,
- konkrete Messwertzuordnung,
- konkrete Limit-/Setpoint-Adressierung,
- CLS-/Steuerbox-Prozess einschließlich Nachweisführung,
- produktiver Betrieb und EEBUS-Zertifizierung.
