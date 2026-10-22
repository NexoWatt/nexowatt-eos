# Node-Paketierung und Erstinstallation – Prüfstand 22.10.2026

Die neue, noch nicht veröffentlichte Managed-TEST-Basis verwendet **Node
24.22.1** und weiterhin **js-controller 7.2.5**. Node wird künftig mit dem
signierten EOS-Paket ausgeliefert. Ein freier `latest`-Download auf der Anlage
ist nicht vorgesehen. Historische signierte Lieferungen und ihre Prüfbelege
werden nicht geändert.

## Herkunft und Liefervertrag

Die offizielle [Node-Veröffentlichung vom 21.10.2026](https://nodejs.org/en/blog/release/v24.22.1)
nennt diese vollständigen SHA-256-Werte:

| Offizielles Archiv | SHA-256 |
| --- | --- |
| `node-v24.22.1-linux-arm64.tar.xz` | `dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e` |
| `node-v24.22.1-linux-x64.tar.xz` | `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6` |

`tools/integration/node-runtime-policy.json` enthält ausschließlich vom
Hersteller geprüfte Versions-/Archivpins. Das Buildwerkzeug prüft das gesamte
offizielle Archiv vor dem Entpacken. Es übernimmt ausschließlich den passenden
ELF-Interpreter und die vollständige Node-Lizenz; es führt ARM64-Code dabei
nicht aus. Links, doppelte ausgewählte Einträge, falsche Architektur, falscher
Hash und Größenüberschreitungen führen zum Abbruch.

Das signierte EOS-Inventar und die SBOM binden gemeinsam diese drei Dateien:

| Pfad | Modus | Bindung |
| --- | --- | --- |
| `node-runtime/bin/node` | `0755` | ELF-Architektur, Größe und SHA-256 |
| `node-runtime/LICENSE` | `0644` | Vollständiger Lizenzinhalt und SHA-256 |
| `node-runtime/runtime.json` | `0644` | Schema, Version, Plattform und die drei Herkunfts-/Inhaltshashes |

Die Metadaten enthalten genau `schemaVersion`, `version`, `platform`,
`archiveSha256`, `binarySha256` und `licenseSha256`. Die SBOM führt Node als
eigenständige Anwendung mit dem Bezug `eos-node-runtime:<version>:linux-arm64`.
Sie authentifiziert zusätzlich den genauen Metadateninhalt und die Lizenz.
Ein Ersatz oder das Weglassen eines dieser Bestandteile wird verworfen.

Der installierte Versionsvertrag bleibt bei Mindestversion 24.22.1 und
Hauptversion 24. Ein Herstellerwechsel auf einen späteren 24.x-Stand benötigt
neue geprüfte Archivpins, einen vollständigen neuen Build, neue native
Qualifikation und eine neue Herstellersignatur. Die Laufzeit-Helfer auf der
Anlage müssen dafür nicht umgeschrieben werden. Die einzelnen Transaktions-
und Rückfallprüfungen stehen im benachbarten Bericht `node-transaction`.

## Herstellerwerkzeuge und Veröffentlichung

Die frische Vorbereitung erwartet zusätzlich das lokale, offiziell gepinnte
ARM64-Archiv:

```text
node tools/integration/prepare-security-refresh.cjs --output ABS_OUTPUT --sequence 15 --resolution-lock ABS_LOCK --node-archive ABS_NODE_ARCHIVE
node tools/bootstrap/build-managed-test.cjs --prepared-runtime ABS_PREPARED --native-evidence ABS_EVIDENCE --private-key ABS_EXTERNAL_KEY --public-key-sha256 PUBLIC_KEY_HASH --sequence 15 --node-archive ABS_NODE_ARCHIVE
```

`pack-prepared-runtime.cjs` behält seine bisherige Schnittstelle. Sein
unsigniertes Transportarchiv enthält jetzt zusätzlich zwingend die drei
Node-Dateien. Ein unsigniertes Laborarchiv ist kein installierbares Release.

Der Downloadgenerator akzeptiert zusätzlich `--node-archive ABS_NODE_ARCHIVE`.
Seine großen Dateien werden unter dem exakten GitHub-Releases-Tag
`managed-test-15-<releaseId>` bereitgestellt. Die Bootstrap-Übertragung erlaubt
nur HTTPS-Weiterleitungen zur GitHub-Asset-CDN, höchstens zwei Weiterleitungen
pro Abruf und höchstens fünf Sekunden je Bereich einschließlich Weiterleitungen.
Die Bereiche sind auf 1 MiB begrenzt; Größen, Bereichsangaben und anschließend
der vollständige, unabhängig gebundene SHA-256 werden geprüft. Das EOS-Archiv
ist auf 256 MiB begrenzt. Vor diesen vollständigen Prüfungen erfolgt keine
Extraktion oder Paketinstallation.

Das kleine `install.sh` wird separat über einen unveränderlichen Raw-GitHub-
Commit bereitgestellt. Bei einem GitHub-Releases-Assetziel erzeugt der Builder
deshalb zunächst **keinen** Installationsbefehl und meldet
`commandReady:false`. Nach Veröffentlichung des exakten Einstiegsskripts:

```text
node tools/bootstrap/build-managed-download.cjs --finalize-command ABS_OUTPUT --entry-base-url https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/COMMIT_40_HEX/delivery/PUBLIC_DIRECTORY
```

Die Finalisierung verlangt einen vollständigen 40-stelligen Commit-Hash und
bindet den Skriptinhalt erneut an den Vorbereitungsbericht. Sie erzeugt
`INSTALL_COMMAND.txt` und `command-preparation.json` ohne vorhandene Dateien
zu überschreiben. **Der öffentliche Rücklesevergleich bleibt erforderlich**;
die Finalisierung behauptet ausdrücklich keinen durchgeführten Netzabruf.
Der endgültige Befehl prüft Größe und Hash, bevor Bash das Skript ausführt.

## Tatsächlich ausgeführte Prüfungen

Die dateigebundenen Ergebnisse und Quellenhashes stehen in
`verification.json`. Ausgeführt wurden auf Linux x64, Node 24.19.0 und Python
3.12.14 insgesamt **72 verschiedene fokussierte Tests**, alle bestanden:

- 36 Python-Tests der Managed-Erstinstallation, einschließlich neuer
  GitHub-Weiterleitungs-, Bereichs-, Zeitbudget- und Header-Grenzen.
- 5 Python-Tests der Node-Archivextraktion und 3 des unsignierten
  Vorbereitungsarchivs.
- 10 JavaScript-Tests des Managed-Bootstraps und der zweistufigen
  Installationsbefehlerzeugung.
- 2 JavaScript-Tests der Node-Archivzulassung und Dateimodi.
- 9 JavaScript-Tests des frischen Build-/SBOM-Vertrags, einschließlich
  versionsgenauer späterer 24.x-Pakete und Ablehnung von Downgrade/Hauptversion25.
- 7 JavaScript-Tests der getrennten historischen und frischen Labor-Fixtures.

Die Prüfungen verwenden synthetische ELF-Dateien, lokale Testarchive,
temporäre Testschlüssel und explizite Netzwerk-/Host-Doubles. Der reale
Payload-Kopiervorgang, die Inventarbindung und das Laden des erzeugten
Installer-Kits wurden geprüft. Eine fehlende Git-Index-Aufnahme neuer
Laufzeitdateien führte zunächst erwartungsgemäß zu `DOWNLOAD_SOURCE_BINDING`;
nach Aufnahme der geprüften Quelldateien bestand der unveränderte Schutz.

## Offen und nicht behauptet

- Der begrenzte Abrufversuch des offiziellen ARM64-Archivs wurde durch einen
  Proxy-Verbindungs-Timeout blockiert. In dieser Umgebung wurde kein echtes
  Node-24.22.1-ARM64-Archiv beschafft oder qualifiziert.
- Neuer vollständiger Build und neuer nativer Linux-x64-Lauf auf Node24.22.1:
  **OFFEN**. Der ältere native Nachweis zu `a2733fa` wird nicht umetikettiert.
- Authentifizierte Herstellerdateien, Herstellersignatur, öffentliche
  Veröffentlichung und exakter öffentlicher Rücklesevergleich: **OFFEN**.
- WSL-Signiervorgang, frische Pi-Installation, realer Updateknopf,
  Stromausfall-/Rollbacktest und Anlagen-/Hardwareprüfung: **OFFEN**.
- Keine Produktionsfreigabe. Die hier dokumentierten Quelltests ersetzen die
  offenen Liefer- und Zielsystemprüfungen nicht.
