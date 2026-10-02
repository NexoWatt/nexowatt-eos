# NexoWatt EOS 0.8.176 RC52 – Lademanagement Live-Diagnose

## Ziel

RC52 ergänzt im AppCenter unter **Ladepunkte** eine zentrale Diagnoseansicht für das Lademanagement. Sie beantwortet ohne Suche in mehreren Objektbäumen:

- Warum lädt ein Ladepunkt nicht?
- Welche Leistung fordert der Modus an?
- Welchen finalen Sollwert gibt NexoWatt EOS tatsächlich vor?
- Welche Leistung ist reserviert und welcher Anteil stammt aus PV oder Speicher?
- Welche Netz-, Phasen-, §14a-, Stations-, Geräte- oder Safety-Grenze ist bindend?
- Wurde der Hardware-Sollwert übernommen oder ist der Write fehlgeschlagen?

Die Erweiterung ist **read-only gegenüber der Anlagensteuerung**. Sie wertet bereits getroffene Entscheidungen aus und verändert keine Budgets, Sollwerte, Prioritäten oder Hardwareausgänge.

## Live-Snapshot

### Global

- aktive Begrenzung / Limiter
- aktive Sicherungsstufe
- verfügbares Ladebudget
- gesamte EVCS-Istleistung
- gesamter finaler NexoWatt-Sollwert
- reservierte Leistung
- verbleibendes Budget
- Netzanschluss-/Import-Gate
- Phasen-Gate
- §14a-Gate
- Stage-A-/Sicherungsstatus
- Zeitpunkt des letzten Regelzyklus

### Je Ladepunkt

- Modus und Online-/Fahrzeug-/Ladebedarfsstatus
- tatsächliche Istleistung
- ursprüngliche Anforderung vor finaler Begrenzung
- finaler NexoWatt-Sollwert in Watt und Ampere
- reservierte Leistung
- zugeteilter PV-Anteil
- bestätigter Speicher-Anteil
- verbleibendes Stationsbudget oder „keine Station“
- aktive Begrenzung und Entscheidungsgrund
- Safety-Bindung
- verwendeter Sollwert-Datenpunkt
- Hardware-Write-/Readback-Status

## Ereignislog

Der Adapter hält maximal **240 relevante Ereignisse** in einem Ringpuffer. Protokolliert werden insbesondere:

- Modus- oder Statuswechsel
- Fahrzeug-/Ladebedarfswechsel
- Änderungen des finalen Sollwerts
- neue oder gelöste Begrenzungen
- Safety-/Failsafe-Zustände
- Stations-, Netz-, Phasen- und §14a-Bindungen
- Hardware-Write-Fehler oder wieder bestätigte Writes

Kleine Messwertschwankungen werden quantisiert und erzeugen keine Logflut. Solange eine Regelung aktiv ist und sich fachlich nichts ändert, wird höchstens einmal pro Minute ein Heartbeat-Snapshot erzeugt.

## Bedienung

- **Aktualisieren:** Live-Daten sofort neu laden
- **Automatisch aktualisieren:** Aktualisierung im Ladepunkte-Tab alle zwei Sekunden
- **Nur Probleme:** normale und rein informative Zustände ausblenden
- **Ladepunktfilter:** Snapshot und Ereignisse auf einen Ladepunkt einschränken
- **JSON exportieren:** vollständigen Diagnosevertrag sichern
- **CSV exportieren:** Ereignisse tabellarisch auswerten
- **Log leeren:** nur Ereignisring leeren; Live-Snapshot und Regelung bleiben unverändert

Das Leeren ist Installer/Admin-geschützt.

## Datenpunkte

Die persistente Diagnose liegt unter:

```text
nexowatt-ui.<Instanz>.chargingManagement.audit.*
```

Wichtige States:

```text
snapshotJson
recentEventsJson
lastEventJson
eventCount
lastEventTs
activeLimiter
safetyStage
safetyActive
problemCount
```

## Begrenzungsgründe

Die Diagnose normalisiert unter anderem:

```text
none
no-vehicle
no-charge-demand
pv-surplus
budget
grid-import
phase
grid-and-phase
para14a
station
device
peak-shaving
stale-meter-failsafe
eos-safety-stop
write-error
fault
unavailable
offline
no-setpoint
```

Ein fehlendes optionales Stationslimit bleibt diagnostisch `null` beziehungsweise „keine Station“ und wird nicht als echte 0-W-Grenze dargestellt.

## Sicherheitsvertrag

Die Audit-Helfer und die AppCenter-Ansicht:

- rufen keinen Hardware-Writer auf,
- erzeugen keine neuen Ladeentscheidungen,
- verändern keinen SafetyEnvelope,
- verändern keine §14a-, Netzanschluss-, Phasen- oder Stationsgrenze,
- verwenden ausschließlich bereits berechnete Soll-/Ist-/Reserve-/Safety-Werte.

Ein Fehler in der Diagnose wird abgefangen und darf keinen Ladezyklus abbrechen.
