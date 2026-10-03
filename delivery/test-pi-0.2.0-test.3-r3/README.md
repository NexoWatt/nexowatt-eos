# EOS test.3 Revision 3 für den isolierten Test-Pi

Runtime **0.2.0-test.3**, Lieferrevision **3**, signierte Sequenz **6**.
Diese Lieferung korrigiert die Sudo-Prüfung der neu angelegten Dienstkonten.
Eine erfolgreiche Abfrage ohne erteilte Rechte wird angenommen; tatsächlich
erteilte Rechte, fehlgeschlagene Abfragen und zusätzliche Ausgaben bleiben gesperrt.

| Bindung | Wert |
| --- | --- |
| Release-ID | `343e639e8283f40df3608281c62a1fd7cd6cac4e7492b2b2bbdb0ebdd1484828` |
| Archiv | `eos-0.2.0-test.3-linux-arm64.tar.gz` |
| Bytes | 88547053 |
| Archiv-SHA-256 | `743781feebfaadb3f2404ba3dca2768e050a30c4db5e3cc6445d49ddbd6efe11` |
| Release-Public-Key-SHA-256 | `8a8adbdd515c5125ad380653234f1dee4c12dafb1b504d57fc9940b48097b1b0` |
| Signierte Dateien | 22202 |

Der private Testsignierschlüssel blieb ausschließlich im Arbeitsspeicher;
dieses Verzeichnis enthält nur den öffentlichen Releaseschlüssel. Der bereits
zugeordnete öffentliche Hersteller-Lizenztrust ist ein getrennter Schlüssel.

[Tatsächlicher Paketbau und Quellbindung](../../reports/integration/installable-test3-r3-20261003/README.md) ·
[Aktueller SSH-Einstieg](../../README.md) ·
[Sudo-Befund und offener Wiederanlauf](../../reports/integration/github-bootstrap-sudo-20261003/README.md).

Auf dem Pi mit dem bereits gemeldeten Sudo-Abbruch muss der Restzustand vor
einem neuen Versuch geprüft werden. Diese Lieferung überschreibt keine
Teilinstallation. Die älteren Lieferungen bleiben unverändert erhalten.

**Vollständige Pi-Installation, Wiederanlauf und Hardwaretests: OFFEN.**
Keine Produktionsfreigabe; Anlagensteuerung bleibt gesperrt.
