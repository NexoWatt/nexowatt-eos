# RC89 Feldtest-Checkliste

1. NexoWatt UI aktualisieren und die Adapterinstanz vollständig neu starten.
2. In EOS Admin prüfen, dass bei `info.connection=true` und aktuellem EMS-Tick **Online / normal** erscheint.
3. Die States `info.adminOverview.adapterOnline`, `emsTickFresh`, `publisherHeartbeatAt`, `publisherLastSuccessAt` und `publisherStatus` kontrollieren.
4. Die Übersicht mindestens 15 Minuten geöffnet lassen. `updatedAt` beziehungsweise `publisherHeartbeatAt` müssen ungefähr alle fünf Sekunden fortgeschrieben werden.
5. Browser kurz schließen beziehungsweise VPN trennen und erneut verbinden. Der Diagnose-Publisher und die EMS-Regelticks müssen weiterlaufen.
6. Einen rein diagnostischen Statezugriff testweise verzögern, sofern im Testsystem möglich. Erwartung: `publisherStatus=degraded`, aber kein falsches „Adapter offline“.
7. Einen EMS-Tick-Stillstand nur im kontrollierten Test simulieren. Erwartung: „Adapter online – EMS-Regelschleife verzögert“, nicht „Adapter offline“.
8. `info.connection=false` beziehungsweise eine tatsächlich gestoppte Instanz muss weiterhin eindeutig als **offline** erscheinen.
9. NVP-, Lade-, Speicher-, Tarif-, §14a-, Export- und Safety-Sollwerte mit RC88 vergleichen; RC89 darf daran keine fachliche Änderung verursachen.
10. Log prüfen: Diagnose-I/O-Fehler dürfen höchstens gedrosselt erscheinen und keine Warnflut erzeugen.
