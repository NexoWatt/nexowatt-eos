# NexoWatt OCPP

**NexoWatt OCPP** ist der lokale OCPP-CSMS-Adapter für das **NexoWatt Energy Operation System (EOS)**. Das EOS basiert auf ioBroker; deshalb bleiben der technische Adaptername `ocpp21`, der Paketname `iobroker.ocpp21` und vorhandene Instanzpfade kompatibel.

Unterstützt werden OCPP **1.6J**, **2.0.1** und **2.1** über denselben Server-Port.

## Kompakte Datenpunktstruktur

Die Station erhält nur noch wenige fachliche Hauptordner:

```text
<Station>.info
<Station>.health
<Station>.measurements
<Station>.vehicle
<Station>.transactions
<Station>.control
```

Optional und standardmäßig deaktiviert:

```text
<Station>.connectors   # getrennte Diagnose je Anschluss
<Station>.advanced     # rohe OCPP-Nachrichten / Device-Model-Bericht
```

Frühere tiefe Zweige wie `main`, `meterValues`, `evse`, `evChargingNeeds`, `ocpp` und `dm` werden bei aktivierter Bereinigung entfernt. Damit bleiben die für das EOS relevanten Mess- und Steuerwerte schnell auffindbar und die Objekt- sowie Schreiblast sinkt deutlich.

## Für das EOS-Lademanagement wichtige Datenpunkte

| Datenpunkt | Bedeutung |
|---|---|
| `<Station>.measurements.powerW` | Aktuelle Ladeleistung in W |
| `<Station>.measurements.powerExportW` | Aktuelle Rückspeiseleistung/V2G-Leistung in W |
| `<Station>.measurements.currentA` | Höchster aktiver Phasenstrom in A |
| `<Station>.measurements.energyWh` | Geladene Energie gesamt in Wh |
| `<Station>.measurements.energyKWh` | Geladene Energie gesamt in kWh |
| `<Station>.measurements.socPercent` | Fahrzeug-SoC, sofern von Fahrzeug oder Station geliefert |
| `<Station>.info.status` | Stations-/Anschlussstatus |
| `<Station>.info.socketConnected` | Physische OCPP-WebSocket-Verbindung besteht |
| `<Station>.health.activityFresh` | Innerhalb des Aktivitätsfensters kam irgendeine OCPP-Anfrage oder -Antwort |
| `<Station>.health.online` | WebSocket besteht und OCPP-Aktivität ist aktuell |
| `<Station>.health.heartbeatAlive` | Heartbeat innerhalb seines erwarteten Zeitfensters empfangen |
| `<Station>.health.dataFresh` | Ladeleistung aktuell oder ein sicher bestätigter Nullzustand aktiv |
| `<Station>.health.powerFresh` | Reale Bezugsleistung innerhalb des Aktualitätsfensters empfangen |
| `<Station>.health.socFresh` | SoC innerhalb des SoC-Aktualitätsfensters empfangen |

Für eine normale EOS-Regelung gilt:

```text
health.online && health.dataFresh
```

Für SoC-abhängige Entscheidungen zusätzlich:

```text
health.socFresh
```

Die drei Verbindungszustände sind bewusst getrennt:

```text
info.socketConnected  = physischer WebSocket besteht
health.activityFresh  = irgendeine OCPP-Aktivität ist aktuell
health.heartbeatAlive = Heartbeat-Diagnose ist aktuell
```

`info.connection` folgt aus Kompatibilitätsgründen ebenfalls der realen WebSocket-Verbindung. Ein verspäteter Heartbeat setzt daher nur `health.heartbeatAlive` auf `false`. Solange der Socket besteht und beispielsweise `MeterValues`, `StatusNotification`, `TransactionEvent` oder eine OCPP-Antwort eingeht, bleibt `health.activityFresh` beziehungsweise `health.online` wahr.

Das Aktivitätsfenster beträgt mindestens 90 Sekunden und ist niemals kürzer als die konfigurierte Heartbeat-Toleranz. Ein aktueller Heartbeat macht einen alten Leistungswert **nicht** künstlich zu einem neuen Messwert.

## Korrekte OCPP-Zuordnung

OCPP bezeichnet Energiefluss zum Fahrzeug als **Import**. Im EOS wird daraus die verständliche Ladeleistung:

| Gelieferter Measurand / Herstellername | EOS-Datenpunkt |
|---|---|
| `Power.Active.Import` | `measurements.powerW` |
| `ActivePowerImport` | `measurements.powerW` |
| `ActivePowerInport` | `measurements.powerW` |
| `ImportActivePower` | `measurements.powerW` |
| `Power.Active.Export` | `measurements.powerExportW` |
| `Current.Import` | `measurements.currentA` |
| `Energy.Active.Import.Register` | `measurements.energyWh` und `measurements.energyKWh` |
| `SoC`, `StateOfCharge`, `BatterySoC` | `measurements.socPercent` |

Bei ausdrücklich angegebenem Power-/Current-Measurand wird auch ohne Einheit die fachlich richtige Einheit angenommen. Nur ein vollständig leerer OCPP-SampledValue verwendet den OCPP-Standardwert `Energy.Active.Import.Register` in Wh.
Bereits vorhandene bekannte `ActivePowerInport`-Duplikate werden bei aktivierter Legacy-Bereinigung entfernt.

### Phasenwerte

- Wirkleistungen der Phasen werden zur Gesamtleistung **addiert**.
- Der Gesamtstrom ist der **höchste Phasenstrom**, nicht die Summe der Phasen. Drei Phasen mit jeweils 16 A ergeben deshalb `currentA = 16 A` und nicht 48 A.
- `L1-N`, `L2-N` und `L3-N` werden kompakt als `L1`, `L2` und `L3` abgelegt.

## Schutz vor Ladeabbrüchen

Der Adapter vermeidet mehrere Situationen, die bei empfindlicher Stations-Firmware zu Ladeunterbrechungen beitragen können:

1. OCPP-CALLRESULT wird sofort zurückgegeben; Datenpunkt- und Diagnosearbeiten laufen danach geordnet in einer Stationswarteschlange.
2. `StatusNotification` wird standardmäßig nicht mehr regelmäßig per `TriggerMessage` angefordert.
3. `MeterValues` werden nur angefordert, wenn die Ladeleistung tatsächlich veraltet ist, nicht bei jedem Zyklus.
4. Trennt sich die Station innerhalb von 30 Sekunden nach `TriggerMessage`, wird die aktive Aktualisierung für sechs Stunden automatisch gesperrt. Passive Meldungen der Station bleiben aktiv.
5. Smart-Charging-Profile und Schedules besitzen je Station, Steuerfunktion und Zielanschluss feste IDs, damit bei wiederholten Sollwerten keine immer neuen Profile entstehen.
6. Ein Sollwert von `0` hält standardmäßig das letzte sichere Profil, statt unbeabsichtigt ein Nullprofil zu senden und die Ladung zu suspendieren.
7. Werte unterhalb des konfigurierten Mindestladestroms werden auf mindestens 6 A angehoben.
8. Veraltete, bereits überholte EOS-Sollwerte werden nicht später aus einer Warteschlange an die Station gesendet.
9. Zwischen zwei Ladeprofiländerungen liegen standardmäßig mindestens fünf Sekunden; Kleinständerungen innerhalb des Totbands werden nicht gesendet.
10. Während ein Smart-Charging-Befehl läuft, startet keine aktive Telemetrieanforderung parallel.

Die zeitliche Korrelation mit `TriggerMessage` ist ein Diagnosehinweis, kein Beweis für einen Firmwarefehler. Ohne OCPP- und Stationslog kann nicht sicher festgestellt werden, ob ein konkreter Abbruch vom Adapter, vom Fahrzeug, von der Ladestation, vom Netzschutz oder von einer externen Regelung ausgelöst wurde.

## Diagnose bei einem Abbruch

Besonders relevant sind:

```text
<Station>.health.lastDisconnectAt
<Station>.health.lastDisconnectCode
<Station>.health.lastDisconnectReason
<Station>.health.disconnectCount
<Station>.health.refreshRelatedDisconnects
<Station>.health.refreshSuppressedUntil
<Station>.health.refreshSuppressedReason
<Station>.health.lastOutboundMethod
<Station>.health.lastOutboundAt
<Station>.health.outboundErrorCount
<Station>.health.queueDepth
<Station>.health.queueErrors
<Station>.health.lastTransactionStopReason
<Station>.info.socketConnected
<Station>.health.activityFresh
<Station>.health.heartbeatAlive
<Station>.health.activityAgeSec
<Station>.health.activityTimeoutSec
<Station>.control.lastCommand
<Station>.control.lastCommandAt
<Station>.control.lastResponse
<Station>.control.lastError
<Station>.transactions.lastReason
<Station>.transactions.triggerReason
```

Interpretation:

- `refreshSuppressedReason = disconnect-after-MeterValues` spricht für einen zeitlichen Zusammenhang mit der aktiven Abfrage.
- `lastTransactionStopReason` oder `transactions.lastReason` zeigt einen von der Station gemeldeten Transaktionsgrund.
- `lastCommand = SetChargingProfile` direkt vor dem Abbruch deutet auf einen möglichen Zusammenhang mit einer Leistungsänderung hin.
- Ein WebSocket-Abbruch ohne StopTransaction weist eher auf Verbindung, Firmware oder Neustart der Station hin.

## Verbindung der Ladestation

Server-Port standardmäßig:

```text
9220
```

Beispiel-URL:

```text
ws://<EOS-IP>:9220/<Stations-ID>
```

Die Station muss eines der WebSocket-Subprotokolle anbieten:

```text
ocpp1.6
ocpp2.0.1
ocpp2.1
```

## Wichtige Einstellungen

| Einstellung | Standard | Zweck |
|---|---:|---|
| Heartbeat-Intervall | 300 s | Von BootNotification zurückgegebenes Intervall |
| Health-Prüfung | 5 s | Berechnung von Online- und Aktualitätszuständen |
| Mindest-Aktivitätsfenster | 90 s | Untergrenze für `activityFresh`; wirksam niemals kürzer als die Heartbeat-Toleranz |
| Unveränderte Werte neu veröffentlichen | 10 s | Aktualisiert noch gültige Status-/Zählerwerte |
| Aktive Aktualisierung | an | Fordert nur bei veralteter Leistung neue MeterValues an |
| Aktives Aktualisierungsintervall | 60 s | Schonender Mindestabstand für TriggerMessage |
| StatusNotification aktiv anfordern | aus | Vermeidet Probleme bei empfindlicher Firmware |
| Leistungs-Maximalalter | 90 s | Grenze für `powerFresh` |
| SoC-Maximalalter | 300 s | Grenze für `socFresh` |
| Anschlussdetails | aus | Nur für echte Mehrfach-Ladestationen aktivieren |
| Rohe OCPP-Nachrichten | aus | Nur zur zeitlich begrenzten Diagnose aktivieren |
| Null-Sollwert-Verhalten | letztes Profil halten | Verhindert unbeabsichtigte Ladeunterbrechung |
| Mindestladestrom | 6 A | Untergrenze für Smart Charging |
| Mindestabstand Ladeprofile | 5 s | Verhindert unnötige schnelle Profil-Neubewertungen |

## Steuerung

Wichtige schreibbare Datenpunkte:

```text
<Station>.control.availability
<Station>.control.chargeLimit
<Station>.control.chargeLimitType
<Station>.control.numberOfPhases
<Station>.control.startTrigger
<Station>.control.stopTrigger
<Station>.control.hardReset
<Station>.control.softReset
```

`control.numberOfPhases` ist ausdrücklich beschreibbar. `chargeLimitType` kann `W` oder `A` sein. Die angewendete Entscheidung wird transparent abgelegt:

```text
control.requestedChargeLimit
control.appliedChargeLimit
control.chargeLimitReason
control.chargeLimitClamped
```

## Aliase

Die fachlichen Aliase liegen unter:

```text
alias.0.nexowatt.ocpp.<Instanz>.<Station>
```

Technische Kompatibilitätsaliase unter `alias.0.ocpp21...` sind optional. Bestehende NexoWatt-Aliase werden auf die kompakte Struktur aktualisiert.

## Entwicklung und Prüfung

Dependency-freie Kernprüfung:

```bash
npm run test:core
```

Vollständige Prüfung nach Installation der Entwicklungsabhängigkeiten:

```bash
npm test
```

Vor einem Produktivbetrieb bleibt ein Feldtest mit der konkreten Stations-Firmware erforderlich. Dabei sollten konstante Last, Sollwertänderungen, Ladeschluss, OCPP-Neuverbindung und ein mindestens mehrstündiger Dauerlauf geprüft werden.
