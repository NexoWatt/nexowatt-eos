# EOS-Hardwareprofil: Raspberry Pi 5

Stand: 30.09.2026. Profil `EOS-HW-RPI5-001`, **vorläufig / vom Nutzer gemeldet**.
Ausgangsstand des Architektur-Repositorys: `8da1152d556625bb8173fc8b5953d0caaef992f1`.
Maschinenlesbarer Datensatz: [`system/hardware/rpi5-profile.json`](../../system/hardware/rpi5-profile.json).
Es wurde kein Zielgerät ausgelesen, verändert oder getestet. `measured=false`, `releaseApproved=false`.

## Gemeldeter Bestand und offene Identifikation

| Merkmal | Verfügbarer Nachweis | Noch offen |
| --- | --- | --- |
| Raspberry Pi 5 | Nutzermeldung vom 30.09.2026 | Boardrevision, konkrete Stückliste |
| 8 GB und 16 GB RAM | Zwei gemeldete Ausstattungsvarianten | Separate Last- und Ausfallmessungen beider Varianten |
| SSD | Nutzermeldung | Modell, Kapazität, Firmware, NVMe/USB/SATA-Brücke, Stromversorgung, Haltbarkeit |
| „linux 12 lite“ | Wortlaut der Nutzermeldung | Distribution, Image, Paketstand, Architektur, Kernel |
| Node.js / js-controller | Gehören ausdrücklich zum EOS-Lieferumfang | Tatsächlich installierte Versionen, Architektur, Dienstrechte, Konfiguration |
| Boot / Gehäuse | Kein Gerätenachweis | EEPROM-Version, Bootreihenfolge, Secure Boot, Kühlung, Netzteil, RTC-Batterie, physischer Zugang |

„Linux 12 Lite“ wird **nicht** als bestätigter Distributionsname übernommen. Raspberry Pi OS Lite auf Debian-12-/Bookworm-Basis ist eine plausible Zuordnung, muss aber am Gerät bestätigt werden. Ein generisches Debian 12 und Raspberry Pi OS sind keine austauschbaren Images. Auch 64-Bit-Kernel und 64-Bit-Userspace sind getrennt zu erfassen.

## Aktueller Quellenstand und Entwicklungsentscheidung

Debian bezeichnet Bookworm inzwischen als abgelöst durch Debian 13. Für Debian 12 besteht LTS bis **30.06.2028**, unter anderem für `arm64` und `armhf`; LTS wird durch ein eigenes Team getragen. Dies ist keine Aussage über jedes installierte Paket oder die gesamte EOS-Supportdauer. [S1, S2]

Raspberry Pi führt **Raspberry Pi OS Legacy Lite 64-bit / Debian 12 Bookworm** weiterhin mit Sicherheitsupdates: Downloadstand 15.09.2026, Kernelreihe 6.12. Der aktuelle Hauptzweig ist Trixie / Debian 13. Diese Angaben betreffen angebotene Images und belegen keinen installierten Stand. [S3]

**Entwicklungsentscheidung:** Die gemeldeten Anlagen erhalten zunächst ein Bestandsprofil. Ziel für neue Pi-5-Produktimages ist ein einzeln freigegebenes, unterstütztes **64-Bit-Lite-Image (`arm64`)** mit festgehaltenem Hash und Paketbestand. Eine Migration auf den aktuellen Hauptzweig wird getrennt geprüft; dieses Dokument löst kein Upgrade aus. Die Wartungsplanung muss OS, Pi-Kernel/Firmware, Node.js, js-controller, Adapter und native Abhängigkeiten einzeln erfassen. Für einen EOS-Supportzeitraum über das Lebensende einer Basisversion hinaus ist rechtzeitig eine geprüfte Migration oder anderweitig belegte Pflege erforderlich.

Der Pi 5 besitzt einen 64-Bit-Arm-Prozessor; 8-GB- und 16-GB-Ausführungen sind Herstellerkonfigurationen. Raspberry Pi nennt Bookworm und Trixie als kompatibel, empfiehlt ein hochwertiges 5-V-/5-A-USB-C-Netzteil sowie Kühlung für anhaltende Last. Die PCIe-Anbindung benötigt einen passenden Adapter/HAT. Das ist eine Hardwaregrundlage, keine EOS-Leistungsfreigabe. [S4]

## Sicherheitsgrenzen dieses Hardwareprofils

- **Startkette:** Raspberry Pi dokumentiert verifizierten Start für den Pi 5. OTP-Provisionierung ist dauerhaft; Boot- und Wiederherstellungsimages, Schlüsselverwahrung und deren Rotation beziehungsweise Grenzen müssen vor einer Serienprovisionierung feststehen. Der hardwaregebundene Signaturpfad nutzt RSA-2048 / PKCS#1 v1.5. Er lässt sich nicht durch einen neueren TLS- oder Anwendungsschlüssel ersetzen. Die Eignung für den geplanten Produktsupport bleibt im Kryptokonzept zu bewerten. [S5, S6]
- **Schlüsselgrenze:** Es gibt keine Secure Enclave, die OTP-Geheimnisse vor dem laufenden privilegierten System schützt. Zugriff auf `/dev/vcio` beziehungsweise Kernelrechte kann diese Schutzgrenze aufheben. Verschlüsselung einer Lizenzdatei allein garantiert daher keine Geheimhaltung gegenüber einem kompromittierten Rootkonto. [S5]
- **Massenspeicher:** Secure Boot verifiziert Bootbestandteile; die Vertrauenskette muss im EOS-Image auf das Root-Dateisystem und ausführbaren Produktcode fortgeführt werden. Verschlüsselung, Integrität, getrennte Schreibbereiche, Recovery und Rückfall sind eigene Entwurfs- und Prüfpunkte. Keine vorhandene SSD-Verschlüsselung wird angenommen.
- **Strom und Wiederanlauf:** Bei USB-SSD ist das gemeinsame Strombudget zu prüfen. Raspberry Pi nennt 600 mA USB-Budget bei 3-A-Versorgung und 1,6 A bei geeigneter 5-A-Versorgung. Lastspitzen, Unterspannung und Stromverlust sind in der konkreten Zusammenstellung zu testen. [S7]
- **Zugriffe:** Adapter erhalten keinen pauschalen Zugriff auf Hostgeräte, `video`, Bootpartition, EEPROM oder einen privilegierten Containerdienst. Notwendige serielle/GPIO-Schnittstellen werden je Adapter und Gerät freigegeben. Ungenutzte Netzwerk-, Funk- und Debugschnittstellen gehören in den dokumentierten Sollzustand.
- **Anlagenbetrieb:** 8 GB und 16 GB müssen getrennt geprüft werden. Mehr RAM belegt weder Reaktionszeit noch zuverlässige Energiebegrenzung. Watchdog, veraltete Messwerte, Geräteausfall, Controller-Neustart und sichere Wiederaufnahme werden mit den Anlagenfunktionen getestet; vorhandene Schutzfunktionen bleiben unabhängig von Lizenz und Bedienoberfläche wirksam.

Diese Punkte ergänzen das [Systembedrohungsmodell](../security/THREAT_MODEL_SYSTEM.md) und den [Kompatibilitätsplan](../operations/COMPATIBILITY_PLAN.md). Sie sind Entwurfsanforderungen, keine Nachweise erfüllter IEC- oder CRA-Konformität.

## Datensparsame Bestandsaufnahme

Die folgenden Lesebefehle können bei einer geplanten Bestandsaufnahme am Zielgerät verwendet werden. Sie installieren nichts und starten keine Dienste. Es liegen noch keine Ausgaben vom Zielgerät vor. Keine vollständigen Konfigurationsdateien, Umgebungsvariablen, Seriennummern, MAC-/IP-Adressen, Lizenzdateien, OTP-Dumps oder Kundendaten mitsenden.

```bash
sed -n '/^ID=/p; /^VERSION_ID=/p; /^VERSION_CODENAME=/p; /^PRETTY_NAME=/p' /etc/os-release
uname -sr
uname -m
getconf LONG_BIT
dpkg --print-architecture
node --version
node -p 'process.arch'
```

Den js-controller-Stand aus dem **tatsächlichen Installationsverzeichnis** lesen; `/opt/iobroker` ist hier nur das übliche Beispiel. Dies liest ausschließlich das Paketmanifest und führt keinen Controllerstart aus:

```bash
python3 -c 'import json; print(json.load(open("/opt/iobroker/node_modules/iobroker.js-controller/package.json", encoding="utf-8"))["version"])'
```

Optionale Ergänzungen, sofern die jeweiligen Werkzeuge vorhanden und bereits zugreifbar sind:

```bash
tr -d '\000' < /proc/device-tree/model
awk '/^MemTotal:/ {print}' /proc/meminfo
lsblk --nodeps --output TYPE,TRAN,SIZE,MODEL
vcgencmd bootloader_version
```

Der letzte Befehl ist von Raspberry Pi als reine Versionsabfrage dokumentiert. [S7] Bei fehlender Berechtigung bleibt der Wert offen; für diese Erhebung keine Gruppen- oder Geräteberechtigungen ändern. Angegebene Modelle vor Weitergabe auf eigene Standortbezeichnungen prüfen. Paketversionen sind Inventarnachweise, kein Nachweis laufender Dienste, erfolgreicher Updates oder fehlender Schwachstellen.

## Offene Abnahme

| Kennung | Erforderlicher Nachweis | Status |
| --- | --- | --- |
| EOS-HW-TEST-001 | Image, Architektur, Kernel, EEPROM, Node und js-controller je Variante inventarisieren | Nicht ausgeführt |
| EOS-HW-TEST-002 | Installation und Funktionsreferenz mit festem Adapterbestand | Nicht ausgeführt |
| EOS-HW-TEST-003 | Dauerlast, RAM, I/O, Temperatur, Unterspannung und Regelverzögerungen | Nicht ausgeführt |
| EOS-HW-TEST-004 | Backup/Restore auf Ersatz-SSD einschließlich Schlüssel-/Lizenzwiederherstellung | Nicht ausgeführt |
| EOS-HW-TEST-005 | Signaturfehler, manipulierte Images, Updateabbruch, Rückfall und Stromverlust | Nicht ausgeführt |
| EOS-HW-TEST-006 | Rechte- und Schnittstellentrennung einschließlich js-controller/Adapter | Nicht ausgeführt |
| EOS-HW-TEST-007 | Geräteausfall, veraltete Werte, Neustart und betriebliche Schutzfunktionen | Nicht ausgeführt |

Änderungsnachweis: ausschließlich Dokumentation und JSON-Profil ergänzt. Inhalt gegen die unten genannten Primärquellen geprüft; JSON-Syntax und Statusfelder lokal geprüft. Kein Benchmark, Penetrationstest, Liveanlagentest oder Installationsversuch. Freigabe bleibt offen. Verantwortlichkeit: EOS-Produktentwicklung; Gerätebestandsdaten und Versuchsergebnisse sind noch zu erheben.

## Primärquellen

Alle abgerufen am 30.09.2026. Dynamische Seiten sind Quellenstand dieses Datums; eine spätere Produktfreigabe muss Versionen und Hardware erneut binden.

- S1: Debian Bookworm Release Information: https://www.debian.org/releases/bookworm/
- S2: Debian LTS: https://www.debian.org/lts/
- S3: Raspberry Pi OS Downloads: https://www.raspberrypi.com/software/operating-systems/
- S4: Raspberry Pi 5 Produktspezifikation: https://www.raspberrypi.com/products/raspberry-pi-5/
- S5: Raspberry Pi Secure Boot: https://github.com/raspberrypi/usbboot/blob/master/docs/secure-boot.md
- S6: Raspberry Pi 5 Secure Boot Provisioning: https://github.com/raspberrypi/usbboot/blob/master/secure-boot-recovery5/README.md
- S7: Raspberry Pi Computer Hardware, Abschnitte Stromversorgung und EEPROM: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
