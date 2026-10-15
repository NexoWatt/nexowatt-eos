# OCPP: stabiler Start vor der Anlageninbetriebnahme

Stand: 15.10.2026. Änderung `EOS-OCPP-COMMISSIONING-20261015` auf Basis des
EOS-Quellstands `e4616fec2a56cd7c6c013df090bdda00a0c37f54`, Komponente
`iobroker.ocpp21` 0.4.0 mit hier dokumentiertem EOS-Overlay. Kein selbständig
veröffentlichtes npm-Release. Die konkrete EOS-Auslieferung muss dieses Overlay
einschließlich Hashes, SBOM und Freigabestatus binden.

## Problem und Änderung

Vorher versuchte eine lizenzierte Instanz bei fehlendem Transportprofil jede
Sekunde einen Start und meldete stets denselben allgemeinen Fehler. Ein laufender
uninstallierter beziehungsweise unkonfigurierter Adapter war nicht eindeutig
von einem kaputten Profil unterscheidbar.

Jetzt bleibt die Instanz ohne Listener und Befehlsausgabe im ausgewiesenen
Wartezustand. Die neue Admin-/Native-Option `eosCommissioningEnabled` ist bei
neuen Instanzen standardmäßig `false`. Altinstanzen ohne das Feld bleiben
profilpflichtig wie zuvor; kein automatisches Stilllegen bestehender Sitzungen.
Ungültige Typen werden verweigert. Ein gültiges geschütztes Profil und eine
aktuelle zentrale Lizenz bleiben auch bei `true` zwingend.

`info.runtimeState`/`info.runtimeReason` bilden Lizenz, Enrollment, fehlerhafte
Konfiguration, Listener und Shutdown ab. `info.connection` bedeutet mindestens
eine tatsächliche Stationsverbindung. Ein offener Listener ist keine erfolgreiche
Geräteprüfung. Fehlerprotokolle enthalten ausschließlich feste Codes und werden
nur bei Zustandswechsel geschrieben. Fehlgeschlagene Startversuche sind auf einen
Versuch pro 30 Sekunden begrenzt; der Lizenz-/Statusplaner läuft alle 5 Sekunden.

Die echte Profillesefunktion prüft Vorfahren nun von der Wurzel nach unten, damit
ein fehlender Unterordner keine unsicheren Rechte darüber als „noch nicht
eingerichtet“ verschleiert. Nur ein fehlendes Manifest beziehungsweise sicherer
fehlender Verzeichnispfad wird als Enrollment-Wartezustand gewertet. Fehlerhafte
JSON-Daten, unsichere Rechte und fehlende Zertifikatsdateien nach Manifestanlage
bleiben Fehler. Fehlerdetails und Dateiinhalte werden nicht veröffentlicht.

## Unveränderte Sicherheitsgrenzen

- TLS 1.3 mit geprüften Clientzertifikaten und exaktem Stations-DNS-SAN.
- Mindestens eine explizit eingetragene Stationsidentität; keine erfundene CA,
  Default-Station oder leere Freigabe.
- Root-eigene, gegen nicht privilegierte Änderungen geschützte Profilpfade.
- Aktuelle zentrale Home-/Pro-Lizenz und vollständiges Ladepunktinventar vor
  Steuerbefehlen. Lizenzverlust erhält Messkanal und Geräteprofile, blockiert
  neue Autorisierung/Steuerung; keine pauschale physische Abschaltung.
- Kein Ausweichen auf Klartext und keine Aufhebung bestehender Befunde.

## Tatsächliche Prüfung

Lokaler Linux-x64-Prüfcontainer, Node 24.19.0, npm-Lockinstallation mit
`npm ci --ignore-scripts --no-fund --no-audit`. Keine Prüfung gegen Hardware.
Rohausgabe: [npm-test.log](reports/commissioning-20261015/npm-test.log).
Quellbindung: [source-sha256.txt](reports/commissioning-20261015/source-sha256.txt).
`npm test` führt nacheinander folgende Prüfungen aus:

| Prüfung | Ergebnis | Grenze |
|---|---|---|
| `test/core.test.js` | 25/25 bestanden | Protokoll-/Messwertfunktionen, keine reale Station |
| `test/package.js` | 46/46 bestanden | Paket-/JSON-Konsistenz |
| `test/license.test.cjs` | 7/7 bestanden | Lizenz-/Befehlsgrenzen mit isolierten Abhängigkeiten |
| `test/commissioning.test.cjs` | 18/18 bestanden | Tatsächliche Lifecycle-Methoden; DB, Lizenztransport und Listener ersetzt |
| `test/secure-transport.test.js` | 15/15 einschließlich Untertests bestanden | Echte TLS-1.3-/WebSocket-Loopback-Handshakes und root-eigene temporäre Testdateien |

Die neue Lifecycle-Prüfung umfasst fehlendes Enrollment, 30-Sekunden-Backoff,
erfolgreiche Wiederaufnahme, klare Fehler bei ungültigen Profilen, unterdrückte
private Fehlerdetails, Switch-Typen, Lizenzwiderruf/-erneuerung, echte
Verbindungsanzeige, Inventar-/Protokollfehler und Shutdown während des Starts.
Die unabhängige interne Peer-Codeprüfung fand zusätzlich zwei asynchrone
Shutdown-Races: Ein verspäteter Ready-Schritt konnte nach Unload erneut einen
Timer anlegen; eine bereits abgesendete Verbindungsstatus-Schreibung konnte
das abschließende `false` wieder durch `true` ersetzen. Beide Pfade wurden
korrigiert: Unload wartet die vollständige Initialisierung ab, nach jedem
Initialisierungs-Await wird Abbruch geprüft, Statusschreibungen werden
generationsgebunden serialisiert und der finale Offline-/Stopped-Status folgt
erst hinter bereits laufenden Schreibungen. Vier deterministische Barrieren-
Tests prüfen Initialstatus, Health-Reset, Lizenzstart und verspätete sowie
aufgereihte Verbindungs-Schreibungen. Interne Peer-Prüfung ist keine unabhängige
Zertifizierung.
Die TLS-Prüfung umfasst jetzt zusätzlich fehlendes Manifest, ungültiges JSON,
fehlende Zertifikate sowie unsichere beziehungsweise symbolische Vorfahren eines
fehlenden Unterordners. Alle bisherigen negativen TLS-/Identitätsfälle bleiben.

Der TLS-Test läuft allein mit Root im wegwerfbaren Prüfcontainer und erstellt
ausschließlich sein zufälliges `/root/eos-ocpp-security-*`-Verzeichnis sowie
einen Loopback-Listener. Das ist keine Erlaubnis, einen Adapter als Root zu
betreiben. Es wurden keine realen `/etc/nexowatt-eos`-Profile verändert.

## Nächster Praxistest und Rückfall

1. Vor EOS-Update vorhandenen geprüft wiederherstellbaren Stand und die
   bisherige Konfiguration sichern; aktualisieren nur über den freigegebenen
   signierten EOS-Updateweg.
2. Neue Instanz ohne Profil starten: Prozess bleibt am Leben,
   `awaiting_transport_enrollment`, `info.connection=false`, kein Listener,
   keine Wiederholungsfehler und kein Stationsbefehl.
3. Echte Station, Firmware und Zertifikatsfähigkeit feststellen. Geschütztes
   Profil vollständig durch Administration bereitstellen und danach die
   Admin-Option aktivieren. Erwartung: `listening`, zunächst weiter keine
   Stationsverbindung; beim gültigen Stations-Handshake `info.connection=true`.
4. Falsche CA/SAN/TLS-Version ablehnen, danach echte Messdaten, Aktualität,
   Anlagenlimits und kontrollierte Befehle prüfen. Lizenzverlust und Neustart
   dürfen keine alten Bedienbefehle nachholen.
5. Bei Fehlern Inbetriebnahme nicht erzwingen. Bereinigte Diagnosecodes und
   Versionsstand erfassen; Rückfall über den zuvor verifizierten EOS-Stand,
   niemals durch TLS-Abschaltung oder Austausch historischer Signaturen.

Pi-/systemd-Betrieb, reale Firmware, Stationszertifikatsbereitstellung,
Anlagensteuerung, Langzeitlauf, Paket-SBOM und Produktions-/CRA-Abnahme bleiben
Aufgaben der übergeordneten Integration. Dieser Vermerk bestätigt keine
100-Prozent-Funktion aller Ladestationen und keine neue CRA-Konformität.
