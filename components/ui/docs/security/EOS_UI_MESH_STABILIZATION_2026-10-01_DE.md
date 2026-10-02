# EOS UI: Mesh-Diagnose und offenes Zeitverhalten, 01.10.2026

Dieser Entwicklungsstand behebt einen nachgewiesenen Diagnosefehler und reduziert wiederholte Arbeit im Rückfallplaner. **UI-MESH-PERF-20261001 bleibt offen.** Die Gesamtsuite unter Node.js 24.21.0 ist fehlgeschlagen. Der Stand erteilt keine Freigabe für Geräte- oder Mesh-Regelung, keine Hardwareabnahme und keine CRA-/IEC-Konformitätserklärung.

## Befund und Änderung

Die bisher angezeigte RTT beschrieb ausschließlich die letzte erfolgreiche Antwort. Eine tatsächlich abgewiesene Antwort konnte deshalb mit einer alten, kurzen RTT erscheinen. `timing.lastAttempt` zeigt nun für den aktuellen beziehungsweise letzten Versuch dessen Art, monotone Dauer, unverändertes Zeitbudget, Ergebnis und Prüfphase. Das Objekt hat fünf begrenzte Felder und enthält weder Pakete noch Schlüssel. Ein Protokollreset entfernt es; eine danach eintreffende alte Antwort stellt es nicht wieder her.

Der Master prüft weiterhin die Gesundheit aller Teilnehmer. Im Zustand `SITE_DEGRADED` musste er zusätzlich bei jeder Nachricht dieselben Zielwerte erneut auf Rückfall begrenzen. Er merkt sich nun, ob sämtliche Ziele bereits höchstens Rückfall sind. Bei Eintritt in diese Bedingung werden Ziele einmal begrenzt; bestätigte und reservierte Altbudgets bleiben erhalten. Der zuletzt beobachtete Rückfallzeitpunkt wird vor einer tatsächlich ausgeführten NORMAL-Planung in die Rampenzeit jedes Teilnehmers übernommen. Das gilt sowohl für feste Zuweisung als auch die Transformatorverteilung. Teilnehmer-/Topologieänderungen erzeugen weiterhin neue Protokollinstanzen.

Die Referenz für den Vergleich ist die unveränderte Planermethode aus Commit `c211f1a48ee0b667fcc739ee9134616af43b6076`. Neun deterministische Tests vergleichen unter anderem Neustart, NORMAL/Rückfall/Wiederanlauf, fehlende Teilnehmer, alte Rückmeldungen, HELLO nach NORMAL, 199-/200-ms-Planung, Rundungen und Reservierungen. Sie prüfen zusätzlich 200 ms akzeptiert/201 ms abgewiesen, dass Empfang die 3.000-ms-Lease nicht neu startet, und Reset während ausstehender Kommunikation.

Der Operationstest zählt bei 1.000 wiederholten Rückfallplanungen mit 99 Teilnehmern zuvor 990.000 Zielzugriffe und danach keine dieser redundanten Zielzugriffe. Der separat begrenzte CPU-Vergleich mit dreimal je 5.000 Planungen zeigt ebenfalls weniger Aufwand. Das beweist die lokale Einsparung, nicht die Ursache der sporadischen Ende-zu-Ende-Verzögerung.

## Nicht aufgelöste Zeitüberschreitungen

Der ursprüngliche Vergleich bleibt erhalten: 99 parallele HTTP-Teilnehmer, 250-ms-Takt, gleichzeitig 32 Datei-fsync-Vorgänge und Prüfung der Lease **nach** dem Warten auf die Archivarbeit. Diese Phase befindet sich in `SITE_DEGRADED`; sie belegt keine normale Freigabeplanung. Eine zusätzliche Phase simuliert verarbeitete Rückmeldungen, erreicht bei allen Teilnehmern NORMAL und erhöht Zielbudgets. Sie wird separat ohne parallele Archivarbeit ausgewertet.

Die neuen Messungen unterscheiden Antwortbudget und Lease:

| Lauf | Tatsächlicher Befund |
|---|---|
| Node 24.19, vollständiger Mesh-Gate | Bestanden; Vergleich mit Archiv-fsync P95 ca. 96 ms, Maximum ca. 116 ms. Kein Nachweis der Fehlerbehebung durch einen einzelnen Erfolg. |
| Node 24.21, fokussierter Mesh-Gate | Ursprüngliche kombinierte Phase, Runde 3: einzelne tatsächliche Versuche ca. 271–290 ms bei 200-ms-Budget. Abweisung korrekt; die 3.000-ms-Lease ist eine andere Grenze. |
| Node 24.21, einmaliger zusätzlicher instrumentierter Lauf | Kombinierte Phase und NORMAL bestanden; später 200,001885 ms bei 200-ms-Budget abgewiesen. Profilierung verändert die Messumgebung. |
| Node 24.21, abschließender `test:all` | Neun deterministische Tests und ursprüngliche kombinierte Phase bestanden; zusätzliche NORMAL-Phase Runde 12 mit `master_timeout`, Versuchsdauer 545,30 ms, fehlgeschlagen. |

Weder Deadline, Lease, Wiederanlaufanforderung noch Testassertion wurden gelockert. Es gab nach dem abschließenden Gesamtlauf keinen Wiederholungslauf bis zu einem grünen Ergebnis. Die fünf vorher festgelegten Baseline-Diagnoseläufe unter 24.19 waren erfolgreich; auch sie erklären die historischen Fehler nicht. Der instrumentierte Sammler ist auf 2.000 Einträge begrenzt, weshalb spätere Fehler nicht aus seinem aggregierten Erfolgsdatensatz abgeleitet werden dürfen. Der direkte Negativnachweis bleibt im Rohprotokoll erhalten.

Die Läufe erfolgten im geteilten Linux-x64-Arbeitsbereich. Der abschließende Gesamtlauf konnte sich mit Integrationsbuilds überschneiden. Dies ist Messkontext, **keine nachgewiesene Ursache** der Verzögerungen. Es wurde keine Raspberry-Pi-/SSD-/Tailnet-Feldmessung durchgeführt. Der Einfluss von Scheduling, Dateisystem, Laufzeitpausen und Netzwerkpfad muss unter kontrollierter Ziellast getrennt gemessen werden, bevor ein zuverlässiges Betriebsprofil festgelegt werden kann.

## Grenze des integrierten Laborprofils

Das ausgelieferte Profil `eos-integrated-ui-lab-v1` verhindert die reguläre Aktivierung zusätzlich zur Sperre endgültiger Geräteschreibzugriffe:

- `onReady` installiert zuerst die Vorschau-Schreibgrenze, startet HTTPS/Onboarding und kehrt unbedingt zurück. Die einzige reguläre Konstruktion und Initialisierung des `MeshCoordinator` liegt dahinter. Der Komponententest ruft diesen echten Lifecycle mit `meshMicrogrid.installed=true` und `enabled=true` auf: Die Flags bleiben wahr, die Instanz entsteht nicht.
- Die erste HTTP-Middleware weist alle verändernden Methoden außerhalb einer kleinen Konto-/Login-/Lizenzwiederherstellungsmenge mit `503/EOS_TEST_CONTROL_BLOCKED` ab. Keine Mesh-Route ist ausgenommen. Die Tests umfassen Konfiguration, Paarung, Betrieb, Austausch, Energie, Abrechnung, ältere Microgrid-/Bridge-/Befehls-/Feldtestrouten und einen App-Aktivierungsversuch über die Installer-Konfiguration.
- Der ergänzte tatsächliche Controller-Test prüft diese POST-Sperren mit einer angemeldeten Service-Identität nach Lizenzaktivierung sowie unveränderte gespeicherte App-Flags. Sein Prozessinterface bietet keinen direkten Beweis über interne Objektinstanzen; dafür dient der getrennte Lifecycle-Test. Der tatsächliche Controller-Lauf wird vom Gesamtintegrationsbericht bewertet.

Diese Aussage gilt für den regulären Start und die geprüften Produkt-APIs. Sie ist keine Sandbox-Garantie gegen beliebigen fremden JavaScript-Code im selben Prozess oder manipulierte Produktdateien. Ein unbeaufsichtigter Mesh-/M2M-Zugang benötigt weiterhin ein gesondert geprüftes Identitätsprofil; die bestehende Anmeldegrenze wurde nicht umgangen. Das Laborprofil ersetzt keine Stillsetzungsstrategie für bereits laufende physische Anlagen.

## Bedrohungsanalyse und Nachweise

| STRIDE-Aspekt | Grenze und Prüfung |
|---|---|
| Spoofing / Tampering | HMAC-, Sequenz-, Sitzungs-, Boot- und Revisionsprüfungen bleiben erhalten; späte oder alte Antworten verlängern keine Freigabe. |
| Repudiation | Die aktuelle Versuchsdauer vermeidet irreführende alte RTT; Rohfehlbelege und Datei-SHA-256 binden die Entwicklungsmessung. Dies ist kein manipulationssicheres externes Auditlog. |
| Information Disclosure | Neue Diagnose enthält nur fünf begrenzte Felder ohne Nutzpakete oder Schlüssel. |
| Denial of Service | Rückfallplanung spart nachgewiesene redundante Zugriffe; die nicht erklärte Laufzeitüberschreitung bleibt offen und bewirkt eine sichere Abweisung, keine längere Freigabe. |
| Elevation of Privilege | Keine neue Authentifizierungs- oder Aktivierungsausnahme. Laborprofil sperrt Mesh-Mutationen unabhängig von Service-Anmeldung und Lizenz. |

Die Änderung fügt keine Paketabhängigkeit hinzu. Die systemweite SBOM muss die neuen Artefakthashes weiterhin durch den Integrationsbuild binden. Der Produktstand bleibt UI 1.0.21. Prüfbefehle, Ergebnisgrenzen und SHA-256 der Rohbelege stehen in [final-verification.json](../../reports/security/stabilization-20261001/final-verification.json). Dort wird ein fehlgeschlagenes `test:all` getrennt von bestandenen Build-, Publikations-, Komponenten- und nachgelagerten Einzelprüfungen geführt.
