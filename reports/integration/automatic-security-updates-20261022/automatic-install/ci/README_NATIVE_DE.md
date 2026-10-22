# Neuer tatsächlicher Laufzeitaufbau und Artefaktprüfung

Quellcommit: `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Security-Lauf `39736782733`, Fresh-Native-Job `119684225321`: **erfolgreich**.
Tatsächlich ausgeführt mit **Node 24.22.1**, separatem Hersteller-npm
**11.19.0** und PostgreSQL **17.11** auf Linux x64.

Die native Prüfung bestand **15 Fälle, 0 Fehler, 0 übersprungene Fälle**.
Sie umfasst echten Start aller sechs Adapter, PostgreSQL-mTLS, HTTPS-Anmeldung,
zentrale Home-/Pro-Lizenzierung mit Widerruf, zwei logische Sicherungen,
Asset-Upload, Enrollment und Neustart. Quell- und App-Bytes sind an die
ausgeführten Belege gebunden. TAP und strukturierte Belege liegen hier bei.

Der neue tatsächliche ARM64-Baum für Sequenz 15 wurde unsigniert gebaut und als
GitHub-Artefakt `12406874883` gespeichert. Das innere Archiv enthält
**22.441 Dateien**, ist **134.045.265 Bytes** groß und hat SHA-256
`f3164a04ee70860bfd113ad4df4c4f967c0c0830f7c47b4456c68ac04d7b7378`.
Die neuen nativen Belege stammen aus Artefakt `12408160061`.

Beide ZIPs wurden heruntergeladen und vollständig gegen die von GitHub
angegebenen SHA-256-Werte geprüft. Eine enge Dateiliste verhinderte zusätzliche
Mitglieder und Links. Der gehärtete vorbereitete Archivleser prüfte alle
22.441 Einträge vor beziehungsweise während der Extraktion.
`verifyPrepared` und `verifyNativeEvidence` bestätigten anschließend den
Quellcommit, Sequenz 15, genaue App-/Node-/SBOM-/Buildbezüge und neuen nativen
Nachweis. Builddatei und SBOM aus beiden Artefakten sind bytegleich; der Audit
bezieht sich auf die tatsächliche Lockdatei. Diese lokale Rückprüfung lief mit
Node 24.19.0 und führte die enthaltene ARM64-Node-Binärdatei nicht aus.

Der aktuelle Dependency-Audit meldet weiterhin **26 betroffene Paketknoten:
20 hoch und 6 moderat**, keine kritischen. Das ist keine Zahl eindeutiger CVEs
und keine Erreichbarkeitsanalyse. Bestehende Befunde werden nicht durch den
erfolgreichen Test als geschlossen behandelt.

Die neue App-Bindung lautet
`0d73d19b12dcc5505bf8fa63b25e41f0234173ddd946ae8a8a97eb1a38881557`;
die übrigen Größen, Hashes und Ablaufdaten stehen in
`native-artifact-verification.json`, `download-verification.json` und
`artifact-readback.json`. `runtime.cdx.json` ist die tatsächliche neue SBOM.
Die GitHub-Artefakte sind befristet; die hier abgelegten Belege ersetzen deren
rechtzeitige sichere Übernahme für die spätere Signierung nicht.

**Offen:** Dieser Lauf führte keine direkte R8-Hostmigration, keinen echten
systemd-/APT-Wartungsablauf und keine Pi-/Anlagenprüfung aus. Die Laufzeit ist
noch nicht als Herstellerrelease signiert oder öffentlich ausgerollt. Es liegt
keine Produktions- oder CRA-Freigabe vor. Historische native Belege bleiben
unverändert an ihre früheren Quellstände gebunden.
