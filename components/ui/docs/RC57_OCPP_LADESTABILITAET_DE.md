# RC57 – OCPP-Ladestabilität

**Version:** NexoWatt UI 0.8.181 RC57  
**Stand:** 12.08.2026

## Ziel

RC57 stabilisiert Ladepunkte, die über den NexoWatt-OCPP-Adapter oder eine kompatible OCPP-Struktur angebunden sind. Die Änderung behebt insbesondere periodische Fehlbewertungen als „offline“, obwohl die OCPP-WebSocket-Verbindung weiterhin besteht, sowie zu kurze Reaktionsfenster beim Start in PV-Überschuss und Min+PV.

## Fehlerbild vor RC57

Typischer Ablauf im Ereignislog:

```text
Laden aktiv / Istleistung vorhanden
ca. 25 Sekunden später: Ladepunkt offline / Sollwert 0 W
wenige Sekunden später: Ladepunkt wieder online / Laden startet erneut
```

Dieses Verhalten konnte Boost, Min+PV und PV-Überschuss unterbrechen. Ursache war die Vermischung von physischer OCPP-Verbindung und ereignisbasierter Datenaktualität.

## Neue OCPP-Wahrheiten

RC57 behandelt die Signale getrennt:

| Signal | Bedeutung | Wirkung |
|---|---|---|
| `socketConnected` | Physische WebSocket-Verbindung zur Ladestation | Maßgeblich für Online/Offline |
| `dataFresh` | Aktuelle, für die Regelung verwendbare Leistungsdaten | Beeinflusst Messwertqualität, nicht Online |
| Heartbeat/LastSeen | OCPP-Aktivität und Diagnose | Ergänzende Diagnose |
| Status | Connectorzustand | Ladebedarf und sichere Zustände |
| `transactionActive` | OCPP-Transaktionszustand | Session-Wahrheit mit Ereignisreihenfolge-Schutz |

## Automatische OCPP-Erkennung

Unterstützt werden:

```text
ocpp21.<Instanz>.<Station>...
alias.0.nexowatt.ocpp.<Instanz>.<Station>...
alias.0.ocpp21.<Instanz>.<Station>...
legacy: ocpp.<Instanz>.<Station>.<Connector>...
```

Aus einem eindeutig erkannten Stationspfad kann das EOS fehlende Begleitzuordnungen für Leistung, Strom, Status, Transaktion, Verbindung, Datenaktualität, Heartbeat und Leistungsvorgabe ergänzen.

Eine manuell zugeordnete OCPP-Aktivitäts- oder Freshness-Quelle wird nur dann auf `socketConnected` migriert, wenn sie nachweislich zur gleichen Ladestation gehört. Fremde Datenpunkte werden niemals automatisch umgeschrieben.

## OCPP-spezifische Reaktionszeiten

| Funktion | Generische Geräte | OCPP |
|---|---:|---:|
| Startantwortzeit | bestehende Einstellung, standardmäßig 15 s | mindestens 75 s |
| Start-Einschwingphase | bestehende Einstellung, standardmäßig 20 s | mindestens 60 s |
| Sollwert-Keepalive | 45 s | 45 s |
| globaler EOS-Regelzyklus | 1 s | 1 s |

Nur die OCPP-Startbehandlung wurde verlängert. Netzanschlussschutz, §14a, Parkregler, Sicherungen, Phasen- und Stationsgrenzen reagieren weiterhin im schnellen EOS-Zyklus.

## Ereignisreihenfolge

OCPP-Nachrichten können verzögert oder in unterschiedlicher Reihenfolge eintreffen. RC57 behandelt deshalb:

- `Charging` plus real positive Leistung trotz kurzzeitigem `transactionActive=false` weiterhin als laufende Ladung.
- `Preparing` beziehungsweise `SuspendedEVSE` bei noch nicht aktiver Transaktion als zulässigen, nicht terminalen Startzustand.
- `Finishing`, `Faulted`, `Unavailable`, `Offline` und tatsächliches Transaktionsende weiterhin als autoritative 0-W-Zustände.

Der letzte EOS-Sollwert wird nicht als gemessene Istleistung ausgegeben oder bilanziert.

## Diagnose

Unter `chargingManagement.wallboxes.<Ladepunkt>` stehen zusätzlich zur Verfügung:

- `ocppAdapterKind`
- `onlineSourceId`
- `onlineIdWasDataFresh`
- `onlineSourceMigrated`
- `dataFreshSourceId`
- `dataFresh`
- `dataFreshKnown`
- `dataFreshAgeMs`
- `telemetryProfile`
- `powerRawW` / `powerEffectiveW` / `powerSource`

Bei einer automatischen Korrektur erscheint in `mappingIssues` einer der Hinweise:

```text
ocpp_online_datafresh_migrated
ocpp_online_source_migrated
```

## Feldtest

1. NexoWatt UI 0.8.181 installieren und Adapter neu starten.
2. Im Lademanagement prüfen, dass der Ladepunkt als OCPP erkannt wird.
3. `onlineSourceId` kontrollieren; bei NexoWatt OCPP muss dort `socketConnected` stehen.
4. Boost für mindestens 5 bis 10 Minuten testen. Es darf kein periodischer „Ladepunkt offline“-Eintrag mehr auftreten.
5. Min+PV testen und den verzögerten Leistungsanstieg beobachten.
6. PV-Überschuss testen; die Startprüfung darf bei langsamer OCPP-Telemetrie nicht nach 15 Sekunden abbrechen.
7. Einen echten OCPP-Verbindungsabbruch prüfen. Ein geschlossenes WebSocket beziehungsweise ein gestoppter OCPP-Adapter muss weiterhin sicher offline führen.
8. §14a-, Netzanschluss-, Stations- und Sicherungsbegrenzung separat prüfen; sie müssen weiterhin sofort wirksam bleiben.

## Sicherheitsgrenzen

- Kein zweiter Geräte-Writer wurde ergänzt.
- Die Betriebsarten und das bestehende Lademanagement bleiben die einzige fachliche Sollwertquelle.
- Es gibt keine künstliche Istleistung und keine Sollwert-zu-Istwert-Brücke.
- Freshness kann die Leistung als unsicher markieren, aber keine bestehende WebSocket-Verbindung fälschlich trennen.
- Ein echter Offline-, Faulted-, Unavailable-, §14a-, Parkregler-, Netz- oder Safety-Grund bleibt autoritativ.

## Hinweis zur nächsten OCPP-Adapterversion

Wenn sich die Ordnerstruktur des OCPP-Adapters ändert, sollten die kanonischen Verbindungs-, Freshness-, Status-, Transaktions-, Leistungs- und Sollwertpfade beziehungsweise stabile Alias-Verträge erhalten bleiben. Nach Bereitstellung der neuen Adapterversion wird die automatische Zuordnung gegen deren endgültige Datenpunktstruktur erneut geprüft.
