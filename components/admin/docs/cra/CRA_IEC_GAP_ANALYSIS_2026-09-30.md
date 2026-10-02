# NexoWatt EOS Admin – CRA- und IEC-62443-Lückenanalyse

Stand: 30.09.2026, Europe/Berlin. Eingang: vollständiges Repository `iobroker.eos-admin` 7.10.9, Datei `NexoWatt_EOS_Admin_7.10.9_README_LICENSE_ONLY_REPOSITORY(1).zip`. Änderungen und tatsächlich ausgeführte Tests dieses Lieferstands sind gesondert im Release-/Prüfbericht zu lesen. Diese Analyse ist ein Anforderungs- und Arbeitsnachweis; sie erteilt weder eine Zertifizierung noch eine vollständige CRA-/IEC-Konformitätsbestätigung.

## 1. Ergebnis und Prüfgrenze

Der hochgeladene Adapter ist eine Grundlage für die weitere Härtung. Ein Admin-Quellpaket allein belegt nicht die Sicherheit des ausgelieferten EOS-Endgeräts. Dafür fehlen hier insbesondere das konkrete Betriebssystemabbild, Boot-/Berechtigungskonzept, js-controller, tatsächlich installierte Drittadapter mit Konfiguration, produktive Schlüsselprovisionierung und die angeschlossenen Geräte. Der separate neue Offline-Keygen 1.0.0 wurde in der Fortsetzung für Admin 7.10.11 erstellt; er ersetzt keine Geräte- oder Herstellerprozessprüfung. Vorhandene Rollenmatrizen und Selbsttests im Repository sind hilfreich, ersetzen aber keine neue Prüfung des tatsächlichen Lieferstands.

Mit „IEC“ wird für diese Cybersicherheitsprüfung IEC 62443 zugrunde gelegt. IEC 62443-4-1:2018 betrifft den Entwicklungs- und Pflegeprozess; IEC 62443-4-2:2019 die technischen Eigenschaften von Komponenten; IEC 62443-3-3:2013 die Systemsicherheit. Das sind unterschiedliche Nachweise [S7–S9]. Eine bestimmte Sicherheitsstufe, ein bestandener vollständiger Normkatalog oder elektrische/funktionale Sicherheit werden hier nicht bescheinigt. Der vollständige lizenzierte Normtext lag nicht vor; die Zuordnung unten ist eine begründete Arbeitszuordnung anhand des offiziellen Normumfangs.

## 2. CRA-Anwendbarkeit und Fristen

**Arbeitsannahme:** NexoWatt liefert das lokale EOS kommerziell unter eigener Marke auf einem Endgerät. Lokale Geräte- und Netzwerkverbindungen reichen für den CRA-Anwendungsbereich; eine Cloudverbindung ist keine Voraussetzung. Daraus folgt für diese Planung die Herstellerrolle für das definierte EOS-Produkt. B2B-Vertrieb und eingebundene Open-Source-Komponenten beseitigen diese Rolle nicht. Das konkrete Produkt, separat vertriebene Adapter und ihre bestimmungsgemäße Verwendung müssen schriftlich abgegrenzt werden [S1, S2].

| Gegenstand | Verifizierter Rahmen | Konsequenz für EOS |
| --- | --- | --- |
| Meldepflichten | Artikel 14 gilt seit **11.09.2026** [S3] | Zuständigkeit und erreichbare Vertretung jetzt festlegen; Meldung und Triage üben. |
| Hauptpflichten | Anwendung ab **11.12.2027** [S1, S2] | Technische Unterlagen und Konformitätsverfahren vor dem jeweils relevanten Inverkehrbringen abschließen. |
| Bereits bereitgestellte Produkte | Übergangsregel und wesentliche Änderungen gesondert bewerten; Art.-14-Meldungen erfassen auch frühere Produkte [S2] | Feldtestanlagen mit Lieferdatum, Hardware und Softwarestand ins Inventar aufnehmen. „Feldtest“ ist keine pauschale Ausnahme. |
| Unterstützungszeitraum | An erwarteter Nutzungsdauer ausrichten, grundsätzlich mindestens fünf Jahre; kürzere Dauer nur bei entsprechend kürzerer erwarteter Nutzung [S1] | Für langlebige Energiesysteme die Laufzeit begründen; kein pauschales Fünfjahresversprechen ohne Produktentscheidung. |
| Verfügbarkeit der Sicherheitsupdates | Nach Bereitstellung mindestens zehn Jahre oder verbleibender Supportzeitraum, falls länger [S1] | Dauerhaftes, gesichertes Archiv und Wiederherstellung des Updatezugangs vorsehen. |

Die CRA-Einstufung ist **offen**, nicht automatisch „Standardprodukt“ oder „kritisch“. Maßgeblich sind Kernfunktion und Produktabgrenzung. Die Durchführungsverordnung (EU) 2025/2392 erläutert die Produktkategorien. Ein Energiecontroller wird nicht allein deshalb zum Betriebssystem oder Identitätsmanagementsystem, weil solche Funktionen eingebaut sind. Ein separat angebotenes Admin-/Sicherheitsprodukt mit privilegierter Zugriffsverwaltung als Kernfunktion erfordert aber eine eigene Prüfung. Je nach Einstufung ist Selbstbewertung möglich oder eine notifizierte Stelle nötig [S4, S5].

IEC-Ausrichtung ist keine automatische CRA-Konformitätsvermutung. Dafür sind der jeweilige harmonisierte Normverweis im EU-Amtsblatt, der abgedeckte Anforderungssatz und die tatsächliche Anwendung maßgeblich. Der aktuelle Standardisierungsauftrag M/606 und künftige Veröffentlichungen müssen bis zur Freigabe nachverfolgt werden. Diese Prüfung behauptet keinen verifizierten harmonisierten IEC-62443-Verweis für EOS [S6].

## 3. Lizenzierung: verbindliches Sicherheitsziel

Die folgenden Anforderungen sind eine technische Ableitung aus dem EOS-Bedrohungsmodell, keine Behauptung, dass der CRA genau dieses Lizenzformat verlangt.

1. **Signatur und Verschlüsselung trennen.** Nur der Hersteller-Keygen darf mit dem privaten Signierschlüssel Lizenzen ausstellen. Geräte und Adapter erhalten ausschließlich öffentliche Prüfschlüssel. Ein im Repository oder Endgerät hinterlegtes gemeinsames HMAC-Geheimnis wäre zum Erstellen eigener Lizenzen missbrauchbar. Ein unbekanntes Legacy-Keygenformat darf nicht ungeprüft als kompatibel bestätigt werden.
2. **UUID binden.** Die signierte Lizenz muss Produkt, Formatversion, System-UUID, Home/Pro, erlaubte Adapter/Funktionen, Grenzen, Lizenzkennung, Ausstellungszeit und gegebenenfalls Ablauf enthalten. UUID ist ein Identifikator, kein Verschlüsselungsgeheimnis. Kopier- und Manipulationsfälle müssen abgewiesen werden.
3. **Geschützte Ablage.** Lizenzdatei authentifiziert verschlüsseln, installationsindividuellen zufälligen Schlüssel verwenden und Dateirechte minimieren. Schlüssel getrennt von exportierten Lizenzdaten, öffentlichen Adapterobjekten, Logs und Webdateien aufbewahren. Ein Backup mit Schlüssel und Chiffrat benötigt eigenen Zugriffsschutz.
4. **Kein Rohschlüssel für Verbraucheradapter.** Adapter sollen über die lokale Admin-Schnittstelle eine prüfbare, zeitlich begrenzte Freigabe für genau ihren Adapter und die angeforderte Funktion beziehen. Niemals private Hersteller- oder Ablageschlüssel ausgeben. Ein frei beschreibbarer ioBroker-State `valid=true` ist keine vertrauenswürdige Freischaltung. Authentizität, Zielbindung, Frische und Wiederholschutz des tatsächlich gewählten Schnittstellenvertrags testen.
5. **Home/Pro im Backend.** Edition, Funktionsrechte, zulässige Anzahl und Rollen sind verschiedene Dinge. Eine Pro-Lizenz macht den angemeldeten Kunden nicht zum Administrator. Unbekannte Editionen oder fehlende Rechte dürfen nicht auf Pro zurückfallen. Neue Funktionsnamen standardmäßig ablehnen. Nutzungsgrenzen auch beim Anlegen weiterer Geräte und bei jeder relevanten Betriebsänderung prüfen.
6. **Ohne gültige Freigabe keine lizenzpflichtige Betriebsfunktion.** Das gilt beim Start und bei laufendem Betrieb, etwa nach Widerruf, Ablauf, UUID-Wechsel, ungültiger Antwort oder veralteter Berechtigung. Der konkrete sichere Übergang muss je Gerätefunktion definiert sein. Ein Lade-/Speichersystem darf durch Lizenzverlust keine Netzlimits, lokale Schutzfunktionen oder Abschaltpfade verlieren.
7. **Wartung erreichbar halten.** Lizenzimport, Diagnose, Sicherheitsupdates, Sicherung/Wiederherstellung und sichere Außerbetriebnahme benötigen einen administrativ geschützten Zugang auch bei ungültiger Lizenz. Kostenpflichtige Zusatzfunktionen und sicherheitsnotwendige Wartung separat behandeln; keine pauschale Fernabschaltung der Schutzregelung.
8. **Offline-Grenzen benennen.** Sofortiger globaler Widerruf, beweissichere Uhrzeit und Schutz gegen vollständiges Zurückspielen eines Gerätespeichers sind ohne zusätzliche Vertrauensquelle nicht vollständig erreichbar. Ablauf-/Rollbackstrategie und Wiederherstellungsverfahren dokumentieren.

**Schutzgrenze:** Verschlüsselung schützt eine entwendete Lizenzdatei ohne zugehörigen Schlüssel. Sie verhindert nicht zuverlässig das Auslesen durch root, einen kompromittierten Prozess mit denselben Rechten oder einen veränderten JavaScript-Adapter auf einem vollständig kontrollierten System. Stärkerer Schutz verlangt getrennte Dienstkonten/Prozesse, abgesicherte Updates und gegebenenfalls TPM/Hardware-Schlüsselspeicherung samt Boot-Vertrauenskette. Solche Maßnahmen müssen auf dem konkreten Endgerät nachgewiesen werden. Eine Zusage „niemand kann die Lizenz auslesen oder die Software ändern“ wäre falsch.

## 4. IEC-Zuordnung und benötigte Nachweise

Die Anforderungen hier sind EOS-Arbeitsziele. „Offen“ bedeutet fehlender ausreichender Nachweis, nicht zwingend nachgewiesene Ausnutzbarkeit.

| IEC-Bereich | EOS-Ziel | Benötigter prüfbarer Nachweis | Stand dieser Teilprüfung |
| --- | --- | --- | --- |
| 62443-4-1 – Sicherheitsanforderungen/Design | Versionierte Bedrohungsanalyse, Vertrauensgrenzen, sicherer Entwicklungsprozess | Anforderung → Befund → Änderung → Test → Release; Verantwortlichkeiten | Prozessvorgabe vorhanden; vollständiger Produktnachweis offen |
| 62443-4-1 – Pflege/Schwachstellen/Ende des Supports | Melde-, Patch-, Support- und Abkündigungsprozess | Bearbeitete Fälle, Fristen, Update-/Rückfalltest, Supportentscheidung | Herstellerprozess offen |
| 62443-4-2 – Identifikation/Authentifizierung | Benutzer- und Dienstidentitäten, sichere Anmeldung | Negative Rollen-/Sitzungstests, Abmeldung/Widerruf, Dienstidentitäten | Bestehende Rollenmatrix vorhanden; vollständige Abdeckung offen |
| 62443-4-2 – Nutzungskontrolle | Jede sensible Aktion serverseitig erlauben/ablehnen | HTTP-, Socket- und Adapterbus-Tests, insbesondere Objekt-/Statezugriff | Änderungen/Tests im Releasebericht nachlesen |
| 62443-4-2 – Integrität | Lizenzsignaturen, Eingabeprüfung, nachvollziehbare Softwareupdates | Manipulations-, Schema-, Versions-, Signatur- und Downgradetests | Lizenzstand gesondert geprüft; Updatekette als Gesamtsystem offen |
| 62443-4-2 – Vertraulichkeit | Geheimnisse nicht in Web, State, Logs oder offenen Backups | Rollenübergreifende Datenabflusstests, Dateirechte, Backupprüfung | Host-/Backupnachweise offen |
| 62443-4-2 – Datenfluss | Netzwerkzugriffe auf erforderliche Gegenstellen/Ports begrenzen | Portinventar, Firewallkonfiguration, VPN-/Segmentierungstest | Endgeräteinventar fehlt |
| 62443-4-2 – Ereignisbehandlung | Sicherheitsereignisse mit Zeit, Ergebnis und Rolle, ohne Geheimnisse | Auditlogs, Rotation, Lösch-/Datenschutzkonzept, Alarmierungsübung | Produktweiter Prozess offen |
| 62443-4-2 – Ressourcenverfügbarkeit | Größen-, Zeit- und Ratenlimits; definierter Fehlerzustand | Last-, Timeout-, Speicher-/Plattenfehler-, Wiederanlauftests | Reale Laufzeit-/Gerätetests offen |
| 62443-3-3 – Gesamtsystem | Zonen und Verbindungen zwischen Admin, ioBroker, Geräten, Service | Netzplan, Rechteplan, Ausfall-/Angriffsszenarien auf Zielhardware | Durch Adapterpaket nicht nachgewiesen |

Normumfang und sieben technische Grundbereiche: [S7–S9]. Eine endgültige Anforderungsmatrix muss die einschlägigen vollständigen Normtexte, gewählte Komponententypen und begründete Sicherheitsziele verwenden. ASVS-Level-2- und SSDF-orientierte Prüfungen sind ergänzende Entwicklungsziele; hier wurde keine vollständige ASVS- oder SSDF-Prüfung durchgeführt.

## 5. Offene Arbeiten mit eindeutigen Kennungen

Priorität P0 = vor entsprechendem Feld-/Serieneinsatz zwingend klären; P1 = vor Produktfreigabe schließen; P2 = geplante Verbesserung. „Verantwortlich“ bezeichnet die zu übernehmende Rolle, keine bereits erfolgte Zustimmung.

| Kennung / Priorität | Lücke und Auswirkung | Konkreter nächster Schritt / Abschlussbeleg | Verantwortlich |
| --- | --- | --- | --- |
| CRA-ADM-01 / P0 | Reale Adapter können Lizenzpflicht umgehen, solange ihre eigenen Ausführungspfade nicht umgestellt sind | Jeden eigenen Adapter mit gemeinsamen Prüfclient versehen; Start, Bus-/API-Aktionen, Timer und Schreibpfade negativ testen; vollständige Editionsmatrix | Adapterentwicklung |
| CRA-ADM-02 / P0 | Neuer separater NWL2-Keygen 1.0.0 implementiert; Austausch mit Admin/Client im lokalen Harness bestanden. Produktiver Vertrauensanker und reale Provisionierung fehlen | Herstellerschlüssel auf dem Herstellerrechner erzeugen, öffentlichen Fingerabdruck kontrolliert provisionieren, Home/Pro und Rotation am Zielsystem prüfen; keine produktiven Geheimnisse im Repository | Hersteller/Entwicklung |
| CRA-ADM-03 / P0 | Lizenzverlust während realer Regelung kann Verfügbarkeit/Netzgrenzen beeinträchtigen | Pro Gerät sicherer Betriebsübergang, lokale Grenzen und Wiederaufnahme festlegen; Labor-/Hausanlagentest mit dokumentierter Ausstattung | System-/Geräteentwicklung |
| CRA-ADM-04 / P0 | Meldeprozess muss seit 11.09.2026 funktionieren; tatsächliche Einrichtung nicht belegt | Sicherheitskontakt/Vertretung, SRP-Zugang und Fallregister einrichten; fristgebundene Trockenübung, keine ungeprüfte echte Meldung | Hersteller/PSIRT |
| CRA-ADM-05 / P1 | Gemeinsamer ioBroker-Benutzer begrenzt Schutz der Lizenzdatei vor fremden Adaptern | Rechte-/Prozessinventar; Drittadapter als Vertrauensdomäne bewerten; Separation oder dokumentierte Restgrenze auf Zielgerät prüfen | Plattformentwicklung |
| CRA-ADM-06 / P1 | Produktabgrenzung und Klasse offen | EOS-Endgerät, Adapter und Security-/Adminfunktionen nach Kernfunktion bewerten; begründete Klassifikation und Konformitätsweg verabschieden | Hersteller |
| CRA-ADM-07 / P1 | Komponenten-/Buildbestand nicht mit ausgeliefertem Gerät abgeglichen | OS, Node, js-controller, Adapter, Frontend-Bundles und Firmware inventarisieren; SBOM/Hashes aus realem Build, Advisories fachlich triagieren | Release/Plattform |
| CRA-ADM-08 / P1 | Support, Updateintegrität und Rückfall nicht für gesamten Produktzyklus belegt | Supportende begründen; signierte Update-/Freigabekette und kontrollierten Sicherheitsrückfall testen; Offlineupdate berücksichtigen | Hersteller/Release |
| CRA-ADM-09 / P1 | Sicherheitsprüfung deckt noch nicht alle Admin-Angriffsflächen ab | Login/Sitzung/CSRF, HTTP/Socket/Bus, Objekt-/Dateirechte, Paket-/Repositoryimport, Upload, XTerm/Exec, MCP und Proxy getrennt prüfen | Security/Entwicklung |
| CRA-ADM-10 / P1 | Vollständige IEC-/CRA-Evidenz, unabhängige Prüfung und Geräteintegration fehlen | Anforderungskatalog, reproduzierbarer Penetrationstest im getrennten Labor, Nachtests und produktbezogene Freigabe; keine Tests auf fremden Anlagen | Hersteller/Security |
| CRA-ADM-11 / P1 | Lizenzablauf, Backup-Restore, Schlüsselverlust und Zeitsprünge brauchen Produktentscheidungen | Recovery ohne Umgehung dokumentieren; Reset/Restore/UUID-Wechsel/Rollback testen; sichere Serviceauthentisierung | Plattform/Support |
| CRA-ADM-12 / P1 | Eingangsstand erlaubt `node >=18.0.0`; damit auch inzwischen nicht unterstützte Hauptlinien | Freigegebene aktuell unterstützte Node-LTS-Linien mit ioBroker/Adapterkompatibilität festlegen, Installationsprüfung und Regressionstests; Umsetzung im Lieferbericht festhalten | Plattform/Release |

Node 18 und 20 sind am Prüfdatum laut offizieller Releaseübersicht EOL; 22 und 24 werden als LTS geführt [S11]. Die Angabe in der Eingangskonfiguration ist ein Wartungsrisiko, kein Nachweis, dass das Nutzergerät tatsächlich eine EOL-Version ausführt. Der neue Lizenz-Keygen liegt als separates Herstellerrepository vor. Weitere NexoWatt-Adapter fehlen weiterhin; deren Umstellung kann hier nicht als erledigt erklärt werden.

## 6. Praktischer Meldeablauf

Bei einer Meldung zuerst Zeit der Kenntniserlangung, Produkt-/Versionsbezug, behaupteten Angriff, erreichbare Schnittstelle und vorhandene Belege erfassen. Ein Scannerfund allein ist noch keine nachgewiesen aktiv ausgenutzte Schwachstelle. Die Triage prüft unverzüglich die gesetzlichen Auslösekriterien und hält die Entscheidung fest.

Bei Meldepflicht: Frühwarnung binnen 24 Stunden, Hauptmeldung binnen 72 Stunden nach Kenntniserlangung. Für aktiv ausgenutzte Schwachstellen folgt der Abschlussbericht spätestens 14 Tage nach Verfügbarkeit der Abhilfe; für schwere Sicherheitsvorfälle binnen eines Monats nach der 72-Stunden-Meldung [S3]. Zuständige Personen müssen Zugänge, Vertretung und ein funktionierendes Verfahren besitzen. Die SRP ist seit 11.09.2026 verfügbar; diese Dokumentation registriert niemanden und führt keine Meldung aus [S10]. Betroffene Kunden müssen nach den einschlägigen Regeln über Auswirkungen und notwendige Abhilfe informiert werden.

## 7. Freigabeunterlagen und nächste Reihenfolge

Die technische Produktakte muss mindestens den beschriebenen Produktscope, Sicherheitsrisiken, angewandte Anforderungen/Lösungen, Entwicklungs-/Schwachstellenprozess und Prüfbelege zusammenführen [S1, S2]. Für EOS soll sie konkret enthalten:

- Konfigurations- und Komponentenregister, Hersteller-/Supportkontakt, bestimmte Nutzung und Grenzen;
- versioniertes Architektur-/Bedrohungsmodell einschließlich gleichberechtigter ioBroker-Prozesse, Updatequelle, Keygen, Lizenzablage und Geräteschnittstellen;
- SBOM des tatsächlichen Lieferstands und bewertetes Befundregister; keine bloße Paketnamensliste;
- Schnittstellenvertrag und Home-/Pro-Rechteübersicht, Hardware-UUID-/Migrations-/Wiederherstellungsverfahren;
- Berechtigungs-, Signatur-, Manipulations-, Ausfall- und Regressionsergebnisse mit Rohbelegen;
- sichere Installation, Netztrennung, Betrieb, Sicherung, Update, Rückfall und Löschung;
- dokumentierte Entscheidung über Supportzeitraum, Aufbewahrung und erreichbaren Schwachstellenkontakt;
- Freigabeentscheidung mit offenen Grenzen; Konformitätserklärung/CE erst nach tragfähiger abschließender Bewertung.

**Reihenfolge:** Nach dem bestandenen lokalen Keygen-/Admin-/Client-Austausch den Herstelleranker kontrolliert auf dem Zielsystem provisionieren; anschließend Verbraucheradapter einzeln umstellen und Home/Pro einschließlich Grenzen prüfen. Danach auf dem bezeichneten Testgerät Installation, Lizenzverlust, Neustart, Restore und sichere Geräteübergänge messen. Parallel Herstellerprozess, Produktinventar, Support und Klassifikation schließen. Erst nach Nachtests und produktspezifischer Entscheidung folgt eine Serienfreigabe.

## 8. Offizielle Quellen und Abrufgrenzen

Abrufdatum 30.09.2026. Die folgenden Quellen wurden über Webrecherche geprüft. EUR-Lex-Direktabrufe wurden teilweise durch eine JavaScript-/Botprüfung begrenzt; die benannten Regelungspassagen waren in amtlich indexierten EUR-Lex-Ergebnissen und den verlinkten Kommissionsseiten zugänglich. Eine vollständige konsolidierte juristische Prüfung sämtlicher Änderungsakte wird damit nicht behauptet. Der Download der Kommissionsleitlinie vom 27.07.2026 war im verwendeten Abruf nicht lesbar; ihr Volltext wird hier nicht als ausgewertet geführt.

| ID | Quelle / verwendeter Umfang |
| --- | --- |
| S1 | [Verordnung (EU) 2024/2847, insbesondere Art. 13, 14, 27, 32, 69, 71 und Anhänge](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32024R2847) – amtliche Fundstellen; Support und Updateverfügbarkeit anhand sichtbarer Art.-13-Passagen |
| S2 | [Kommission: CRA – Zusammenfassung](https://digital-strategy.ec.europa.eu/en/policies/cra-summary) und [Hersteller](https://digital-strategy.ec.europa.eu/en/policies/cra-manufacturers) – Scope, Hersteller, Unterlagen und Übergang |
| S3 | [Kommission: Meldepflichten](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting) – gültige Fristen, aktualisiert 11.09.2026 |
| S4 | [Kommission: Konformitätsbewertung](https://digital-strategy.ec.europa.eu/en/policies/cra-conformity-assessment) – Verfahrenswege, aktualisiert 31.07.2026 |
| S5 | [Durchführungsverordnung (EU) 2025/2392](https://eur-lex.europa.eu/legal-content/en/TXT/?uri=CELEX%3A32025R2392) – Kernfunktion und technische Produktbeschreibungen |
| S6 | [Kommission: Standardisierung](https://digital-strategy.ec.europa.eu/en/policies/cra-standardisation) – M/606 und Konformitätsvermutung, aktualisiert 31.07.2026 |
| S7 | [IEC 62443-4-1:2018](https://webstore.iec.ch/en/publication/33615) – offizieller Umfang des Entwicklungsprozesses |
| S8 | [IEC 62443-4-2:2019](https://webstore.iec.ch/en/publication/34421) – offizieller Komponenten-/Grundanforderungsumfang, Berichtigung 2022 berücksichtigt |
| S9 | [IEC 62443-3-3:2013](https://webstore.iec.ch/en/publication/7033) – offizieller Systemumfang |
| S10 | [ENISA: Single Reporting Platform](https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp) – Plattform, Zugangs- und Verfahrensmaterial |
| S11 | [Node.js: Releaseübersicht](https://nodejs.org/en/about/previous-releases) – Supportstatus der Node-Hauptlinien am Prüfdatum |

Erstellt als Bestandteil des beauftragten Repositoryumbaus. Keine Produktionseinrichtung, Meldung, externe Veröffentlichung oder unabhängige Zertifizierung wurde durch diese Teilprüfung vorgenommen.
