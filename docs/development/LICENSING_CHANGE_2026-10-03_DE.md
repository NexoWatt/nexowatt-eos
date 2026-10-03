# Proprietäre Kennzeichnung der EOS-Quellen

Stand: 3. Oktober 2026, Ergänzung zur Erststart-Lieferung `0.2.0-dev.9`.

Auf Wunsch des Auftraggebers verlangt die [zentrale Lizenz](../../LICENSE) für
die eigenen, nicht anderweitig lizenzierten NexoWatt-Bestandteile die vorherige
schriftliche Erlaubnis von NexoWatt. Das umfasst insbesondere Nutzung,
Installation, Ausführung, Änderung und Weitergabe. Ein öffentlich verfügbares
Repository oder Paket erteilt keine Erlaubnis. Umfang, Zweck und Dauer richten
sich nach der schriftlichen Vereinbarung.

Diese Änderung setzt Eigentum an fremdem Code nicht voraus und nimmt bereits
wirksam eingeräumte Nutzungsrechte nicht zurück. Die ioBroker-Basis, früher
unter MIT freigegebene Bestandteile, OCA-Schemata und sonstige Abhängigkeiten
behalten ihre Bedingungen. Die ursprünglichen MIT-Texte bleiben bytegenau
erhalten; [Drittanbieterhinweise](../../THIRD_PARTY_NOTICES.md) ordnen sie zu.
Der [MIT-Lizenztext](https://opensource.org/license/mit) verlangt weiterhin die
Mitlieferung seiner Copyright- und Erlaubnishinweise. Beim früheren OCPP-Vermerk
„You“ bleibt die genaue Urheberschaft ungeklärt; die neue Kennzeichnung ist kein
Nachweis exklusiver NexoWatt-Rechte.

Geändert wurden die zentrale Lizenz, README und Produktmetadaten sowie die
eigenen Lizenzangaben von OCPP21, Backup und den drei PostgreSQL-Paketen. Admin,
UI, Devices und EEBUS waren bereits proprietär gekennzeichnet; ihre Lizenztexte
bleiben erhalten. Die betroffenen Paketmanifeste verweisen mit
`SEE LICENSE IN LICENSE` auf den beigefügten Text. Das Rootpaket ist zusätzlich
`private: true`, um eine versehentliche npm-Veröffentlichung zu verhindern.
Diese Metadaten folgen der
[npm-Dokumentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/?v=true).

Die technische Schlüsselprüfung und die Erststart-Option ohne aktivierten
EOS-Schlüssel wurden nicht verändert. Eine solche Einrichtung ist weiterhin
keine vertragliche Nutzungsberechtigung. Ein Softwarelizenztext und die technische
Freischaltung erfüllen unterschiedliche Aufgaben.

Die Builder liefern bei künftiger Erstellung die zentrale Lizenz und passende
Herkunftshinweise mit dem Runtime-Appbaum und dem Bundle aus. Die Lizenzdateien
der einzelnen installierten Pakete bleiben daneben erhalten. Eine Runtime mit
den neuen Lizenzmetadaten wurde noch nicht neu assembliert, signiert oder
installiert. Die früheren Erststart-Prüfberichte und Runtime-SBOMs wurden nicht
nachträglich auf den neuen Lizenzstand umgeschrieben. Sie belegen ausschließlich
ihren damaligen Quell-/Artefaktstand. Der vorherige Komponentenregisterstand ist
unter `reports/integration/licensing-20261003/prior-component-register.json`
erhalten; der aktuelle Register- und Quell-SBOM-Stand wurde separat erzeugt.

Bei der Lieferprüfung fiel zusätzlich auf, dass die allgemeine Ignore-Regel
`package-lock.json` die neun vorhandenen Komponenten-Quell-Locks sowie den
Testbasis-Lock aus dem vorherigen ZIP ausgeschlossen hatte. Exakte Ausnahmen in
`.gitignore` nehmen diese zehn Dateien jetzt in die vollständige Quelllieferung
auf. Abhängigkeiten wurden hierfür nicht neu installiert oder aufgelöst.

Die [aktuellen Nachweise](../../reports/integration/licensing-20261003/verification.json)
verknüpfen die Prüfungen der Metadaten, unveränderten früheren Lizenztexte,
OCA-Schemata, tatsächlichen `npm pack --dry-run`-Dateilisten und Builderverträge.
Die Dry-Runs erfolgen offline mit deaktivierten Lifecycle-Skripten. Sie sind
keine vollständige rechtliche Prüfung aller transitiven Abhängigkeiten.

Offen bleiben die vollständige Linux-/Pi-Installation, PostgreSQL-/systemd-
Abnahme, grafische Browserprüfung und Gerätetests. Das vorhandene Native-Gate
bleibt gesperrt; die historische `test.2`-Paketprüfung bestätigt weiterhin keine
vollständige Installation. Der neue ZIP-Export ist eine Quelllieferung mit
Nachweisen, keine freigegebene oder installierbare Vollruntime.
