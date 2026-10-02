# RC89 – zuverlässige EMS-Übersicht und getrennte Gesundheitszustände

## Ausgangslage

Die EOS-Admin-Übersicht kennzeichnete die NexoWatt-UI-Instanz als **„Offline / veraltet“**, obwohl `info.connection=true` war und die EMS-Regelticks weiterhin aktuell liefen. Ursache war keine fachliche EMS-Begrenzung, sondern die bisherige Kopplung dreier unterschiedlicher Zustände:

1. Erreichbarkeit der Adapterinstanz;
2. Aktualität der EMS-Regelschleife;
3. Aktualität des rein lesenden Diagnose-Publishers.

Eine verzögerte Diagnoseabfrage durfte dadurch den Eindruck erwecken, der vollständige Adapter sei offline.

## Korrigierter Gesundheitsvertrag

RC89 veröffentlicht die drei Ebenen getrennt:

| State | Bedeutung |
|---|---|
| `info.adminOverview.adapterOnline` | Adapter/Web-API meldet `info.connection=true` |
| `info.adminOverview.emsTickFresh` | letzter EMS-Regeltick liegt innerhalb der Aktualitätsgrenze |
| `info.adminOverview.emsTickAgeMs` | Alter des letzten bekannten EMS-Regelticks |
| `info.adminOverview.publisherHeartbeatAt` | Diagnose-Publisher hat einen neuen Zyklus begonnen |
| `info.adminOverview.publisherLastSuccessAt` | vollständiger Diagnose-Snapshot wurde bestätigt geschrieben |
| `info.adminOverview.publisherStatus` | `ok` oder `degraded` für den rein lesenden Publisher |
| `info.adminOverview.publisherLastError` | letzter begrenzter Diagnose-I/O-Fehler |

Daraus ergeben sich eindeutige Zustände:

```text
Adapter online + EMS-Tick aktuell + Publisher aktuell
→ Online / normal

Adapter online + EMS-Tick veraltet
→ Adapter online – EMS-Regelschleife verzögert

Adapter online + Publisher verzögert
→ Adapter online – Diagnoseaktualisierung verzögert

info.connection=false
→ Adapter offline
```

## Kompatibilitäts-Heartbeat

Ältere EOS-Admin-Versionen bewerten weiterhin `info.adminOverview.updatedAt`. RC89 aktualisiert diesen State deshalb am **Beginn** jedes Diagnosezyklus, bevor die umfangreicheren Lesezugriffe starten.

```text
Diagnosezyklus beginnt
→ updatedAt/Heartbeat bestätigen
→ volatile EMS-States mit Timeout aktualisieren
→ kompakten Snapshot erzeugen und schreiben
```

Ein einzelner langsamer Diagnosezugriff kann dadurch nicht mehr fälschlich als vollständiger Adapterausfall erscheinen.

## Begrenzte Diagnose-I/O

Alle ioBroker-Lese-, Schreib- und Objektoperationen des Diagnose-Publishers besitzen feste Zeitlimits. Operationen werden mit begrenzter Parallelität ausgeführt. Hängt eine Operation, bleibt genau dieses Label quarantänisiert; in folgenden Zyklen wird keine unbegrenzte Zahl identischer Promises erzeugt.

Wichtig: Diese Timeouts betreffen ausschließlich die **read-only Diagnose**. Sie verändern keine NVP-, Lade-, Speicher-, Tarif-, §14a-, PV-, Export- oder Safety-Entscheidung.

## Nachvollziehbare Kommentare

Nicht offensichtliche Sicherheits- und Fallbacklogik ist direkt im kanonischen TypeScript dokumentiert. Kommentare erklären dabei vor allem:

- **warum** Adapterstatus, Tickstatus und Publisherstatus getrennt werden;
- weshalb der Heartbeat vor den teureren Abfragen geschrieben wird;
- warum verspätete Promises nicht einfach vergessen oder erneut parallel gestartet werden dürfen;
- welche States nur Diagnose sind und niemals an der EMS-Arbitrierung teilnehmen;
- weshalb `lastTickStart` und `lastTickEnd` als kanonische Tickquellen berücksichtigt werden.

Generierte JavaScript-Runtimes und Runtime-Spiegel werden ausschließlich aus der kommentierten TypeScript-Quelle synchronisiert und nicht separat von Hand gepflegt.

## Regelungsinvarianz

RC89 ändert keine Sollwerte oder Grenzberechnungen. Unverändert bleiben insbesondere:

- permanente NVP-Bezugsüberwachung;
- Import-Soft-/Hard-Limit;
- Export-Limit und optionale 0-Einspeisung;
- Ladepunktverteilung und Offline-Isolation;
- Speicher-, Tarif- und Forecastlogik;
- §14a und finaler Safety-Writer;
- SSE-/Heap-Härtung aus RC88.
