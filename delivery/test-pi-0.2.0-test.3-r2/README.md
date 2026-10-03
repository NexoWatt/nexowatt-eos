# Vollständiger EOS-Installationskandidat test.3, Revision 2

Stand: 03.10.2026 · **Linux ARM64, frischer isolierter Debian-13-Testhost**.
Lieferrevision 2, signierte Manifestsequenz 5. Runtime-Version `0.2.0-test.3`.

Enthalten sind Controller 7.2.2, EOS Admin 7.10.11, UI 1.0.21, Devices 0.5.169,
EEBUS 0.3.0, OCPP21 0.4.0, Backup 1.0.10, die PostgreSQL-Backends sowie der
geschützte HTTPS-Erststart mit UUID-Anzeige und Passwortvergabe im Frontend.

Diese Revision korrigiert die Prüfung vorhandener systemd-Units. Ein leeres
EOS-/ioBroker-Suchergebnis darf einen frischen Debian-13-Host nicht allein
wegen des Exitcodes eines gefilterten Aufrufs zurückweisen. Die neue Prüfung
wertet eine erfolgreiche vollständige Unitliste aus; vorhandene EOS-/ioBroker-
Units, unvollständige Ausgaben und Befehlsfehler bleiben Abbruchgründe.
Der App-Baum wurde bytegleich übernommen. Das vorherige test.3-Archiv bleibt
unverändert im benachbarten historischen Lieferordner erhalten.

| Bindung | Wert |
|---|---|
| Archiv | `eos-0.2.0-test.3-linux-arm64.tar.gz` |
| Größe | 88546534 Bytes |
| Signierte Dateien | 22202 |
| Lieferrevision / signierte Sequenz | 2 / 5 |
| SHA-256 des Archivs | `0991381b9851594003f59ea124370a971d9188325ced7bf87c1c987df8770534` |
| SHA-256 des öffentlichen Releaseschlüssels | `552aea62599485fecc4d34d2d2973913b4fa3a76d6cfbebe0e75282065908b60` |
| Manifestbasierte Release-ID | `f8791884897defb86c07bd58114ef3df4abf5c9bda053694e4406d6ac7e779ef` |

**Installation:** [Git-Anleitung für Revision 2](../../docs/operations/GIT_TEST3_INSTALLATION_DE.md).
Den neuen öffentlichen Releaseschlüssel-Fingerabdruck über den bestätigten
Übergabeweg abgleichen. Zusätzlich euren authentischen öffentlichen NWL2-
Lizenz-Trust-Export bereitstellen. Kein privater Herstellerschlüssel und keine
erfundene Kundenlizenz werden mitgeliefert. Der Testsignierer hielt seinen
privaten Schlüssel ausschließlich im Arbeitsspeicher; er ersetzt keinen
dauerhaft verwalteten Hersteller-Releasekanal.

Alle Produkt-/SBOM-/Native-Paketgates, die Signatur und sämtliche Archivmitglieder
wurden vor der Lieferung erneut geprüft. Die festgelegten Runtime-/System- und
Paketquellen sind an die signierten Bytes gebunden. Die früheren Lieferungen
test.1, test.2 und test.3 sind nachweislich bytegleich erhalten.
[Nachweise dieser Revision](../../reports/integration/installable-test3-r2-20261003/README.md).

Die Lizenz schaltet die vorhandenen Home-/Pro-Bereiche und Kontingente frei.
Engere signierte Grenzen gewinnen; tatsächliche Gerätesteuerung bleibt bis
zur eigenen technischen Abnahme gesperrt. Eigene NexoWatt-Bestandteile sind
proprietär; die Lizenzdateien erhalten Drittanbieter- und frühere Rechte.

**Offen, nicht ausgeführt:** vollständige Pi-Installation, nativer Ziel-
Ladeversuch, PostgreSQL/systemd/POSIX-Rechte, echter Browserablauf, Reboot,
Abbruch/Recovery, Backup/Restore und sämtliche Hardware-/Anlagentests.
Die früher dokumentierten Windows-/Zeitbudget-Grenzen der vollständigen
UI-Testsuite bleiben bestehen. Keine Produktionsfreigabe.
