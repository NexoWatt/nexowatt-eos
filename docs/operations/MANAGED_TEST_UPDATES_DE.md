# Test-Pi frisch installieren, danach Updates im Admin

Die neue Testbasis ist im Quellcode vorbereitet, aber noch nicht ausgeliefert.
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

`tools/bootstrap/build-managed-test.cjs` baut nach sauberem Quellstand und
passendem nativen Nachweis mit `--native-evidence`, `--private-key`,
`--public-key-sha256`, `--sequence` einen Kandidaten; alle vier Argumente sind
in dieser Reihenfolge erforderlich. Sequenz 15 ist für die Frischbasis
reserviert, höhere Sequenzen für weitere Kandidaten. Der native Nachweis aus
der bestehenden R10-App-Prüfkette prüft die rekonstruierte App, nicht den neuen
Frischinstallations-/systemd-Updateablauf. Paketbau und Signierung wurden für
diese neue Basis noch nicht ausgeführt.

`tools/bootstrap/sign-managed-channel.cjs` signiert ein geprüftes
Kanaldokument. Es veröffentlicht nichts und ersetzt keinen öffentlichen
Rücklesetest. Ein Offline-Paket muss nach Veröffentlichung vollständig
zurückgelesen und gegen Hash, Signatur, Größe und Quelle geprüft werden,
bevor ein signiertes Angebot in den Feed aufgenommen wird.

`tools/system/install-managed-from-checkout.cjs` ist der vorbereitete
Installationskern für einen authentifizierten, root-kontrollierten Checkout.
Er installiert keine Betriebssystempakete und ersetzt daher noch keinen
vollständigen freigegebenen öffentlichen Bootstrapbefehl. Signaturmaterial,
Artefakt, endgültige öffentliche Pins und Pi-Abnahme fehlen noch.

V1 beschränkt Folgeupdates auf eigene Adapterdateien bei gleichbleibenden
Versionen und Host-/Abhängigkeitsverträgen. Weitere Migrationsarten sind offen.
Siehe [Anforderungen](../requirements/EOS-REQ-MANAGED-UPDATES-20261021.md) und
[Prüfbericht](../../reports/integration/managed-updates-20261021/README_DE.md).
