# Frischinstallation und Updates im Admin

Stand: 22.10.2026 (Präzisierung der Automatik und direkter R8-Übergang). Nutzerauftrag:
Linux-Sicherheitsupdates und freigegebene Node-24-Updates selbstständig installieren;
allgemeine EOS-Anpassungen weiterhin über den Updateknopf. Zusätzlich soll der neue
Stand direkt von R8 erreichbar sein, ohne R9–R11 einzeln zu installieren. Quellimplementierung
für eine neue Testbasis, keine ausgelieferte Version oder Gerätefreigabe.

| ID | Anforderung / Umsetzung | Nachweis / Grenze |
| --- | --- | --- |
| MU-01 | Eigenständige Frischinstallation ab Sequenz 15 ohne vorhandenes R4/R10; Erststart legt sechs eigene Instanzen an | Enrollment- und Hostinstallations-Fixtures; vollständiger Pi-Erststart OFFEN |
| MU-02 | Service/Installateur prüft und startet ein freigegebenes EOS-Update im Admin | Aktuelle Session zweimal geprüft, HTTPS, Herkunft und eigenes Headerfeld; HTTP-Vertragstests |
| MU-03 | Browser/Adapter liefert weder URL noch Shellbefehl; ausschließlich freigegebene Release-ID | Exakte Anfragefelder, signierter fester Feed, hashgebundenes GitHub-Release-Asset oder unveränderlicher Artefakt-Commit |
| MU-04 | Update läuft unabhängig vom Browser und Controller-Neustart | Separater root-eigener systemd-Dienst, begrenzter Unix-Socket, Statusjournal; echter systemd-Ablauf OFFEN |
| MU-05 | Authentische, passende und neuere Pakete | Ed25519 für Feed und Manifest, SHA-256/Größe, gleicher dauerhafter Schlüssel, ARM64/Node 24 ab 24.22.1, explizite Vorgänger-ID, steigende Sequenz |
| MU-06 | Verbindungsausfall und Doppelklick dürfen keine parallelen Transaktionen auslösen | Ein Auftrag, begrenztes Staging, Status nach Wiederverbindung; Neustart mit offenem Auftrag sperrt weitere Updates |
| MU-07 | Fehler führen zum geprüften alten Stand oder zu einer gesperrten Wiederherstellung | Pointer/Zustand/Asset-Rückfall mit 21 injizierten Transaktionsfehlerprüfungen; Stromausfall und Pi OFFEN |
| MU-08 | Konten, Lizenz, UUID, TLS und Datenbank bleiben erhalten | Geschützte Dateien bytegleich, keine neue Einschreibung bei Folgeupdates; reale Daten-/Backup-Abnahme OFFEN |
| MU-09 | Nachweis an tatsächlich geprüfte Quellen binden | Prüfbericht, Dateihashes, rohe TAP-Dateien, eigener CI-Workflow; keine Übernahme historischer PASS für neue Hardwareabläufe |
| MU-10 | Node-24-Aktualisierungen ohne Bedienklick installieren | Gesonderte signierte Freigabe für reine Node-Pakete, unveränderte Anwendung und Hostverträge, nächtliches Zeitfenster, begrenzte Versuche, gesicherter Rückfall; Pi-Abnahme OFFEN |
| MU-11 | Vollständig eingerichtetes R8 direkt auf die neue Managed-Basis übernehmen | Eigener Migrationspfad für die genaue R8-Identität; Schlüssel-, Dienst- und Adapterübergang in einem kontrollierten Vorgang, ohne Installation der Zwischenreleases; Zielgeräteabnahme OFFEN |

## Unterstützter erster Updateumfang

Version 1 erlaubt Quellcode- und Assetanpassungen innerhalb der sechs eigenen
Adapter bei unveränderten Paketversionen, Abhängigkeiten, Zulassungsregeln,
Datenbank- und Hostverträgen. Catalog und SBOM müssen die neuen Dateien binden.
Zusätzlich werden signierte Node-24-Laufzeitaktualisierungen ab 24.22.1 ohne
Versionsrückschritt zusammen mit EOS aktiviert. Binärdatei, Lizenz und Metadaten
sind Bestandteil der Signatur und SBOM; ein Fehler verlangt gemeinsamen Rückfall.
Für die automatische Installation muss der Hersteller das Angebot zusätzlich
als reines Node-Update freigeben. Der Empfänger prüft unabhängig davon, dass
Anwendung, Adapterkatalog und Hostdateien unverändert sind. Ein bloßes
Freigabefeld darf keine beliebige EOS-Änderung zur automatischen Installation
berechtigen. Die nächtliche Automatik ersetzt keine Benutzerbestätigung durch
eine erfundene Sicherungs- oder Wartungszusage.
Eine Admin-8-/React-19-Migration, Adapterversionswechsel, Node-Hauptversionswechsel,
Datenbankmigration oder Änderung des privilegierten Updatedienstes benötigt
weiter einen gesondert geprüften Migrationspfad.

Linux-Pakete werden automatisch aus den freigegebenen signierten Quellen
aktualisiert. OS-/EOS-Transaktionen müssen sich gegenseitig sperren. Ausstehende
Kernel- und Dienstaktivierungen bleiben sichtbar; keine pauschale automatische
Neustartfreigabe für Energieanlagen. Details und Zielabnahme in der
[Betriebsanleitung](../operations/AUTOMATISCHE_SICHERHEITSUPDATES_DE.md).

## Freigabesperren

Noch erforderlich: dauerhafte geschützte Hersteller-Signierautorität,
Quellstandqualifikation und ARM64-Lieferpaket, unabhängig bestätigter öffentlicher
Schlüsselfingerprint, realer HTTPS-Artefakt-Rücklesetest einschließlich
Range-Verhalten, vollständige Installation auf leerem Pi sowie mindestens zwei
aufeinanderfolgende Updates per Admin einschließlich Unterbrechung/Rückfall.
Es gibt noch keinen freigegebenen neuen Neuinstallationsbefehl.

Keine Produktions-, Anlagen-, CRA-, Adapterisolations- oder Reaktionszeitfreigabe.
Bestehende Sicherheitsbefunde werden durch dieses Inkrement nicht geschlossen.
