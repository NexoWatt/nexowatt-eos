# EOS-Testsystem auf dem getrennten Raspberry Pi

Stand: 1. Oktober 2026. Diese Anleitung gehört zum integrierten Testpaket
`0.2.0-test.1` aus dem EOS-Quellstand `0.2.0-dev.3`. Maßgeblich sind die
Dateihashes und Prüfnachweise der konkreten Lieferung. Eine bereits bestandene
Installation auf dem bereitgestellten Test-Pi wird damit nicht behauptet.

Das Ziel dieser Etappe ist ein reproduzierbar startender **Controller mit
NexoWatt Admin und UI**, persönlichen Zugängen und verschlüsselter interner
Datenbankkommunikation. Devices, EEBUS, OCPP und Backup liegen als Quellen vor,
sind im installierten Profil aber noch nicht aktiviert. Physische Schreibbefehle
bleiben auch mit gültiger Lizenz gesperrt. Das Paket ist kein vollständig
abgenommenes Anlagenprodukt und keine CRA-/IEC-Konformitätserklärung.

## 1. Den vorhandenen Test-Pi zunächst nur auslesen

Die folgenden Befehle lesen den Zustand; sie installieren und formatieren nichts:

```bash
if [ -r /proc/device-tree/model ]; then
    tr -d '\000' < /proc/device-tree/model
fi
cat /etc/os-release
uname -m
free -h
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
df -h /
```

Pi-Modell, RAM, 64-Bit-Betriebssystem und der tatsächliche Systemdatenträger
müssen vor der Installation feststehen. Keine Passwörter, Lizenzcodes,
Privatschlüssel oder Kundendaten in eine Rückmeldung kopieren. Wenn auf dem
Datenträger noch Daten benötigt werden, zuerst gesondert sichern. Diese Anleitung
enthält bewusst keinen Formatierungsbefehl.

Das gegenwärtige Hostprofil akzeptiert **Debian/Raspberry Pi OS 12, 64 Bit mit
laufendem systemd**. Für das Pi-Paket muss `uname -m` den Wert `aarch64` melden;
Node bezeichnet diese Architektur als `arm64`. Ein 32-Bit-System oder Debian 13
wird nicht durch Entfernen einer Prüfbedingung passend gemacht. Andere Pi-Modelle
oder RAM-Größen als der vorgesehene Pi 5 mit 8/16 GB benötigen eigene Bewertung;
die Dienstlimits wurden nicht für kleine Modelle abgenommen.

Eine SSD-/Systemabbild-Sicherung des frischen, vorbereiteten Testhosts ist der
Rückweg für diesen ersten Versuch. Der Test-Pi erhält zunächst keine Verbindung
zu steuerbaren Energiegeräten und keine Portweiterleitung aus dem Internet.

## 2. Frischen Host und Laufzeit vorbereiten

Nur auf dem getrennten Testhost ohne bestehende ioBroker-/EOS-Installation:

```bash
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install ca-certificates curl gnupg xz-utils unzip \
    redis-server openssl iproute2 libcap2-bin
```

Die eingerichteten Distributionsquellen und Signaturprüfungen müssen gültig sein.
Paketaktualisierungen zuerst abschließen und einen erforderlichen Neustart
durchführen. OS-/Kernel-/Redis-Paketstände für den Zieltest erfassen; die
Anwesenheit eines Programms ist kein Schwachstellenfreigabenachweis.

Das Paket verlangt **Node 24.21.0 unter `/usr/bin/node`**. Node aus einem
Benutzerverzeichnis oder eine andere Version erfüllt diese Bindung nicht. Das
passende offizielle Linux-ARM64-Archiv ist in der Lieferung enthalten und wird
im nächsten Abschnitt bereitgestellt. Einen vorhandenen Node-Paketbestand nicht
blind überschreiben.

```bash
/usr/bin/redis-server --version
/usr/bin/openssl version
systemctl --version
timedatectl status
```

Soll: antwortender systemd-Manager und korrekte Systemzeit. Der spätere Bootstrap
muss Redis tatsächlich per authentifiziertem
TLS-1.3-Handshake prüfen; `redis-server --version` belegt diese Fähigkeit nicht.
Es wird kein npm auf dem Pi ausgeführt und keine Adapterabhängigkeit dort
nachgeladen.

Das Distributionspaket kann einen allgemeinen Redis-Dienst aktivieren. Auf
diesem frischen Testhost wird er nicht benötigt; EOS verwendet zwei eigene
Dienste mit eigenen Konfigurationen. Nur wenn dieser Dienst tatsächlich durch
die obige Neuinstallation hinzugekommen ist:

```bash
sudo systemctl disable --now redis-server.service
```

Bestehende Redis-Nutzer oder andere Anwendungen bedeuten, dass es kein frischer
Testhost ist; ihre Dienste nicht nach dieser Anleitung abschalten.

## 3. Lieferung und Vertrauensanker prüfen

Vor Root-Ausführung das vollständige Repository-ZIP und das ARM64-Laufzeitarchiv
mit den außerhalb der Archive erhaltenen SHA-256-Werten vergleichen. Zusätzlich
den Fingerabdruck des öffentlichen **Test-Releaseschlüssels** über den bestätigten
Übergabeweg prüfen. Eine selbst mitgelieferte Prüfsumme oder ein mitgelieferter
Schlüssel allein beweist die Herkunft nicht.

Das vollständige Repository-ZIP zuerst als normaler Benutzer prüfen und in ein
neues Verzeichnis entpacken. Der exakte ZIP-Name und sein SHA-256 stehen im
Übergabenachweis der Lieferung. Bei jedem Fehler stoppen; keinen der folgenden
Befehle nach einem fehlgeschlagenen Vorgänger fortsetzen.

```bash
read -r -p 'Absoluter Pfad zur vollständigen EOS-Repository-ZIP: ' EOS_ZIP
sha256sum "$EOS_ZIP"
```

Erst nach Vergleich mit dem bestätigten externen ZIP-SHA-256:

```bash
mkdir eos-unpacked-01
unzip "$EOS_ZIP" -d eos-unpacked-01
```

Im entpackten Verzeichnis den enthaltenen Repositoryordner öffnen, in dem
`system/product.json` und `tools/system/eos-base.cjs` liegen. Die folgenden
Befehle **aus diesem Repositoryordner** ausführen:

```bash
sudo mkdir -m 0700 /root/eos-test-import-01
sudo cp -R --no-dereference . /root/eos-test-import-01/repository
sudo chmod -R go-w /root/eos-test-import-01
sudo sh -c 'cd /root/eos-test-import-01/repository/delivery/test-pi-0.2.0-test.1 && sha256sum --check bundle.sha256'
sudo sha256sum /root/eos-test-import-01/repository/delivery/test-pi-0.2.0-test.1/release-public.pem
```

Den letzten Wert mit dem bestätigten Release-Schlüsselfingerabdruck aus der
Übergabe vergleichen. Danach das geprüfte Bundle entpacken. Die Dateimodi
müssen erhalten bleiben, weil sie Teil der signierten Bestandsprüfung sind:

```bash
sudo tar --extract --gzip --same-permissions --no-same-owner \
    --file /root/eos-test-import-01/repository/delivery/test-pi-0.2.0-test.1/eos-0.2.0-test.1-linux-arm64.tar.gz \
    --directory /root/eos-test-import-01
sudo mv /root/eos-test-import-01/bundle /root/eos-test-import-01/test-bundle
sudo install -m 0644 \
    /root/eos-test-import-01/repository/delivery/test-pi-0.2.0-test.1/release-public.pem \
    /root/eos-test-import-01/release-public.pem
```

Node-Archiv prüfen:

```bash
sudo sha256sum /root/eos-test-import-01/repository/delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz
```

Erwarteter SHA-256:
`6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2`.
Der Lieferlauf prüft diesen Wert gegen die über HTTPS abgerufene offizielle
Node-Prüfsummenliste. Eine zusätzlich unabhängig geprüfte OpenPGP-Signatur
dieser Liste wird damit nicht behauptet. Herkunft:
<https://nodejs.org/download/release/v24.21.0/SHASUMS256.txt>.

Nur wenn `/usr/bin/node` und `/opt/node-v24.21.0-linux-arm64` noch nicht existieren,
das geprüfte Archiv in den root-kontrollierten Systembereich übernehmen:

```bash
sudo test ! -e /usr/bin/node
sudo test ! -L /usr/bin/node
sudo test ! -e /opt/node-v24.21.0-linux-arm64
sudo test ! -L /opt/node-v24.21.0-linux-arm64
sudo tar --extract --xz --same-permissions --no-same-owner \
    --file /root/eos-test-import-01/repository/delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz \
    --directory /opt
sudo ln -s /opt/node-v24.21.0-linux-arm64/bin/node /usr/bin/node
/usr/bin/node --version
/usr/bin/node -p 'process.platform + "-" + process.arch'
```

Soll: `v24.21.0` und `linux-arm64`. Einen bereits vorhandenen Node-Bestand erst
nach Eigentümer-/Paketprüfung gesondert behandeln. Der Preflight akzeptiert die
gezeigte root-kontrollierte Node-Verknüpfung, prüft aber Ziel, Pfadrechte und
Dateifähigkeiten. Die aus Sicherheitsgründen erforderlichen späteren
Node-Aktualisierungen benötigen einen neu geprüften, passend gebundenen EOS-Stand;
die exakte Bindung ist keine dauerhafte Patchsperre.

Für die folgenden Befehle muss das geprüfte Material in dieser **neu angelegten,
root-eigenen** Struktur bereitliegen:

| Absoluter Pfad | Inhalt |
| --- | --- |
| `/root/eos-test-import-01/repository/` | Vollständige geprüfte EOS-Quelllieferung |
| `/root/eos-test-import-01/test-bundle/` | Entpacktes signiertes ARM64-Bundle mit `manifest.json`, `manifest.sig`, `payload/` |
| `/root/eos-test-import-01/release-public.pem` | Bestätigter öffentlicher Test-Releaseschlüssel |
| `/root/eos-test-input-01/` | Später angelegte private Einrichtungsdateien |

Keine bestehenden Importe überschreiben. Alle Pfade einschließlich ihrer
übergeordneten Verzeichnisse müssen root gehören und dürfen nicht gruppen- oder
weltbeschreibbar sein; keine Symlinks. Den Einstieg ebenfalls aus der geschützten
Repositorykopie ausführen. Keine Programme aus einem gleichzeitig durch normale
Benutzer veränderbaren Downloadordner als root starten.

```bash
sudo /usr/bin/node /root/eos-test-import-01/repository/tools/system/eos-base.cjs verify \
    --bundle /root/eos-test-import-01/test-bundle \
    --public-key /root/eos-test-import-01/release-public.pem
```

Soll: `ok: true`, Profil `test`, drei ausgewählte Pakete: js-controller 7.2.2,
EOS Admin 7.10.11 und NexoWatt UI 1.0.21. Bei abweichender Signatur, Node-Version,
Architektur, SBOM-/Paketbindung oder Zulassung abbrechen. Kein `curl | bash`,
kein Nachinstallieren aus beliebigen URLs und kein Abschalten der Prüfung.

## 4. Individuelle Einrichtungsdateien vorbereiten

Die Befehle legen ausschließlich **leere neue** Geheimnisdateien an; vorher
sicherstellen, dass `/root/eos-test-input-01` noch nicht existiert:

```bash
sudo mkdir -m 0700 /root/eos-test-input-01
sudo install -m 0600 /dev/null /root/eos-test-input-01/service-password.txt
sudo install -m 0600 /dev/null /root/eos-test-input-01/accounts.json
sudo install -m 0600 /dev/null /root/eos-test-input-01/hosts.json
sudoedit /root/eos-test-input-01/service-password.txt
sudoedit /root/eos-test-input-01/accounts.json
sudoedit /root/eos-test-input-01/hosts.json
```

Das Servicepasswort ist eine einzelne UTF-8-Zeile. Es gehört ausschließlich zum
gerätebezogenen NexoWatt-Servicezugang `admin`. In einem dafür vorgesehenen
Passwortmanager sicher hinterlegen; kein gemeinsames Standardpasswort verwenden.

`accounts.json` enthält genau `schemaVersion` und `accounts`. Die folgende
JSON-Struktur ist syntaktisch gültig; die leeren Passwörter sind absichtlich
**nicht provisionierbar** und müssen im geschützten Editor durch individuell
erzeugte temporäre Passwörter ersetzt werden:

```json
{
  "schemaVersion": 1,
  "accounts": [
    { "username": "installateur1", "role": "installer", "password": "" },
    { "username": "benutzer1", "role": "enduser", "password": "" }
  ]
}
```

Es sind 2 bis 16 Konten mit mindestens je einem `installer` und `enduser`
erforderlich. Namen: 3 bis 32 Zeichen, beginnend mit einem Kleinbuchstaben,
anschließend Kleinbuchstaben, Ziffern, `_` oder `-`. Reservierte Namen wie
`admin`, `root` und `service` bleiben ausgeschlossen. Alle Passwörter müssen
verschieden sein, auch vom Servicepasswort: 15 bis 128 Unicode-Zeichen, höchstens
256 UTF-8-Bytes, ohne Steuerzeichen. Die persönlichen Benutzer vergeben nach
der ersten Anmeldung ihr eigenes neues Passwort. Schema und zusätzliche
Laufzeitregeln: `system/integration/accounts.schema.json` und
`runtime/bootstrap/accounts.cjs`.

`hosts.json` ist ein JSON-Array mit **tatsächlich verwendeten** DNS-Namen und/oder
IP-Adressen dieses Test-Pi, höchstens 24 Einträge. Keine URL, kein Port, kein
Wildcardname. Eine feste LAN-Adresse oder ein verlässlich auflösbarer Name
verhindert, dass ein DHCP-Wechsel den Browserzugriff unpassend zum Zertifikat
macht. Benötigte Tailscale-DNS-Namen/IPv4-Adressen bereits aufnehmen, wenn sie
feststehen. `localhost`, `127.0.0.1` und `::1` werden automatisch ergänzt; sie
ersetzen keinen vom Service-Client erreichbaren Namen. Eine spätere Änderung
der Hostliste ist in diesem Einrichtungsbefehl kein automatischer Nachrüstweg.

Der Hersteller liefert zusätzlich eine echte öffentliche `license-trust.json`.
Der Inhalt ist eine JSON-Zuordnung von Schlüsselkennung (`kid`) auf öffentlichen
Ed25519-PEM-Schlüsseltext; 1 bis 32 Schlüssel, SPKI-Format `BEGIN PUBLIC KEY`.
Das ist weder ein Lizenzcode noch der private Lizenzsignierschlüssel. Keine
Testschlüssel aus Quelltests übernehmen oder eine scheinbar gültige Datei erfinden.
Nach Prüfung der Herstellerherkunft den authentifizierten Export übernehmen:

```bash
read -r -p 'Absoluter Pfad zum bestätigten öffentlichen Lizenz-Trust-Export: ' EOS_LICENSE_TRUST
sudo install -m 0600 -- "$EOS_LICENSE_TRUST" /root/eos-test-input-01/license-trust.json
```

Ohne echten Trust-Export kann die Einrichtung nicht abgeschlossen werden.
Das Onboarding übernimmt ihn später nach `/etc/nexowatt-eos/license-trust.json`.

## 5. Gesamte Vorbereitung ohne Installation prüfen

```bash
sudo /usr/bin/node /root/eos-test-import-01/repository/tools/system/preflight-installation.cjs \
    --bundle /root/eos-test-import-01/test-bundle \
    --public-key /root/eos-test-import-01/release-public.pem \
    --password-file /root/eos-test-input-01/service-password.txt \
    --accounts-file /root/eos-test-input-01/accounts.json \
    --license-trust /root/eos-test-input-01/license-trust.json \
    --hosts-file /root/eos-test-input-01/hosts.json
```

Soll: `ready: true`, `changesPerformed: false` und alle Hostprüfungen `pass`.
Die Prüfung verbindet Signatur, Profil, Einrichtungsdateien und Hostvoraussetzungen.
Sie erzeugt keine Konten, Zertifikate oder Dienste. Unter anderem müssen die
Ports 16379/16380 sowie 8081/8188 frei sein. Das Ergebnis behauptet ausdrücklich
noch keinen Redis-TLS-Nachweis oder bestandenen Hardwaretest. Bei `ready: false`
zunächst den benannten Grund beheben; keine Installation erzwingen.

Implementierungs- und Negativtestnachweis dieser Vorprüfung:
[`installation-preflight/verification-summary.json`](../../reports/integration/installation-preflight/verification-summary.json).
Dieser Bericht ersetzt weiterhin keinen Lauf auf dem konkreten Pi.

## 6. Kern installieren und anschließend Admin/UI einrichten

```bash
sudo /usr/bin/node /root/eos-test-import-01/repository/tools/system/eos-base.cjs install \
    --bundle /root/eos-test-import-01/test-bundle \
    --public-key /root/eos-test-import-01/release-public.pem \
    --start yes
```

`--start yes` ist hier erforderlich: Es initialisiert die Datenbanken und startet
den geprüften **Kern ohne aktivierte Adapter**. `--start no` würde nur einen
deaktivierten, nicht initialisierten Stand hinterlassen; unmittelbar folgendes
UI-Onboarding könnte damit nicht funktionieren. Die Installation erzeugt eigene
unprivilegierte Dienstkonten, individuelle TLS-Identitäten und Datenbankkennwörter.
Soll: `ok: true`, `phase: TEST_SERVICES_STARTED`.

Erst nach diesem Erfolg:

```bash
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/onboard-ui.cjs \
    --password-file /root/eos-test-input-01/service-password.txt \
    --accounts-file /root/eos-test-input-01/accounts.json \
    --license-trust /root/eos-test-input-01/license-trust.json \
    --hosts-file /root/eos-test-input-01/hosts.json
```

Der Befehl richtet Rollen und persönliche Konten ein, erzeugt die geräteeigene
HTTPS-CA, veröffentlicht die geprüften statischen Oberflächendateien und startet
Admin/UI. Er kontrolliert frische Adapter-Heartbeats und die erwarteten
HTTPS-Authentifizierungsantworten. Soll: `status: UI_LAB_ENROLLED`,
`physicalControlEnabled: false`, Admin-Port 8081, UI-Port 8188. CA-Fingerabdruck
und Release-ID ohne Geheimnisse im Testprotokoll erfassen.

Ein Fehler lässt den Controller gegebenenfalls absichtlich gestoppt und eine
Wartungssperre bestehen. Den Code und Zeitpunkt sichern, den ersten Versuch am
frischen Snapshot wiederholen und die Ursache zuvor beheben. Keine Sperrdateien
löschen, Marker erhöhen oder Zertifikatsprüfungen abschalten. Die Programme
migrieren keine vorhandene Anlage und setzen fehlgeschlagene Teilprovisionierung
nicht durch blindes Wiederholen fort.

## 7. Browservertrauen, persönliche Anmeldung und Lizenz

Das öffentliche Geräte-CA-Zertifikat liegt unter
`/etc/nexowatt-eos/web/ca.crt`. Nur diese öffentliche Datei kontrolliert auf den
Service-/Testrechner übertragen. Den Fingerabdruck am Pi prüfen:

```bash
sudo openssl x509 -in /etc/nexowatt-eos/web/ca.crt \
    -noout -fingerprint -sha256
```

Er muss zum Onboardingbericht passen. Die CA nur im vorgesehenen Testclient als
Vertrauensanker importieren; Browser-/OS-abhängige Schritte auf diesem Client
prüfen. Keine privaten Dateien aus `web/authority/` oder `*.key` exportieren.
Zertifikatswarnungen nicht dauerhaft übergehen und keinen globalen
TLS-Prüfungsbypass konfigurieren.

1. Im Browser `https://` plus den tatsächlich eingetragenen Pi-Namen und `:8081`
   öffnen. Der Name muss im Zertifikat enthalten und vom Client erreichbar sein.
2. Mit dem jeweiligen persönlichen Startkonto anmelden. Installateur und
   Benutzer müssen vor Produktzugriff ein eigenes neues Passwort vergeben und
   sich anschließend neu anmelden. Ein Rollenwechsel wird dadurch nicht möglich.
3. Installateur/Benutzer gelangen ins NexoWatt-Portal; das Cockpit öffnet denselben
   Host über HTTPS-Port 8188. Der Serviceadministrator `admin` erhält die technische
   Administration. Servicezugang nicht an andere Rollen weitergeben.
4. Als Serviceadministrator `/nexowatt/license` auf Port 8081 öffnen. Die dort
   angezeigte echte Geräte-UUID für eine Hersteller-Testlizenz verwenden. Nur den
   für diese UUID ausgestellten NWL2-Code über diese geschützte Seite übernehmen.
   Alte Lizenzformate oder Testtoken aus Quelltests sind keine Ersatzlizenz.
5. Ohne Lizenz müssen Anmeldung, eigene Passwortvergabe und Service-Lizenzverwaltung
   weiter erreichbar sein; lizenzpflichtige Freigaben bleiben gesperrt. Eine gültige
   Lizenz muss zur UI weitergegeben werden, schaltet in diesem Profil jedoch
   weiterhin keine physische Gerätesteuerung frei.

Nach erfolgreichem Zugangstest die temporären Klartext-Passwortdateien gemäß dem
lokalen Geheimnisverfahren entfernen. Löschen einer Datei garantiert auf einer
SSD keine physische Löschung. Servicezugang und persönliche Kennwörter gehören
in den dafür vorgesehenen sicheren Betrieb, nicht in Screenshots oder Berichte.

## 8. Betriebsprüfung und Abnahmeprotokoll

```bash
sudo systemctl status --no-pager nexowatt-eos-controller.service \
    nexowatt-eos-redis@objects.service nexowatt-eos-redis@states.service
sudo /usr/bin/node /opt/nexowatt/eos/current/runtime/release/installed-check.cjs
sudo /usr/bin/node /opt/nexowatt/eos/current/runtime/transport/redis-tls.cjs \
    probe --config /etc/nexowatt-eos/iobroker.json
sudo /usr/bin/node /opt/nexowatt/eos/current/tools/system/rotate-certificates.cjs status
sudo ss -ltnp
sudo journalctl -u nexowatt-eos-controller.service -b --no-pager -n 150
```

Interne Redis-Listener müssen auf `127.0.0.1:16379/16380` bleiben; diese Ports
werden nicht für LAN oder Tailscale freigegeben. Admin/UI verwenden TLS 1.3 auf
8081/8188 und binden derzeit an alle **IPv4**-Adressen (`0.0.0.0`). Das bewahrt
IPv4-Zugriff über passende Ethernet-, WLAN-, VLAN- oder Tailscale-Routen, ersetzt
aber keine Netzsegmentierung/Zugriffsregeln. IPv6-Erreichbarkeit der Weboberflächen
ist damit nicht implementiert oder abgenommen. Allgemeine Routen und Firewallregeln
werden vom Installer nicht eingerichtet oder überschrieben.

Tailscale wird nicht automatisch installiert, angemeldet, als Subnet-Router oder
Exit-Node aktiviert. Den Servicezugang anschließend im vorgesehenen Tailnet mit
berechtigten Identitäten einrichten und von einem erlaubten sowie einem nicht
erlaubten Client prüfen. Keine pauschale Freigabe aller Netze oder Weiterleitung
der internen Datenbankports vornehmen. Falls der künftige Service-DNS-Name bei
Onboarding noch fehlte, zuerst das Zertifikats-/Namenskonzept klären.

| Zieltest | Erwartung | Beim ersten Durchlauf einzutragen |
| --- | --- | --- |
| Erststart | Signatur-/Profilprüfung, authentifizierter Redis-TLS-Handshake, Controller und beide Adapter bereit | Datum, Release-ID, Ergebnis |
| Persönliche Zugänge | Eigene Passwörter, Pflichtwechsel, keine Selbstbeförderung, alte Sitzung nach Änderung ungültig | Ergebnis je Rolle, keine Kennwörter |
| Lizenz | Ohne Lizenz keine lizenzpflichtige Freigabe; gültige UUID-Lizenz erkannt; physische Befehle weiter gesperrt | Ausgabe ohne Token, Ergebnis |
| Neustart | Nach regulärem `sudo reboot` Dienste und Browseranmeldung erneut verfügbar | Startdauer, Fehlercodes |
| TLS/Netze | Richtiger Host/CA funktioniert; falscher Host/CA wird abgelehnt; Datenbanken nicht aus LAN erreichbar | Client/Verbindung, Ergebnis |
| Service-VPN | Berechtigter Serviceclient erreicht HTTPS/SSH gemäß Regeln; unberechtigter Client wird abgewiesen | Tailnet-Regelbezug, Ergebnis |
| Zertifikatsbetrieb | Timer aktiv, Status gültig; geplante Erneuerung und Wiederanmeldung erfolgreich | Siehe `CERTIFICATE_LIFECYCLE.md` |
| Dauerlauf | Mehrere Tage mit dokumentierten Neustarts, RAM/SSD/Temperatur und Fehlern beobachten | Beobachtungszeitraum, Auffälligkeiten |
| Wiederherstellung | Vorbereitetes Systemabbild lässt sich tatsächlich auf dem Testmedium wiederherstellen | Medium/Stand, Ergebnis |

Ein erfolgreicher Dauerlauf liefert Erfahrung für genau dieses Gerät und diesen
Build. Er ersetzt keinen Penetrationstest, Stromausfall-/Datenträgervolltest,
gerätespezifische Failsafes oder die spätere Backup-/Updateabnahme. Solche
Fehlerfälle nur in der getrennten Testumgebung und mit gesichertem Rückweg prüfen.
Logs vor Weitergabe auf Zugangsdaten, Lizenzcodes und Anlageninformationen sichten;
keine vollständigen privaten Konfigurationsverzeichnisse versenden.

Die Quellen bleiben gemeinsam im Hauptsystem. Änderungen an einem Einzeladapter
werden kontrolliert in dieses System übernommen und erneut paketiert; siehe
[`EOS_SOURCE_WORKFLOW_DE.md`](../development/EOS_SOURCE_WORKFLOW_DE.md).
Für neue Teststände derzeit den frischen Snapshot verwenden. Die additive
Adapteraufnahme ist kein allgemeiner Updater für bestehenden Code.
