# R7: öffentlicher Einstieg zur eingegrenzten Erststart-Wiederherstellung

04.10.2026 · Hersteller-/CI-Werkzeuge und Transporttests. Der neue Einstieg ist
ausschließlich für den authentifizierten R4-Teststand mit fehlgeschlagenem
Erststart vorgesehen. Er ist weder der R6-Bestandsupdater noch ein allgemeiner
Reparatur- oder Neuinstallationsbefehl. Die historischen R4/R5/R6-Dateien bleiben
unverändert.

## Neue Dateien und Ausgabevertrag

- `tools/bootstrap/build-public-r7-recovery-entry.cjs`
- `tools/bootstrap/prepare-public-r7-recovery-publication.cjs`
- `tests/bootstrap/public-r7-recovery-entry.test.cjs`
- `tests/bootstrap/public-r7-recovery-publication.test.cjs`

Der Builder liest das tatsächlich vorhandene signierte Archiv unter
`delivery/test-pi-0.2.0-test.3-r7`. Release-ID und Schlüssel werden nicht vorab
erfunden. Vor einer Ausgabe muss er die vollständige R7-Archivsignatur, Revision
7 / Sequenz 10, Node 24.21.0, Linux ARM64, Archivgröße und -SHA-256 sowie die
exakten Bytes des mitgelieferten Wiederherstellungshelfers bestätigen. Dessen
erlaubte Ausgangsbasis muss genau die bekannte R4-Release-ID, Sequenz 7 und den
bekannten R4-Schlüssel enthalten. Historische R4/R5/R6-Release-IDs und Schlüssel
werden als neues R7-Ziel abgewiesen.

Ausgabe ist ausschließlich ein neuer Ordner `delivery/public-recovery-test3-r7`:
zunächst `recover.sh`, `preparation.json` und nach tatsächlichem öffentlichen
Download `remote-readback.json`; anschließend `RECOVERY_COMMAND.txt` und
`command-verification.json`, gebunden an den bereits veröffentlichten
Einstiegscommit. Bestehende Ausgaben werden nicht überschrieben. Der Publisher
akzeptiert jeweils nur die vollständige neue Dateiliste, Modus `100644`, den
erwarteten HEAD und keine zusätzlichen oder veränderten Quellen.

## Laufzeitgrenze

Der spätere Operatorbefehl bindet eine unveränderliche öffentliche Commit-URL,
exakte Länge und SHA-256 des Skripts. HTTPS-Downloads erlauben keine Redirects,
prüfen Größe/Hash und lehnen symbolische Links, Hardlinks sowie bestehende Ziele
ab. Heruntergeladener Code wird erst nach vollständiger Archiv-Hashprüfung
geladen. Der danach gestartete Recoveryhelfer prüft zusätzlich Signaturen,
Inventar, Eigentümer und die konkrete lokale Erststart-/Sperr-/Handoff-Situation.
Ein erfolgreich eingerichtetes R4, R5/R6 oder ein unbekannter beschädigter Stand
gehört nicht zum Eingangsvertrag.

Der Einstieg verwendet einen privaten Root-Ordner, bereinigte Umgebung,
vertrauensgeprüfte Basiswerkzeuge und die gesonderte transiente Unit
`nexowatt-eos-first-start-recovery-r7`. Sie hat ein begrenztes Start-/Stoppbudget
und `ExecStopPost=... --quiesce-incomplete`. Der Nachlauf übernimmt ausschließlich
die vom Helfer geschützte eigene systemd-Invocation. Es gibt weder einen Force-
Schalter noch pauschales Löschen von Sperren, Passwort-Rücksetzung, APT-Aufruf
oder erneutes Provisionieren des Systems im Transportskript.

Der Wiederherstellungshelfer und dessen genaue R4-Zulässigkeits-/Rückfalltests
werden separat geprüft. Transporttests stellen keine erfolgreiche Zielreparatur
dar. Passwort, UUID, Lizenz, Datenbank und Anlagenfreigaben dürfen durch den
Transport nicht neu gesetzt werden.

## Tatsächliche Prüfungen

Linux x64, Node 24.19.0: **25/25 Tests bestanden**, keine übersprungen.
Rohbeleg: `raw/public-r7-recovery.tap`. Die Tests führen echte Bash-, stat-,
SHA-256-, Python-Archiv- und temporäre Git-Operationen aus. Netzwerkantworten
werden durch begrenzte Datei-Fixtures dargestellt; systemd/Pi werden nicht
gestartet. Geprüft sind erfolgreiche und manipulierte Downloads, Traversal,
Links, Unveränderlichkeit, Signatur-/Release-Metadaten, Recoveryhelper-Bindung,
Supervisor-Umgebung, Veröffentlichungsgrenzen und vollständige Assetnachweise.
Beide generierten Bash-Einstiege bestehen `bash -n` innerhalb der Suite.

Ein anfänglicher Testlauf hatte 24/25 Erfolge: die richtige Abweisung einer
verbreiterten Scope-Konfiguration meldete noch den inneren Entry-Diagnosecode
statt des äußeren Publikationscodes. Die Publikationsschnittstelle vereinheitlicht
diesen Fehler jetzt. Der negative Rohbeleg bleibt unter
`raw/initial-publication-diagnostic.tap` erhalten; er war kein freigegebener
Download oder Zielversuch.

`verification.json` bindet Befehle, Umgebung, Quell- und Rohbelegdateien. Eine
endgültige signierte R7-Erzeugung, öffentliche Asset-/Einstiegsrücklesung und
Pi-Ausführung werden durch diesen lokalen Bericht ausdrücklich nicht behauptet.
Die Veröffentlichung darf erst nach Abschluss der eigenständigen Recovery- und
R7-Buildprüfungen erfolgen. Anlagensteuerung, Hardwareabnahme und
Produktionsfreigabe bleiben getrennt.
