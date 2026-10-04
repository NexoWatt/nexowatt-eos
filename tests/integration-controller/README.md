# Nativer Controller-/PostgreSQL-Startnachweis

04.10.2026 · Ergänzung zur Untersuchung `EOS_PG_TRANSACTION_FAILED` beim
tatsächlichen Controller-Hostobjekt und zum PID-Schreibzugriff im unveränderlichen
Releasebaum. Dies ist ein Entwicklungsprüfstand, kein Pi-Reparaturbefehl.

Der zusätzliche Job `native-postgresql-controller` im bestehenden
`security-review.yml` verwendet Node 24.21.0 und eine echte, als normaler
Runnerbenutzer gestartete PostgreSQL-17.11-Instanz. Der Server wird aus dem bereits
in `reports/integration/postgresql/environment.json` gebundenen offiziellen
Quellarchiv gebaut; Downloadgröße und SHA-256 werden vor dem Entpacken geprüft.
Controller 7.2.2 und `pg` 8.23.1 werden ausschließlich aus den vorhandenen
Lockdateien mit deaktivierten Lifecycle-Skripten installiert. Kein bestehender
Hostcluster und keine vorhandene Datenbank werden verwendet.

Der Controller erhält die aktuellen Controller-/PID-Buildtransformationen.
`stageLaboratory` übernimmt die aktuellen drei PostgreSQL-Backendpakete aus
`runtime/postgresql/packages`; es wird kein historisches Backend aus einem
R4-/R6-Archiv als neuer Prüfling ausgegeben. Die vorhandenen Kopier-,
Hash-, Paketidentitäts- und leere-Datenbank-Prüfungen bleiben verbindlich.

Die vorhandene native Integrationssuite prüft nun ausdrücklich:

- reale Objects-/States-Verbindungen mit geprüfter Gegenstelle und TLS 1.3;
- tatsächliches Controller-CLI-Setup ohne aktive physische Adapter;
- tatsächlichen Controllerstart und dessen Hostobjekt in PostgreSQL;
- leeres gespeichertes Prozessumfeld statt übernommener Umgebungswerte;
- frische `alive`-/PID-Zustände und zugehöriges Ereignis zwischen Prozessen;
- die unveränderte Produktfunktion `waitController`, einschließlich bestätigtem
  aktuellem Heartbeat, exakter Prozess-PID und Hostversionsprüfung;
- echten PID-Pfadzugriff und eine ausdrücklich separate Datei-Schreibprobe im
  vorgesehenen Datenverzeichnis, während das Controllerverzeichnis für den
  unprivilegierten Prozess nachweislich nicht beschreibbar ist;
- reguläres Stoppen, erneuten Start mit neuer PID und abschließendes Stoppen.

Das feste PID-Verzeichnis wird ausschließlich auf einer frischen, wegwerfbaren
GitHub-VM angelegt. Bereits vorhandenes `/var/lib/nexowatt-eos` führt zum Abbruch.
Alle Produktprogramme und PostgreSQL laufen ohne Rootrechte. Root wird nur für
die isolierte Verzeichnisbereitstellung verwendet. Kurzlebige Zertifikate und
Datenbankdateien liegen im privaten temporären Labor und werden nicht als
Workflow-Artefakte hochgeladen. TAP und Transformationshashes sind die einzigen
Artefakte; Roh-Konfigurationen und Schlüssel sind ausgeschlossen.

Lokale Syntax-/YAML-/Pfadprüfungen ersetzen diesen nativen Lauf nicht. Im lokalen
Arbeitsraum ist ausschließlich UID 0 abgebildet; die native Ausführung bleibt
hier gesperrt. Erst der konkrete GitHub-Job kann den nativen Erfolg nachweisen.
Auch ein erfolgreicher Job wäre keine Pi-/ARM64-, systemd-Mount-, Admin-/UI-,
Anlagen-, Backup-/Restore- oder Produktionsabnahme. Die Unix-Modusprüfung
reproduziert den PID-Schreibschutz, nicht sämtliche `ProtectSystem`-Eigenschaften.
Der adapterfreie Controllerstart löst die Upstream-Funktion `storePids` nicht
aus; diese wird bei Adapter-Prozesswechseln aufgerufen. Der native Job behauptet
deshalb keinen tatsächlich ausgelösten Adapter-PID-Schreibzyklus. Die separate
PID-Transformationssuite prüft die wirkliche Writer-/Reader-Funktion.
Ein regulärer Stop von Controller 7.2.2 endet mit dessen definiertem
`JS_CONTROLLER_STOPPED`-Code 1; die Prüfung bindet sich an den tatsächlichen
Export und wertet das nicht als Startfehler.

Lokaler Aufruf auf einer eigens vorbereiteten, unprivilegierten Test-VM:

```sh
bash tests/integration-controller/prepare-native.sh /absoluter/privater/laborordner
node tests/integration-controller/run-native.cjs /absoluter/privater/laborordner
```

Der Laborordner muss frisch, real, dem Benutzer zugeordnet und Modus `0700` sein.
Der Aufruf gehört ausschließlich auf einen separaten Entwicklungsprüfstand.
