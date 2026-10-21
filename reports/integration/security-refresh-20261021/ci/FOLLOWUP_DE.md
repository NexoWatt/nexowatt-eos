# Korrekturen aus dem ersten vollständigen CI-Lauf

Der veröffentlichte Quellstand `19c250aa6516881587cea045ab384308b37647d1`
bestand die neuen Controller-/Admin-Prüfungen unter Node 24.21.0,
die Workflowprüfung, die Browserprüfungen und die Netzwerkqualifikation.
Die historischen nativen PostgreSQL-/Managementläufe bestanden ebenfalls;
sie qualifizieren ausdrücklich nicht die neue Laufzeit.

Der neue vollständige Paketbau brach vor der nativen Prüfung an der
Abhängigkeitsrichtlinie ab. Ursache war der noch exakte UI-Pin des Adapterkerns
auf 3.4.1 statt 3.4.3. Der Pin und die Lockdatei sind korrigiert; der dadurch
hinzugekommene Common-DB-Vertrag bleibt auf 7.2.5. Auch der nun produktiv
erreichbare HTTP-Unterpfad erhält follow-redirects 1.16.1. Das UI-Audit zeigt
danach drei Paketknoten der bereits offenen Forge-Kette; die frühere
UI-Nullmeldung gilt nur für den früheren Paketgraphen.

Weitere CI-Fehler betrafen Testannahmen: Der isolierte UI-Lizenztest lädt nun
den kanonischen Client korrekt, die historische R6-Negativprüfung führt die
zwei neu versiegelten Frontend-Manifeste als weiterhin verbotene Quellen,
und die Managed-Host-Fixture prüft die tatsächliche 7.2.5-Paketidentität.
Zusätzliche Negativfälle weisen 7.2.2, Controller 8 und widersprüchliche
Paketidentitäten vor Hoständerungen zurück. Produktionsrechte und historische
Builder-Freigabelisten werden dadurch nicht erweitert.

Die Builddiagnose bleibt geschlossen und veröffentlicht nur feste bekannte
Paketidentitäten, begrenzte Versionswerte und eine Einordnung der Paketlage.
Private Dateipfade, beliebige Paketnamen und ungefilterte Fehlermeldungen
werden nicht ausgegeben. Die vollständige lokale Diagnoseauflösung mit
deaktivierten Lifecycle-Skripten bestand die tatsächliche Paketbaumprüfung;
Node 24.19/npm 11.9 sind dabei nur Diagnosewerkzeuge, keine Freigabe-Toolchain.

Die Teilnachweise und `attempt-19c250a.json` dokumentieren die tatsächlichen
Ergebnisse und Grenzen. Die veröffentlichten Erstberichte bleiben Belege für
die Bytes des ersten Commits; neue Folgebelege binden die späteren Änderungen.
Erforderlich bleiben der erneute vollständige CI-Lauf unter Node 24.21/npm
11.19, die neue native Laufzeitprüfung, eine permanente Herstellersignatur
und die tatsächliche Pi-Abnahme. Noch kein neues Installationspaket freigegeben.
