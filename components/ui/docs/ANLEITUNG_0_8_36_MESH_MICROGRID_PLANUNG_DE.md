# NexoWatt UI 0.8.36 – Mesh/Microgrid Regelbasis im Diagnosemodus

## Zweck

Version 0.8.36 erweitert die separate EOS-App **Mesh/Microgrid** um eine reine Diagnose- und Planungsbasis. Das System zeigt, welche Local-First-/Grid-Last-Entscheidungen später sinnvoll wären, schreibt aber weiterhin keine Hardware-Sollwerte.

## Wichtigste Sicherheitsregel

Alle Planungswerte sind read-only:

```text
hardwareWrite = false
readOnly = true
```

Das Modul schreibt keine WR-Setpoints, keine Ladepunkt-Setpoints, keine Speicher-Setpoints und keine Schaltbefehle.

## Neue Inhalte

### Geplante Entscheidungen

Die Betreiberansicht `/mesh/microgrid` zeigt jetzt geplante Diagnose-Entscheidungen, zum Beispiel:

- lokalen Überschuss bevorzugt an Verbraucher, Speicher oder Ladepunkte geben,
- lokale Quellen vor Netzbezug nutzen,
- bei Netzlimit-Überschreitung niedriger priorisierte Verbraucher verschieben,
- bei Exportlimit-Überschreitung lokale Senken bevorzugen oder weniger wichtige Erzeuger begrenzen.

### Prioritätsauswertung

Knoten werden nach Betreiberpriorität sortiert. Niedrige Zahlen bedeuten höhere Priorität.

### Netzlimit-Diagnose

Die Diagnose zeigt:

- konfiguriertes Grid-/Clusterlimit,
- aktive Leistung am Netzlimit,
- Richtung Import/Export,
- Auslastung,
- Reserve,
- Überschreitung,
- Status ok/warn/critical.

## Neue States

```text
meshMicrogrid.planning.actionsJson
meshMicrogrid.planning.localFirstActionsJson
meshMicrogrid.planning.gridLastActionsJson
meshMicrogrid.planning.gridLimitActionsJson
meshMicrogrid.planning.priorityOrderJson
meshMicrogrid.planning.gridLimitDiagnosticsJson
meshMicrogrid.planning.actionCount
meshMicrogrid.planning.criticalActionCount
meshMicrogrid.planning.readinessScorePercent
meshMicrogrid.planning.readOnly
meshMicrogrid.planning.summaryJson
meshMicrogrid.planning.lastReason
```

## APIs

Die vorhandenen APIs enthalten jetzt zusätzlich die Planungsdiagnose:

```text
/api/mesh/microgrid
/api/mesh/microgrid.csv
```

## Bedienung

1. Im Installer/App-Center die separate EOS-App **Mesh/Microgrid** aktivieren.
2. Knoten und Prioritäten konfigurieren.
3. Betreiberansicht öffnen:

```text
http://<NexoWatt-IP>:8188/mesh/microgrid
```

4. Geplante Entscheidungen und Netzlimit-Diagnose prüfen.

## Produktgrenze

Diese Version ist bewusst noch kein automatischer Microgrid-Regler. Sie zeigt transparent, was später geregelt werden könnte. Die Hardwaresteuerung kommt erst nach separater Freigabe, CommandGuard und SafetyGuard.
