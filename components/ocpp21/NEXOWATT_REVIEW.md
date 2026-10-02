# NexoWatt OCPP 0.4.0 – Zuverlässigkeitsprüfung

Stand: 12.08.2026

## Prüfumfang

Geprüft wurden die Datenpunktstruktur, die Verarbeitung von MeterValues und Statusmeldungen, die Aktualitätslogik für NexoWatt EOS, aktive OCPP-Abfragen, Smart Charging, Transaktionszuordnung, Wiederverbindungen und alle Stellen, an denen der Adapter einen laufenden Ladevorgang mittelbar beeinflussen kann.

## Ergebnis zur Frage nach den Ladeabbrüchen

**Der Adapter konnte plausibel an den beobachteten Unterbrechungen beteiligt sein. Ein konkreter Feldabbruch ist ohne Stations-, OCPP- und EOS-Log jedoch nicht beweisbar.**

Im bisherigen Stand gab es mehrere technische Risikofaktoren:

1. Zustands- und Objektarbeiten konnten vor der OCPP-Antwort ausgeführt werden. Bei langsamer Datenbank oder sehr vielen dynamischen Datenpunkten konnte die Station die Antwort verspätet erhalten.
2. Die aktive Aktualisierung konnte regelmäßig sowohl `MeterValues` als auch `StatusNotification` per `TriggerMessage` anfordern. Einige Stations-Firmwares reagieren auf wiederholte oder parallele Trigger instabil.
3. Smart-Charging-Profile verwendeten wechselnde IDs. Eine Station konnte dadurch mehrere Profile behalten oder unerwartet priorisieren.
4. Ein EOS-Sollwert von `0` konnte als Nullprofil übertragen werden. Je nach Firmware wird das als Suspendierung oder faktischer Ladestopp interpretiert.
5. Mehrere schnelle EOS-Sollwerte konnten nacheinander in einer Warteschlange landen, obwohl ältere Werte bereits überholt waren.
6. Phasenströme wurden addiert. Drei Phasen mit 16 A ergaben dadurch 48 A und konnten das Lademanagement zu einer falschen Bewertung veranlassen.
7. Die tiefe dynamische Ordnerstruktur erhöhte Objektzahl und Schreiblast unnötig.
8. Status-Safe-Zero und nachgelagerte Zustandsarbeiten konnten sich zeitlich überholen.

Diese Punkte sind in 0.4.0 korrigiert oder defensiv abgesichert.

## Kompakte Struktur

Standardstruktur je Station:

```text
<Station>.info
<Station>.health
<Station>.measurements
<Station>.vehicle
<Station>.transactions
<Station>.control
```

Optional:

```text
<Station>.connectors
<Station>.advanced
```

Die optionalen Anschlussdetails sind standardmäßig deaktiviert. Die ehemalige tiefe Struktur wird bei aktivierter Bereinigung entfernt.

## Korrektur von ActivePowerImport

Folgende Schreibweisen werden kanonisch auf OCPP `Power.Active.Import` normalisiert:

```text
Power.Active.Import
ActivePowerImport
ActivePowerInport
ImportActivePower
PowerImportActive
```

Ausgabe:

```text
<Station>.measurements.powerW
```

Damit wird kein unverständlicher oder falsch geschriebener Datenpunkt `aktivpowerinport` mehr als eigener fachlicher Messwert erzeugt. Bereits vorhandene bekannte `ActivePowerInport`-Duplikate im kompakten Messwertordner werden bei aktivierter Bereinigung entfernt. Unbekannte herstellerspezifische Werte bleiben flach unter `measurements.extra_*`, ohne neue Unterordner zu erzeugen.

## Phasenvertrag

```text
Gesamtleistung = Summe der Phasenleistungen
Gesamtstrom    = höchster Betrag eines Phasenstroms
```

Beispiel:

```text
L1 = 16 A
L2 = 16 A
L3 = 16 A
=> currentA = 16 A
```

Die frühere Summe von 48 A wäre für die Dimensionierung und Regelung falsch.

## Schutzmaßnahmen gegen adapterbedingte Unterbrechungen

### Schnelle OCPP-Antwort

Der Handler liefert den CALLRESULT unmittelbar zurück. Datenpunktarbeiten werden anschließend pro Station geordnet abgearbeitet. Dadurch blockieren große Payloads oder viele ioBroker-Schreibvorgänge nicht die Protokollantwort.

### Schonende aktive Aktualisierung

- `StatusNotification`-Trigger standardmäßig aus.
- `MeterValues` nur bei veralteter aktiver Bezugsleistung.
- Mindestabstand standardmäßig 60 Sekunden.
- Keine aktive Aktualisierung während eines Smart-Charging-Befehls.
- Backoff bei `Rejected`, `NotImplemented`, Fehler oder Timeout.
- Maximal zwei Anschlüsse je Aktualisierungsrunde; Rotation statt dauerhafter Bevorzugung.

### Automatische Schutzsperre

Wenn die WebSocket-Verbindung innerhalb von 30 Sekunden nach einem `TriggerMessage` abbricht, wird die aktive Aktualisierung sechs Stunden lang gesperrt:

```text
health.refreshRelatedDisconnects
health.refreshSuppressedUntil
health.refreshSuppressedReason
```

Die Station darf weiterhin selbst Heartbeat, Status und MeterValues senden. Die Sperre verhindert, dass der Adapter einen möglichen Firmwarefehler immer wieder auslöst.

### Smart Charging

- feste Profil-ID je Station, Steuerfunktion und Zielanschluss,
- feste Schedule-ID je Station, Steuerfunktion und Zielanschluss,
- neuester Sollwert gewinnt,
- alte wartende Sollwerte werden verworfen,
- standardmäßig mindestens fünf Sekunden Abstand zwischen Profiländerungen,
- Deadband gegen unnötige Kleinständerungen,
- 0-W-Sollwert hält standardmäßig das letzte sichere Profil,
- Werte unter 6 A werden auf den Mindeststrom angehoben.

## Aktualitätsmodell für EOS

Die physische Verbindung, allgemeine OCPP-Aktivität und Heartbeat-Diagnose sind getrennt:

```text
info.socketConnected  = physischer WebSocket besteht
info.connection       = kompatibler Spiegel der physischen Verbindung
health.activityFresh  = irgendeine OCPP-Anfrage/-Antwort innerhalb des Aktivitätsfensters
health.online         = socketConnected und activityFresh
health.heartbeatAlive = Heartbeat innerhalb seines eigenen Toleranzfensters
health.dataFresh      = powerFresh oder sicher bestätigter Nullzustand
health.socFresh       = SoC innerhalb des getrennten SoC-Zeitfensters
```

Das Aktivitätsfenster beträgt mindestens 90 Sekunden und ist niemals kürzer als die Heartbeat-Toleranz. Ein verspäteter Heartbeat setzt deshalb ausschließlich `heartbeatAlive` auf `false`. Solange der WebSocket besteht und andere OCPP-Nachrichten oder CALLRESULT-Antworten eingehen, bleibt die Station physisch verbunden und anwendungsseitig aktiv.

Unveränderte echte OCPP-Messwerte werden erneut in ioBroker geschrieben und erhalten einen aktuellen Zeitstempel. Ein alter Leistungswert wird dagegen nicht nur wegen eines neuen Heartbeats künstlich verlängert.

## Diagnosevertrag

Bei einem nächsten Abbruch sollten mindestens folgende Werte mit Zeitstempel gesichert werden:

```text
health.lastDisconnectAt
health.lastDisconnectCode
health.lastDisconnectReason
health.refreshRelatedDisconnects
health.refreshSuppressedReason
health.lastOutboundMethod
health.lastOutboundAt
health.outboundErrorCount
health.lastTransactionStopReason
info.socketConnected
health.activityFresh
health.heartbeatAlive
health.activityAgeSec
health.activityTimeoutSec
control.lastCommand
control.lastCommandAt
control.lastResponse
control.lastError
transactions.lastType
transactions.lastReason
transactions.triggerReason
info.status
info.errorCode
info.vendorErrorCode
```

Zusätzlich für etwa zwei Minuten vor und nach dem Ereignis:

- ioBroker-Log von `ocpp21.0`,
- OCPP-Rohlog der Station oder zeitlich begrenzt `advanced` aktivieren,
- Stations-/Herstellerlog,
- aktueller EOS-Lademanagement-Sollwert,
- Fahrzeugstatus und gegebenenfalls Schutz-/Netzmeldungen.

## Automatische Tests

Die dependency-freie Kernprüfung deckt unter anderem ab:

- OCPP 1.6, 2.0.1 und 2.1 Handlerregistrierung,
- schnelle CALLRESULT-Antwort,
- geordnete und abgewartete Status-Side-Effects,
- `ActivePowerImport` und `ActivePowerInport`,
- Einheiteninferenz bei fehlender Unit,
- Leistungs- und Strom-Phasenaggregation,
- optional vollständig deaktivierte Connector-Ordner,
- Wh/kWh-Spiegelung,
- SoC-Verarbeitung,
- OCPP-Default-SampledValues,
- parallele OCPP-1.6-Transaktionen,
- Null-/Mindestwertschutz für Smart Charging,
- Aktualitäts- und Safe-Zero-Regeln.

## Verbleibende Grenzen

- Ein realer Stations-Firmwaretest kann nicht durch einen Quellcode- oder Schematest ersetzt werden.
- OCPP garantiert nicht, dass jede Station `TriggerMessage` unterstützt oder korrekt verarbeitet.
- SoC ist nur verfügbar, wenn Fahrzeug und Station ihn über OCPP, ISO 15118 oder einen herstellerspezifischen DataTransfer liefern.
- Security Profile 2/3 benötigen weiterhin TLS, Zertifikatsverwaltung und ein PKI-Backend.
- Ein Abbruch kann auch vom Fahrzeug, vom Ladecontroller, von Schutztechnik, Temperatur, Netzqualität oder einer externen Regelung stammen.

## Feldfreigabe

Vor produktiver Freigabe ist ein kontrollierter Dauerlauf mit der betroffenen Wallbox erforderlich:

1. Ladung ohne aktive EOS-Leistungsänderung.
2. Konstante Leistungsbegrenzung über mindestens 30 Minuten.
3. Mehrere kleine und große Sollwertänderungen oberhalb 6 A.
4. Beobachtung eines natürlichen Ladeschlusses.
5. Trennen und Wiederverbinden der OCPP-Verbindung.
6. Prüfung, ob `refreshSuppressedReason` nach einem Abbruch gesetzt wird.
7. Vergleich der Abbruchzeit mit `lastOutboundMethod`, `lastCommand` und Stationslog.
