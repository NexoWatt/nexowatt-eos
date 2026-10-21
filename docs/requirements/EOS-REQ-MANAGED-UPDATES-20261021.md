# Frischinstallation und Updates im Admin

Stand: 21.10.2026. Nutzerauftrag: Test-Pi einmal neu aufsetzen; weitere
Anpassungen anschließend über den Updateknopf installieren. Quellimplementierung
für eine neue Testbasis, keine ausgelieferte Version oder Gerätefreigabe.

| ID | Anforderung / Umsetzung | Nachweis / Grenze |
| --- | --- | --- |
| MU-01 | Eigenständige Frischinstallation ab Sequenz 15 ohne vorhandenes R4/R10; Erststart legt sechs eigene Instanzen an | Enrollment- und Hostinstallations-Fixtures; vollständiger Pi-Erststart OFFEN |
| MU-02 | Service/Installateur prüft und startet ein freigegebenes EOS-Update im Admin | Aktuelle Session zweimal geprüft, HTTPS, Herkunft und eigenes Headerfeld; HTTP-Vertragstests |
| MU-03 | Browser/Adapter liefert weder URL noch Shellbefehl; ausschließlich freigegebene Release-ID | Exakte Anfragefelder, signierter fester Feed, unveränderlicher Artefakt-Commit |
| MU-04 | Update läuft unabhängig vom Browser und Controller-Neustart | Separater root-eigener systemd-Dienst, begrenzter Unix-Socket, Statusjournal; echter systemd-Ablauf OFFEN |
| MU-05 | Authentische, passende und neuere Pakete | Ed25519 für Feed und Manifest, SHA-256/Größe, gleicher dauerhafter Schlüssel, ARM64/Node 24.21.0, explizite Vorgänger-ID, steigende Sequenz |
| MU-06 | Verbindungsausfall und Doppelklick dürfen keine parallelen Transaktionen auslösen | Ein Auftrag, begrenztes Staging, Status nach Wiederverbindung; Neustart mit offenem Auftrag sperrt weitere Updates |
| MU-07 | Fehler führen zum geprüften alten Stand oder zu einer gesperrten Wiederherstellung | Pointer/Zustand/Asset-Rückfall mit 21 injizierten Transaktionsfehlerprüfungen; Stromausfall und Pi OFFEN |
| MU-08 | Konten, Lizenz, UUID, TLS und Datenbank bleiben erhalten | Geschützte Dateien bytegleich, keine neue Einschreibung bei Folgeupdates; reale Daten-/Backup-Abnahme OFFEN |
| MU-09 | Nachweis an tatsächlich geprüfte Quellen binden | Prüfbericht, Dateihashes, rohe TAP-Dateien, eigener CI-Workflow; keine Übernahme historischer PASS für neue Hardwareabläufe |

## Unterstützter erster Updateumfang

Version 1 erlaubt Quellcode- und Assetanpassungen innerhalb der sechs eigenen
Adapter bei unveränderten Paketversionen, Abhängigkeiten, Zulassungsregeln,
Datenbank- und Hostverträgen. Catalog und SBOM müssen die neuen Dateien binden.
Andere Änderungen werden ausdrücklich abgelehnt. Eine Admin-8-/React-19-
Migration, Versionswechsel, Node-Wechsel, Datenbankmigration oder Änderung des
privilegierten Updatedienstes benötigt einen zusätzlich geprüften
Migrationspfad. Diese Arbeiten sind durch dieses Inkrement nicht erledigt.

Der neue Runtimepfad verlangt Node 24.21.0. Ältere Engine-Angaben und
Kompatibilitätslisten anderer Pakete wurden hier nicht pauschal geändert.

## Freigabesperren

Noch erforderlich: dauerhafte geschützte Hersteller-Signierautorität,
Quellstandqualifikation und ARM64-Lieferpaket, unabhängig bestätigter öffentlicher
Schlüsselfingerprint, realer HTTPS-Artefakt-Rücklesetest einschließlich
Range-Verhalten, vollständige Installation auf leerem Pi sowie mindestens zwei
aufeinanderfolgende Updates per Admin einschließlich Unterbrechung/Rückfall.
Es gibt noch keinen freigegebenen neuen Neuinstallationsbefehl.

Keine Produktions-, Anlagen-, CRA-, Adapterisolations- oder Reaktionszeitfreigabe.
Bestehende Sicherheitsbefunde werden durch dieses Inkrement nicht geschlossen.
