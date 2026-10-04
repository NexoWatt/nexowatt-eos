# HTTPS-Bereitschaft nach dem Adapterstart

Änderung `EOS-MANAGEMENT-HTTPS-READINESS-20261004`, 04.10.2026.
Diese Korrektur betrifft `tools/system/onboard-ui.cjs:probeWeb` und einen
neuen gezielten Test. Signierte R7-Dateien und der R7-Recovery-Koordinator
werden nicht verändert.

## Reproduzierter Fehler

Der Controller 7.2.2 setzt den frischen, bestätigten Adapterzustand `.alive`
vor dem Aufruf des Adapter-Ready-Handlers. Die UI erledigt anschließend
asynchrone Datenbank-, Lizenz- und Konfigurationsschritte, bevor HTTPS lauscht.
`waitAdapters` darf deshalb bereits erfolgreich sein, obwohl der Webserver
noch nicht erreichbar ist.

Der bisherige `probeWeb` führte genau eine Anfrage aus. Sein Fünfsekundentimer
war ein Anfrage-Timeout; ein früher Verbindungsfehler brach sofort ab. Mit den
unveränderten Funktionen und echtem TLS-1.3-Loopbackverkehr war dies
reproduzierbar: Die erste Prüfung scheiterte nach **7 ms**, obwohl die Listener
nach 1000 ms öffneten und beide Endpoint-Prüfungen nach 1016 ms bestanden.
Die Zustandsantworten und HTTP-Handler dieses Vorversuchs waren ausdrücklich
Testfixtures. Originalquelle und Ergebnis stehen unter `raw/`; der SHA-256
der Originalquelle stimmt mit dem Vorversuch überein.

Der Betreiberbefund zeigt bestätigte R7-Controllerbereitschaft, danach einen
kontrollierten Stop und Rücknahme. Er enthält keinen erhaltenen ursprünglichen
Readiness-Fehlercode. Der hier nachgewiesene Produktfehler ist daher **nicht als
bewiesene alleinige Ursache dieses Pi-Abbruchs** ausgewiesen. Private IPs und
das vollständige Betreiberprotokoll werden nicht veröffentlicht.

## Änderung und Sicherheitsgrenze

Die feste Schnittstelle `probeWeb(port, ca)` bleibt bestehen. Ein gemeinsames
monotones Budget von 5000 ms umfasst Listener-Wartezeit, sämtliche Anfragen
und Antwortverarbeitung. Nur `ECONNREFUSED` und `ECONNRESET` vor dem ersten
HTTP-Response-Ereignis werden im Abstand von 200 ms wiederholt. Nach einer
Antwort erfolgen keine Wiederholungen. Deadline, Anfrage und Antwort werden
bei Abschluss bereinigt; verspätete Ereignisse können keine neue Prüfung
starten. Ein nicht antwortender Listener erhält kein neues Zeitbudget.

Unverändert bleiben feste Ports 8081/8188, Loopback, Servername `localhost`,
CA-/Peerprüfung, ausschließlich TLS 1.3, `agent: false`, Antwortgrenze 16384
Bytes, der exakte lokale Admin-Login-Redirect und alle anonymen UI-Status- und
Berechtigungsfelder. Fehler bei Zertifikat, Protokoll, HTTP, Inhalt oder
Authentisierung werden weiterhin abgewiesen. Die Änderung erweitert keine
Adapterfreigabe, Netzberechtigung oder Systemd-Schreibgrenze.

Der feste Fehlercode bleibt `ONBOARD_HTTPS_NOT_READY`. Für einen künftig
diagnostizierbaren Koordinator gibt es ausschließlich feste Zusatzwerte:
`stage: "https-probe"`, `reason` aus `input`, `deadline`, `transport`, `tls`,
`response`, `size`; `port` erscheint nur für die zwei erlaubten Ports.
Freie Fehlertexte, Antworten und Geheimnisse werden nicht übernommen.
Der unveränderte R7-Koordinator verwirft den ursprünglichen Stufencode weiterhin
bei der Rücknahme; diese getrennte Berichtslücke ist im Vorversuch dokumentiert.

## Ausgeführte Prüfungen

```sh
node --test --test-reporter=tap --test-concurrency=1 tests/onboarding/web-readiness.test.cjs tests/integration/onboard-ui.test.cjs
```

**35/35 bestanden, keine übersprungenen Tests.** Der neue Test enthält echte
TLS-1.3-Sockets und prüft verzögerten Listenerstart, Reset vor HTTP-Headern,
genauen Admin-Redirect, falsche CA, altes TLS, HTTP-Fehler, abgeschwächte
Berechtigung, übergroßen Inhalt, Reset nach HTTP-Headern, falschen Port,
dauerhaft geschlossenen Port und einen erst nach 900 ms öffnenden Listener
ohne Antwort. Die beiden letzten Fälle enden innerhalb desselben
Fünfsekundenbudgets; nach Abschluss bleiben keine Verbindungen oder Retries.
Die zusätzliche Messtoleranz berücksichtigt die Test-Eventloop, verändert
aber das Produktbudget nicht. Bestehende Redirect-/Auth-Vertragsprüfungen
bleiben unverändert und bestanden ebenfalls.

Der erste kombinierte Lauf hatte 34/35 bestandene Prüfungen: Der zusätzliche
Top-Level-Import der monotonen Uhr verletzte die bestehende VM-Fixture für
den Release-Snapshot-Test. Der Import ist nun auf `probeWeb` begrenzt; die
alte Testdatei wurde nicht verändert. Der abschließende vollständige TAP-Lauf
und der vorherige Befund sind erhalten.

Umgebung: Linux x64, Node 24.19.0. Neue Festporttests laufen sequenziell und
melden einen bereits belegten Port als Fehler. Im unprivilegierten CI-Job
ist die neue Datei separat ausführbar; die ältere Integrationsdatei verwendet
zusätzlich Root-Dateifixtures. Dies ist kein vollständiger Adapterstart,
nativer PostgreSQL-/Systemd-/ARM64-Lauf oder neuer Pi-Wiederherstellungsversuch.
Die spätere integrierte Management-Prüfung und Lieferung werden gesondert
nachgewiesen. Keine Produktions- oder Hardwarefreigabe.

Maschinenlesbar: [verification.json](verification.json).
Rohbeleg: [web-readiness.tap](raw/web-readiness.tap).
