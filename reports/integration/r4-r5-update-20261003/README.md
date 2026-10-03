# Gezielte R4-zu-R5-Testreparatur

Status: lokaler Implementierungskandidat. Kein auf dem Raspberry Pi ausgeführtes
Update, kein bestandener Admin-Login und keine Produktions-/Hardwarefreigabe.

Das vorhandene `eos-base extend` erlaubt ausschließlich zusätzliche Adapter mit
demselben Signierschlüssel. Es ist für die Änderung des bestehenden Admin-Codes
nicht geeignet. Der private R4-Testschlüssel wurde zudem nicht gespeichert.
Eine Neuinstallation über bestehende Daten würde die Installationsschutzregeln
verletzen. Deshalb gibt es einen eigenen, eng begrenzten Wartungspfad.

## Vertrauens- und Zustandsvertrag

- Ausschließlich root, Linux ARM64, Node 24.21.0, bekannte R4-Release-ID,
  Sequenz 7 und bekannter R4-Testschlüssel.
- Neuer Kandidat: `0.2.0-test.3`, Testprofil, Sequenz 8. Neue Release-ID und neuer
  Schlüsselhash müssen unabhängig im unveränderlichen Downloadbefehl festgelegt
  werden. Dies ist eine ausdrückliche lokale Vertrauensentscheidung des
  Betreibers; es wird keine Signaturkontinuität mit dem verlorenen R4-Schlüssel behauptet.
- Abgeschlossener Erststart, vorhandene Initialisierung, aktive PostgreSQL-Unit,
  unveränderte installierte systemd-Units, unverändertes Datenbankschema und
  unveränderte Adapterzulassungen. Anlagenadapter bleiben gesperrt.
- Vollständige Signatur- und Dateiprüfung beider Releases, geschützter Import,
  unveränderliches neues Release-Verzeichnis, eigener Nachweisordner sowie
  erneuter nativer Lade-Test ohne Geräte-I/O.
- Ein gemeinsames Wartungsschloss verhindert konkurrierende Erststart-,
  Zertifikats- oder Release-Vorgänge. Nur der Controller wird angehalten.
- UUID, Konten/Passwort, Lizenz, Datenbank, Einstellungen, CA und Zertifikate
  werden nicht neu provisioniert. Root-Konfiguration wird während des Vorgangs
  verglichen; ein fremder Zustand wird nicht überschrieben.
- Nach dem Wechsel müssen Controller-Start, frische Alive-Zustände von Admin/UI
  und beide HTTPS-Endpunkte bestehen. Der Test führt keinen Passwort-Login aus.

## Fehler und Unterbrechung

Vor dem Anhalten des Controllers wird das eigene Schloss bei Fehlern entfernt.
Ab dem ersten Stop-Versuch bleibt das Schloss bei Fehlern bestehen. Nach einer
gescheiterten Probe werden ausschließlich eigene, exakt wiedererkannte
Pointer-/Release-State-Werte zurückgesetzt. Der alte Controller wird nicht
automatisch neu gestartet: `RESTORED_STOPPED` verlangt eine lokale Prüfung.
Bei abweichendem Zustand oder fehlgeschlagenem Stop lautet der Bericht
`RECOVERY_REQUIRED`. Die Ausführung verlangt eine systemd-Invocation-ID. Der
Downloadbefehl muss eine beaufsichtigte One-shot-Unit mit
`ExecStopPost=... --quiesce-incomplete` verwenden: Der Nachlauf widerruft die
Startfreigabe und stoppt den Controller, wenn das Schloss zur eigenen
unvollständigen Reparatur gehört. Ein fremder Wartungsvorgang wird nicht beendet.
Das Schloss allein stoppt keinen bereits laufenden Prozess. Ein tatsächlich
ausgeführter SIGKILL-/SSH-Abbruchtest auf dem Pi steht noch aus.

PostgreSQL und SSH werden durch dieses Werkzeug nicht angehalten. Die bisherigen
Release-Verzeichnisse und Nutzerdaten bleiben erhalten. Ein Datenbank-Backup mit
Restore-Nachweis und die tatsächliche Reparatur auf dem Zielgerät sind damit
nicht ersetzt.

## Tatsächlich geprüfter Umfang

21 lokale Tests auf Linux x64 / Node 24.19.0 bestanden. Sie prüfen insbesondere
falsche Pins, fremde Wartungsschlösser, Unit-/Schema-/Zulassungsänderungen,
Signatur-/Native-Gate-Abbruch, erfolgreichen Dateitransaktionsablauf,
HTTPS-/Readiness-Fehler, fremden Pointer/State, Konfigurationskonflikte,
fehlgeschlagenen Stop, Journal-I/O-Fehler, fsync-Fehler nach dem Entsperren,
abgelehnte Tool-Vertrauensprüfung und den systemd-Nachlauf einschließlich
Journal-Rückfall bei geschütztem, unvollständig geschriebenem eigenem Schloss.
Ein gültiges fremdes Schloss wird nicht durch ein altes Journal überstimmt.
Service-, Signatur- und native
Ausführung sind in diesen Transaktionsfixtures injiziert; die gemeinsamen
Prüfmodule werden hier nicht als realer ARM64-/systemd-Test ausgegeben.

Rohprotokolle und Quellhashes: `verification.json`, `updater-tests.stdout.log`,
`updater-tests.stderr.log`. Vor Veröffentlichung muss R5 den neuen
Wartungstyp `test-release-repair`, dieses Werkzeug und einen passend
geprüften, hashgebundenen Downloadbefehl enthalten. Ein manuell ausgedachter
R5-Hash darf nicht als ausführbare Anleitung veröffentlicht werden.
