# Test-Pi frisch installieren, danach Updates im Admin

Nach dem Node-Sicherheitsrelease vom 21.10.2026 wird die neue Testbasis auf
Node 24.22.1 und gekoppelte Node-/EOS-Updates umgestellt. Der neue Quellstand
`06ed52f636d0da58d56a86646cdbe4ba601f1776` hat seinen eigenen vollständigen
Linux-x64-Lauf mit sechs Adaptern, Lizenzen, Backup und Neustart bestanden;
das erzeugte unsignierte Paket wurde zurückgelesen und geprüft. Dieser
Nachweis ersetzt keine ARM64-/Pi-Abnahme. Eine signierte Pi-Auslieferung fehlt noch.
Sie bleibt ausdrücklich auf js-controller **7.2.5**. Controller 8 wird weder
automatisch bezogen noch durch den neuen Paket-/Katalogvertrag zugelassen.
**Bestehenden Test-Pi noch nicht löschen.** Der R11-Befehl in der README ist
weiterhin ausschließlich der historische Updateweg von einem gesunden R10.
Er installiert diese neue Frischbasis nicht.

## Vorgesehener Betreiberablauf

1. Vorhandene Sicherung auf Wiederherstellbarkeit prüfen, aktuelle Daten und
   Lizenzinformationen sichern, Wartungsfenster vorsehen.
2. Nach Freigabe die neue signierte ARM64-Testbasis auf einen frischen,
   vorbereiteten Debian-13-Host installieren. Node ist für diese Frischbasis exakt 24.22.1;
   PostgreSQL-, TLS-, OS-Update- und Netzwerkvoraussetzungen werden geprüft.
3. Den HTTPS-Erststart abschließen. Konten und sechs eigene Adapter werden
   einmalig eingerichtet; Geräteadapter haben zunächst keine physischen Ziele.
4. Als Service oder Installateur im Admin unter System/Grundeinstellungen
   **EOS-Updates** öffnen, **Updates prüfen** wählen, angebotenen Stand prüfen
   und Wartung/Sicherung bestätigen. Erst dann **Update installieren**.
5. Der Hintergrunddienst lädt und prüft das Paket. Während des Controller-
   Neustarts kann die Admin-Verbindung abbrechen. Dialog später wieder öffnen;
   bei Erfolg Admin neu laden. Kein zweiter SSH-Installationsbefehl vorgesehen.

Die Wartungsbestätigung erstellt selbst kein Backup. Automatisch wird nur
auf Angebote geprüft (beim Start und alle sechs Stunden); die Installation
benötigt einen bewussten Klick. Ein Kunde ohne technische Rolle sieht keinen
Installationsknopf. Bei `RECOVERY_REQUIRED` keine Sperrdateien manuell löschen
und keinen Prozessstart erzwingen: Service prüft zuerst Zustand und Journal.

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
Hersteller erzeugt. Die erfolgreiche Erzeugung ist inzwischen vom Betreiber
gemeldet. Der [öffentliche Prüfschlüssel](../security/release-trust/manufacturer-20261021.pem)
wurde als kanonisches Ed25519-SPKI-PEM geprüft und stimmt mit dem vorher vom
Betreiber mitgeteilten SHA-256 überein:
`95151b5f26aa09a95c2f0cb5215fdfc7a7fc3066da9e670937d1e8b50c701248`.
Private Schlüsseldatei und Passphrase bleiben auf dem Herstellerrechner.
Getrennte Sicherung, tatsächlicher Signierlauf und Installation dieses
Vertrauensankers auf einem Pi sind noch nicht nachgewiesen.

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
Herstellerschlüssel werden trotzdem geprüft. Der Feed fehlt im aktuellen
Quellstand noch. Spätere Pakete verwenden eine Sequenz ab 16 und müssen die
zulässige Ausgangslieferung ausdrücklich benennen.

Für den abschließenden Herstellerlauf werden konkret benötigt:

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
Der öffentliche Herstellerschlüssel ist geprüft; die geschützte lokale
Verwendung seines privaten Gegenstücks, signierte Lieferung, endgültige
öffentliche Lieferpins und Pi-Abnahme fehlen weiterhin. Die vorhandenen R11-Befehle ersetzen diesen
Schritt nicht. Der Hersteller muss die exakt geprüften Quell- und Paketbytes
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
