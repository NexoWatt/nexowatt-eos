# Lokal gebundener Managed-16-Signierhelfer

Stand: 24.10.2026. Der neue eigenständige Helfer
`tools/bootstrap/sign-qualified-managed16-wsl.py` bindet den vorgesehenen
Qualifikationsquellstand `f2ea9a7ba67ef46a7de8a4f0ef05eaa672ca38f4`, Sequenz 16,
Lieferrevision 13 und den bestätigten öffentlichen Herstellerschlüsselhash
`518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40`.
Dieser Helfer gehört nicht nachträglich zum qualifizierten Runtime-Quellbaum:
Er klont dafür einen getrennten, unveränderten Checkout des festen Commits.
Der historische `sign-qualified-r8-wsl.py` wurde nicht verändert.

## Freigabestand dieses Belegs

Die sieben zuvor gesperrten Werte sind jetzt an die tatsächlich empfangenen
CI-Artefakte des festen Quellstands gebunden. Beide vollständigen ZIPs wurden
unabhängig gegen die getrennt übermittelten API-Hashes und Größen geprüft;
der enthaltene Tarstream wurde vollständig gehasht und die native ZIP-Dateiliste
exakt geprüft. Der native Beleg nennt Sequenz 16, diesen Quellcommit und 22
erfolgreiche Prüfmerkmale. Die vollständige Runtime-/SBOM-/native
Signiergateprüfung erfolgt zusätzlich durch den qualifizierten Code vor jeder
lokalen Signierung; der übergeordnete Qualifikationsbeleg hält die unabhängige
Gesamtprüfung fest.

| Eingang | Bytes | SHA-256 |
| --- | ---: | --- |
| `eos-unsigned-f2ea9a7.zip` | 134047653 | `9dfb4bac5dc501ca5815cefb5f862234b2dd2515a62f56bab24909fb5ae6c12d` |
| `eos-native-f2ea9a7.zip` | 218396 | `37f871a1fe5df44d4d9dee67351a239c7abba2e523a105d1879e87dae2be1f3e` |
| inneres `eos-security-refresh-unsigned.tar.gz` | 134047467 | `734a6b296cdfec50bc084e722c1b8eb5eb838969813b311200eae9071cd73bb9` |

Die native Belegablage ist genau `eos-own-adapters.trlC30cd`. Herkunft ist der
Security-CI-Lauf `40069294296` am festen Quellcommit; der übergeordnete Prüfer
prüft zusätzlich den vollständigen CI-Status und die echten Laufzeitbelege.
`artifact-pins.json` dokumentiert die hier tatsächlich durchgeführte Dateiprüfung.

Fehlende oder missgebildete Pins blockieren weiterhin `main` vor jedem
Dateizugriff, Unterprozess, Download oder Schlüsselzugriff. Der ursprüngliche,
noch ungepinnte CLI-Test endete nachweislich mit `QUALIFICATION_PINS_PENDING`,
Exitcode 1; dieser historische Sperrbeleg bleibt erhalten. Die aktualisierten
Tests wiederholen die Sperrfälle durch interne Test-Fixtures. Ein Aufrufparameter
oder eine Umgebungsvariable kann die Freigabedaten nicht austauschen.

Der Helfer ist damit für die geschützte lokale Signierung genau dieser Eingaben
vorbereitet. Tatsächliche Herstellersignierung, Veröffentlichung und
Installationsbefehl wurden in diesem Arbeitsschritt nicht ausgeführt oder erzeugt.

## Vorbereiteter Ablauf nach echter Qualifikation

- Auf dem bestehenden normalen Ubuntu-/WSL-Benutzerkonto wird standardmäßig
  der vorhandene private Ordner `~/nexowatt-signing-neu-ITuuaaOd` verwendet.
  Ein ausdrücklich übergebener anderer Ordner muss ebenfalls kanonisch,
  eigentümerkontrolliert und privat unter diesem Linux-Heimverzeichnis liegen.
  Es wird niemals automatisch ein Schlüssel erzeugt oder ersetzt.
- Beide CI-ZIPs werden vor und nach dem Kopieren exakt nach Größe und Hash
  geprüft. ZIP-Pfade, Dateitypen und vollständige Dateilisten sind begrenzt.
  Die tatsächliche Runtime, SBOM, nativen Belege, Sequenz und ARM64-Node-Datei
  werden vom qualifizierten Quellcode erneut geprüft, bevor entschlüsselt wird.
- Der bestätigte öffentliche Lizenzexport wird als einzelne Git-Datei aus dem
  festen Quellcommit gelesen: `delivery/bootstrap-test3-r4/license-public-trust.json`,
  140 Bytes, SHA-256
  `470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
  Private Lizenzdateien werden nicht benötigt.
- Der verschlüsselte private Herstellerschlüssel bleibt beim Betreiber. Nur
  während `build-managed-test.cjs --sequence 16` liegt seine temporäre
  entschlüsselte Datei mit Modus 0600 in einem privaten tmpfs-Verzeichnis.
  Normales Ende, Fehler und behandelbare Unterbrechungen räumen diese Datei auf;
  für SIGKILL oder Stromverlust wird keine kontrollierte Bereinigung behauptet.
- Erst nach Entfernung der temporären Schlüsseldatei erzeugt der qualifizierte
  `build-managed-download.cjs` den neuen Frischinstaller. Es gibt keinen
  R8-Einstieg, keine Quellpatches und keine Wiederaufnahme alter Sequenz-15-Läufe.
  Der vorhandene Updatefeed wird durch diesen Helfer weder geändert noch neu
  signiert. Seine Gültigkeit ist vor dem späteren Pi-Test separat zu prüfen.
- Außerhalb des Quellcheckouts entsteht `public/` mit genau zehn Dateien:
  Runtime-Archiv, Node-Archiv, Installerkit, `install.sh`,
  `download-preparation.json`, `release-public.pem`, `delivery.json`,
  `license-public-trust.json`, `summary.json` und `eos-public-metadata.zip`.
  Das ZIP enthält ausschließlich die sechs kleinen öffentlichen Metadatendateien
  aus der festen `METADATA_FILES`-Liste. Es enthält weder Arbeitsverzeichnisse
  noch absolute Herstellerpfade oder private Schlüssel.
- Der Export enthält noch keinen Installationsbefehl. Veröffentlichung,
  öffentlicher vollständiger Rücklesetest und Bindung der kleinen Einstiegsdatei
  an ihren unveränderlichen Git-Commit bleiben getrennte nachfolgende Schritte.

## Tatsächlich geprüft

`python3 -I -B tests/bootstrap/sign-qualified-managed16-wsl.test.py`:
**34/34 Tests bestanden, keine übersprungen.** Der unabhängige zweite
Codeprüfer führte dieselben 34 Verträge ebenfalls erfolgreich aus.

Die Tests prüfen echte temporäre Dateien, ZIPs und Git-Repositories sowie
flüchtige synthetische Ed25519-/OpenSSL-Schlüssel ausschließlich in tmpfs.
Für den Ablauf zwischen Qualifikation, Signierwerkzeug und Downloadgenerator
werden explizite Test-Doubles verwendet. Private Herstellerdateien, echte
CI-Artefakte, reale Runtime-Signierung, Veröffentlichung und Pi-Operationen
wurden damit nicht ausgeführt.

Der ARM64-Node-Hash entspricht der versionierten
`tools/integration/node-runtime-policy.json`. Die zusätzliche Größenbindung
30978868 Bytes wurde am 24.10.2026 über einen tatsächlich ausgeführten HTTPS-
HEAD-Abruf der offiziellen Node-Datei bestätigt (HTTP 200,
`Content-Length: 30978868`, TLS-Prüfung aktiv, kein Redirect). Der Abruf ist
kein neuer vollständiger Hashnachweis des Archivs; diesen führt der Helfer vor
Benutzung gegen den festen SHA-256-Pin aus. Rohbelege und Dateihashes stehen in
`verification.json`.
