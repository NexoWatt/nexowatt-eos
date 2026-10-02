# RC58 – NexoWatt OCPP 0.4: kompakter Datenpunktvertrag

**Version:** NexoWatt UI 0.8.182 RC58  
**Stand:** 12.08.2026

## Ziel

RC58 bindet den kompakten Datenpunktbaum des NexoWatt-OCPP-Adapters 0.4 nativ in das Lademanagement ein. Bereits gespeicherte Zuordnungen aus dem älteren 0.3-Datenpunktbaum werden stationsgebunden auf die neuen Pfade umgesetzt. Fremde oder manuell angelegte MQTT-, Modbus-, HTTP- und Geräteadapter-Zuordnungen bleiben unverändert.

## Bevorzugter Vertrag

Für die automatische Zuordnung verwendet das EOS zuerst den stabilen öffentlichen Aliasvertrag:

```text
alias.0.nexowatt.ocpp.<Instanz>.<Station>
```

Falls dieser noch nicht verfügbar ist, wird der kompakte native Baum verwendet:

```text
ocpp21.<Instanz>.<Station>
```

Der optionale technische Alias unter `alias.0.ocpp21...` und der bisherige Adapter unter `ocpp...` bleiben kompatible Rückfälle.

## Automatisch zugeordnete Datenpunkte

| EOS-Funktion | Öffentlicher Alias | Nativer OCPP-0.4-Pfad |
|---|---|---|
| Istleistung | `powerW` | `measurements.powerW` |
| Gesamtenergie | `energyKWh` | `measurements.energyKWh` |
| Gesamtenergie-Fallback | `energyWh` | `measurements.energyWh` |
| Stationsstatus | `status` | `info.status` |
| Transaktion aktiv | `txActive` | `transactions.transactionActive` |
| Physisch verbunden | `socketConnected` | `info.socketConnected` |
| Leistungsdaten aktuell | `dataFresh` | `health.dataFresh` |
| Letzte Aktivität | nativer Pfad | `health.lastSeenMs` |
| Fahrzeug-SoC | `soc` | `measurements.socPercent` |
| RFID | `rfid` | `info.rfid` |
| Leistungsvorgabe | `chargeLimit` | `control.chargeLimit` |
| Stationsfreigabe | `availability` | `control.availability` |

Die Leistungsvorgabe erfolgt in Watt. Der OCPP-Adapter setzt sie über den vorhandenen Smart-Charging-Vertrag um; das NexoWatt-Lademanagement bleibt der einzige fachliche Sollwertgeber.

## Sichere Migration älterer Zuordnungen

Folgende bekannte OCPP-0.3-Pfade werden nur innerhalb derselben eindeutig erkannten Station auf den kompakten Vertrag umgesetzt:

```text
meterValues.Power_Active_Import
meterValues.Current_Import
meterValues.Energy_Active_Import_Register
meterValues.Energy_Active_Import_Register_kWh
meterValues.SoC
evse.<EVSE>.connector.<Connector>.status
connector1Status
info.connection
health.online
```

Beispiel:

```text
ocpp21.0.CP_01.meterValues.Power_Active_Import
→ ocpp21.0.CP_01.measurements.powerW
```

Eine Zuordnung wie `mqtt.0.wallbox.power` wird niemals automatisch verändert. Auch ein Pfad einer anderen OCPP-Station wird nicht umgeschrieben.

## Automatische Erkennung im AppCenter

Die Funktionen **OCPP automatisch erkennen** und **Datenpunkte zuordnen** bevorzugen den öffentlichen Aliasvertrag und übernehmen zusätzlich:

- Fahrzeug-SoC,
- RFID,
- `dataFresh`,
- WebSocket-Verbindung,
- Transaktionsstatus,
- Leistungsvorgabe,
- optionale Stationsfreigabe.

Beim Zuordnen vorhandener Ladepunkte werden leere Felder gefüllt. Zusätzlich dürfen ausschließlich bekannte veraltete OCPP-0.3-Pfade derselben Station ersetzt werden. Andere bestehende Zuordnungen bleiben erhalten.

## Diagnose

Unter `chargingManagement.wallboxes.<Ladepunkt>` stehen zusätzlich zur Verfügung:

```text
ocppDatapointContract
ocppDatapointMappingMigrated
ocppDatapointMappingMigrations
```

Bei einer Laufzeitmigration erscheint in `mappingIssues`:

```text
ocpp_0_4_compact_mapping_migrated
```

`ocppDatapointMappingMigrations` zeigt für Diagnosezwecke die betroffenen Bedeutungen sowie alten und neuen Pfad.

## Zuständigkeiten und Sicherheit

RC58 führt keinen zweiten Geräte-Writer ein:

```text
Betriebsart / Betriebsstrategie
        ↓
NexoWatt Lademanagement
        ↓
Netz-, Stations-, §14a- und Safety-Grenzen
        ↓
vorhandener EVCS-Writer
        ↓
OCPP chargeLimit / availability
```

`socketConnected` bleibt die physische Online-Wahrheit. `dataFresh` bestimmt ausschließlich, ob die Istleistung für die geschlossene Regelung aktuell genug ist. Ein langsamer Heartbeat oder unveränderte Meterwerte dürfen die Station nicht fälschlich offline schalten.

## Hinweis zum Null-Sollwert des OCPP-Adapters

Der OCPP-Adapter 0.4 besitzt eine eigene Einstellung **Null-Sollwert-Verhalten**. Deren Wahl bestimmt, wie `chargeLimit = 0` auf die Ladestation übertragen wird. Für einen Feldtest von PV-Überschuss und Min+PV muss diese Einstellung zum Verhalten der eingesetzten Ladestation passen. Die EOS-Zuordnung ändert die Adaptereinstellung nicht automatisch.

## Feldtest

1. NexoWatt OCPP 0.4 und NexoWatt UI 0.8.182 installieren und beide Instanzen neu starten.
2. Im AppCenter unter Lademanagement die OCPP-Erkennung ausführen.
3. Prüfen, dass bevorzugt `alias.0.nexowatt.ocpp...` eingetragen wurde.
4. `powerId`, `statusId`, `onlineId`, `dataFreshId`, `setPowerWId`, Fahrzeug-SoC und RFID kontrollieren.
5. Speichern und EOS neu starten.
6. Im Diagnosebereich kontrollieren:
   - `ocppDatapointContract = nexowatt-ocpp-0.4-compact`
   - `onlineSourceId` endet auf `socketConnected`
   - `dataFreshSourceId` endet auf `dataFresh`
7. Boost mindestens zehn Minuten testen.
8. Min+PV und PV-Überschuss einschließlich Start, Leistungsänderung und kontrolliertem Pausieren testen.
9. Einen echten WebSocket-Abbruch prüfen; die Station muss sicher offline erkannt werden.
10. §14a-, Stations- und Netzgrenzen erneut prüfen.

## Kompatibilität

Unverändert bleiben:

- Ladepunkte über `nexowatt-devices`,
- ältere `ocpp.<Instanz>...`-Zuordnungen,
- Boost, Auto, Min+PV, PV-Überschuss, Manuell und Zeit-Ziel,
- Stationsverteilung und Multi-Lademanagement,
- §14a, Parkregler, Netz- und Phasengrenzen,
- der bestehende Single-Writer- und Safety-Pfad.
