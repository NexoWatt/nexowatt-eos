> Ergänzung dev8 vom 02.10.2026: `system/integration/requirements.json` enthält
> den abgegrenzten Folgebeleg `EOS-DEV8-CHANNEL-20261002` für 158 gezielte
> Prüfungen. Neue Befunde sind im vorhandenen Register ergänzt. Die übergreifenden
> Anforderungen zu Transport, Hostisolation, Erweiterungen und Betriebssicherheit
> bleiben bis zur nativen Zielabnahme offen. Siehe `docs/security/ADAPTER_CHANNEL_DEV8_DE.md`.

# EOS: Anforderungen und Nachweise der integrierten Testversion

> Historischer Integrationsumfang `0.2.0-dev.1`. Die aktuelle Änderung
> `0.2.0-dev.2` wird ergänzend in
> [`branding-roles-requirements.json`](../../system/integration/branding-roles-requirements.json)
> und im [aktuellen Prüfbericht](../security/INTEGRATED_REPORT_DE.md) nachgeführt.
> Die folgenden Anforderungen und früheren Ergebnisse werden dadurch nicht
> automatisch als für den geänderten Quellstand abgenommen ausgewiesen.

Stand: **01.10.2026** · Änderung `EOS-INTEGRATION-20261001` · Zielstand
`0.2.0-dev.1` · Ausgangspunkt
`bd6efcf8025ff0aeee9f6d7661d1e8221c8c78e3` (`0.1.0-test.1`).

Diese Arbeitsfassung legt die Abnahme der integrierten Software fest. Sie ist
keine CRA-Konformitätserklärung, IEC-Zertifizierung oder Produktivfreigabe.
Die maschinenlesbare Matrix liegt in
[`system/integration/requirements.json`](../../system/integration/requirements.json):
**21 Unteranforderungen, 42 geplante positive/negative Abnahmeszenarien und
17 offene Integrationsrisiken**. Diese Zahlen sind keine bestandenen Tests.

## Einordnung in die vorhandenen Unterlagen

Die bestehenden Kennungen `EOS-REQ-001` bis `EOS-REQ-020`, `EOS-TM-*` und
Adapterbefunde bleiben erhalten. Die neuen `EOS-INT-REQ-*` konkretisieren den
Integrationsschritt und verweisen auf diese Elternanforderungen. Die historische
[Befundliste](../../system/integration/finding-register.json) beschreibt den dort
genannten Quellstand; ein neuer Quellstand schließt einen alten Befund nicht
automatisch. Eine Behebung benötigt einen konkreten Änderungs- und Nachtestbeleg.
Die Matrix bindet diese Befunde außerdem über `historicalRelatedFindingIds`
direkt an die jeweilige Integrationsanforderung.

Der bisherige Controllerkern hat reale Laborprüfungen. Sein
[Prüfbeleg](../../reports/test-base/verification-summary.json) nennt unter anderem
169 Systemtests, 41 bestehende Sicherheitstests und 15 gemeldete
Integrationserfolge; letztere enthalten 13 Verhaltensprüfungen und zwei
übergeordnete Tests. Dieser Stand lief ohne aktive Fachadapter, mit einer
Testidentität und Sandbox-UID 0. Die Belege zeigen weder eine vollständige
Adapterintegration noch den Betrieb als unprivilegierter systemd-Dienst auf
Debian 12/Raspberry Pi. Die JSON-Matrix bindet historische Belege durch Hashes.

Neue Komponententests dürfen dort mit engerem Geltungsbereich ergänzt werden.
`integration_not_verified` bedeutet: Die gesamte Anforderung für den
integrierten Lieferstand ist noch nicht abgenommen. Es bedeutet nicht, dass
überhaupt keine Implementierung oder Unit-Prüfung vorliegt. Rohbelege,
beobachtetes Ergebnis und Testumgebung sind für jede Statusänderung nötig.

Am 01.10.2026 wurden außerdem die vorliegenden neuen Prüfprotokolle gelesen:

| Protokoll | Gemeldetes Ergebnis | Tatsächlicher Umfang |
| --- | --- | --- |
| `reports/integration/raw/enrollment.tap` | 27/27 bestanden, keine übersprungen | DB-/State-Fixtures, feste zwei Instanzen und echte lokale Passwortableitung; kein laufender Admin-/UI-Prozess |
| `reports/integration/raw/web-certificates.tap` | 14/14 bestanden, keine übersprungen | OpenSSL-Zertifikate, Dateirechte, Ablauf und echte lokale TLS-Sockets; kein Browser-/Produktlistener |
| `reports/integration/raw/bootstrap-regression.tap` | 46/46 bestanden, keine übersprungen | Bisherige Kern-Bootstrap-/Readiness-Fixtures; keine vollständige Host-Ersteinrichtung |

Die Dateien enthalten den Node-Test-Spec-Reporter trotz Endung `.tap`. Hashes
und enge Beleggrenzen stehen unter `componentVerificationEvidence` im JSON.
Die exakt gelesenen Logs sind zusätzlich unter
`reports/integration/review-snapshots/` erhalten, damit spätere Gesamtläufe die
hier referenzierten Teilbelege nicht ersetzen.
Der Quellstand wurde beim Lesen gehasht; diese einzelnen Logs enthalten selbst
keine vollständige Quell-/Laufprovenienz. Vor Lieferung ist der endgültige
Quellstand an den tatsächlichen Testlauf zu binden. Die 42 übergreifenden
Abnahmeszenarien bleiben geplant. Das aktuelle Instanzenprofil nimmt nur Admin
und UI für das Labor auf; `physicalControlEnabled=false` und fehlende
Zielhardwareabnahme bleiben ausdrücklich bestehen.

Die aktuellen getrennten Geräteadapter-Nachbesserungen, Protokollgrenzen und
Befunde `NW-EOS-ADP-261001-01` bis `08` stehen in
[`ADAPTERS_INTEGRATED.md`](../integration/ADAPTERS_INTEGRATED.md) mit
[`Komponentenprüfbericht`](../../reports/integrated/adapters/verification.json).
Diese Quellen enthalten unter anderem EEBUS-Peer-/Pairing-Schutz, einen
verpflichtenden OCPP-mTLS-Pfad und begrenzte Devices-Abfragen. Alle vier
physischen Adapter bleiben dennoch ohne Instanzenfreigabe. Der sichere Übergang
bei zentralem Lizenzverlust und die Backup-Hostarchitektur sind offen; die
Lizenzguards werden bei diesen Adaptern noch nicht importiert. Der separate
Bericht wurde gelesen und verknüpft, seine komplette Testsuite durch diese
Dokumentprüfung nicht nochmals ausgeführt.

Bei der anschließenden Gegenprüfung kamen zwei weitere EEBUS-Befunde hinzu:
`NW-EOS-ADP-261001-09` betrifft Control-/JSON-Nachrichten außerhalb des
Data-Kanal-Vertrauenstors, `-10` die vorzeitige beziehungsweise nach Widerruf
mögliche PIN-Ausgabe. Der gelesene
[Vorher-Nachweis](../../reports/integrated/adapters/eebus-control-bypass-before-fix.tap)
weist 16 Fälle aus: 11 bestanden und fünf fehlgeschlagen. Der anschließende
Code-/Labornachtest bestand mit 21/21 Frame-/PIN-/Ressourcenfällen; vier bestehende
Skripte bestanden ebenfalls gegen den abschließenden TypeScript-5.9.3-Build.
Damit sind die beiden konkreten Befunde eng auf dieser Ebene korrigiert; die
umfassende Protokoll-/Geräteabnahme bleibt offen. Die ursprünglichen zehn
erfolgreichen Tests belegten nicht sämtliche Framepfade. Nachgewiesen sind Callback-/Parserzugriff
und die Ausgabe einer synthetischen Test-PIN, keine physische Anlagensteuerung.
Ein nachgelagertes `processClsEvent`-Vertrauenstor begrenzt die Aussage über
unvertrauenswürdige physische Schreibzugriffe. Die Adapter bleiben deaktiviert.

Der getrennte [Admin-7-Nachweis](../integration/ADMIN_INTEGRATED.md) und seine
Rohprotokolle wurden ebenfalls gelesen: 13 Quell- und 13 Buildprofiltests,
zehn gemeldete Socket-/HTTPS-OAuth-Erfolge (vier Socketfälle, fünf HTTPS-Fälle
und ein übergeordneter Test), 112 Sicherheitsregressionsfälle sowie 40
isolierte Grenzprüfungen. Quell- und Buildtests überschneiden sich. Diese Zahlen
belegen keine zusätzliche vollständige Controller-, Browser- oder Zielhostabnahme.
Der Snapshot des Komponentenberichts und die Loghashes stehen im JSON.
Der anschließende r4-Nachtest korrigiert einen erst in der Controllerintegration
erkannten Vertrag: Gruppenansichten liefern einen übersetzten Anzeigenamen als
`row.id`. Sitzungs- und Rollenprüfung verwenden nun die streng validierte,
eindeutige Objektkennung `row.value._id`. Ungültige oder doppelte Kennungen
werden abgewiesen. 31 Quell- und 41 Build-/Socket-/OAuth-Testeinträge sowie die
40 Grenzprüfungen bestanden im gelesenen Nachtest. Diese überlappen die früheren
Tests und ersetzen keine vollständige Anmeldung im Gesamtsystem. Die optionale
Sentry-Plugin-Deklaration wurde unabhängig von CI-Einstellungen entfernt und
das Manifest in den Dateisiegelumfang aufgenommen. Der finale Komponentensnapshot
ist ebenfalls getrennt erhalten.

Die installierten npm-Bäume sind getrennt inventarisiert: Der erhaltene
Admin-/UI-Checkpoint r2 vor der späteren UI-Startkorrektur enthält 465 Paketverzeichnisse, 425 unterschiedliche
npm-Name-/Versionskombinationen und zwei eingebettete Pakete. Sein
[Audit](../../reports/integration/sbom/review-snapshots/ui-r2/candidate-final-tree.audit.json) meldet
drei moderate Paketknoten der Controller-/esbuild-Kette, keine hohen oder
kritischen. Der reine
[Bewertungsbaum aller sechs Komponenten](../../reports/integration/review-snapshots/dependency-post-admin-assessment-tree.audit.json)
meldet nach den Admin-Korrekturen zwölf betroffene Paketknoten: zwei kritische
und zehn moderate, darunter die Backup-Abhängigkeitskette. Dies sind keine
Zahlen unabhängiger CVEs und keine Freigabe der deaktivierten Adapter. Die
frühere Auswertung mit 18 Knoten bleibt historisch; die spätere
EEBUS-Framekorrektur ist kein geprüfter Bestandteil dieses Bewertungsbaums.
Die zugehörigen CycloneDX-Dateien, Deckungsnachweise und Hashes stehen unter
`dependencyAssessmentEvidence` in der Matrix. Geräte-OS, Binaries, Firmware
und vollständige Frontend-Bundleherkunft benötigen zusätzliche Nachweise.

Der abschließende
[Admin-/UI-Prozessversuch r4](../../reports/integration/raw/ui-controller-summary.json)
ist jetzt tatsächlich bestanden: **sieben Stufen, acht TAP-Einträge einschließlich
eines übergeordneten Tests**. Controller, beide Adapter und zwei Redis-Prozesse
liefen; geprüft wurden TLS 1.3, echte HTTPS-Anmeldung/OAuth, zentrale signierte
Testlizenz, genaue UI-Freigabelimits, Widerruf und abgewiesene Anlagenbefehle.
Der Lauf benötigte ein ausdrücklich gekennzeichnetes **OS-Schnittstellenfixture**
in zwei Dateien einer Wegwerfkopie, weil die Sandbox den nativen
`uv_interface_addresses`-Aufruf verweigerte. Der unveränderte Kandidat und die
Fixtureeingaben sind per Hash gebunden. UID 0, Loopback, synthetische Gerätekennung
und flüchtige Testschlüssel sind Laborbedingungen. Unveränderter nativer Start,
Debian-/Pi-/VMware-Dienstrechte, Browser, Tailscale und physische Geräte sind
damit weiterhin nicht abgenommen. Sämtliche vorherigen Fehlversuche bleiben
erhalten. Die 42 vollständigen Abnahmeszenarien werden durch diesen engeren
Prozessnachweis nicht pauschal auf bestanden gesetzt.

Der verbindliche abschließende npm-Nachweis gehört zu **r4**:
[`candidate-final-tree.cdx.json`](../../reports/integration/sbom/candidate-final-tree.cdx.json)
mit 465 installierten Paketverzeichnissen, 425 npm-Identitäten und zwei
explizit eingebetteten Paketen. Sein Audit meldet weiterhin drei moderate
Paketknoten der Controller-/esbuild-Kette, null hohe und null kritische.
Der [Build-/SBOM-Bericht](../../reports/integration/sbom/verification.json)
bindet diesen Baum an den r4-Prozessversuch und die konkreten Dateien;
34 Werkzeugtests und fünf getrennte vollständige CycloneDX-1.5-Schemaprüfungen
wurden durch Rohbelege nachgewiesen. Der Deckungsbericht selbst führt keinen
Schemaschritt aus; dessen `fullJsonSchemaValidated=false` steht deshalb neben
dem anschließend separat gehashten positiven Schemabericht. Frühere r2- und
Gesamtbewertungsstände bleiben historische Belege. Dies ist noch kein
vollständiges Geräteinventar oder signiertes Installationsartefakt.

## Produktgrenze und Lieferumfang

Ziel ist ein lokal regelndes EOS-System auf Debian/Raspberry Pi OS 12, zunächst
Raspberry Pi 5 mit 8/16 GB und SSD; eine x64-VM dient der vorgelagerten
Softwareabnahme. Node.js und js-controller bleiben Bestandteil. EOS Admin 7,
NexoWatt-UI, Devices, EEBUS, OCPP und Backup werden komponentenweise aufgenommen.
Admin 8 wird aus einer Versionsnummer nicht stillschweigend als produktiver
Ersatz zugrunde gelegt. Versionen und Artefakte kommen aus dem tatsächlichen
Komponenteninventar und Build, nicht aus dieser Entwurfsbeschreibung.

Für jeden Adapter sind mindestens diese Zustände getrennt auszuweisen:

| Zustand | Aussage |
| --- | --- |
| Quelle beigefügt | Der Quellcode gehört zum vollständigen Repository-Paket. |
| Paket installiert | Der konkrete Paketbaum liegt im signierten Runtime-Stand. |
| Instanz zugelassen | Version, Einstiegspunkt, Rechte und Konfiguration sind überprüft aufgenommen. |
| Instanz aktiv | Der Prozess wurde in der angegebenen Umgebung tatsächlich gestartet. |
| Produktiv freigegeben | Der Hersteller hat die erforderlichen Nachweise und offenen Risiken für den konkreten Einsatz bewertet. |

Weder eine Quellbeilage noch eine gültige Paketsignatur beweist die Sicherheit
des Paketverhaltens. Ein deaktivierter Adapter erhält keine Funktionsfreigabe.
Diese Unterscheidung gilt besonders für bisherige Backup-Hostaktionen und noch
nicht gegen reale Geräte geprüfte Protokolladapter.

## Abnahmeanforderungen

Alle Kennungen in der Tabelle besitzen im JSON zwei explizite Prüfszenarien,
Elternanforderungen, Risiken, Verantwortung, offene Nachweise und gegebenenfalls
historische Teilbelege. `P`/`N` stehen für positives beziehungsweise negatives
Szenario; mehrere Einzelfälle darin müssen im tatsächlichen Testbericht getrennt
nachvollziehbar werden.

| EOS-INT-REQ | Gefordertes Ergebnis | Wesentliche noch zu belegende Grenze |
| --- | --- | --- |
| 001 | Exakte Quellen, Versionen, Build-/Dateihashes und Plattformen | Integrierter Lieferbaum statt bloßer Paketnamen |
| 002 | Zuverlässiger Erststart und kontrollierte Instanzenaufnahme | Teilabbruch, paralleler Aufruf, reale Dienstrechte |
| 003 | Persönliche Erstzuordnung ohne Standardpasswort | Einmalnachweis, Erstvertrauen und dauerhafter Abschluss |
| 004 | HTTPS/WSS, Rollen, Sitzungen und serverseitige Prüfungen | Browser, WebSocket, CSRF/Origin und Session-Widerruf |
| 005 | Verschlüsselung jedes tatsächlichen internen Netzwerkpfads | Alle Adapterverbindungen und zusätzliche Nebenkanäle |
| 006 | Minimale Hostrechte und wirksame Modulberechtigungen | Gemeinsame UID/DB-Zugänge sind keine Adapterisolation |
| 007 | Zertifikatsablauf, Erneuerung und Wiederherstellung | Redis- und Webvertrauen, Zeitfehler und unterbrochener Wechsel |
| 008 | Asymmetrische Offline-Lizenz und verschlüsselte Speicherung | Gerätebindung, Schlüsselrechte, Restore und Rotation |
| 009 | Minimale Freischaltungen ohne Verlust nötiger Schutzfunktionen | Alle Adapter, Lizenzablauf und Ausfall der Lizenzabfrage |
| 010 | Begrenzte, validierte HTTPS-/MQTTS-Gerätekommunikation | Legacyprofile, Datentypen, Frische, Gesamtdeadline und Datenmenge |
| 011 | EEBUS-Steuerung nur nach verifizierter Peerzuordnung | Pairing, Zertifikatswechsel und echte Protokollgegenstelle |
| 012 | OCPP-Station und Transaktion authentisieren/autorisieren | WSS, Stationsnachweis, unbekannte Tokens und Schemaprüfung |
| 013 | Verschlüsseltes Backup und kontrollierter Restore | Hostbroker, Archivfehler, Schlüssel und Geräteidentitäten |
| 014 | Zusätzliche Adapter ausschließlich über geprüfte signierte Freigabe | Admin-/CLI-/npm-Umgehung und getrennte Startaufnahme |
| 015 | Update und Rückfall halten Code und Daten konsistent | Allgemeine Updates über additive Erweiterungen hinaus |
| 016 | Tailscale-Service und erforderliche Netze bleiben funktionsfähig | Rollen, Tailnetregeln, Widerruf und lokale Autonomie |
| 017 | Begrenzte, verwertbare Diagnose ohne Geheimnisse | Fehlerflut, Logwachstum und Ausfall der Überwachung |
| 018 | Design, Energie-/Ladefunktionen und Grenzwerte erhalten | Reale Anlage, Kommunikationsverlust und Wiederaufnahme |
| 019 | CycloneDX und Advisorybewertung passen zum tatsächlichen Build | OS/Node/Firmware, weitere Adapter und offene Befunde |
| 020 | Herstellerprozesse und regulatorische Entscheidungen dokumentieren | Support, Meldung, Produktkategorie und Bewertungsverfahren |
| 021 | Jede Freigabe ist durch passende Belege gedeckt | Kein geplanter/übersprungener Test als bestanden |

Für externe HTTPS-Datenabrufe gilt die persönliche EOS-Programmierlinie:
höchstens 5.000 ms für den gesamten Auftrag einschließlich DNS/TLS,
Antwortkörper, Authentisierung, Wiederholungen und Fallback. Ein Timeout pro
Einzelversuch genügt nicht. Grenzen für Nachrichten, Warteschlangen und Logs
werden je Pfad implementiert und getestet. Das ist ein EOS-Entwicklungsvertrag,
keine behauptete gesetzliche Millisekundenvorgabe.

## Verschlüsselung und Netze

TLS 1.3 mit geprüfter Gegenstelle ist das interne Transportprofil. Gegenseitige
Modulidentität und Autorisierung bleiben gesonderte Anforderungen aus
`EOS-REQ-005`; Server-TLS mit gemeinsam nutzbaren DB-Passwörtern erfüllt dieses
Isolationsziel noch nicht vollständig. Node-IPC oder weitere lokale Kanäle
benötigen einen expliziten Vertrauensgrenzenbeleg und dürfen nicht pauschal als
verschlüsselt bezeichnet werden.

Ein ausschließlich lokales Feldprotokoll ist nicht automatisch sicher. Ist
Kryptografie auf einer Gegenstelle technisch unmöglich, muss der konkrete
Gerätepfad samt Zugriffen, Netzgrenze und Restrisiko dokumentiert werden.
Legacy-Modbus wird durch Redis-TLS oder einen Service-VPN nicht verschlüsselt.

Der Nutzer benötigt unterschiedliche Netze für Geräte und Service. Deshalb
wird keine pauschale LAN-Sperre eingeführt. Zugang wird anhand Dienst,
Gegenstelle und Rolle geprüft; Tailscale-Subnetzrouten, Exit-Node und öffentliche
Weiterleitungen werden nicht automatisch aktiviert. Ein Service-VPN ersetzt
keine Anmeldung an EOS. Der lokale Regelbetrieb darf nicht vom Service-Tunnel
abhängen. Hosting/Control-Plane und Datenflüsse der Fernwartung sind separat
festzulegen; aus dem lokalen Energieregelbetrieb folgt keine pauschale Aussage
„das gesamte Produkt hat keine externe Abhängigkeit“.

## Aktuelle normative Grundlage und Grenzen

Die folgenden Primärquellen wurden am **01.10.2026** geprüft. Vollständige
IEC-Normtexte wurden nicht eingesehen; Katalogangaben bestätigen Fassung und
Geltungsbereich. Die Zuordnung ist eine technische Ableitung. Eine konkrete
harmonisierte EN-Fassung mit Amtsblattfundstelle und abgedeckten Anforderungen
wird hier nicht behauptet.
Ein älteres Publikationsjahr ist dabei kein Nachweis einer veralteten Norm;
eine neuere Entwurfsfassung ersetzt nicht automatisch eine gültige Finalfassung.

| Referenz | Ermittelter Stand / Verwendung |
| --- | --- |
| [CRA-Herstellerpflichten](https://digital-strategy.ec.europa.eu/en/policies/cra-manufacturers), Seitenstand 14.08.2026 | Risikobewertung, technische Unterlagen, sichere Lieferung und Schwachstellenbehandlung sind Herstelleraufgaben. |
| [CRA-Zusammenfassung](https://digital-strategy.ec.europa.eu/en/policies/cra-summary) | Hauptpflichten ab 11.12.2027; Anhang I umfasst Produkteigenschaften und Schwachstellenbehandlung. Die Kommissionszusammenfassung ist nicht der vollständige Rechtstext. |
| [CRA-Meldungen](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), Seitenstand 11.09.2026 | Herstellerpflichten nach Artikel 14 gelten seit 11.09.2026. Aktiv ausgenutzte Schwachstellen und schwerwiegende Sicherheitsvorfälle sind von gewöhnlichen Codebefunden zu unterscheiden. |
| [Konformitätsbewertung](https://digital-strategy.ec.europa.eu/en/policies/cra-conformity-assessment), Seitenstand 31.07.2026 | Kategorie und Verfahren hängen von der tatsächlichen Produktfunktion ab. Die Seite verweist auf die technischen Kategorien der Durchführungsverordnung (EU) 2025/2392. |
| [CRA-Normung](https://digital-strategy.ec.europa.eu/en/policies/cra-standardisation), Seitenstand 31.07.2026 | M/606 betrifft die Entwicklung unterstützender Normen; der Normungsauftrag ist kein Nachweis einer konkreten EOS-Konformitätsvermutung. |
| [IEC 62443-4-1:2018, Ed. 1.0](https://webstore.iec.ch/en/publication/33615) | Entwicklungs-/Wartungsprozess des Produktherstellers. |
| [IEC 62443-4-2:2019, Ed. 1.0](https://webstore.iec.ch/en/publication/34421) | Technische Komponentenanforderungen; Ausgabe enthält Korrigendum August 2022. |
| [IEC 62443-3-2:2020, Ed. 1.0](https://webstore.iec.ch/en/publication/30727) | Systemgrenze, Zonen/Verbindungen, Risiko und begründeter Ziel-Sicherheitslevel. |
| [IEC 62443-3-3:2013, Ed. 1.0](https://webstore.iec.ch/en/publication/7033) | Systemanforderungen; Ausgabe enthält Korrigendum April 2014. |
| [NIST SSDF](https://csrc.nist.gov/projects/ssdf), Projektstand 13.04.2026 | SP 800-218 v1.1 ist die finale Ausgangsbasis. |
| [NIST SP 800-218 Rev. 1](https://csrc.nist.gov/pubs/sp/800/218/r1/ipd) | SSDF v1.2 vom 17.12.2025 wird weiterhin als **Initial Public Draft** angezeigt. Keine Finalfassung daraus ableiten. |
| [OWASP ASVS](https://owasp.org/projects/asvs) | 5.0.0 wird als aktuelle stabile Fassung genannt. L2 ist die EOS-Prüfbasis; risikobegründete Ergänzungen aus L3 und konkrete versionsgebundene Einzelkontrollen bleiben zuzuordnen. Kein erreichtes ASVS-Level behauptet. |

Der vollständige EUR-Lex-Abruf der
[Verordnung (EU) 2024/2847](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng)
und der verlinkten technischen Kategorien wurde durch eine Robotprüfung
blockiert. Deshalb bleibt die abschließende klauselscharfe rechtliche
Zuordnung offen. Die zugänglichen Kommissionsseiten belegen die oben genannten
Orientierungspunkte. Alle URLs und Abrufgrenzen sind auch im JSON verzeichnet.

Die Bezeichnung „Betriebssystem“ entscheidet die CRA-Produktkategorie nicht.
Eine als eigene allgemeine Runtime/OS vermarktete Funktion könnte anders zu
bewerten sein als eine fest definierte Energiesteuerungs-Appliance. Diese
Einordnung muss anhand des tatsächlichen Lieferumfangs und der Kernfunktion
entschieden werden; weder eine Standardkategorie noch verpflichtende
Fremdbewertung wird hier vorweggenommen.

Für den Meldeprozess nennt die Kommission 24 Stunden für die Frühwarnung und
72 Stunden für die Meldung ab Kenntnis. Abschlussfristen unterscheiden sich:
bei aktiv ausgenutzten Schwachstellen spätestens 14 Tage nach verfügbarer
Abhilfe, bei schweren Vorfällen innerhalb eines Monats nach der
72-Stunden-Meldung. Die Single Reporting Platform ist nach Kommissionsangabe
seit 11.09.2026 verfügbar. Diese Arbeitsfassung dokumentiert keine bereits
erfolgte Registrierung, Meldung oder Übung. [Quelle: CRA-Meldungen oben.]

## Entwicklungs- und Freigabeverfahren

1. Jede Änderung bindet Anforderung, Bedrohung, betroffene Version, Verträge
   und vorgesehenes Fehlerverhalten. Eingaben werden vor Seiteneffekten
   geprüft; keine freien Shell-Aufrufe oder eingebauten gemeinsamen Secrets.
2. Passende positive/negative Unit- und Integrationstests laufen mit der
   Implementierung. Lint, Typprüfung, Abhängigkeits-/Geheimnisprüfung und
   Rohbelege werden am tatsächlich ausgelieferten Stand geführt.
3. Der integrierte Build benötigt reale Prozess-/Browserprüfungen. Mocktests
   zählen nur als Mocktests. Vorliegende moderate esbuild-Befunde des Kerns
   bleiben gemäß Basisbericht bewertet und werden nicht durch ein neues ZIP
   automatisch geschlossen.
4. Danach folgen frische Debian-VM, unprivilegierte systemd-Ausführung,
   Update/Restore und schließlich Raspberry Pi mit SSD und benannten Geräten.
   Stromausfall, Zeitfehler, Datenträgerdruck, Netz-/VPN-Ausfall und sichere
   Wiederaufnahme werden mit passenden Anlagenlimits geprüft.
5. Supportende, Schwachstellenkontakt, Melde-/Patchprozess, anwendbares
   Konformitätsverfahren und Herstellerentscheidung werden ergänzt. Die
   Produktfreigabe und gegebenenfalls erforderliche unabhängige Prüfung
   bleiben von der internen Entwicklungsprüfung getrennt.

Ein fehlgeschlagener sicherheitskritischer Test oder bekannte ausnutzbare
Schwachstelle im vorgesehenen Betrieb ist ein Freigabehindernis. Offene
Nachweise werden mit Verantwortlichkeit und nächstem Schritt geführt;
Risikoakzeptanz wird nicht erfunden. Die endgültige Lieferung enthält das
vollständige Repository, versionsgebundene Nachweise, SBOM, Installations- und
Testanleitung sowie die klar benannten Grenzen des konkreten Teststands.

Cybersecurity-Prüfungen ersetzen keine elektrische/funktionale Sicherheit,
EMV-/Funkbewertung, Protokollzertifizierung oder anlagenspezifische
Netzanschlussprüfung. Insbesondere wird weder ein IEC-62443-Sicherheitslevel
noch ein SIL oder eine §14a-/Netzanschlussabnahme aus den Softwaretests abgeleitet.


## Fortschreibung 0.2.0-dev.3 / Test-Pi 0.2.0-test.1

Die neue Liefergrenze ergänzt Offline-Build, Zielarchitekturprüfung, SBOM-zu-Dateibaum-Bindung und lesende Einrichtungs-/Hostvorprüfung. STRIDE und Grenzen: `docs/security/TEST_PI_STABILIZATION_THREAT_MODEL_DE.md`; ausgeführte Belege: `reports/integration/stabilization/verification-summary.json`. Mesh-Timing, Zielhardware-, Geräte-, Backup-/Update- und unabhängige Sicherheitsabnahme bleiben offen. Ein signiertes Entwicklungstestpaket ist kein Nachweis vollständiger CRA- oder IEC-Erfüllung. Das auf dem Pi erst zu erhebende OS-/Firmwareinventar gehört zusätzlich zur Produktdokumentation.


## Fortschreibung 0.2.0-dev.4: externe Redis-Komponente

`EOS-HOST-REDIS-20261001` hält neue Installationen an. Ein signierter
npm-Dateibaum deckt separat installierte Hostpakete nicht ab. Die aktuelle
Vorprüfung trennt technische Diagnose (`prerequisitesReady`) von Freigabe
(`ready: false`). Das frühere Testpaket bleibt unverändert historisch erhalten,
ist aber für Neuinstallationen zurückgezogen; kein technischer Offlinewiderruf
wird behauptet. Befund, konkrete Quellen und Testgrenzen stehen in
`docs/security/DEBIAN13_TEST_HOST_DE.md`, die Hashbindung in
`reports/integration/debian13/verification-summary.json`. Debian-13-/ARM64-
Betrieb und genaue OS-/Redis-SBOM bleiben offen. Die bestehende npm-SBOM
beschreibt den unveränderten App-Build, nicht die gesamte Produktversion.

## Fortschreibung 0.2.0-dev.5: Betriebssystem-Patchprozess

Die Anforderung des Nutzers erweitert den Produktumfang um automatische
OS-Paketpflege und eine sichtbare, ausschließlich lesbare Statusanzeige.
Der separate Hostdienst begrenzt die Root-Grenze gegenüber den Adaptern;
geprüfte Archivmetadaten, sichere Voreinstellungen, Frische-/Fehleranzeige,
Aktivierungsbedarf und ein tatsächliches dpkg-Inventar liefern Teilnachweise.
STRIDE, Umfang, Quellen und verbleibende Grenzen stehen in
`docs/security/OS_SECURITY_UPDATES_DE.md`.

Diese Maßnahmen ersetzen weder den EOS-/Node-/Adapter-Patchprozess noch die
Herstellerbewertung bekannter Schwachstellen. Insbesondere wird
`EOS-HOST-REDIS-20261001` nicht durch Aktivierung eines Timers geschlossen.
`EOS-OS-UPDATES-RUNTIME-PIN-20261001` hält den noch nötigen abgestimmten
Updatepfad für die exakt gebundene Node-Laufzeit nach. Blockierte Korrekturen
müssen sichtbar bleiben. Betriebs- und Sicherheitsanforderungen sind gemeinsam
abzunehmen: Dienste können durch Paket-Skripte neu starten; kein allgemeiner
Nachweis von unterbrechungsfreiem Betrieb wird aus Unit-Tests abgeleitet.

Offen sind reale Debian-12-/13-ARM64-Pakettransaktionen, Pi-Kernel-/Firmware-
Aktivierung, Fehler-/Stromverlustwiederaufnahme, der benutzerfreundliche
produktweite Aufschub-/Opt-out-Ablauf sowie das herstellerseitige Verfahren zur
dringenden Behebung außerhalb regulärer Wartungsfenster. Eine rootverwaltete
Richtlinie allein belegt noch keine vollständige Erfüllung dieses Nutzerablaufs.
Die historischen SBOMs bleiben historische Buildbelege; für diese neue
Quellenlieferung werden passende Quellbindungen separat ausgewiesen.

## Fortschreibung PostgreSQL 0.2.0-dev.6

`EOS-PG-INTEGRATION-20261001` hält eine Auslieferung des neuen Backends offen:
Native PostgreSQL-TLS-/Controller-Tests, per-Adapter-Autorisierung und
OS-Isolation, Migration, Backup/Restore, Zielhostlast und Geräteausfälle sind
noch nachzuweisen. Bestehende CRA-/IEC-Anforderungen bleiben unverändert.
Modultests mit Doubles, SQL/RLS unter einer separaten WASM-Engine und
tatsächliche Controller-Modulauflösung werden getrennt ausgewiesen; keiner
dieser Nachweise ersetzt einen laufenden PostgreSQL-Server oder einen
unabhängigen Penetrationstest. Support und Hauptversionswechsel müssen
PostgreSQLs Wartungsende sowie den EOS-Supportzeitraum berücksichtigen.
