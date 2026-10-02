# NexoWatt EOS 1.0.1 – offizielle Stable-Version

**Veröffentlichungsdatum:** 2026-09-09  
**Status:** Official Stable Patch / produktiver Verkaufsstand

## Zweck des Patches

NexoWatt EOS 1.0.1 beseitigt zwei zusammenhängende Fehldiagnosen aus 1.0.0: Der Speicherwächter wertete ein schnelles Heap-Wachstum auch bei sehr niedriger absoluter Auslastung als Speicherdruck. Daraufhin konnten gesunde Server-Sent-Events-Verbindungen geschlossen und für 30 Sekunden an der Wiederverbindung gehindert werden. Die EOS-Übersicht markierte ihre Live-Daten bereits nach ungefähr 20 Sekunden als veraltet und zeigte deshalb kurzzeitig „Offline / Veraltet“, obwohl Adapter, EMS-Regeltakt und Anlage weiterliefen.

## Korrigierte Speicherklassifizierung

Die Schutzstufen richten sich nun ausschließlich nach der realen Heap-Auslastung:

| Heap-Auslastung | Reaktion |
|---:|---|
| unter 65 % | keine Speicherwarnung und keine Druckentlastung |
| ab 65 % | gedrosselte Diagnosewarnung |
| ab 75 % | selektive Entlastung wirklich ungesunder SSE-Clients |
| ab 86 % über zwei Messungen | kontrollierter Adapterneustart als letzte Notbremse |
| ab 92 % | sofortige kontrollierte Notbremse vor V8-OOM |

Der Zehn-Minuten-Trend bleibt in der Diagnose erhalten, kann aber allein weder Warnung noch Entlastung auslösen. Der konkrete Feldfall mit 233 MiB von 2096 MiB, 11,1 % Heap und 141 MiB Wachstum wird daher als `fastGrowth=true`, aber `warn=false` und `pressure=false` klassifiziert.

## Korrigierter SSE-Livekanal

Bei normaler Speicherdruckbehandlung gilt jetzt:

- keine globale Reconnect-Sperre;
- ein kleiner normaler HTTP-/Socketpuffer ist kein Fehler;
- ein frischer Initial- oder Resync-Snapshot erhält bis zum bestehenden Backpressure-Timeout Zeit zum `drain`;
- getrennt werden nur tatsächlich blockierte oder stark gepufferte Clients;
- nach einer selektiven Trennung kann EventSource sofort neu verbinden.

Bei wirklich kritischem Speicherdruck werden weiterhin alle SSE-Verbindungen geschlossen. Die globale Reconnect-Sperre ist dort auf maximal zehn Sekunden begrenzt. Damit bleibt die Schutzwirkung erhalten, ohne das 20-Sekunden-Frischefenster der EOS-Übersicht regelmäßig zu überschreiten.

## Betriebliche Logmeldungen

Laufzeitmeldungen verwenden versionsneutrale Präfixe:

```text
[memory-guard]
[sse-guard]
```

Eine Meldung erscheint nur bei einer realen Schwellenverletzung beziehungsweise einer tatsächlich ungesunden SSE-Verbindung. Historische RC88-Bezeichnungen bleiben ausschließlich in Tests, Dokumentation und internen Kompatibilitätsmarkern bestehen.

## Unveränderte Regelungsfunktionen

Der Patch verändert keine fachliche Anlagenregelung. Unverändert bleiben insbesondere:

- signierter NVP und Netzanschlussgrenzen;
- Lade- und Lastmanagement;
- Speicher- und Multi-Use-Regelung;
- Netzlimit, feste Einspeisebegrenzung und Nulleinspeisung;
- Export Guard und Single-Writer-Struktur;
- §14a, Tarife und Prognosen;
- EZA-/Parkregler-Priorität und deren Fallbacks;
- sämtliche produktiven Hardware-Writer.

## Feldprüfung nach Update

Nach Installation aus einem frischen Ordner ist der Adapter vollständig neu zu starten. Die EOS-Übersicht sollte mindestens 30 Minuten geöffnet bleiben. Bei niedriger Heap-Auslastung dürfen weder wiederkehrende Speicherwarnungen noch druckbedingte SSE-Trennungen auftreten. Ein echter Adapterausfall, veralteter EMS-Regeltakt oder realer kritischer Speicherdruck bleibt weiterhin sichtbar und wird nicht künstlich als online dargestellt.
