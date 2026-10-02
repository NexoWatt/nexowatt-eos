# NexoWatt EOS 1.0.2 – offizielle Stable-Version

**Veröffentlichungsdatum:** 2026-09-09  
**Status:** Official Stable Patch / produktiver Verkaufsstand

## Zweck des Patches

NexoWatt EOS 1.0.2 beseitigt die nach 1.0.1 weiterhin beobachtete zyklische Anzeige „Offline / veraltet“ in der EOS-Admin-Übersicht. Der Fehler lag nicht mehr im RC88-Speicherwächter oder im SSE-Livekanal. Es bestand ein eigenständiger Timing-Konflikt zwischen dem ungefähr 20 Sekunden großen Frischefenster der Oberfläche, dem bisherigen 30-Sekunden-Heartbeat von `info.connection` und EMS-/Diagnosezyklen, die innerhalb ihrer Watchdoggrenzen länger als 20 Sekunden laufen dürfen.

Der Feldfall zeigte gleichzeitig einen erreichbaren Adapter, einen 25 Sekunden alten Tick-Start und eine vorherige Zyklusdauer von 2608 ms. Ein noch laufender, nicht festhängender Zyklus wurde dabei irrtümlich wie ein nicht erreichbarer Adapter dargestellt.

## Neuer Zustandsvertrag

Die Übersicht unterscheidet jetzt vier technisch getrennte Signale:

| Signal | Takt / Grenze | Bedeutung |
|---|---:|---|
| Adapter-/HTTP-Erreichbarkeit | 4 s | `info.connection` wird aus dem realen Serverzustand bestätigt |
| EMS-Scheduler-Liveness | 4 s | Schedulerprozess lebt unabhängig vom vollständigen Regelzyklus |
| EMS-Regelzyklus | Watchdog 30 s, konfigurierbar | laufend, aktuell oder tatsächlich festhängend |
| Diagnose-Publisher | 4 s Liveness, 5 s Vollsnapshot | Übersichtspfad lebt; vollständige Diagnose kann separat verzögert sein |

### Normalbetrieb

Adapter, Scheduler und Regelzyklus sind aktuell. Die Übersicht bleibt online und wechselt nicht aufgrund eines 20–30 Sekunden laufenden Zyklus auf „veraltet“.

### Verzögerter Regelzyklus

Ist der Adapter erreichbar und der Scheduler-Heartbeat frisch, läuft der aktuelle Regelzyklus aber länger als die Watchdoggrenze, erscheint eine Warnung:

```text
Adapter online – EMS-Regelzyklus überschreitet Zeitlimit
```

Dies ist ausdrücklich kein Adapter-Offlinezustand.

### Tatsächlicher Offlinefall

Meldet der reale HTTP-Server nicht mehr `listening`, wird `info.connection=false` geschrieben. Bei Prozessabbruch enden alle Heartbeats und überschreiten das Frischefenster. Beide Fälle werden weiterhin zuverlässig als offline erkannt. Ein frischer Scheduler- oder alter Summary-Wert darf `info.connection=false` nicht überdecken.

## Last- und Ressourcenverhalten

Der vollständige Diagnose-Snapshot bleibt im Fünf-Sekunden-Takt. Der unabhängige Liveness-Timer aktualisiert kleine Health-States alle vier Sekunden. `summaryJson` wird vom Zusatzheartbeat nur dann erneuert, wenn der normale Vollsnapshot bereits länger ausbleibt; dadurch wird die übliche Snapshotlast nicht verdoppelt. Alle Timer werden beim Adapter-Unload explizit beendet.

## Regressionstests

Die Stable-Prüfung enthält folgende Szenarien:

- 25 Sekunden laufender Regelzyklus, frischer Scheduler, vorherige Zyklusdauer 2608 ms: online, kein Stall, keine Veraltet-Anzeige;
- 35 Sekunden laufender Regelzyklus bei frischem Scheduler: Warnung `tick-stalled`, aber Adapter online;
- Scheduler-Heartbeat älter als seine Grenze bei weiterhin verbundenem Adapter: Scheduler-Warnung, nicht Adapter offline;
- `info.connection=false` trotz frischer anderer Werte: sofortiger echter Offlinezustand;
- unabhängiger Vier-Sekunden-Heartbeat während eines laufenden vollständigen Diagnosezyklus;
- korrekter Shutdown aller neuen Timer;
- Auswahl des neuesten statt des ersten vorhandenen Aktivitätszeitstempels.

## Unveränderte Regelungsfunktionen

Der Patch betrifft ausschließlich Statusermittlung, Heartbeats und Diagnosepublikation. Unverändert bleiben insbesondere:

- signierter NVP und Netzanschlussgrenzen;
- Lade- und Lastmanagement;
- Speicher- und Multi-Use-Regelung;
- Netzlimit, feste Einspeisebegrenzung und Nulleinspeisung;
- Export Guard und Single-Writer-Struktur;
- §14a, Tarife und Prognosen;
- EZA-/Parkregler-Priorität und deren Fallbacks;
- sämtliche produktiven Hardware-Writer.

## Feldprüfung nach Update

Nach Installation aus einem frischen Ordner ist der Adapter vollständig neu zu starten und der Browser einmal mit `Strg+F5` zu laden. Die EOS-Übersicht sollte mindestens 30 Minuten geöffnet bleiben. Im Normalbetrieb darf sie nicht mehr rhythmisch zwischen online und „Offline / veraltet“ wechseln. Für einen Gegencheck kann die Adapterinstanz kontrolliert gestoppt werden; nach dem Frischefenster muss die Übersicht eindeutig offline anzeigen.
