# RC59 – OCPP21-Nativzuordnung und Wiederherstellung der Speicherfarm

**Version:** NexoWatt UI 0.8.183 RC59  
**Stand:** 13.08.2026

## Anlass

RC58 enthielt im Diagnoseobjekt des Lademanagements einen JavaScript-Referenzfehler:

```text
ocppDatapointMappingMigrations is not defined
```

Dadurch brach der sicherheitskritische `chargingManagement`-Tick ab. Das gemeinsame Safety-Envelope sperrte anschließend korrekterweise positive Speicherbefehle. Die Speicherfarm erhielt deshalb nur noch einen sicheren `farm-stop` mit 0 W, obwohl die Speicherlogik selbst eine Be- oder Entladung berechnet hatte.

## Korrektur des Tickfehlers

Das Diagnosefeld wird nun ausschließlich aus dem tatsächlich vorhandenen Array erzeugt:

```js
ocppDatapointMappingMigrations:
  Array.isArray(ocppDatapointMigrations)
    ? ocppDatapointMigrations
    : []
```

Ein leerer Migrationssatz wird als `[]` ausgegeben. Die Diagnose kann damit keinen Regel-Tick mehr durch eine nicht definierte Variable abbrechen.

## Verhalten der Speicherfarm nach der Korrektur

Das Sicherheitsprinzip bleibt unverändert:

```text
Lademanagement fehlerhaft
→ Safety-Envelope ungültig
→ positive Speicherbefehle werden auf 0 W geklemmt
```

Nach einem erfolgreichen Lademanagement-Tick wird der verriegelte Modulfehler durch den Modulmanager gelöscht. Im unmittelbar folgenden vollständigen EMS-Zyklus wird das Safety-Envelope neu aufgebaut und die Speicherfarm kann wieder ihre berechneten Sollwerte schreiben.

Die Schutzkopplung wurde bewusst nicht umgangen oder abgeschwächt.

## Direkter Datenpunktvertrag des NexoWatt-OCPP21-Adapters

Die automatische Erkennung und produktive Regelung verwenden nur noch den nativen Objektbaum:

```text
ocpp21.<Instanz>.<Station>...
```

Verwendete Datenpunkte:

| EOS-Funktion | Nativer OCPP21-Datenpunkt |
|---|---|
| Ladeleistung | `measurements.powerW` |
| Gesamtstrom | `measurements.currentA` |
| Energie | `measurements.energyKWh` |
| Energie-Fallback | `measurements.energyWh` |
| Fahrzeug-SoC | `measurements.socPercent` |
| SoC-Fallback | `vehicle.socPercent` |
| Status | `info.status` |
| WebSocket-Verbindung | `info.socketConnected` |
| Transaktion aktiv | `transactions.transactionActive` |
| Ladezustand | `transactions.chargingState` |
| Messwerte aktuell | `health.dataFresh` |
| Letzte Aktivität | `health.lastSeenMs` |
| RFID | `info.rfid` |
| Leistungsvorgabe | `control.chargeLimit` |
| Stationsfreigabe | `control.availability` |
| Phasenanzahl | `control.numberOfPhases` |

Produktive Lese- und Schreibpfade laufen nicht mehr über `alias.0.nexowatt.ocpp.*` oder `alias.0.ocpp21.*`.

## Migration bestehender OCPP-Zuordnungen

Bekannte Alias- und ältere OCPP-Pfade werden nur noch als Migrationsquelle erkannt. Sie werden stationsgebunden auf den nativen `ocpp21.*`-Pfad umgesetzt.

Beispiel:

```text
alias.0.nexowatt.ocpp.0.CP_01.powerW
→ ocpp21.0.CP_01.measurements.powerW
```

Eine Migration erfolgt nur, wenn Quelle und Ziel eindeutig zur gleichen OCPP-Station gehören. MQTT-, Modbus- und `nexowatt-devices`-Zuordnungen werden nicht verändert.

## Sichere Zuordnung bei mehreren Ladepunkten

Die Funktion **„Suche Datenpunkte (OCPP21)“** ordnet nicht mehr anhand der Listenposition zu. Die Reihenfolge verschiedener Adapter darf daher nicht dazu führen, dass ein vorhandener Modbus- oder `nexowatt-devices`-Ladepunkt mit OCPP-Datenpunkten überschrieben wird.

Zuordnungsreihenfolge:

1. bereits konfigurierte OCPP-Station mit derselben Stationsidentität,
2. passender leerer OCPP-Eintrag mit demselben `stationKey`,
3. vollständig leerer Ladepunkt-Eintrag,
4. neuer Ladepunkt-Eintrag, sofern die Maximalzahl noch nicht erreicht ist.

## Inbetriebnahme nach dem Update

1. NexoWatt UI auf 0.8.183 aktualisieren.
2. Adapterinstanz vollständig neu starten.
3. Unter **Status** prüfen, dass `chargingManagement` grün und ohne Tickfehler läuft.
4. Unter **Ladepunkte** die Funktion **„Suche Datenpunkte (OCPP21)“** ausführen.
5. Kontrollieren, dass alle OCPP-Zuordnungen mit `ocpp21.<Instanz>.<Station>` beginnen.
6. Speichern und EOS erneut starten.
7. Speicherfarmdiagnose prüfen: Bei einem realen Speicherbedarf darf der Sollwert nicht mehr wegen eines `chargingManagement`-Tickfehlers auf 0 W geklemmt werden.
8. OCPP zunächst im Boost-Modus, danach in Min+PV und PV-Überschuss testen.
9. Einen echten OCPP-Verbindungsabbruch testen; `info.socketConnected=false` muss weiterhin sicher stoppen.
10. §14a-, Netzanschluss- und Stationsbegrenzung abschließend kontrollieren.

## Sicherheitsgrenzen

- Das Lademanagement bleibt sicherheitskritisch.
- Die Speicherfarm darf keinen ungültigen Safety-Envelope umgehen.
- Die OCPP-Regelung besitzt weiterhin nur einen Writer über das vorhandene Lademanagement.
- Automatische Zuordnung überschreibt keine fremden Ladepunkttechnologien.
- Ein echter WebSocket-Abbruch, Gerätefehler oder eine übergeordnete Netzvorgabe stoppt weiterhin sofort.
