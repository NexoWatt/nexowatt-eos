# RC88 Validierungsbericht

**Adapter:** iobroker.nexowatt-ui 0.8.213  
**Stand:** 26.08.2026  
**Ziel:** Beseitigung der nach mehrstündigem Betrieb beobachteten V8-Heap-Out-of-Memory-Risikopfade, ohne Änderungen an EMS-Fachentscheidungen.

## Technische Korrekturen

- HTTP-/Socket-Backpressure des SSE-Livekanals wird ausgewertet.
- Pro SSE-Client gelten harte Grenzen für Anzahl, Framegröße, Writable-Puffer und Backpressure-Dauer.
- Während Backpressure werden Zwischenupdates nicht weiter in Node.js gepuffert; nach `drain` folgt genau ein aktueller Vollabgleich.
- Halb offene Request-, Response- und Socketverbindungen werden über Heartbeat und Lifecycle-Ereignisse entfernt.
- Interne und öffentliche Live-Payloads werden pro Batch jeweils nur einmal serialisiert.
- Ohne verbundenes Dashboard wird keine dauerhafte SSE-Flush-/Allokationskette betrieben.
- Watchdog-Timeouts halten das betroffene Label bis zum echten Ende der Originaloperation quarantänisiert; parallele Altoperationen werden unterdrückt.
- Die In-Flight-Struktur enthält nur kleine Token-/Zeit-/Abort-Einträge, nicht die vollständige offene Promise-Kette.
- Frühe Heap-Druckentlastung schließt zuerst gepufferte LIVE-Verbindungen, ohne Lade-, Speicher- oder Netzregelung zu verändern.
- Eine kontrollierte Adapterbeendigung ist nur die letzte Notbremse vor dem V8-Hartabsturz.

## Durchgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---:|
| TypeScript-Quellen syntaktisch geprüft | 737 |
| Produktive Runtime-Dateien synchron | 120 |
| Runtime-Parallelspiegel synchron | 482 |
| Release-Artefaktprüfung | 308 Paketdateien |
| npm-Tarball | 309 Dateien |
| Runtime-Start-/Syntax-Smoke | 178 JS-/MJS-Dateien |
| `npm pack --dry-run` | bestanden |
| `npm publish --dry-run --ignore-scripts` | bestanden |
| frisch entpacktes npm-Paket: Runtime-Start-Smoke | bestanden |
| RC57–RC88 Fachregressionen | bestanden |
| RC88 Speicher-/Backpressurevertrag | bestanden |

Die RC57–RC88-Fachgruppen wurden einzeln ausgeführt und bestanden. Dazu gehören OCPP/OCPP21, Auto/PV/Min+PV, Speicher/Tarif, §14a, Forecast, signed NVP, Soft-/Hard-Limit, 0-Einspeisung, Export-Limit und die finale Safety-Hülle. Die TypeScript-, Runtime-Mirror-, Release-, Paket- und frisch-entpackten Paketprüfungen wurden ebenfalls separat ausgeführt. Der RC70-Chromium-Test lieferte beim ersten Start einmalig noch keine Debug-Tab-Liste und bestand beim unmittelbaren Wiederholungslauf; es gab keinen fachlichen Testfehler.

## RC88-Stresstest

- 1.000.000 Updates gegen einen blockierten SSE-Client: nur der erste Write gelangt in den simulierten Node-Schreibpuffer; die folgenden Zwischenupdates werden verworfen beziehungsweise zu einem späteren Vollabgleich zusammengefasst.
- Nach `drain`: genau ein aktueller Vollsnapshot, keine Wiedergabe einer wachsenden Zwischenwarteschlange.
- 100 wiederholte Backpressure-/Drain-Zyklen: Listenerbuchhaltung bleibt begrenzt.
- Überschrittener Writable-Puffer: Client wird vor einem weiteren Frame geschlossen.
- Nicht drainender Client: Verbindung wird nach der festen Frist entfernt.
- Ein 1-MiB-Initialsnapshot darf in Backpressure gehen und anschließend drainen; er wird nicht durch eine zu kleine Puffergrenze abgewiesen.
- Clientlimit: älteste Verbindung wird entfernt; die Set-Größe bleibt begrenzt.
- Kritischer Heap-Druck: LIVE-Verbindungen werden geschlossen und Reconnects kurzzeitig gedrosselt.
- 10.000 erneute Aufrufe eines hängenden Watchdog-Labels: keine zweite Originaloperation wird gestartet.
- Späte Beendigung der Originaloperation: Quarantäne wird automatisch freigegeben.

## Regelungsinvarianz

RC88 ändert keine fachliche NVP-, Lade-, Speicher-, Tarif-, §14a-, 0-Einspeise-, Export- oder Safety-Entscheidung. Die Änderungen betreffen ausschließlich:

1. SSE-Live-Transport und Client-Lifecycle;
2. Watchdog-/Promise-Lifecycle;
3. begrenzte Speicherdiagnostik;
4. letzte Heap-Notbremse.

## Feldabnahme

Vor der Stable-Freigabe sollte derselbe Quellstand mindestens 24 bis 48 Stunden mit geöffnetem LIVE-Dashboard, einem getrennten beziehungsweise wiederverbundenen Browser/VPN und einem testweise offline genommenen Ladepunkt laufen. Dabei sind Heap/RSS, letzter EMS-Regeltick, SSE-Clientzahl, NVP-Hard-Limit und die Freigabe der übrigen Ladepunkte zu kontrollieren.
