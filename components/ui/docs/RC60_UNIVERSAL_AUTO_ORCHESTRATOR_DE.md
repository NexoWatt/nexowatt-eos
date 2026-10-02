# RC60 – Universeller Auto-Orchestrator für Ladepunkte

**Version:** NexoWatt UI 0.8.185 RC60  
**Stand:** 13.08.2026

## Ziel

RC60 vereinheitlicht die automatische Ladeentscheidung für alle im NexoWatt EOS unterstützten Ladepunktanbindungen. Die Fachlogik für Auto, PV-Überschuss, Min+PV, Zeit-Ziel-Laden und dynamische Tarife wird nur noch einmal ausgeführt. Hersteller- und Protokollunterschiede werden davor auf einen gemeinsamen EVCS-Zustandsvertrag normalisiert.

Unterstützte Integrationsprofile:

1. **NexoWatt Devices** mit stabilem EVCS-Fähigkeitsvertrag, beispielsweise Alfen über Modbus;
2. **NexoWatt OCPP21** über direkte native Datenpunkte unter `ocpp21.*`;
3. **freie/manuelle Zuordnung** mit Status, Fahrzeugkontakt, Ladebedarf und Strom- oder Leistungssollwert.

Ein Ladepunkt ist produktiv regelbar, wenn mindestens ein beschreibbarer Strom- oder Leistungssollwert vorhanden ist und das EOS den Fahrzeug-/Stationszustand zuverlässig bestimmen kann. Nicht steuerbare oder semantisch unvollständige Hardware bleibt sichtbar diagnostizierbar, wird aber nicht mit erfundenen Zuständen geregelt.

## Gemeinsamer Zustandsvertrag

Das EOS unterscheidet jetzt ausdrücklich:

- **Fahrzeug getrennt**;
- **Fahrzeug verbunden**;
- **kontrollierter Startversuch erlaubt**;
- **Fahrzeugbedarf bestätigt**;
- **Ladung aktiv**;
- **Fahrzeug pausiert selbst**;
- **Station begrenzt oder wartet auf EOS**;
- **Fehler / offline / nicht verfügbar**.

Dadurch wird ein noch nicht laufender Ladevorgang nicht mehr mit „kein Fahrzeugbedarf“ verwechselt. Gleichzeitig darf ein Status wie `charging=false` nicht mehr als ausdrückliche Ablehnung des Fahrzeugs interpretiert werden.
Negative Statusmeldungen wie `Not charging`, `Charging paused`, `Charging blocked`, `Charging complete` oder `Charging stopped` werden ausdrücklich als Kein-Bedarf-/Pausenzustand behandelt und dürfen keinen Startversuch auslösen.

## IEC-61851-/Mode-3-Zustände

Für Alfen und andere Mode-3-Wallboxen gilt:

| Zustand | EOS-Bedeutung | Auto-Start |
|---|---|---:|
| A, A1, A2 | kein Fahrzeug | nein |
| B1 | Fahrzeug verbunden, PWM noch nicht aktiv | begrenzter Startversuch |
| B2 | Fahrzeug verbunden, PWM/Freigabe vorhanden | begrenzter Startversuch |
| C1, D1 | Fahrzeug fordert Energie | ja |
| C2, D2 | Ladung aktiv | ja |
| E, F | Fehlerzustand | sofort sperren |

B1/B2 werden bewusst nicht als bereits laufender Ladebedarf bilanziert. Sie dürfen nur die technische Mindestleistung für einen zeitlich begrenzten Startversuch erhalten. Erst C1/D1, C2/D2 oder eine frische reale Ladeleistung bestätigen den laufenden Bedarf.

## OCPP21-Zustände

Der native Datenpunkt `transactions.chargingState` wird zusätzlich zum Stationsstatus ausgewertet.

| Zustand | EOS-Bedeutung |
|---|---|
| `Available` | kein Fahrzeug |
| `Preparing`, `Occupied`, `EVConnected` | verbunden/startbereit |
| `Charging` | Ladung aktiv |
| `SuspendedEVSE` | Fahrzeug wartet auf Freigabe/Leistung des EOS |
| `SuspendedEV` | Fahrzeug pausiert selbst; kein wiederholter Start |
| `Finishing` | Ladevorgang endet |
| `Faulted`, `Unavailable`, offline | sofort sperren |

Die OCPP-spezifische Startantwortzeit und die physische WebSocket-Verbindung bleiben weiterhin getrennt von der Aktualität der Leistungswerte.

## NexoWatt-Devices-Automatik

Das EOS übernimmt aus genau einer Gerätebasis bevorzugt den versionierten Vertrag unter:

```text
nexowatt-devices.<Instanz>.devices.<Gerät>.aliases.v1.*
```

Verwendete Fähigkeiten sind insbesondere:

```text
r.power
r.energyTotal
r.mode3State / r.mode3Code / r.evState
r.vehicleConnected
r.online
r.lastSeenMs / r.heartbeat
ctrl.currentLimitA
ctrl.powerLimitW
ctrl.run
```

Legacy-Aliase und Rohdatenpunkte bleiben als Fallback erhalten. Mess- und Stellpfade mehrerer Geräte dürfen nicht miteinander vermischt werden. Eine vorhandene manuelle Installer-Zuordnung bleibt autoritativ.

Beobachtungswerte wie `r.charging`, `transactionActive` oder `chargingActive` werden nicht automatisch als Ladebedarfs-Datenpunkt verwendet. Vor der ersten Stromfreigabe sind diese Werte typischerweise `false` und würden sonst einen Start verhindern.

## Zeitlich begrenzter Startversuch

Auto, PV und Min+PV dürfen ein eindeutig verbundenes/startbereites Fahrzeug mit der technischen Mindestleistung anstarten. Der Versuch ist begrenzt und wird überwacht:

```text
Startbereitschaft erkannt
→ positives, sicher begrenztes Energiebudget vorhanden
→ technische Mindestleistung ausgeben
→ auf Status-/Leistungsreaktion warten
→ bei Erfolg normale Regelung übernehmen
→ bei ausbleibender Reaktion stoppen und Cooldown aktivieren
```

Standardwerte:

- generische/Modbus-Wallbox: 45 Sekunden Antwortzeit;
- OCPP: mindestens 75 Sekunden Antwortzeit;
- erneuter Versuch nach erfolglosem Start: frühestens nach 60 Sekunden.

Während des Cooldowns wird keine Mindestleistung reserviert. Harte Fehler, Offline, §14a, Parkregler, Netz-, Phasen- oder Stationsgrenzen beenden den Versuch sofort.

## Auto, PV, Min+PV, Zeit-Ziel und Tarif

### Auto

Auto darf bei verbundenem/startbereitem Fahrzeug kontrolliert anfahren. Nach bestätigtem Bedarf wird die reguläre verfügbare Ladeleistung zugeteilt. Rampen, Stationsverteilung und alle Sicherheitsgrenzen bleiben wirksam.

### PV-Überschuss

Ein Start erfolgt nur, wenn mindestens die technisch fahrbare Mindestleistung als realer PV-Grant verfügbar ist. Nicht genutzte EVCS-PV-Anteile werden nicht reserviert, sondern stehen Speicher und nachgelagerten Verbrauchern zur Verfügung.

### Min+PV

Die technische Mindestleistung darf aus dem erlaubten Netz-/Gesamtbudget stammen; zusätzliche Leistung kommt aus PV. Dadurch kann eine angeschlossene Wallbox auch bei zunächst 0 W PV sauber starten, ohne das gesamte EVCS-Budget zu blockieren.

### Zeit-Ziel-Laden

Der Zielplaner berechnet aus Ziel-SoC, Batteriekapazität und Restzeit eine fahrbare Ziel-Leistung. Ein sicher verbundenes, noch nicht ladendes Fahrzeug kann damit zunächst über die technische Mindestleistung kontrolliert gestartet werden. Nach bestätigter Fahrzeugreaktion begrenzt die berechnete Ziel-Leistung den Sollwert; Netz-, Stations-, Phasen-, §14a- und Safety-Grenzen bleiben jederzeit maßgeblich.

### Dynamischer Tarif

Günstige Tarifzeiten können die Ladeplanung freigeben beziehungsweise in der Smart-Zielstrategie beschleunigen. Teure Zeitfenster dürfen bei ausreichender Restzeit warten. Wird die Zielerreichung gefährdet, übersteuert der späteste sichere Startzeitpunkt die Tarifwartezeit – weiterhin ausschließlich innerhalb der übergeordneten Grenzen.

## Single-Writer und Speicherfarm

RC60 führt keinen zusätzlichen Hardware-Writer ein:

```text
Betriebsart / Zeit-Ziel / Tarif / Betriebsstrategie
→ universeller Auto-Orchestrator
→ zentrales Lademanagement
→ Netz-, Stations-, Phasen-, §14a- und Safety-Grenzen
→ bestehender EVCS-Writer
→ Wallbox
```

Die Speicherfarm bleibt unabhängig ausführender Speicher-Writer. Nur bestätigte Fahrzeugleistung, ein aktiver begrenzter Startversuch oder eine echte Ladeanforderung darf im gemeinsamen Budget berücksichtigt werden. Ein lediglich angeschlossenes Fahrzeug blockiert die Speicherfarm nicht dauerhaft.

## Diagnose

Pro Ladepunkt werden zusätzlich veröffentlicht:

- normalisierter Fahrzeugzustand;
- Fahrzeug verbunden;
- Startversuch zulässig;
- Ladebedarf bestätigt;
- Startversuch aktiv;
- Beginn und verbleibendes Antwortzeitfenster;
- Cooldown aktiv und Ablaufzeit;
- verwendeter Status-/Fahrzeug-/Online-Datenpunkt;
- Grund der Startberechtigung oder Sperre;
- Ziel-, PV-, Tarif-, Netz- und Stationsbegrenzung.

Damit lässt sich unterscheiden, ob eine Wallbox nicht startet, weil kein Fahrzeug erkannt wurde, die technische Mindestleistung fehlt, ein Tariffenster wartet, die Startantwort ausgeblieben ist oder eine harte Sicherheitsgrenze wirkt.

## Feldtest

1. Einen Ladepunkt pro Integrationsprofil einzeln testen.
2. **Auto** mit verbundenem, noch nicht ladendem Fahrzeug starten.
3. **Min+PV** bei 0 W PV und anschließend steigendem PV-Ertrag prüfen.
4. **PV-Überschuss** knapp unter und über der technischen Mindestleistung testen.
5. **Zeit-Ziel** mit fernem und dringendem Zielzeitpunkt prüfen.
6. Günstigen und teuren Tarifzustand testen.
7. Ausbleibende Fahrzeugreaktion simulieren; nach Timeout muss 0 W und anschließend Cooldown gelten.
8. Echten Offline-/Fehlerzustand prüfen; dieser muss sofort stoppen.
9. Mehrere Ladepunkte und gemeinsame Stationsgrenzen testen.
10. Speicherfarm parallel beobachten; ein nur verbundenes Fahrzeug darf keine dauerhafte Speicherreservierung auslösen.
11. §14a, Parkregler, Netzanschluss- und Phasenbegrenzung abschließend verifizieren.

## Kompatibilitätsgrenze

Der universelle Orchestrator arbeitet mit jeder unterstützten oder semantisch korrekt zugeordneten Wallbox, die:

- einen zuverlässigen Online-/Fehlerzustand liefert;
- Fahrzeugkontakt oder einen auswertbaren Status bereitstellt;
- mindestens einen beschreibbaren Strom- oder Leistungssollwert besitzt;
- Sollwerte innerhalb der erforderlichen Geräte-Watchdogzeit annimmt.

Eine unbekannte Hardware ohne steuerbaren Sollwert oder ohne belastbaren Fahrzeug-/Statusnachweis kann technisch nicht sicher automatisch geregelt werden. Sie bleibt deshalb fail-closed, bis ein passendes NexoWatt-Devices-Template oder eine vollständige manuelle Zuordnung vorhanden ist.
