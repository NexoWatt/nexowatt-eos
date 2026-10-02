# STRIDE-Modell der integrierten EOS-Testversion

Stand: **01.10.2026** · Änderung `EOS-INTEGRATION-20261001` · Ziel
`0.2.0-dev.1`. Ausgangspunkt ist der geprüfte Controllerkern `0.1.0-test.1`.
Dieses Dokument konkretisiert das bestehende
[`THREAT_MODEL_SYSTEM.md`](THREAT_MODEL_SYSTEM.md). Maschinenlesbare Szenarien,
Elternkennungen, Maßnahmen, Zuständigkeit und Testverknüpfungen stehen im
Feld `risks` der
[`Integrationsmatrix`](../../system/integration/requirements.json).

## Bewertungsrahmen

STRIDE erfasst Identitätsfälschung, Manipulation, Abstreitbarkeit,
Informationsabfluss, Verfügbarkeitsangriffe und Rechteausweitung. Die Szenarien
sind eine qualitative Integrationsrisikoanalyse; sie sind nicht automatisch
nachgewiesene Schwachstellen, CVEs oder konkrete Angriffe. Die Einstufung
„hoch“ begründet sich durch mögliche Fremdsteuerung, Geheimnisverlust oder
Verfügbarkeitsverlust an der jeweils beschriebenen Grenze. Eintrittshäufigkeit
und vollständiges Anlagenrisiko sind ohne konkrete Topologie/Geräte nicht
quantifiziert. Kein Risiko ist durch diese Dokumentation akzeptiert oder
geschlossen.

Geschützte Werte sind die vorhandenen `EOS-ASSET-01` bis `04`: sichere
Regelverfügbarkeit und Anlagenlimits, korrekte Mess-/Stellwerte und
Konfiguration, Identitäten/Schlüssel/Lizenzen sowie Code-/Releaseintegrität,
Sicherungen und Nachweise. Die bestehenden Vertrauensgrenzen bleiben gültig:

| Grenze | Integrationsrelevanz |
| --- | --- |
| EOS-TB-01: Browser-/Managementnetz → Admin/UI | Einmalige Einrichtung, HTTPS, Nutzerrolle, Sitzung, CSRF und WebSocket |
| EOS-TB-02: Adapter → Bus/Daten | TLS schützt Verbindung; gemeinsame UID/DB-Rechte schützen nicht vor anderem zugelassenem Adapter |
| EOS-TB-03: Feldgeräte → Regelung | Geräteidentität, Pairing, Protokollvalidierung, Frische, Einheiten und Leistungsgrenzen |
| EOS-TB-04: Hersteller-/Ausstellerumgebung → Gerät | Signierter Release/Lizenz, unabhängig verankerte Prüfschlüssel |
| EOS-TB-05: Runtime → Hostwartung | Feste privilegierte Operationen, keine allgemeine sudo-/Shell-Freigabe |
| EOS-TB-06: Backup/Datenträger → aktives System | Authentisierte Verschlüsselung, sichere Pfade, Versions-/Identitätsentscheidung |

## Register der Integrationsrisiken

`S/T/R/I/D/E` bezeichnen die STRIDE-Kategorien in der oben genannten Reihenfolge.
Die Nummern in der letzten Spalte sind Unteranforderungen `EOS-INT-REQ-*`;
diese führen zu den geplanten `EOS-INT-TEST-*-P/N`-Szenarien.

| EOS-INT-TM | STRIDE | Angriff oder Fehler / erforderliche Gegenmaßnahme | Anforderungen |
| --- | --- | --- | --- |
| 001 | T/E | Registry-/Importmanipulation oder npm-Umgehung → vollständige Signatur-/Hashprüfung, feste Versionen, keine dynamische Nachinstallation | 001, 014, 015, 019 |
| 002 | T/D | Ungeprüfte Instanz oder unterbrochene Aktivierung → feste Aufnahme, Zustandsautomat, Readiness und Recovery | 001, 002, 014, 015 |
| 003 | S/E | Übernahme des noch unzugeordneten Geräts → einmaliger vertrauenswürdig bereitgestellter Nachweis, persönliche Zugangsdaten, atomarer Abschluss | 002–004 |
| 004 | S/E | Niedrige Rolle, alte Sitzung oder VPN-Mitgliedschaft wird als Adminrecht behandelt → aktuelle serverseitige Autorisierung | 003, 004, 016 |
| 005 | S/I/T | Nebenkanal bleibt Klartext oder akzeptiert falsche Gegenstelle → tatsächliche Kanalmatrix, verpflichtende Zertifikats-/Namensprüfung | 004, 005, 007, 010 |
| 006 | I/T/E | Kompromittierter zugelassener Adapter greift auf fremde Rechte zu → getrennte Identitäten und minimale Operationsrechte | 005, 006, 009, 014 |
| 007 | D/S | Zertifikatablauf oder halber Vertrauenswechsel → Alarm, frühzeitige Erneuerung, atomare Aktivierung, definierte Recovery | 007, 017 |
| 008 | T/I/E | Lizenzdatei gefälscht, gemeinsames Secret extrahiert oder Adapterkennung imitiert → Signatur, AEAD-Speicherung, authentisierte minimale Abfrage | 008, 009 |
| 009 | S/T | Falsche/veraltete Gerätewerte → Identität, Werte-/Frischeprüfung und Gerätebereich; Legacyrestrisiko benennen | 010–012, 016, 018 |
| 010 | T/E/I | Pfad, Archiv oder Mountparameter erreicht Root → minimaler Hostbroker, feste Operationen, Rechte-/Link-/Pfadprüfung | 006, 008, 013 |
| 011 | S/T/E/I | Ungepaarter EEBUS-Peer oder kopierte OCPP-Kennung steuert → Peerbindung, Pairing, Stationsnachweis und echte Autorisierung | 011, 012 |
| 012 | I/T | Gestohlenes/manipuliertes Backup oder Identitätsklon → authentisierte Verschlüsselung und kontrollierter Restore | 013 |
| 013 | T/D | Lizenz-/Kommunikationsfehler löst gefährlichen Dauerwert oder pauschale Abschaltung aus → gerätespezifischer Failsafe und Prioritäten | 009–012, 018 |
| 014 | T/D | Stromverlust, PubSub-Lücke oder Rollback verliert/dupliziert Zustände → dauerhafte Daten, Idempotenz/Frische und Zustandsabgleich | 002, 005, 007, 013, 015, 018 |
| 015 | D/I | Langsame/übergroße Antwort oder Fehlerflut → echte Gesamtdeadlines und Größen-/Queue-/Loggrenzen ohne Secrets | 010, 017 |
| 016 | S/E/I | Servicezugriff öffnet unbeabsichtigt Anlagen-/Subnetze → gezielte Tailnetregeln, getrennte Identitäten, Widerruf und keine automatischen Routen | 016 |
| 017 | R/T | Alte/geplante Tests gelten als Freigabe oder Schwachstellenreaktion fehlt → releasegebundene Rohbelege und geübte Herstellerprozesse | 017, 019–021 |

## Sicherheitsentscheidungen und verbleibende Grenzen

**Code und Host.** Der bestehende Kern prüft signierte Dateien und sperrt
gewöhnliche dynamische Installationswege. Ein gültig signierter Adapter ist
deshalb nicht automatisch harmlos. Bei gemeinsamer UID und DB-Identität gehört
sein Code zur gleichen Vertrauenszone. Paketprüfung, Laufzeitrechte,
Adapterisolierung und Anwendungsautorisierung sind unterschiedliche Maßnahmen.
Die vorherige UID-0-Laborumgebung ist kein Beleg einer sicheren Hostgrenze.

**Betrieb und Verschlüsselung.** Die vorhandenen echten Redis-Prüfungen zeigen
geschützte Objects/States/Messagebox-Verbindungen des Kerns. Sie zeigen nicht,
dass alle späteren Adapter oder direkten Geräteverbindungen geschützt sind.
Wiederverbindung bedeutet nicht, dass PubSub während der Unterbrechung
ereignisverlustfrei arbeitet. Nach Wiederanlauf müssen Adapter ihren Zustand
abgleichen und alte/mehrfache Stellbefehle kontrolliert behandeln. Auch
AOF-everysec ist keine Zusage ohne Verlust der jüngsten Daten bei Stromausfall.

**Zertifikate.** Die Baseline verwendete Testserverzertifikate mit 90 Tagen
Laufzeit. Die aktuelle [Lebenszyklusimplementierung](../operations/CERTIFICATE_LIFECYCLE.md)
ergänzt Redis-CA-/Serverwechsel und HTTPS-Leaf-Erneuerung mit Recovery.
Der tägliche Timer prüft den Status; eine Dienstunterbrechung zur Rotation
erfolgt ausdrücklich durch den Root-Wartungsweg. Erneuerung der Browser-CA,
Widerruf kompromittierter Browser-CA und Benachrichtigung jenseits Journal/Unit
bleiben offen. Redis-Trust und Browser-Trust sind getrennte Abläufe; tatsächliche
systemd-/Geräte- und Stromausfallprüfungen werden nicht aus den Laborbelegen
abgeleitet.

**Lizenzen.** Signatur schützt Herkunft/Integrität, Verschlüsselung schützt
gespeicherte Inhalte unter den Rechten des konkreten Schlüsselspeichers. Eine
gemeinsame UID oder lokaler Root kann laufenden Klartext weiterhin erreichen.
Ohne nachgewiesenen Hardwarevertrauensanker wird keine manipulationssichere
Gerätebindung gegen Root behauptet. Lizenzfehler dürfen Sicherheitswartung und
notwendige Anlagenschutzfunktionen nicht stilllegen.

**Identitätsverträge.** Eine echte Controllerausführung deckte einen Unterschied
zur früheren Gruppen-Fixture auf: `row.id` ist ein übersetzbarer Anzeigename,
keine kanonische Gruppenidentität. Admin verwendet jetzt streng validierte,
eindeutige `row.value._id` sowohl für Sitzungen als auch für Rollen. Die
Komponentennachtests und der spätere tatsächliche Prozessversuch mit Anmeldung/
Lizenzierung bestanden; dieser Lauf benötigte das ausdrücklich dokumentierte
OS-Schnittstellenfixture und ersetzt keine native Zielhostabnahme. Eine optionale Sentry-
Plugin-Deklaration wurde aus dem Manifest entfernt; eine im Labor gesetzte
CI-Variable ist keine produktive Datenschutz-/Sicherheitsgrenze.

**Service und Anlagenkommunikation.** Die Erreichbarkeit aller benötigten
Netze bleibt Ziel. Daraus folgt keine Freigabe aller Ports für alle Teilnehmer.
LAN-/VPN-Teilnehmer sind vor jeder privilegierten Aktion zu authentisieren und
autorisieren. Eine Verbindung über Tailscale schützt nicht automatisch den
Weg vom EOS-Gerät zu einem ungeschützten Modbus-/HTTP-Feldgerät.

**Backup.** Frühere Shell-/Mount-/Restorepfade benötigen eine separate
Hostarchitektur. Allgemeine sudo-Rechte nachzurüsten wäre kein Abschluss der
Integration. Bis ein dokumentierter Broker und reale Restorebelege vorliegen,
bleibt die betroffene Funktion ohne Freigabe.

**Lieferkettenbefunde.** Das Admin-/UI-Laborartefakt und der Bewertungsbaum
aller sechs Komponenten haben unterschiedliche Abhängigkeitsmengen. Drei
moderate Audit-Paketknoten im Kandidaten und zwölf Knoten im Gesamtbewertungsbaum
(davon zwei kritische) sind getrennt in der Anforderungsmatrix verknüpft.
Die betroffene Backup-Kette bleibt ein Grund gegen ihre Freigabe; das Entfernen
aus einem Laborprofil behebt den mitgelieferten Adapterquellbestand nicht.
Relevanz, Abhilfe und genaue Artefaktbindung sind je Advisory zu bewerten.

**Regelung.** Keine universelle „alles abschalten“-Regel wird aus Cybersecurity
abgeleitet. Prioritäten und Grenzen für Speicher, AC/DC-Laden, Netzlimit und
Einspeisung sind mit Geräteversion, Anlagenkonfiguration und unabhängiger
Schutzkette zu prüfen. Eine VM kann den elektrischen Teil nicht abnehmen.

## Zusätzliche EEBUS-Gegenprüfung

Die Befunde `NW-EOS-ADP-261001-09` und `-10` sind als konkrete
Komponentenbefunde mit dokumentiertem Vorher-/Nachher-Verlauf zusätzlich zum qualitativen Integrationsrisiko
`EOS-INT-TM-011` erfasst. Control-/JSON-Frames konnten die für den Data-Kanal
geprüfte SHIP-Vertrauensgrenze umgehen; ein ungepaartes oder noch nicht fertig
ausgehandeltes Peer konnte Anwendungscallbacks und den tatsächlichen CLS-Parser
erreichen. Auch nach vollständig abgeschlossenem Handshake gelangte
Anwendungsinhalt über den falschen Framekanal weiter. Ein weiterer Befund
betrifft die Ausgabe der konfigurierten PIN vor der vertrauenswürdigen
Protokollphase beziehungsweise nach Widerruf.

Der [Vorher-Lauf](../../reports/integrated/adapters/eebus-control-bypass-before-fix.tap)
der erweiterten 16-Fälle-Suite hatte **11 Erfolge und fünf Fehler**. Die alten
zehn Erfolge belegen die neu untersuchten Pfade deshalb nicht. Der Test nutzt
eine synthetische PIN und einen vom echten CLS-Parser erkannten 4.200-W-Befehl;
er steuert keine Anlage. `processClsEvent` besitzt eine zusätzliche
Vertrauensprüfung, deshalb wird kein unberechtigter physischer Schreibzugriff
behauptet. Die beiden konkreten Befunde sind anschließend auf Code-/Laborebene
korrigiert: Die abschließende Suite meldet **21/21** erfolgreiche Fälle
(16 Frame-/PIN-Fälle und fünf Ressourcenfälle), vier bestehende Skripte bestehen
gegen den TypeScript-5.9.3-Build. Streng erkannte Control-Nachrichten ersetzen
den generischen Anwendungsfallback; PIN-Ausgabe benötigt aktuelle Trust- und
Protokollphase. Verbindungs-/Pairingfristen, begrenzte Sessions, sofortige
Fehlerbehandlung während Registrierung und besitzgeprüfte Socketbereinigung
sind zusätzlich regressionsgeprüft. Ein echter lokaler TLS-/WebSocket-Fall
prüft malformed Frames während verzögerter Registrierung; weitere Fälle sind
Timer-/Socket-Fixtures. EEBUS bleibt ohne Instanzenfreigabe. Diese Korrektur
ersetzt keine Protokoll-/Geräteabnahme und schließt das umfassendere
Integrationsrisiko nicht.

## Abschlusskriterien

Die interne Gegenprüfung der neuen Bootstrap-/Onboarding-/Webzertifikatsmodule
hat sieben konkrete Rückmeldungen an die implementierende Entwicklung erzeugt.
Sie sind unter `integrationCodeReview` in der JSON-Matrix mit Quellhashes,
Reproduktionsniveau und vorgeschlagenem Nachtest erhalten: Start nach spätem
Onboardingabbruch, Snapshot vor Wartungslock, fehlende Prüfung des privaten
CA-Schlüssels, Hostanzahl nach Normalisierung, Prozessbindung der Readiness,
Config-Mount für CLI-Uploads und Dateimodus bei restriktiver umask.

Vier enge Verhaltensweisen wurden mit temporären Dateien beziehungsweise
Mockstates reproduziert; die übrigen sind Codebefunde. Dabei wurden keine
laufenden Hostdienste oder Anlagen verändert und keine echten Schlüsselwerte
protokolliert. Diese Fundaufzeichnung bleibt an den dort festgehaltenen
Quellstand gebunden. Die sieben Rückmeldungen wurden anschließend im Code
korrigiert und mit enger Quell-/Testprüfung nachkontrolliert:

| Rückmeldung | Korrektur und Nachweisgrenze |
| --- | --- |
| REVIEW-001 | Vor dem Controllerstart prüft ein Root-geschütztes Wartungstor einen lebenden Koordinator anhand PID, Prozessstartzeit und Boot-ID. Prozessende und veraltete Permits wurden mit echten `/proc`-/Kindprozessen geprüft; keine reale systemd-/Runtime-UID-Abnahme. Sperrfehler verhindern den unabhängigen Stopversuch nicht mehr. |
| REVIEW-002 | Release und Konfiguration werden unter dem Wartungslock erneut gebunden. Ein Fixture führt den tatsächlichen Onboardingcode bei parallel verändertem Release aus und erhält die erwartete Ablehnung. |
| REVIEW-003/004 | CA-Schlüssel/Verzeichnis und Schlüsselzuordnung werden geprüft; 24 eigene SANs plus drei Loopbacks funktionieren. Der Aufrufer übergibt rohe Eingaben nach Validierung, sodass die Normalisierung nicht doppelt erfolgt. |
| REVIEW-005 | Heartbeat muss zum neuen Start gehören; HTTP-Antwort muss dem festen unangemeldeten Sicherheitsvertrag entsprechen. Negative Antworten wurden gemockt geprüft; das ist kein echter Browser-/Login-/Lizenztest. |
| REVIEW-006 | Feste Upload-Unit mit Runtimebenutzer und identischem schreibgeschütztem Config-Bind. Inhalt und systemd-Grammatik geprüft; tatsächliche Mount-/Dateizugriffe auf dem Zielhost bleiben offen. |
| REVIEW-007 | Expliziter finaler Dateimodus; Kindprozess mit `umask 077` bestätigt 0644/0640. Das ist ein Dateimodustest, keine vollständige Zielhost-Lesbarkeitsprüfung. |

Der eigene Nachtest `reports/integration/raw/onboard-ui-closure-regression.tap`
bestand mit **18/18** Fällen. Dazu wurden die vorhandenen Protokolle
`onboarding-maintenance.tap` (30/30), `activation.tap` (20/20) und die relevanten
Webzertifikatsfälle im Systemlauf (210/210 gemeldete Tests) gelesen. Diese Läufe
enthalten Überschneidungen und dürfen nicht als neue unabhängige Fälle addiert
werden. Der erste fehlgeschlagene Prozessnamespace-Versuch bleibt unter
`reports/integration/raw/attempts/maintenance-proc-namespace.tap` erhalten.

Der nachfolgende Host-/Aktivierungslauf
[`host-activation-final.tap`](../../reports/integration/raw/host-activation-final.tap)
bestand mit **39/39** gemeldeten Tests; er überschneidet sich mit früheren
Host-/Aktivierungsläufen. Zwei zusätzliche Fehler-Injektionen zeigen, dass ein
I/O-Fehler beim Permit-Widerruf den Rückfallversuch nicht verhindert und ein
abschließender Bereinigungsfehler keinen Erfolg meldet: Lock bleibt, ein
Stopversuch erfolgt unabhängig. Auch der Zertifikatstimer wird beim
Installerabbruch deaktiviert. Die Dateisystemeffekte sind lokal geprüft,
`systemctl`-Wirkungen im Fixture simuliert. Reale Dienstrechte, Stromausfall und
physische Wiederaufnahme bleiben für `EOS-INT-TM-014` offen.

Eine spätere echte Controller-/Adapterausführung im gekennzeichneten
OS-Schnittstellenfixture zeigte, dass die vollständige Admin-Authentifizierung
vor dem Lizenzhandler mit **HTTP 302** antwortet. Der frühere 403-Mock war kein
passender Beleg dieses vollständigen Pfads. Die Readinessprüfung wurde auf den
exakten relativen Anmeldeort korrigiert; externe, protokollrelative, abweichende
lokale und um zusätzliche Parameter ergänzte Redirects werden abgelehnt.
Der gelesene nächste Unit-Lauf meldet **79/79** inklusive dieser vier neuen
Negativfälle und überlappender bisheriger Tests. Das bestätigt nur den
unangemeldeten Readinessvertrag; ein erfolgreicher vollständiger Login-/
Lizenzablauf wird daraus nicht behauptet. Frühere Protokolle bleiben erhalten.

Der spätere r4-Prozessnachweis bestand anschließend mit **sieben Stufen / acht
TAP-Einträgen**: tatsächliche TLS-Datenbanken, Controller, Admin, UI, Anmeldung,
Lizenzfreigabe/Widerruf und abgewiesene physische Befehle. Wegen der Sandboxgrenze
wurde die OS-Schnittstellenfunktion in zwei Dateien der Wegwerfkopie ersetzt;
der gelieferte Kandidat blieb unverändert. Fixture-/Originalhashes, UID 0,
synthetische Gerätekennung und sämtliche früheren Fehlversuche stehen im
[Laborbericht](../../reports/integration/raw/ui-controller-summary.json).
Das ist ein tatsächlicher Teilintegrationsnachweis mit einer expliziten
Umgebungsabweichung, keine bestandene native systemd-/Pi-/Tailscale-Abnahme.

`remediated_scoped_verification` schließt nur die konkrete interne Rückmeldung
auf Code-/Teiltestebene. Sämtliche zugehörigen vollständigen Anforderungen,
realen Hostgrenzen und Anlagenprüfungen bleiben bis zur tatsächlichen Abnahme
offen. Die Nachtests liefern keine unabhängige Zertifizierung.

Ein Risiko wird erst nach passender Änderung, tatsächlichem positivem und
negativem Nachtest sowie dokumentierter Bewertung des Restrisikos geschlossen.
Eine einzelne Unterfunktion kann einen bestandenen Test haben, während das
Integrationsrisiko offen bleibt. Nachweise müssen das konkrete Artefakt, die
Konfiguration, Umgebung, Uhrzeit, Befehle und bereinigten Rohdaten binden.

Verantwortlich sind die EOS-Entwicklung und der Hersteller-Freigabeverantwortliche.
Die Fälligkeit ist das jeweilige Aktivierungs-/Produktfreigabetor; ein fiktiver
Kalendertermin oder eine nicht erteilte Risikoakzeptanz wird nicht eingetragen.
Die regulatorische Einordnung mit aktuellen Quellen steht in
[`INTEGRATED_TEST_REQUIREMENTS.md`](../cra/INTEGRATED_TEST_REQUIREMENTS.md).
