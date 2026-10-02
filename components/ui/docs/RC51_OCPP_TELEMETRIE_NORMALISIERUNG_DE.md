# RC51 – OCPP-Telemetrie-Normalisierung

## Ziel

NexoWatt EOS muss EV-Ladepunkte unabhängig davon korrekt bilanzieren, ob ihre
Messwerte zyklisch abgefragt oder ereignisbasiert übertragen werden. Der
verwendete OCPP-Adapter schreibt `MeterValues` nur dann in Datenpunkte, wenn die
Ladestation eine OCPP-Nachricht sendet. Bei einem Transaktionsende setzt er den
Connector-State `transactionActive` auf `false`, schreibt einen zuvor empfangenen
Leistungswert jedoch nicht automatisch auf 0 W zurück.

RC51 erkennt den OCPP-Datenweg automatisch anhand des Objektpfads

```text
ocpp.<Instanz>.<ChargePoint>.<Connector>.<Datenpunkt>
```

und verwendet dafür einen ereignisbasierten Telemetrievertrag. Andere
Modbus-, HTTP-, MQTT-, UDP- und generische Datenpunkte behalten ihren bisherigen
Vertrag.

## Automatisch abgeleitete Connector-Datenpunkte

Aus einem zugeordneten Connector-Datenpunkt wie

```text
ocpp.0.DC_CHARGER_01.1.meterValues.Power_Active_Import
```

leitet EOS automatisch ab:

```text
ocpp.0.DC_CHARGER_01.1.status
ocpp.0.DC_CHARGER_01.1.transactionActive
ocpp.0.DC_CHARGER_01.connected
system.adapter.ocpp.0.alive
```

Eine zusätzliche Auswahl dieser vier Datenpunkte ist im Regelfall nicht nötig.
Explizit konfigurierte Datenpunkte haben weiterhin Vorrang.

## Rohwert und effektive Istleistung

EOS verändert den Rohdatenpunkt des OCPP-Adapters nicht. Intern werden getrennt:

```text
powerRawW       zuletzt empfangener OCPP-MeterValue
powerEffectiveW für Bilanzierung, Ladeerkennung und Leistungsbudgets
requestedPowerW von EOS angeforderter Sollwert
reservedPowerW  für den Ladepunkt reserviertes Budget
```

Der letzte EOS-Sollwert wird im OCPP-Profil niemals als gemessene Istleistung
verwendet.

## Statusvertrag

| Connectorstatus / Transaktion | Effektive Leistung |
|---|---:|
| `Charging`, Transaktion aktiv | letzter gültiger OCPP-Leistungswert |
| unveränderter Leistungswert, Station verbunden | Wert bleibt ereignisbasiert gültig |
| `Preparing` | 0 W, Ladebedarf kann vorhanden sein |
| `SuspendedEVSE` | 0 W, Ladebedarf kann weiterhin vorhanden sein |
| `SuspendedEV` | 0 W, aktuell kein Fahrzeugladebedarf |
| `Finishing` | sofort 0 W |
| `Available` | sofort 0 W |
| `Faulted` / `Unavailable` | sofort 0 W und Betrieb blockiert |
| `transactionActive=false` | sofort 0 W und Sitzung beendet |
| OCPP-Adapter oder Ladestation offline | 0 W und keine positive Istlast |

Bei einem bestätigten Ladeende werden außerdem die Ladeerkennung, PV-Reservierung,
Stationsreserve und Speicher-Schutzlast im nächsten EMS-Zyklus freigegeben.

## Datenqualität

Die OCPP-Connector-Stati sind ereignisbasiert. Solange OCPP-Adapter und
Ladestation verbunden sind, bleibt ein unveränderter Status gültig. Ein
Adapterausfall wird zusätzlich über `system.adapter.ocpp.<Instanz>.alive`
erkannt. Fehlende oder leere Werte werden niemals als reale Messung 0 behandelt;
ein autoritativer OCPP-Endstatus darf dagegen ausdrücklich eine effektive
Leistung von 0 W herstellen.

## Diagnosedatenpunkte

Unter `chargingManagement.wallboxes.<Ladepunkt>` stehen zusätzlich zur Verfügung:

```text
telemetryProfile
telemetryAutoDetected
ocppConnectorRoot
powerRawW
powerEffectiveW
powerSource
powerAuthoritativeZero
meterRawStale
meterStale
transactionActive
transactionActiveKnown
transactionActiveAgeMs
transactionActiveSourceId
ocppAdapterAlive
ocppAdapterAliveKnown
ocppAdapterAliveSourceId
actualPowerRawW
actualPowerW
```

`actualPowerW` ist ab RC51 die für das EMS wirksame Istleistung.
`actualPowerRawW` bleibt der unveränderte zuletzt empfangene Quellwert.

## Abgrenzung

RC51 ändert weder die OCPP-Ladestation noch den OCPP-Adapter. Die Anpassung liegt
im NexoWatt-EOS-Lademanagement und normalisiert die bereits vorhandenen
Datenpunkte. §14a, Netzanschlussgrenzen, FENECON, Speicher, SmartHome, NexoLogic
und die Netzbetreiber-Schnittstelle bleiben fachlich unverändert.
