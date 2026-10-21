# Test-Pi frisch installieren, danach Updates im Admin

Die neue Testbasis ist gebaut und im Linux-x64-Labor nativ geprüft, aber noch
nicht signiert oder als Pi-Installationspaket ausgeliefert.
Sie bleibt ausdrücklich auf js-controller **7.2.5**. Controller 8 wird weder
automatisch bezogen noch durch den neuen Paket-/Katalogvertrag zugelassen.
**Bestehenden Test-Pi noch nicht löschen.** Der R11-Befehl in der README ist
weiterhin ausschließlich der historische Updateweg von einem gesunden R10.
Er installiert diese neue Frischbasis nicht.

## Vorgesehener Betreiberablauf

1. Vorhandene Sicherung auf Wiederherstellbarkeit prüfen, aktuelle Daten und
   Lizenzinformationen sichern, Wartungsfenster vorsehen.
2. Nach Freigabe die neue signierte ARM64-Testbasis auf einen frischen,
   vorbereiteten Debian-13-Host installieren. Node ist exakt 24.21.0;
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
- Archivpfad: `delivery/managed-test-<Sequenz>/eos-linux-arm64.tar.gz` an einem
  unveränderlichen Git-Commit. Bis 100 MiB; 1-MiB-Rangeabrufe; pro externem
  Abruf höchstens fünf Sekunden einschließlich DNS, TLS und Körper.
- `/etc/nexowatt-eos/update-trust.pem` bindet den Hersteller dauerhaft.
  Private Schlüssel gehören nicht auf den Pi, ins Repository oder in Logs.
- `nexowatt-eos-updates.service` bleibt an die unveränderliche erste
  Releaseinstallation gebunden. Der Controller folgt dem getrennten
  `current`-Zeiger. Der gleiche, bereits installierte Transaktionscode prüft
  Folgepakete; kein aus einem Feed geladener Shell-/Installationsbefehl.
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

Die Sicherheitsaktualisierung benötigt eine **vollständig neue Laufzeitbasis**.
Ein Quellen-Overlay auf R9 kann die geänderten Controller-/Dependency-Versionen
nicht übernehmen und wird dafür nicht verwendet. Der Hersteller bereitet mit
`stage-security-refresh-cache.cjs` einmalig die genaue Paketauflösung vor;
`prepare-security-refresh.cjs` installiert diese Lockdatei anschließend offline
ohne Paket-Lifecycle-Skripte. Dateiinventar, tatsächliche SBOM,
Controllertransformationen und native Prüfung beziehen sich auf denselben
vorbereiteten Laufzeitbaum. Details und tatsächlicher Prüfstatus stehen im
[Umsetzungsbericht](../../reports/integration/security-refresh-20261021/README_DE.md).

`tools/bootstrap/build-managed-test.cjs` erhält den bereits vorbereiteten und
geprüften Laufzeitbaum über `--prepared-runtime`, außerdem `--native-evidence`,
`--private-key`, `--public-key-sha256` und `--sequence`. Sequenz 15 ist für die
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
  SPKI-PEM-Prüfschlüssels;
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
hashgebundenen Node-24.21.0-Schritt einschließlich der benötigten
Netzwerkwerkzeuge. Diese Hoständerungen wurden noch nicht auf einem Pi ausgeführt.

`build-managed-download.cjs` erzeugt das öffentliche Installationspaket und
den gepinnten Befehl erst aus der tatsächlich signierten Sequenz-15-Lieferung
und separat authentifizierten öffentlichen Release-/Lizenzprüfschlüsseln.
Es übernimmt ausschließlich versionierte Quelldateien und entfernt interne
Buildaufzeichnungen aus der öffentlichen Ausgabe. Ein generierter Befehl ist
erst nach Veröffentlichung und vollständigem öffentlichem Rücklesen verwendbar.
Der vollständige neue Laufzeitbaum am Quellstand
`a2733fa5561f7327ff3689b7464f8727760fb670` bestand die native Prüfung mit
sechs Adaptern, zentralen Lizenzen, Backup und Neustart. Das daraus erzeugte
CI-Archiv ist ausdrücklich **unsignierter Transport für den Hersteller**.
Es enthält weder eine Installationsfreigabe noch eine dauerhafte Updateautorität.
Signaturmaterial, signierte Lieferung, endgültige öffentliche Pins und
Pi-Abnahme fehlen weiterhin; die vorhandenen R11-Befehle ersetzen diesen
Schritt nicht. Der Hersteller muss die exakt geprüften Quell- und Paketbytes
verwenden; ein späterer Dokumentationscommit qualifiziert keine neu gebaute
Laufzeit automatisch mit.

V1 beschränkt Folgeupdates auf eigene Adapterdateien bei gleichbleibenden
Versionen und Host-/Abhängigkeitsverträgen. Weitere Migrationsarten sind offen.
Siehe [Anforderungen](../requirements/EOS-REQ-MANAGED-UPDATES-20261021.md) und
[Prüfbericht](../../reports/integration/managed-updates-20261021/README_DE.md).
