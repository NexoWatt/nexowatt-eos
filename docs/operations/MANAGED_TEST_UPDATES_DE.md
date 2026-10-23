# Managed-Testbasis: Frischinstallation, direkter R8-Übergang und Updates

**Präzisierung vom 23.10.2026:** Für den vorhandenen, vollständig eingerichteten
R8-Teststand ist ein [direkter Übergang](R8_DIREKT_MANAGED_UPDATE_DE.md) auf diese neue Basis implementiert.
Die Neuinstallation bleibt ein eigener Weg für einen leeren Test-Pi.
Linux-Sicherheitsupdates und gesondert freigegebene reine Node-24-Pakete werden
auf der neuen Basis automatisch installiert. Der Bedienknopf ist für allgemeine
EOS-Änderungen vorgesehen. Details zum Nachtfenster und den Grenzen stehen in
[Automatische Sicherheitsupdates](AUTOMATISCHE_SICHERHEITSUPDATES_DE.md).
Die tatsächliche signierte Sequenz-15-Lieferung ist inzwischen als
[GitHub-Testrelease](https://github.com/NexoWatt/nexowatt-eos/releases/tag/managed-test-15-95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534)
veröffentlicht. Vollständiger öffentlicher Rücklesetest, Feed-Bereitstellung und
bytegenaue öffentliche Rückprüfung des Betreiberbefehls sind abgeschlossen.
Der [geprüfte R8-Befehl](../../delivery/r8-managed15/R8_UPDATE_COMMAND.txt) ist
für den kontrollierten Test nach der R8-Anleitung nutzbar. Der
[Veröffentlichungsnachweis](../../reports/integration/managed15-publication-20261023/README_DE.md)
hält diese Ergebnisse fest; die Zielabnahme auf dem Pi bleibt offen.

Nach dem Node-Sicherheitsrelease vom 21.10.2026 wird die neue Testbasis auf
Node 24.22.1 und gekoppelte Node-/EOS-Updates umgestellt. Der frühere Zwischenstand
`06ed52f636d0da58d56a86646cdbe4ba601f1776` hat seinen eigenen vollständigen
Linux-x64-Lauf mit sechs Adaptern, Lizenzen, Backup und Neustart bestanden;
das erzeugte unsignierte Paket wurde zurückgelesen und geprüft. Dieser
Nachweis ersetzt keine ARM64-/Pi-Abnahme. Für die signierte Lieferung ist der
anschließend qualifizierte Quellstand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`
mit seinen eigenen [CI- und Artefaktnachweisen](../../reports/integration/automatic-security-updates-20261022/automatic-install/ci/qualification.json)
maßgeblich. Das tatsächliche signierte Archiv wurde unabhängig vollständig
geprüft und als Testrelease veröffentlicht; die bestandene öffentliche Rückprüfung ist
im oben verlinkten Veröffentlichungsnachweis dokumentiert.
Die Testbasis bleibt ausdrücklich auf js-controller **7.2.5**. Controller 8 wird weder
automatisch bezogen noch durch den neuen Paket-/Katalogvertrag zugelassen.
**Bestehenden Test-Pi noch nicht löschen.** Der R11-Befehl in der README ist
weiterhin ausschließlich der historische Updateweg von einem gesunden R10.
Er installiert diese neue Frischbasis nicht.

## Vorgesehener Betreiberablauf

1. Vorhandene Sicherung auf Wiederherstellbarkeit prüfen, aktuelle Daten und
   Lizenzinformationen sichern, geprüften Rückfallstand und Wartungsfenster vorsehen.
2. Nach Freigabe die neue signierte ARM64-Testbasis auf einen frischen,
   vorbereiteten Debian-13-Host installieren. Node ist für diese Frischbasis exakt 24.22.1;
   PostgreSQL-, TLS-, OS-Update- und Netzwerkvoraussetzungen werden geprüft.
   Für den vorhandenen R8-Teststand stattdessen den
   [direkten Übergang](R8_DIREKT_MANAGED_UPDATE_DE.md) mit dem gepinnten
   [R8-Befehl](../../delivery/r8-managed15/R8_UPDATE_COMMAND.txt) verwenden;
   seine öffentliche Rückprüfung und der Feednachweis sind abgeschlossen.
3. Bei einer Frischinstallation den HTTPS-Erststart abschließen. Konten und sechs eigene Adapter werden
   einmalig eingerichtet; Geräteadapter haben zunächst keine physischen Ziele.
4. Als Service oder Installateur im Admin unter System/Grundeinstellungen
   **EOS-Updates** öffnen, **Updates prüfen** wählen, angebotenen Stand prüfen
   und Wartung/Sicherung bestätigen. Erst dann **Update installieren**.
5. Der Hintergrunddienst lädt und prüft das Paket. Während des Controller-
   Neustarts kann die Admin-Verbindung abbrechen. Dialog später wieder öffnen;
   bei Erfolg Admin neu laden. Kein zweiter SSH-Installationsbefehl vorgesehen.

Die Wartungsbestätigung erstellt selbst kein Backup. Auf Angebote wird beim
Start und alle sechs Stunden geprüft. Allgemeine EOS-Änderungen benötigen einen
bewussten Klick; gesondert freigegebene reine Node-24-Pakete und die zulässigen
Linux-Sicherheitsupdates folgen den automatischen Wartungsregeln. Ein Kunde ohne
technische Rolle sieht keinen Installationsknopf. Bei `RECOVERY_REQUIRED` keine Sperrdateien manuell löschen
und keinen Prozessstart erzwingen: Service prüft zuerst Zustand und Journal.
Der Test bleibt bei `physicalControlEnabled: false`. Den optionalen alten
`pgsql`-Provider weder aktivieren noch für Wiederherstellungen verwenden.
Die Testveröffentlichung ist keine Produktions- oder CRA-Freigabe.

## Technischer Vertrag

- Fester Feed: `delivery/update-channel/test.json` auf `main`, signierter
  Umschlag mit zeitlich begrenzter Gültigkeit (höchstens 31 Tage).
- Neue große Pakete einschließlich Node werden über ein fest benanntes
  GitHub-Release-Asset bezogen; Tag `managed-test-<Sequenz>-<Release-ID>`.
  Historische unveränderliche Git-Archivpfade bleiben erkennbar. Bis 256 MiB;
  1-MiB-Rangeabrufe; pro externem Abruf höchstens fünf Sekunden einschließlich
  DNS, TLS, erlaubter GitHub-CDN-Weiterleitung und Körper. Signatur, Größe und
  SHA-256 entscheiden über die Zulassung.
- `/etc/nexowatt-eos/update-trust.pem` bindet den Hersteller dauerhaft.
  Private Schlüssel gehören nicht auf den Pi, ins Repository oder in Logs.
- Der JavaScript-Transaktionscode von `nexowatt-eos-updates.service` bleibt an
  die unveränderliche erste Releaseinstallation gebunden. Seine Node-Binärdatei
  und der Controller folgen dem gemeinsam umgeschalteten `current`-Zeiger.
  Nach dem dauerhaften Abschluss startet der Update-Dienst unter der aktiven
  Node-Version neu. Der bereits installierte Transaktionscode prüft Folgepakete;
  kein aus einem Feed geladener Shell-/Installationsbefehl.
- Admin-API `/nexowatt/managed-updates/{status,check,install}`; getrennt von
  der vorhandenen `/nexowatt/updates`-Status-/Einstellungsschnittstelle.
- Status `/var/lib/nexowatt-eos-updates/status.json`, Aufträge darunter in
  `jobs`; maximal fünf aufbewahrte Aufträge. Erfolgreiche Aufträge werden
  nach dauerhaftem Statusabschluss entfernt. Fehler werden nicht als Erfolg
  ausgeblendet. Transaktionsjournal: `/etc/nexowatt-eos/managed-update-status.json`.
- Rückfall prüft alte Signatur, Zustand, Konfiguration, Assets, HTTPS und
  frische Adapter-Heartbeats. Bei unklarer Wiederherstellung bleibt der
  Controller gesperrt/gestoppt. Reale Stromausfallabnahme steht aus.

Die Schnittstelle ist auf den vorgesehenen lokalen Dienstzugriff begrenzt.
Die aktuelle Session und technische Benutzerrolle werden geprüft. Eine
vollständige Adapterisolation ist damit nicht nachgewiesen; die gesonderte
Sicherheitsabnahme bleibt offen.

## Hersteller-Vorbereitung und offene Freigabe

Eine dauerhaft gesicherte Ed25519-Autorität muss außerhalb des Repositories
bereitgestellt werden, beispielsweise in einer geschützten CI-Umgebung oder
einem geschützten Offline-Signierprozess. Die bisherigen Einmal-Testschlüssel
sind dafür nicht verfügbar. Private Schlüssel nicht in den Chat kopieren.
Für den Windows-Rechner ist die
[verschlüsselte Schlüsselablage unter WSL 2](WINDOWS_SIGNIERRECHNER_DE.md)
beschrieben. Die dauerhafte Schlüsseldatei wird ausschließlich beim
Hersteller erzeugt. Nach erneutem Verlust der Passphrase hat der Betreiber
am 23.10.2026 die Erzeugung und das erfolgreiche erneute Öffnen eines weiteren
verschlüsselten Ersatzschlüssels gemeldet. Dieser ersetzt den ersten Ersatz
vom selben Tag; eine Kompromittierung wurde nicht gemeldet. Der neue
[öffentliche Prüfschlüssel](../security/release-trust/manufacturer-20261023-2.pem)
wurde als kanonisches Ed25519-SPKI-PEM geprüft und stimmt mit dem vom
Betreiber mitgeteilten SHA-256 überein:
`518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40`.
Beide vorherigen öffentlichen Schlüssel und Prüfberichte bleiben historisch erhalten;
der aktuelle Signierhelfer und R8-Einstieg binden ausschließlich den neuen Hash.
Der [Änderungsvermerk](../../reports/integration/manufacturer-key-replacement-20261023-2/README_DE.md)
beschreibt die begrenzte Herstelleränderung und die noch offenen Liefergates.
Private Schlüsseldatei und Passphrase bleiben auf dem Herstellerrechner.
Die tatsächliche Signierung und die unabhängige vollständige Archivprüfung
sind im [Archivnachweis](../../reports/integration/managed15-archive-verification-20261023/README_DE.md)
dokumentiert. Getrennte Schlüsselsicherung und Installation dieses
Vertrauensankers auf einem Pi sind weiterhin nicht nachgewiesen.

Die Sicherheitsaktualisierung benötigt eine **vollständig neue Laufzeitbasis**.
Ein Quellen-Overlay auf R9 kann die geänderten Controller-/Dependency-Versionen
nicht übernehmen und wird dafür nicht verwendet. Der Hersteller bereitet mit
`stage-security-refresh-cache.cjs` einmalig die genaue Paketauflösung vor;
`prepare-security-refresh.cjs` installiert diese Lockdatei anschließend offline
ohne Paket-Lifecycle-Skripte. Dateiinventar, tatsächliche SBOM,
Controllertransformationen und native Prüfung beziehen sich auf denselben
vorbereiteten Laufzeitbaum. Details und tatsächlicher Prüfstatus stehen im
[Umsetzungsbericht](../../reports/integration/security-refresh-20261021/README_DE.md).

Der Hersteller-Build benötigt Node **24.22.1** und separat festgelegtes npm
**11.19.0** direkt neben diesem Interpreter. Das mit Node24.22.1 gelieferte npm
11.19.1 wird für diesen Build nicht ungeprüft übernommen. Der genaue
[Vorbereitungsschritt](WINDOWS_SIGNIERRECHNER_DE.md) und der frische CI-Job
prüfen den tatsächlichen npm-Pfad und die Version. npm wird nicht auf den Pi
mitgeliefert; der bestehende strikte Buildvertrag bleibt erhalten.

`tools/bootstrap/build-managed-test.cjs` erhält den bereits vorbereiteten und
geprüften Laufzeitbaum über `--prepared-runtime`, außerdem `--native-evidence`,
`--private-key`, `--public-key-sha256`, `--sequence` und `--node-archive`. Sequenz 15 ist für die
Frischbasis reserviert. Der private Schlüssel wird ausschließlich auf dem
geschützten Hersteller-Buildhost eingelesen. Ein erfolgreiches Linux-x64-Labor
ersetzt weder den Frischinstallations-/systemd-Test noch die ARM64-/Pi-Abnahme.

`tools/bootstrap/sign-managed-channel.cjs` signiert ein geprüftes
Kanaldokument. Es veröffentlicht nichts und ersetzt keinen öffentlichen
Rücklesetest. Ein Offline-Paket muss nach Veröffentlichung vollständig
zurückgelesen und gegen Hash, Signatur, Größe und Quelle geprüft werden,
bevor ein signiertes Angebot in den Feed aufgenommen wird.

Auch für den ersten funktionsfähigen Updateabruf muss der Hersteller einen
gültigen signierten Feed unter `delivery/update-channel/test.json`
veröffentlichen. Ein anfangs leeres Angebot ist erlaubt; Kanal
`eos-managed-test-v1`, Ablaufdatum und der auf dem Pi verankerte
Herstellerschlüssel werden trotzdem geprüft. Der signierte leere Kanal ist am
aktiven Feedpfad veröffentlicht und öffentlich bytegleich zurückgelesen.
Seine Signatur ist geprüft; die Gültigkeit endet am
`2026-11-22T19:13:09.971Z`. Die leere Releaseliste bietet noch kein Folgeupdate an.
Diese Lieferprüfungen sind im
[Veröffentlichungsnachweis](../../reports/integration/managed15-publication-20261023/README_DE.md)
festgehalten. Spätere Pakete verwenden eine Sequenz ab 16 und müssen die
zulässige Ausgangslieferung ausdrücklich benennen.

Für weitere Herstellerläufe beziehungsweise eine gesonderte Frischinstallation
werden weiterhin benötigt:

- eine dauerhaft gesicherte Ed25519-Schlüsseldatei auf dem Signierrechner,
  außerhalb des Repositorys, nur für den Eigentümer lesbar;
- der unabhängig bestätigte SHA-256-Fingerabdruck des kanonischen öffentlichen
  SPKI-PEM-Prüfschlüssels; die vom Betreiber getrennt übermittelten PEM-/Hashdaten
  stimmen überein, der oben genannte Hash ist für diesen Herstellerlauf zu verwenden;
- die authentifizierte öffentliche Vertrauensdatei des tatsächlichen zentralen
  Lizenzservers samt SHA-256-Fingerabdruck;
- die endgültige HTTPS-Veröffentlichungsadresse für die Installationsdateien.

Der private Schlüssel bleibt auf diesem Rechner. Er wird weder in den Chat
noch auf den Pi oder in die öffentliche Lieferung kopiert. Hersteller- und
Lizenzprüfschlüssel sind öffentliche Daten; ihre richtige Herkunft muss
trotzdem vor dem Einbau bestätigt sein.

`tools/system/install-managed-from-checkout.cjs` ist der vorbereitete
Installationskern für einen authentifizierten, root-kontrollierten Checkout.
Er installiert selbst keine Betriebssystempakete. Der neue feste Einstieg
`first-start-managed.cjs` und `prepare-managed-host.py` ergänzen die geprüften
Debian-13-/ARM64-Frischhostbedingungen, APT-Herkunftsprüfungen und den
hashgebundenen Node-24.22.1-Schritt einschließlich der benötigten
Netzwerkwerkzeuge. Diese Hoständerungen wurden noch nicht auf einem Pi ausgeführt.

`build-managed-download.cjs` erzeugt das öffentliche Installationspaket und
den gepinnten Befehl erst aus der tatsächlich signierten Sequenz-15-Lieferung
und separat authentifizierten öffentlichen Release-/Lizenzprüfschlüsseln.
Es übernimmt ausschließlich versionierte Quelldateien und entfernt interne
Buildaufzeichnungen aus der öffentlichen Ausgabe. Ein generierter Befehl ist
erst nach Veröffentlichung und vollständigem öffentlichem Rücklesen verwendbar.
Mit einer GitHub-Release-Adresse als `--base-url` erzeugt dieser erste Schritt
noch keinen Installationsbefehl. Die großen Dateien kommen als Release-Assets
unter `managed-test-15-<Release-ID>`; die kleine `install.sh` wird anschließend
in einem Git-Commit veröffentlicht. Danach erstellt derselbe Generator mit
`--finalize-command <absolutes-Ausgabeverzeichnis> --entry-base-url <unveränderliche-Raw-Adresse>`
die Datei `INSTALL_COMMAND.txt`. Die Raw-Adresse muss den vollständigen
40-stelligen Commit und ein Unterverzeichnis von `delivery/` enthalten.
Auch dieser Schritt prüft nur die lokale Bindung: Der tatsächliche öffentliche
Rücklesetest aller Dateien bleibt vor Weitergabe des Befehls verpflichtend.
Der vorherige vollständige Laufzeitbaum unter Node 24.21.0 am Quellstand
`a2733fa5561f7327ff3689b7464f8727760fb670` bestand die native Prüfung mit
sechs Adaptern, zentralen Lizenzen, Backup und Neustart. Das daraus erzeugte
CI-Archiv ist ausdrücklich **unsignierter Transport für den Hersteller**.
Es enthält weder eine Installationsfreigabe noch eine dauerhafte Updateautorität.
Die inzwischen tatsächlich signierte Lieferung stammt vom neueren qualifizierten
Stand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`, wurde unabhängig vollständig
geprüft und als Testrelease veröffentlicht. Öffentliche Lieferpins sowie die
bestandenen Rücklese- und Feedprüfungen stehen im aktuellen Veröffentlichungsbericht;
die Pi-Abnahme bleibt offen. Die vorhandenen R11-Befehle ersetzen den direkten
R8-Einstieg nicht. Der Hersteller muss die exakt geprüften Quell- und Paketbytes
verwenden; ein späterer Dokumentationscommit qualifiziert keine neu gebaute
Laufzeit automatisch mit.

Die öffentliche Schlüsseldokumentation legt ausdrücklich kein Verzeichnis
`delivery/managed-test-15` an. Der Signierer benötigt dieses Ziel frisch und
schreibt den aus dem privaten Schlüssel abgeleiteten, gegen den bestätigten
Hash geprüften öffentlichen Schlüssel selbst in die neue Lieferung. Historische
Lieferungen und deren Schlüssel bleiben unverändert. Der Downloadgenerator
erhält denselben Hash als `--release-public-key-sha256`; Feed und spätere
Folgepakete müssen zur auf dem frisch installierten Pi verankerten Autorität passen.

Folgeupdates umfassen eigene Adapterdateien bei gleichbleibenden Paketversionen
und Host-/Abhängigkeitsverträgen sowie den gesondert gebundenen Node-24-Laufzeitbaum.
Node- und EOS-Stand wechseln gemeinsam; Node-Hauptversionswechsel und andere
Migrationsarten bleiben gesperrt. Die [automatische Linux-Wartung](AUTOMATISCHE_SICHERHEITSUPDATES_DE.md)
koordiniert ihre Pakettransaktionen über dieselbe geschützte Wartungssperre.
Siehe [Anforderungen](../requirements/EOS-REQ-MANAGED-UPDATES-20261021.md) und
[Prüfbericht](../../reports/integration/managed-updates-20261021/README_DE.md).
