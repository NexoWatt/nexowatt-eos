# Test-Pi vorbereiten: derzeit nur Bestandsaufnahme

**Fortschreibung 02.10.2026:** Dieser Text dokumentiert die historische
Redis-Sperre. Für den neuen, ausschließlich isolierten PostgreSQL-Kandidaten
`test.2` gilt [diese Anleitung](POSTGRESQL_TEST_INSTALLATION_DE.md). Die Redis-
Sperre wird dadurch nicht aufgehoben; keine bestehende Anlage migrieren.

Stand: 01.10.2026 · Quellen `0.2.0-dev.4` · Befund `EOS-HOST-REDIS-20261001`.

**Neue Installationen sind vorläufig gesperrt. Das frühere Paket
`0.2.0-test.1` nicht installieren.** Es bleibt mit unveränderten Signaturen und
Nachweisen als historisches Artefakt im Repository. Es gibt in dieser Lieferung
kein neues signiertes Installationspaket. Der [aktuelle Prüfbericht](../security/DEBIAN13_TEST_HOST_DE.md)
erläutert den Redis-Befund und die erforderliche Abhilfe.

## Der gemeldete Testhost

| Merkmal | Vom Nutzer ausgelesen |
| --- | --- |
| Hardware | Raspberry Pi 5 Model B Rev 1.0 |
| Arbeitsspeicher | 7,9 GiB insgesamt, entsprechend der 8-GB-Ausführung |
| Betriebssystem | Debian GNU/Linux 13 (trixie), vollständige Versionsangabe 13.4 |
| Architektur | aarch64, entspricht Node ARM64 |
| Systemmedium | mmcblk0, 59,5 GiB, Root-Dateisystem ext4 auf mmcblk0p2 |
| SSD | In der Ausgabe nicht vorhanden |

Das ist eine geeignete Hardwareklasse für die geplante Teststufe, aber noch
keine Zielgeräteabnahme. Freier Speicherplatz, installierte Pakete und eine
mögliche vorhandene Anwendung sind aus der bisherigen Ausgabe nicht ersichtlich.
Das System nicht formatieren oder auf Debian 12 zurücksetzen. Auch dort benötigt
Redis eine konkrete Paket- und Sicherheitsbewertung. Die SD-Karte kann später
für einen isolierten Erststart dienen; SSD-/Stromausfall-/Dauerlaufprüfungen sind
zusätzlich am vorgesehenen Serienmedium erforderlich.

## Nächster Schritt: nur lesen

Diese Befehle installieren nichts und verändern keine Dienste:

```bash
df -h /
dpkg-query -W -f='${Package}	${Version}	${Architecture}\n' \
    redis-server redis-tools nodejs systemd openssl libssl3t64 2>/dev/null
systemctl --version | head -n 1
command -v node
if command -v node >/dev/null 2>&1; then node --version; fi
for p in /opt/iobroker /etc/nexowatt-eos /var/lib/nexowatt-eos; do
    if [ -e "$p" ]; then printf 'VORHANDEN: %s\n' "$p"; fi
done
```

Fehlende Paketzeilen sind bei einer frischen Installation normal. Keine
Passwörter, Lizenzcodes, privaten Schlüssel oder vollständigen Konfigurationen
weitergeben. Die Paketstände werden mit dem aktuellen Sicherheitsstatus
abgeglichen, bevor ein neuer konkreter Installationsweg bereitgestellt wird.

## Voraussetzungen für die Aufhebung der Sperre

1. Einen konkret behobenen Redis-Paket-/Binärstand mit Herkunft, Hashes,
   Lizenzbewertung und Advisory-Nachweis auswählen. Debian-Revisionen beachten;
   `redis-server --version` zeigt diese nicht vollständig an.
2. Den Stand für ARM64 prüfen und die OS-/Redis-Komponenten separat zur
   vorhandenen CycloneDX-npm-SBOM erfassen. Eine Versionsfamilie allein genügt
   nicht zur Freigabe. Keine Pakete aus Debian sid in den Testhost mischen.
3. Mit diesem Stand TLS 1.3, Controller/Admin/UI, Zertifikatswechsel und
   unprivilegierte systemd-Dienste nachweisen. TLS nicht als Ausweichlösung
   abschalten; die internen Ports bleiben an Loopback gebunden.
4. Neues signiertes Testpaket und aktualisierte Anleitung erstellen. Danach auf
   dem getrennten Pi Erststart, Rollen, Neustart und Wiederherstellung prüfen.

Die neuen Diagnosewerkzeuge erkennen Debian 12/13 und prüfen passende
Systemd-/Redis-Hauptversionen. `prerequisitesReady: true` bedeutet ausschließlich,
dass diese technischen Vorbedingungen passen. `redis-security-admission: fail`
und `ready: false` verhindern mit den **aktuellen Werkzeugen** jede
Neuinstallation. Es gibt keinen Force-Schalter. Bereits ausgelieferte ältere
Werkzeuge und Offlinekopien werden dadurch technisch nicht widerrufen.
Bestehende additive Updatewege sind von dieser Neuinstallationssperre nicht
automatisch erfasst; für sie ist ebenfalls keine neue Freigabe erteilt.

Der öffentliche Hersteller-Export `license-trust.json` wird für die spätere
Einrichtung weiterhin benötigt. Er enthält öffentliche Schlüssel; den privaten
Lizenzschlüssel nicht übertragen. Persönliche Service-, Installateur- und
Benutzerpasswörter werden erst bei der tatsächlichen Einrichtung lokal vergeben.

Die [frühere Anleitung](../history/TEST_PI_INSTALLATION_0.2.0-test.1_DE.md)
ist ausschließlich ein historischer Nachweis und derzeit **nicht auszuführen**.
