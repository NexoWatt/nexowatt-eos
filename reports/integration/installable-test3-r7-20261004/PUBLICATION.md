# R7 – Herstellerausgabe und Veröffentlichungsgrenze

Stand: 04.10.2026. Dieser Vermerk beschreibt die geprüften Werkzeuge und den
vorbereiteten Workflow. Er behauptet noch keinen ausgeführten GitHub-Lauf,
keine bereits veröffentlichte R7-Datei und kein erfolgreiches Pi-Update.

`.github/workflows/eos-r7-test-delivery.yml` ist auf
`NexoWatt/nexowatt-eos`, Zweig `main`, begrenzt. Normale Quell- und
Dokumentations-Uploads lösen diese Veröffentlichung nicht aus. Der einzige
automatische Auslöser ist ein eigener Commit, der ausschließlich
`reports/integration/installable-test3-r7-20261004/BUILD_REQUEST.json` anlegt
oder ändert. Er muss genau einen Elterncommit haben. Die Datei muss exakt
`schemaVersion: 1`, `deliveryRevision: 7` und dessen vollständigen
`sourceCommit` enthalten. Doppelte Schlüssel, zusätzliche Felder, andere
Quelländerungen oder ein abweichender Elterncommit werden abgewiesen.
Der Hersteller erstellt diesen Auftrag erst nach Prüfung des gebundenen
Quellstands; die Workflowvorbereitung erzeugt selbst keinen Auftrag.

`workflow_dispatch` erlaubt insbesondere, eine unvollständige Veröffentlichung
fortzusetzen. Dabei wird keine unpassende Elterncommit-Bedingung auf einen
bereits vorhandenen Archiv- oder Entry-Commit angewandt. Die verbleibenden
Quell-, Signatur-, Artefakt- und Veröffentlichungsschranken gelten trotzdem.
Innerhalb desselben Laufs muss zuerst die native
PostgreSQL-17.11-/Controller-Prüfung bestehen. Erst danach folgen
Build-Verträge, signierter Kandidatenbau und Tests gegen die tatsächlich
zusammengesetzten Admin-/Objects-Module. Vor dem Signieren müssen zusätzlich
32 Erststart-Recoveryverträge und zehn Sammlerprüfungen am tatsächlich
authentifizierten R4-Archiv im selben Delivery-Lauf bestehen; ein früherer
Quellprüflauf ersetzt diese Schranke nicht.

Der native Job verwendet die gleiche aktuelle Prüfanordnung wie der
Sicherheitsworkflow: gewöhnlicher Runner-Benutzer, PostgreSQL mit gegenseitigem
TLS, realer Controller 7.2.2, Hostobjekt-/Readiness-/Prozess-PID-/Neustartprüfung.
Die native Core-only-Prüfung bestätigt PID-Pfad, abgewiesene Code-Schreibzugriffe
und private Daten-Schreibzugriffe; sie aktiviert keine Adapter und prüft deshalb
nicht deren tatsächlichen PID-Schreibzyklus. Dessen Upstream-Funktionsregression
ist im gesonderten PID-Beleg dokumentiert.
Ein gescheiterter Job verhindert die abhängigen Build-/Publikationsjobs. Ein
früher grüner Lauf gegen andere Quellen kann diese Schranke nicht ersetzen.
Dies ist weiterhin kein Pi-, systemd-Mount- oder Anlagentest.

Der Veröffentlichungsschritt lädt ausschließlich das anhand seiner Artifact-ID
zugeordnete Ergebnis dieses Builds. Er akzeptiert zwölf neue, fest benannte
Dateien: vier Lieferdateien, fünf Buildnachweise und drei TAP-Ausgaben. Bereits
versionierte Herstellerquellen im Berichtsordner dürfen nur bytegleich
wiederholt werden. R4/R5/R6, vorhandene R7-Ausgaben und sonstige Dateien werden
nicht überschrieben. Kandidaten dürfen weder symbolische Links noch Dateien
mit mehreren Hardlinks enthalten. Doppelte JSON-Schlüssel, nichtendliche
JSON-Werte, doppelte Prüfsummenzeilen und fehlgeschlagene, leere, übersprungene
oder mehrdeutige TAP-Zusammenfassungen werden zurückgewiesen.

Vor dem ersten Kopieren ruft der Publisher ausschließlich den Verifier aus
dem sauberen, geprüften Checkout auf. Dieser authentifiziert das unveränderte
R6-Archiv, baut den erwarteten App-/Runtime-Baum aus dessen Dateien und den
aktuellen Herstellerquellen erneut auf und vergleicht Signaturen,
Dateiinventar, Transformationen, SBOM und Katalog. Kandidatencode wird dabei
nicht ausgeführt; vom Kandidaten behauptete `true`-Prüffelder reichen nicht aus.

Standardberechtigung ist `contents: read`; nur der abschließende Publish-Job
erhält `contents: write`. Alle externen Actions sind an vollständige
Commit-SHAs gebunden, Checkouts speichern keine Zugangsdaten. Vor dem normalen
Fast-forward-Push muss der entfernte `main` unverändert auf dem geprüften
Quellcommit stehen. Es gibt keinen Force-Push oder Fehler-Bypass. Das
kurzlebige Askpass-Skript wird entfernt und enthält selbst keinen Tokenwert.

Lokale Prüfungen: **16/16 Publisher-Verträge bestanden**;
[Rohbeleg](local-publication-tests.log). Zusätzlich wurden die YAML-Struktur,
Auslöser, Jobabhängigkeiten, Rechte, Action-Pins und einundzwanzig eingebettete
Bash-Skripte sowie zwei eingebettete JavaScript-Programme und der eingebettete
Python-Requestprüfer auf Syntax geprüft. Acht tatsächlich angelegte temporäre
Git-Verläufe bestätigten die Requestgrenze: gültiger Auftrag und manuelle
Fortsetzung akzeptiert; falscher Elterncommit, zusätzliche Quelldatei,
Zusatzfeld, doppelter JSON-Schlüssel, Boolean statt Versionszahl und falscher
HEAD abgewiesen. Die Publisher-Python-Dateien bestehen die Syntaxprüfung. Der
abschließende vollständige lokale Actionlint-Lauf mit der gepinnten Version
`1.7.12` bestand nach dem zuvor dokumentierten Proxy-Download-Timeout. Die
tatsächliche GitHub-Ausführung der Delivery-Kette bleibt bis zum belegten Lauf
offen. Der Vermerk ersetzt keinen solchen Lauf.

Nach dem signierten Archiv veröffentlicht der Workflow den gesonderten
Bedienereinstieg ausschließlich für den authentifizierten fehlgeschlagenen
R4-Erststart. Dazu werden Archiv, öffentlicher Schlüssel und Liefermetadaten
tatsächlich aus ihren öffentlichen, commitgebundenen URLs zurückgelesen.
Erst der erfolgreiche Push der drei Entry-Dateien macht `recover.sh`
öffentlich. Anschließend lädt ein eigener Schritt genau dieses öffentliche
Skript herunter und vergleicht Größe, SHA-256 und vollständige Bytes, bevor
`RECOVERY_COMMAND.txt` und dessen Prüfnachweis in einem zweiten normalen
Fast-forward-Push veröffentlicht werden. Der zusätzliche tatsächliche
Skript-Readback steht in `command-verification.json` unter
`publicEntryReadback`; ein Vergleich nur mit lokalen Git-Dateien ersetzt ihn
nicht.

Scheitert dieser zweite Teil, kann ein manueller Lauf die drei bereits
veröffentlichten Entry-Dateien erhalten und nur den noch fehlenden Befehl
ergänzen. Zuvor werden Archivsignatur, enthaltenes Recoverywerkzeug, aktuelles
Skriptrendering und vorheriger Asset-Readback erneut geprüft. Ein vollständiger
Fünf-Dateien-Einstieg wird nur geprüft und nicht ersetzt. Unerwartete oder
teilweise anders zusammengesetzte Ausgabeordner werden abgewiesen.
Die Veröffentlichung führt keinen Wiederherstellungsbefehl auf einem Pi aus.
