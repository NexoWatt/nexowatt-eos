# EOS PostgreSQL-Testinstallation – 0.2.0-test.2

Stand: 02.10.2026, Quellen 0.2.0-dev.7. Nur **frischer, getrennter Raspberry Pi 5, Debian/Raspberry Pi OS Lite 13, 64 Bit (aarch64)**. Kein Update einer bestehenden Anlage. Kein eigener Linux-Kernel: EOS bleibt ein gehärtetes Anwendungssystem auf Linux, Node.js und ioBroker.

## Was dieses Paket ermöglicht

Der neue signierte ARM64-Stand enthält js-controller 7.2.2, EOS Admin 7.10.11, die aktuelle NexoWatt UI 1.0.21 einschließlich Update-Status und die neuen PostgreSQL-Backends 0.1.0-dev.1 / pg 8.23.1. Der Installer richtet einen eigenen PostgreSQL-17-Cluster ein. Redis-Server wird dafür nicht benötigt. Einige ioBroker-Kompatibilitätsbibliotheken tragen weiterhin Redis im Paketnamen.

**Installationskandidat zum Testen, noch kein abgenommener Gesamtlauf.** Ein nativer PostgreSQL-/Controller-/Systemd-Lauf war in der root-only Entwicklungsumgebung nicht möglich. Der Installer führt deshalb auf dem Pi echte TLS-, SQL- und Startprüfungen aus und bricht bei Fehlern ab. Ein solcher Fehler ist ein Prüfresultat, kein Grund, TLS oder Sicherheitsprüfungen abzuschalten.

Devices, EEBUS, OCPP21 und Backitup sind als Quellen im vollständigen Repository vorhanden, aber in diesem Laufzeitprofil **nicht installiert/aktiviert**. Physische Gerätebefehle bleiben gesperrt. Die vollständige Anlagenregelung, PostgreSQL-Backup/Restore und Adapter-Nachinstallation sind noch nicht abgenommen. Für diesen Test keine echte Anlage anschließen.

## 1. Bestehenden Datenträger erhalten

Dein bisheriger Pi hatte einen aktiven Dienst `nexowatt-eos.service`, `/opt/nexowatt-eos`, `/etc/nexowatt-eos` und `/var/lib/nexowatt-eos`. Diesen Datenträger aufbewahren und nicht überschreiben. Nutze eine separate SD-Karte/SSD mit frischem Lite-System. Der Installer verweigert vorhandene EOS-Daten und übernimmt keine bestehenden Konten. Es gibt keinen Force-Schalter und keine automatische Datenmigration.

Im isolierten Testnetz arbeiten; keine Router-Portweiterleitungen. Tailscale darf über ein separat verwaltetes, eingeschränktes Serviceprofil genutzt werden; dieses Paket installiert oder konfiguriert Tailscale nicht. Die Datenbank bleibt ausschließlich auf `127.0.0.1:15432`. HTTPS-Ports 8081/8188 sind nach Einrichtung im erreichbaren Testnetz verfügbar. Alle Netze pauschal freizugeben ist nicht erforderlich.

## 2. Paket übernehmen und Betriebssystem vorbereiten

Das vollständige ZIP auf den Pi übertragen. Seine SHA256 mit der getrennt gelieferten Prüfsumme abgleichen, bevor enthaltene Programme als Root ausgeführt werden. Danach das ZIP in einem **neuen root-eigenen Verzeichnis** entpacken, beispielsweise `/root/eos-test-02/`. Darin muss `/root/eos-test-02/NexoWatt_EOS/` liegen. Nicht aus einem von anderen Benutzern beschreibbaren Verzeichnis als Root starten.

Zunächst nur prüfen:

```bash
cat /etc/os-release
uname -m
df -h /
systemctl list-unit-files --no-pager 'nexowatt-eos*' 'iobroker*'
```

Vorausgesetzt wird ein aktualisiertes Debian-13-System mit korrekter Uhrzeit. Die folgenden Paketbefehle gelten nur für den frischen Testdatenträger und verwenden die bereits eingerichteten offiziellen Distributionsquellen:

```bash
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install postgresql-common python3 python3-apt unattended-upgrades \
  needrestart debian-archive-keyring ca-certificates openssl libcap2-bin iproute2 unzip
sudoedit /etc/postgresql-common/createcluster.conf
```

In dieser Datei `create_main_cluster = false` als wirksame Einstellung setzen. So erzeugt die folgende Paketinstallation keinen zusätzlichen Standardcluster. Andere vorhandene Datenbankcluster niemals löschen. Danach:

```bash
sudo apt-get install postgresql-17 postgresql-client-17
pg_lsclusters
```

`pg_lsclusters` soll auf diesem frischen Testsystem keine Cluster auflisten. EOS verwendet anschließend bewusst seinen eigenen Dienst und kein Debian-`main`-Cluster. Auf Raspberry-Pi-OS zusätzlich das vorhandene Paket `raspberrypi-archive-keyring` erhalten/aktualisieren. Keine sid-/testing-Pakete und keine ungeprüften Fremdquellen beimischen. Der Preflight verlangt mindestens PostgreSQL 17.11; wenn die offiziellen Quellen das nicht liefern, stoppen und die Paketversion melden.

Die dokumentierte Debian-Option: <https://manpages.debian.org/trixie/postgresql-common/pg_createcluster.1.en.html> (Abschnitt DEFAULT VALUES). Änderungen des Linux-Kernels/firmwarebedingte Neustarts vor dem EOS-Test abschließen.

## 3. Exakte Node-Laufzeit installieren

Node 24.21.0 ARM64 wird bereits im vollständigen Repository unter `delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz` mitgeliefert. **Nur das offizielle Node-Archiv wiederverwenden, nicht das zurückgezogene EOS-test.1 installieren.**

SHA256 des Node-Archivs:

`6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2`

In einer Root-Sitzung (`sudo -i`), nachdem das Repository geschützt entpackt wurde:

```bash
cd /root/eos-test-02/NexoWatt_EOS
sha256sum delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz
```

Nur fortfahren, wenn der Hash exakt stimmt und `/usr/bin/node` sowie `/opt/nexowatt-node/node-v24.21.0-linux-arm64` noch nicht existieren. Vorhandene Node-Installationen nicht blind ersetzen. Falls bereits exakt 24.21.0 geschützt unter `/usr/bin/node` vorhanden ist, diesen Schritt überspringen.

```bash
install -d -m 0755 /opt/nexowatt-node
tar -xJf delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz -C /opt/nexowatt-node
ln -s /opt/nexowatt-node/node-v24.21.0-linux-arm64/bin/node /usr/bin/node
/usr/bin/node --version
```

Kein `npm install`, kein `curl | bash` und keine nachträgliche Auflösung privater Adapter auf dem Zielgerät. Die vollständige Laufzeit ist bereits im signierten Bundle enthalten.

## 4. Testbundle prüfen und persönliche Zugänge vorbereiten

Weiterhin als Root im Repository:

```bash
cd delivery/test-pi-0.2.0-test.2
sha256sum -c bundle.sha256
tar -xzf eos-0.2.0-test.2-linux-arm64.tar.gz
/usr/bin/node bundle/payload/tools/system/eos-base.cjs verify \
  --bundle /root/eos-test-02/NexoWatt_EOS/delivery/test-pi-0.2.0-test.2/bundle \
  --public-key /root/eos-test-02/NexoWatt_EOS/delivery/test-pi-0.2.0-test.2/release-public.pem
python3 bundle/payload/tools/system/prepare-inputs.py
```

Der Dialog vergibt **drei unterschiedliche, selbst gewählte Passwörter**: Service-Admin, Installateur und Benutzer. Installateur/Benutzer müssen ihr Startpasswort beim ersten Login ändern. Das technische `admin`-Konto bleibt dem Service vorbehalten. Keine Standardpasswörter.

Benötigt wird außerdem ein authentischer **öffentlicher Hersteller-Lizenz-Trust-Export** aus eurer Lizenzverwaltung. Keine privaten Lizenzschlüssel übertragen. Ohne diesen Export wird die vollständige Einrichtung absichtlich nicht freigeschaltet; das Paket erzeugt keinen Ersatz-Herstellerschlüssel und keine Testlizenz. Eine spätere Lizenz muss zur echten Geräte-UUID passen.

Der Dialog legt ausschließlich root-lesbare Dateien unter `/root/eos-test-input-02/` an. Diese niemals hier posten. Die Hostliste enthält Pi-IP/DNS-Namen, bei Bedarf den später tatsächlich verwendeten Tailscale-DNS-Namen. Browserzertifikate nicht durch unsichere TLS-Ausnahmen umgehen.

## 5. Erst prüfen, dann installieren

```bash
/usr/bin/node bundle/payload/tools/system/preflight-installation.cjs \
  --bundle /root/eos-test-02/NexoWatt_EOS/delivery/test-pi-0.2.0-test.2/bundle \
  --public-key /root/eos-test-02/NexoWatt_EOS/delivery/test-pi-0.2.0-test.2/release-public.pem \
  --password-file /root/eos-test-input-02/service-password.txt \
  --accounts-file /root/eos-test-input-02/accounts.json \
  --license-trust /root/eos-test-input-02/license-trust.json \
  --hosts-file /root/eos-test-input-02/hosts.json
```

Nur bei `ready: true` fortfahren. Bei Fehlern ausschließlich den bereinigten Prüfbericht zurückgeben, keine Konfigurationsdateien/Passwörter. Dann:

```bash
/usr/bin/node bundle/payload/tools/system/eos-base.cjs install \
  --bundle /root/eos-test-02/NexoWatt_EOS/delivery/test-pi-0.2.0-test.2/bundle \
  --public-key /root/eos-test-02/NexoWatt_EOS/delivery/test-pi-0.2.0-test.2/release-public.pem \
  --start yes
/usr/bin/node /opt/nexowatt/eos/current/tools/system/onboard-ui.cjs \
  --password-file /root/eos-test-input-02/service-password.txt \
  --accounts-file /root/eos-test-input-02/accounts.json \
  --license-trust /root/eos-test-input-02/license-trust.json \
  --hosts-file /root/eos-test-input-02/hosts.json
```

Keinen zweiten Installationsversuch über halb angelegte Daten erzwingen. Bei Abbruch bleiben Daten und Belege erhalten; die eigenen Dienste werden soweit möglich gestoppt. Bei `CLEANUP_INCOMPLETE` Dienststatus gesondert prüfen. Ein Rollback bedeutet hier: alten unberührten Datenträger einsetzen, nicht JSON-/SQL-Daten zurückkopieren.

Nach erfolgreicher Einrichtung die CA `/etc/nexowatt-eos/web/ca.crt` samt geprüftem Fingerabdruck auf dem Testrechner vertrauen. **Nur die öffentliche CA**, keine `.key`-Datei kopieren. Anschließend `https://PI-IP:8188` (UI) und `https://PI-IP:8081` (Service-Admin) öffnen. Das Design wurde nicht ersetzt; aktivierte Funktionen bleiben im begrenzten Laborprofil.

## 6. Zielabnahme – nicht überspringen

```bash
systemctl is-active nexowatt-eos-postgresql.service nexowatt-eos-controller.service
cat /etc/nexowatt-eos/postgresql-acceptance.json
systemctl list-timers --all --no-pager 'nexowatt-eos*'
ss -ltn
```

Der Datenbankbericht muss `passed: true` zeigen. Er prüft echte TLS-1.3-Verbindungen für beide Rollen, Schema/Rollen, SQL-Roundtrips, RLS sowie die Ablehnung von Klartext, fehlendem/falschem Clientzertifikat und TLS 1.2. Er ist kein Penetrationstest.

Danach auf dem Testgerät einzeln dokumentieren:

1. Alle drei Rollen anmelden, Passwortwechsel, falsche Passwörter und unberechtigte Service-/Schreibzugriffe prüfen.
2. Lizenzseite, Navigationspunkte und Darstellung prüfen; keine physische Regelung erwarten.
3. Kontrollierter Pi-Neustart: Daten bleiben erhalten, beide Dienste und beide HTTPS-Oberflächen kommen zurück.
4. Im leeren Labor Datenbankdienst kontrolliert stoppen/starten; Wiederanlauf und veraltete Zustände prüfen. Aktuell ist kein automatischer Controller-Wiederanlauf nach jedem abhängigen DB-Stopp nachgewiesen. Im Wartungsfall den gesamten EOS-Target kontrolliert neu starten; keine Sicherheit durch überbrückte Startprüfungen vortäuschen.
5. Update-Status im UI prüfen. Den ersten echten Debian-Paketupdate-Lauf, erforderliche Dienstneustarts und Rebootstatus beobachten. Kein automatischer Reboot; Node wird durch das signierte Laufzeitprofil gepflegt, nicht still durch APT ausgetauscht.

Zum kontrollierten Stoppen: `systemctl stop nexowatt-eos.target`. Ein automatischer PostgreSQL-/Web-Zertifikatswechsel ist in test.2 noch **nicht** implementiert. Zertifikate gelten 90 Tage; der neue PG-Timer warnt ab 30 Tagen Restlaufzeit. Dieser erste Test ist auf maximal 30 Tage angesetzt. Vor längerer Nutzung ist eine geprüfte Zertifikatsrotation einschließlich Web-Zertifikaten nötig.

Kein produktiver Anlagenbetrieb, keine CRA-/IEC-Konformitätsbehauptung, keine Aussage „alle Penetrationstests bestanden“. Die offenen Nachweise stehen in `docs/security/POSTGRESQL_TEST_INSTALLATION_DE.md`.
