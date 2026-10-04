# Einmaliges Testupdate von R4 oder R5 auf R6

Stand: 04.10.2026. R6 liefert die NexoWatt-Logos und Browser-/Login-Korrekturen
aus dem Quellcommit `e699a6d575974574ffc4f48d47fe647f6f147f2a` an das bestehende
Testsystem. Es bleibt bei `0.2.0-test.3`, neuer Lieferrevision 6 und Sequenz 9.
Die sechs Produktadapter und die Home-/Pro-Systemlizenz bleiben Bestandteil.
Zwei im bisherigen Backup-Paket fehlende Hilfsmodule für SD-Karten und InfluxDB
werden mit ihren bereits festgelegten, unveränderten Dateiprüfsummen ergänzt.

Diese Anleitung beschreibt den neu vorbereiteten Updateweg. Der konkrete,
veröffentlichte Befehl steht erst nach erfolgreichem Build und öffentlicher
Rückleseprüfung in der aktuellen README auf `main`. Ein vorbereiteter Workflow
allein ist kein veröffentlichtes Paket und kein ausgeführtes Pi-Update.

## Unterstützter Ausgangsstand

Vollständig eingerichteter R4- oder R5-Teststand auf Linux/ARM64 mit Node
24.21.0. Der Updater prüft Release-ID, Sequenz, Signierschlüssel, signierte
Dateien und den geschützten Erststartnachweis. Ein von R4 aktualisiertes R5
behält seinen alten Erststartnachweis; zusätzlich muss seine geschützte,
erfolgreich abgeschlossene R4→R5-Herkunft nachweisbar sein.

Andere, beschädigte oder bereits auf R6 aktualisierte Stände werden abgewiesen.
Es gibt keinen Force-Schalter. Der Befehl ist keine Neuinstallation und verlangt
keinen Zwischenlauf über R5, wenn der erlaubte R4-Ausgangsstand vorliegt.

## Auf dem Pi

1. Vor dem Test eine überprüfte Sicherung und einen gesicherten Anlagenzustand
   bereitstellen. Der Paketwechsel ersetzt keine Datensicherung.
2. Den vollständigen aktuellen R6-Befehl aus der README einmal im SSH-Terminal
   des normalen Administrationskontos ausführen. Er verwendet dessen `sudo`.
3. Auf der bisherigen HTTPS-Adresse als `admin` mit dem bestehenden Passwort
   anmelden. Admin, UI und Backup-Oberfläche auf NexoWatt-Logos prüfen; abmelden,
   erneut anmelden und einen normalen Neustart prüfen. Lizenz und UUID müssen
   erhalten bleiben. Gerätefreigaben und physische Befehle werden nicht erweitert.

Passwort, Datenbank, Lizenz und Zertifikate werden nicht neu eingerichtet.
Ein Fehler lässt lokale Belege zurück. Sperrdateien nicht löschen und keinen
frischen Installer über die vorhandene Installation starten. Der kontrollierte
Rückfall stellt den vorherigen Paketzeiger wieder her und lässt den Controller
bei einem fehlgeschlagenen Test gestoppt; unklare Teilzustände benötigen Prüfung.

Bei einem Fehler zunächst den Diagnosecode und diese lesenden Angaben melden:

```sh
uptime
free -m
systemctl show nexowatt-eos-controller.service nexowatt-eos-postgresql.service \
  --property=Id,ActiveState,SubState,Result,ExecMainCode,ExecMainStatus,NRestarts,MemoryCurrent,MemoryPeak,MemoryMax
```

Keine Passwörter, privaten Schlüssel, vollständigen Konfigurationen oder
Lizenz-/Sitzungstokens in öffentliche Fehlerberichte übernehmen.

## Herstellung und Bindung

Der neue Workflow `.github/workflows/eos-r6-test-delivery.yml` führt drei getrennte
Schritte aus: geprüften Kandidaten bauen, nur neue Lieferdateien veröffentlichen,
anschließend den öffentlichen Updatebefehl an unveränderliche Commits binden.
Veröffentlichungen erfolgen nur als normaler Fast-forward auf unverändertem
`main`; konkurrierende Arbeit wird nicht überschrieben.

Das R5-Basisarchiv wird anhand seiner bisherigen Größe, SHA-256 und Signatur
authentifiziert. Explizite Quellübernahmen erhalten neue Dateitabellen,
Katalogdigests und eine abgeleitete SBOM. R6 erhält einen neuen ephemeren
Ed25519-Testschlüssel; dessen privater Teil wird nicht gespeichert. Der neue
Befehl bindet öffentlichen Schlüssel, Archiv und Release ausdrücklich.
Historische R4/R5-Dateien und ihre Pins bleiben unverändert.

Die R6-Werkzeuge sind separat benannt:

- `reports/integration/installable-test3-r6-20261004/build-revision.cjs`
- `tools/system/update-test-to-r6.cjs`
- `tools/bootstrap/build-public-r6-update-entry.cjs`
- `tools/bootstrap/prepare-public-r6-update-publication.cjs`

Der generierte Einstieg prüft Größe und SHA-256 vor jeder Codeausführung,
verwendet feste HTTPS-Commit-URLs ohne Weiterleitungen und private Root-Ordner.
Ein vorübergehender systemd-Dienst überwacht den Updateprozess und die an dessen
Invocation gebundene Abbruchbereinigung. Die Veröffentlichung liest die echten
öffentlichen Dateien zurück; sie führt den Updatebefehl nicht auf dem Pi aus.

Reale ARM64-Ausführung, systemd-Unterbrechung, Admin-Anmeldung, Neustart,
Backup/Wiederherstellung und Anlagenabnahme bleiben bis zum Zieltest **OFFEN**.
Dies ist ein Testkandidat, keine Produktions- oder CRA-Konformitätsfreigabe.
