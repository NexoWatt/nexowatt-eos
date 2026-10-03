# Herkunft und Lizenzabgrenzung

Die eigenen, nicht anderweitig lizenzierten NexoWatt-Bestandteile dieser Fassung
stehen unter der [proprietären EOS-Lizenz](LICENSE). Für ihre Nutzung ist die
vorherige schriftliche Erlaubnis von NexoWatt erforderlich. Das Repository
enthält daneben fremde und bereits frei lizenzierte Bestandteile. Die
proprietäre Kennzeichnung des Gesamtprodukts entzieht deren Nutzungsrechte nicht.

| Bestandteil | Maßgebliche Hinweise |
| --- | --- |
| Übernommener ioBroker-Installer und unverändert geltende MIT-Rechte | [Ursprünglicher vollständiger MIT-Text](licenses/upstream/LICENSE.ioBroker-Installer.txt), Copyright 2014–2026 bluefox und 2014 hobbyquaker; [Upstream-Herkunft](docs/history/UPSTREAM_README.md) |
| EOS Admin und übernommener ioBroker Admin | [Proprietäre NexoWatt-Ergänzungen](components/admin/NEXOWATT_PROPRIETARY_LICENSE.md), [Drittanbieterhinweise](components/admin/THIRD_PARTY_NOTICES.md) |
| EOS UI | [Komponentenlizenz](components/ui/LICENSE); enthaltene Fremdbestandteile behalten ihre eigenen Bedingungen |
| EOS Devices | [Komponentenlizenz](components/devices/LICENSE), [Drittanbieterhinweise](components/devices/docs/THIRD_PARTY_NOTICES.md) |
| EOS EEBUS | [Komponentenlizenz](components/eebus/LICENSE); Abhängigkeiten behalten ihre eigenen Bedingungen |
| EOS OCPP21 | [Komponentenlizenz](components/ocpp21/LICENSE), [Hinweise](components/ocpp21/NOTICE.md), [früherer MIT-Text](components/ocpp21/LICENSES/PREVIOUS-MIT.txt); die OCA-Standardschemata behalten ihre gesonderten Bedingungen, insbesondere CC BY-ND 4.0 |
| EOS Backup / ioBroker.backitup | [Komponentenlizenz](components/backitup/LICENSE), [Hinweise](components/backitup/NOTICE.md), [vollständiger bisheriger MIT-Text einschließlich simatec](components/backitup/LICENSES/PREVIOUS-MIT.txt) |
| Eigene PostgreSQL-Brücken und Store | `runtime/postgresql/packages/*/LICENSE` und jeweilige `NOTICE.md`; der verwendete ioBroker-Redis-Client und `pg` bleiben gesondert lizenziert |
| Übrige Laufzeit-, Entwicklungs-, Test- und Werkzeugabhängigkeiten | Jeweilige Lizenzdateien, Copyright-Hinweise und Manifeste der Abhängigkeiten; Herkunft zusätzlich in den SBOMs unter `reports/integration/` |

Die Kopien unter `licenses/upstream/` und `components/*/LICENSES/` erhalten
frühere Lizenztexte unverändert. Sie sind keine neue Zusage, dass bisher fremde
oder zuvor frei lizenzierte Teile nun NexoWatt gehören. Der frühere OCPP-Vermerk
„You“ ist ein nicht geklärter Herkunftshinweis und kein Eigentumsnachweis.

Insbesondere bleiben früher wirksam eingeräumte MIT-Rechte auch an damals
bereits freigegebenen NexoWatt-Anteilen bestehen. Ein Neuaufsetzen des Systems
hebt diese Rechte nicht auf. Die neuen Bedingungen betreffen nur Rechte, über
die NexoWatt entsprechend verfügen darf, und neue nicht anderweitig freigegebene
Ergänzungen. Zwingende Verpflichtungen aus Drittanbieter-Lizenzen werden weder
durch diese Datei noch durch Paketmetadaten eingeschränkt.

Historische Lieferarchive und deren Prüfberichte bleiben in ihrem damaligen
Lizenz- und Quellenstand erhalten. Die neue Kennzeichnung macht aus früheren
Paketen keine neue, bereits geprüfte oder freigegebene Laufzeitlieferung.
