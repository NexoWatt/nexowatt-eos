# EOS-ADMIN-WIZARD-20261005

Basis: `c6b433fc4f4e73b5ae5fe05dbf92ba511bbc6859`, `main`. Anlass ist der vom
Nutzer nach erfolgreicher R8-Wiederherstellung gemeldete zusätzliche
ioBroker-Startassistent. Private Gerätebilder und Konfigurationsdaten werden
nicht veröffentlicht.

## Änderung

`runtime/bootstrap/enrollment.cjs` setzt bei neuem EOS-Erststart und Labor-
Enrollment `system.config.common.licenseConfirmed=true`. Beide Pfade erhalten
die übrigen Konfigurationsfelder und verlangen weiter `diag='none'`.
Bestehende Bootprüfungen und die Admin-Socket-Berechtigungen bleiben unverändert.
Es gibt keine neue Pflichtmarkierung, die historische R8-Installationen sperrt.

Für das bereits eingerichtete R8-System ergänzt der Commit einen auf genau dieses
Release begrenzten Python-/SQL-Helfer. Die SQL-Transaktion setzt nur das fehlende
Flag und veröffentlicht das normale PostgreSQL-Objektänderungsereignis. Die
Dateihashes in `source-hashes.json` binden die nachstehend geprüften Quellen.
Kein R8-Archiv und keine signierte Auslieferungsdatei wird geändert.

## Prüfungen und Grenzen

- Node 24.19.0, synthetische Enrollment-Objekte: 37/37 bestanden. Dieselben Tests
  mit dem vorherigen HEAD-Modul: 33 bestanden, vier erwartete Regressionen.
  Rohbelege `enrollment-before.tap` und `enrollment-after.tap`; abschließende
  Leerzeichen im Vorher-Beleg entfernt, Ergebnisse unverändert.
- Das getestete Wizard-Prädikat stammt aus dem tatsächlichen Admin `App.tsx`.
  Prüfung von Schema-3-Erststart, älterem Erststart, Labor-Enrollment, Passwort-,
  UUID- und Einstellungserhalt, identischer Wiederholung und unterbrochenen
  Schreibvorgängen. Historische Flagzustände bleiben bootprüfbar.
- SQL: 24/24 bestanden, 0 übersprungen, mit PGlite 0.5.8 / PostgreSQL 18.3 WASM.
  Der tatsächliche SQL-Helfer läuft gegen das Produktschema mit Rollen/RLS.
  Geprüft sind Datenerhalt, Ereignis, Wiederholung, Ablehnung unvollständiger
  Einrichtung oder Policyabweichung sowie Rücknahme bei fehlgeschlagenem Event.
  Rohbeleg: `sql-wasm.tap`. Das ist kein Nachweis für PostgreSQL 17, Transport,
  systemd oder ARM64. Derselbe Test ist in der bestehenden nativen PostgreSQL-
  17.11-CI eingebunden; Ergebnis dieser Veröffentlichung zunächst OFFEN.
- Python-Wrapper: 17/17 stdlib-Tests bestanden. Temporäre Dateibäume und
  simulierte Dienste prüfen Release-/Completion-Bindung, SQL-Pin, private
  Ausgabe, Abbruch vor DB-Zugriff und Erhalt fremder Sperren. Keine echten
  Systemdienste oder Produktdatenbanken kontaktiert. Rohbeleg: `wrapper-tests.txt`.
- `node --check runtime/bootstrap/enrollment.cjs` und `git diff --check` bestanden.
  Lokales actionlint konnte wegen Proxy-Timeout beim Download nicht ausgeführt
  werden (`workflows.txt`); die unveränderte bestehende CI-Prüfung bleibt aktiv.

Offen bleiben die Ausführung dieses neuen Helfers auf dem Test-Pi, das tatsächliche
Browser-Neuladen ohne Wizard, Ab-/Anmeldung und Neustart. Die zuvor gemeldete
erfolgreiche R8-Wiederherstellung ist kein Nachweis dieser neuen Korrektur.
Keine Aussage vollständiger Stabilität, Anlagen- oder Produktionsfreigabe.

## Rückfall und verbleibende Grenzen

Ein SQL-Fehler vor COMMIT hinterlässt keine Teiländerung. Wiederholung nach
unklarem Verbindungsende ist idempotent. Fremde oder nach hartem Prozessabbruch
verbliebene Wartungssperren werden nicht automatisch entfernt. Der Helfer prüft
den root-geschützten R8-Zustand und Zeiger; er ist kein erneuter vollständiger
Signatur-/Dateiinventurtest des bereits gestarteten R8-Pakets.

Die Telemetrie bleibt deaktiviert, Lizenzhinweise werden weiter ausgeliefert.
SBOM und Abhängigkeiten des historischen R8-Pakets bleiben unverändert. Die
Änderung führt keine zusätzliche Produktabhängigkeit ein; Python und psql sind
bereits vorhandene Betriebssystemwerkzeuge. Die lokale PGlite-Testabhängigkeit
gehört ausschließlich zum Entwicklungsprüfstand.

[Bedienung und Fehlerbehandlung](../../../docs/operations/COMPLETE_R8_ADMIN_SETUP_DE.md).

## Veröffentlichung

Quellen veröffentlicht auf `main` als `44768e2bfaed979663f52efc730bc61dfe1e1f81`. Python und SQL
wurden anschließend über die öffentliche GitHub-Schnittstelle vom exakten
Commit zurückgelesen und bytegenau mit den geprüften Dateien verglichen.
Der getrennte Befehls-/Dokumentationscommit bindet beide Downloads an diese
Quellrevision und deren SHA-256. Die GitHub-Läufe dieses Quellstands sind
[Security](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37355237825),
[Workflowprüfung](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37355237848)
und [CodeQL](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37355237867);
die Workflowprüfung war erfolgreich, Security und CodeQL beim
Veröffentlichen des Befehls noch in Arbeit. Äußere und innere Bash-Syntax des
fest gebundenen Befehls wurden mit `bash -n` geprüft; der Pi-Befehl selbst
wurde hier nicht gegen ein Gerät ausgeführt.
