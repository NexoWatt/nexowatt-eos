# Vollständiger EOS-Installationskandidat test.3

Stand: 03.10.2026 · **Linux ARM64, frischer isolierter Debian-13-Testhost**.

Enthalten sind Controller 7.2.2, EOS Admin 7.10.11, UI 1.0.21, Devices 0.5.169,
EEBUS 0.3.0, OCPP21 0.4.0, Backup 1.0.10, die PostgreSQL-Backends sowie der
geschützte HTTPS-Erststart mit UUID-Anzeige und Passwortvergabe im Frontend.
Signatur und sämtliche Archivmitglieder wurden gelesen und geprüft.

| Bindung | Wert |
|---|---|
| Archiv | `eos-0.2.0-test.3-linux-arm64.tar.gz` |
| Größe | 88545970 Bytes |
| Signierte Dateien | 22202 |
| SHA-256 des Archivs | `17584d3ec2faa37d5bd978670d85e2ac478ad4129e79fde0d9b10a5570d28716` |
| SHA-256 des öffentlichen Releaseschlüssels | `446fdfe6b5719db58439b68c464f9064318ea423b176ed313a75acc6d4e7798a` |
| Manifestbasierte Release-ID | `fd3445a3b8dcd7e94bc5ecb5e88fecabff191da77232ebc47ed266fb6e93f5fa` |

**Installation:** [Git-Anleitung](../../docs/operations/GIT_TEST3_INSTALLATION_DE.md).
Den öffentlichen Releaseschlüssel-Fingerabdruck über den bestätigten
Übergabeweg abgleichen. Zusätzlich euren authentischen öffentlichen
NWL2-Lizenz-Trust-Export bereitstellen. Kein privater Herstellerschlüssel
und keine erfundene Kundenlizenz werden mitgeliefert.

Die Lizenz schaltet die vorhandenen Home-/Pro-Bereiche und Kontingente frei.
Engere signierte Grenzen gewinnen; tatsächliche Gerätesteuerung bleibt bis
zur eigenen technischen Abnahme gesperrt. Eigene NexoWatt-Bestandteile sind
proprietär; die Lizenzdateien erhalten Drittanbieter- und frühere Rechte.

**Offen, nicht ausgeführt:** vollständige Pi-Installation, nativer Ziel-
Ladeversuch, PostgreSQL/systemd/POSIX-Rechte, echter Browserablauf, Reboot,
Abbruch/Recovery, Backup/Restore und sämtliche Hardware-/Anlagentests.
Der vollständige UI-TypeScript-Build besteht. Die gesamte UI-Testsuite bleibt
wegen POSIX-Prüfungen unter Windows und des Mesh-Zeitbudgets nicht grün.
[Detaillierte Nachweise und Grenzen](../../reports/integration/installable-test3-20261003/README.md).
Keine Produktionsfreigabe. test.1/test.2 sind unveränderte historische Pakete.
