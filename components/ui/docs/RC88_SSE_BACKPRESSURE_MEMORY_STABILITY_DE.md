# RC88 – SSE-Backpressure, Watchdog-Quarantäne und Heap-Stabilität

## Ausgangslage

Der Anlagenlog vom 26.08.2026 zeigt einen echten V8-Speicherabsturz des Adapterprozesses:

```text
[RC85 heap] 1972 MiB / 2096 MiB (94.1%)
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
```

Der Screenshot beweist den Heap-Out-of-Memory-Absturz. Er allein weist jedoch keine einzelne JavaScript-Variable als Ursache aus. Die anschließende Codeprüfung hat zwei konkrete, technisch unbegrenzte Speicherhaltepfade ergeben, die RC88 schließt:

1. Live-Updates über Server-Sent Events wurden auch dann weiter an eine Verbindung geschrieben, wenn `res.write()` bereits Backpressure meldete.
2. Ein nur durch `Promise.race()` zeitlich begrenzter Geräte-/Modulaufruf konnte nach dem Timeout im Hintergrund offen bleiben und später erneut parallel gestartet werden.

Die EMS-Fachregelung wird dafür nicht verändert. RC88 härtet Transport, asynchrone Laufzeit und die letzte Heap-Notbremse.

## 1. Speicherbegrenzter SSE-Livekanal

Jeder SSE-Client wird durch `lib/sse-runtime-guard.js` verwaltet.

### Backpressure

`res.write()` wird ausgewertet. Liefert Node.js `false`, wird für diesen Client kein weiteres Zustandsupdate geschrieben. Statt Tausende Zwischenstände im HTTP-/Socketpuffer zu halten, merkt sich der Adapter nur, dass nach `drain` ein Vollabgleich nötig ist.

```text
write() meldet Backpressure
→ weitere Zwischenupdates verwerfen/coalescen
→ höchstens eine Resynchronisierung vormerken
→ bei drain einen aktuellen Vollsnapshot senden
→ bei ausbleibendem drain Verbindung schließen
```

### Harte Grenzen

- maximal 24 gleichzeitige SSE-Verbindungen;
- maximal 4 MiB beobachteter Schreibpuffer je Verbindung;
- maximal 8 MiB je SSE-Frame;
- maximal 8 Sekunden Backpressure;
- Heartbeat alle 15 Sekunden;
- Trennung bei Request-, Response- oder Socketfehler;
- vollständige Listener- und Clientbereinigung beim Adapter-Unload;
- keine globale Reconnect-Sperre bei normalem Heap-Druck; bei wirklich kritischem Heap-Druck maximal zehn Sekunden Sperre.

Die Werte besitzen konservative interne Grenzen. Nicht mehr lesende Browser, VPN-Tunnel oder Reverse-Proxys können daher keinen unbegrenzt wachsenden Sendepuffer im Adapter erzeugen.

### Weniger temporäre Allokationen

Interne und öffentliche SSE-Nachrichten werden pro Batch jeweils nur einmal serialisiert. Ohne verbundenes Dashboard wird weder ein SSE-Payload gesammelt noch eine dauerhafte 120-ms-Flushkette betrieben.

## 2. Keine parallelen Altoperationen nach Watchdog-Timeout

Ein Timeout kann eine JavaScript-Promise nicht automatisch abbrechen. RC88 behandelt deshalb einen abgelaufenen Geräte-/Modulaufruf als quarantänisiert:

```text
Operation A startet
→ Timeout
→ optionales AbortSignal auslösen
→ Label A bleibt gesperrt
→ weitere Aufrufe mit Label A werden verworfen
→ Freigabe erst, wenn die ursprüngliche Promise wirklich endet
```

Die In-Flight-Tabelle hält pro Label nur einen kleinen Quarantäne-Eintrag aus Token, Zeitstempel und `AbortController` – nicht die komplette offene Promise-Kette. Ein einmalig an die Original-Promise gehängter Settlement-Handler entfernt den Eintrag erst bei ihrem tatsächlichen Ende. Bis dahin kann keine zweite identische Operation gestartet werden. Maximal 256 unterschiedliche Labels können gleichzeitig registriert sein. Damit ist die Zahl paralleler Altoperationen hart begrenzt; ein einzelner offline gegangener Ladepunkt kann weiterhin als Teilstörung behandelt werden, ohne sekündlich neue hängende Schreiboperationen aufzubauen.

## 3. Frühzeitige Heap-Druckentlastung

Die Heapüberwachung ist an die reale Adapterinstanz gebunden und läuft alle 30 Sekunden.

| Stufe | Standardreaktion |
|---|---|
| ab 65 % Heap | gedrosselte Diagnosewarnung; schneller Wachstumstrend bleibt nur Telemetrie |
| ab 75 % | nur wirklich blockierte oder stark gepufferte Clients schließen; keine globale Reconnect-Sperre |
| ab 82 % | alle SSE-Verbindungen trennen; kritische Reconnect-Sperre maximal zehn Sekunden |
| ab 86 % über zwei Messungen | kontrollierter Adapterneustart als letzte Notbremse |
| ab 92 % | sofortige kontrollierte Notbremse vor V8-`SIGABRT` |

Vor einer Notbremse werden begrenzte Diagnosewerte protokolliert:

- SSE-Clientzahl und Backpressure-Clients;
- beobachtete Writable-Bytes;
- State-/Raw-Cache-Keyanzahl;
- offene Server-Sockets;
- aktive Watchdog-Labels und Alter der ältesten Operation;
- Heap, RSS, externer Speicher und 10-Minuten-Trend.

Der kontrollierte Neustart ist keine normale Betriebsfunktion. Er ist nur der letzte Schutz, falls neben den behobenen Pfaden eine weitere Drittanbieter-/Treiberoperation Speicher bindet. Die eigentliche Stabilisierung besteht aus Backpressure, harten Grenzen und der Unterdrückung paralleler Altoperationen.

## 4. Unveränderte EMS-Regelung

RC88 verändert keine Lade-, Speicher- oder Netzregelentscheidung. Unverändert bleiben insbesondere:

- signierter NVP und Import-Hard-Limit;
- 90-%-Softzone und progressive Rampenbegrenzung;
- Offline-Isolation einzelner Ladepunkte;
- Auto-, PV-, Min+PV-, Boost-, Manuell- und Zeit-Ziel-Modi;
- dynamische Tarif- und Speicherpolitik;
- §14a, Phasen-/Stations-/Leitungsgrenzen;
- 0-Einspeisung und Export-Limit;
- finaler Safety-Writer.

Geändert werden ausschließlich der LIVE-Transport, der asynchrone Watchdog-Lifecycle, bounded Diagnostik und die Heap-Notbremse.

## 5. Erwartetes Feldverhalten

- Ein länger geöffneter Browser darf den Heap nicht kontinuierlich wachsen lassen.
- Nach Abbruch einer VPN-/Browserverbindung wird der zugehörige SSE-Client entfernt oder spätestens bei Backpressure getrennt.
- Ein offline gegangener Ladepunkt startet keine wachsende Zahl paralleler Schreib-Promises.
- Der EMS-Regeltick läuft für die übrigen Module weiter.
- Bei einem seltenen Heapdruckereignis bleibt die Regelung während der ersten Druckentlastung unverändert; nur LIVE-Browser verbinden sich neu.
- Ein V8-Hartabsturz bei rund 2 GiB soll durch die frühe Entlastung beziehungsweise die letzte kontrollierte Notbremse vermieden werden.


## Stable-Patch 1.0.1

Der Feldfall mit 11,1 % Heap und 141 MiB Wachstum in zehn Minuten darf keine Druckentlastung mehr auslösen. Ein 32-KiB-Socketpuffer und ein frischer 1-MiB-Initialsnapshot gelten nicht als ungesunde Verbindung. Die automatisierten Tests sichern diese Fälle sowie die weiterhin wirksame Trennung echter Backpressure-Clients ab.
