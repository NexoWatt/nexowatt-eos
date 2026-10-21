# Frischer Laufzeitstand: nativer CI-Nachweis

Stand: 21.10.2026. Geprüfter Quellcommit:
`a2733fa5561f7327ff3689b7464f8727760fb670`.
Der frische Job [119467462673 im Lauf 39670690111](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39670690111/job/119467462673)
bestand mit **15 bestandenen TAP-Tests**. Er verwendet js-controller **7.2.5**,
Node **24.21.0**, npm **11.19.0** und PostgreSQL **17.11**. Controller 8 wurde
nicht eingebaut.

Die tatsächliche Linux-x64-Ausführung prüfte frische Ersteinrichtung, sechs
Adapterprozesse, Admin/UI über HTTPS, zentrale Home-/Pro-Aktivierung und
Widerruf, unveränderte Anwendungsdateien, zwei private logische Sicherungen
sowie erneute Bereitschaft nach Neustart. Die 21 vorgeschriebenen
Nachweismerkmale und die vollständigen erfolgreichen Prüfstufen stehen in
[native-summary.json](native-summary.json).

Die heruntergeladenen ZIP-Bytes stimmen mit den GitHub-Artefaktdigests überein.
Das enthaltene unsignierte Archiv wurde mit dem strikten Archivprüfer auf
22.436 Dateien einschließlich Inhaltshashes und Dateimodi geprüft. Anschließend
wurden Architektur-, SBOM-, Katalog-, Quell-/Build- und native Nachweisbindung
gegen die tatsächlichen 22.429 App-Dateien erneut geprüft. Buildrecord, SBOM und
Lockdatei sind in beiden CI-Artefakten bytegleich. Die lokale Nachprüfung
verwendete Node 24.19.0 ausschließlich zum Lesen und Prüfen; die native
Laufzeitausführung stammt aus der oben genannten CI-Umgebung.

| Nachweis | Wert |
| --- | --- |
| Native ZIP | ID `12380506158`, 217.521 Bytes |
| Native ZIP SHA256 | `de78032465f8888d71b2877766e1b11d6ecad5eaf27e2264f990ae5f26e1de06` |
| Unsignierte ZIP | ID `12378749914`, 89.799.046 Bytes |
| Unsignierte ZIP SHA256 | `258f56a617a192909904f1661e9f9f13269a93d3479b8dc9f5904f06bd32623b` |
| Enthaltene TAR.GZ | 89.798.860 Bytes |
| TAR.GZ SHA256 | `0a9b425146d1b2ee3d078b63d5635d84e2acdac1d7012e4569d008854fcfa462` |
| Tatsächliche App-Lockdatei SHA256 | `06724b9ee228dc01a312d396886073f474f77f550fdc82fffbff7994554a8eee` |

[artifact-manifest.json](artifact-manifest.json) enthält Metadaten und
Einzeldateihashes; [verification.json](verification.json) bindet die
Prüferdateien, den Resolution-Lock, den Buildrecord und die SBOM. Die
unsignierten Binärartefakte wurden außerhalb des Repositorys erhalten.
Öffentlich abgelegt sind ausschließlich ausgewählte Nachweisfelder ohne
private Testkonfiguration, Schlüssel, Datenbanken, Sicherungsinhalte,
Rohprotokolle, absolute Runnerpfade oder temporäre Downloadadressen.

Das tatsächliche Produktionsabhängigkeitsaudit war verfügbar und meldet
**26 betroffene Pakete: 20 hoch, 6 mittel, 0 kritisch**. Dies sind
Paketbefunde einschließlich geerbter Befunde, keine Anzahl unabhängig
ausnutzbarer Schwachstellen. [runtime-audit.json](runtime-audit.json) ist die
unveränderte bereinigte CI-Ausgabe. Eine Erreichbarkeitsbewertung ist darin
ausdrücklich nicht bescheinigt. Die CI hat keine rohen Advisory-/`via`-/
`fixAvailable`-Felder aufbewahrt. Eine lokale Wiederholung gegen denselben Lock
endete nach 15 Sekunden Gesamtlimit ohne Rohresultat; diese Felder wurden
nicht erfunden. Die anschließende separate
[Braces-/Chokidar-Einordnung](../../audit/braces-chokidar-a2733fa.md)
behandelt die tatsächliche installierte Kette und den fehlenden kompatiblen Patch.

Offen bleiben die Abhängigkeitsbefunde, geschützte Signierung und die Abnahme
auf dem tatsächlichen Pi. Die sechs Adapter liefen ohne angeschlossene
Geräte. ARM64-Ausführung, echte systemd-/Mount-Regeln, Gerätefunktionen,
vollständige Wiederherstellung und historischer R9-Rückfall wurden hier nicht
abgenommen. Das Archiv ist **unsignierter Buildtransport**, kein freigegebenes
Installations- oder Updatepaket. Eine Produktions- oder CRA-Freigabe wird
nicht behauptet.
