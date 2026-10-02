# CRA-/IEC-Geltungsbereich und aktuelle Sicherheitsgrundlagen

**Recherche- und Bearbeitungsstand: 30.09.2026.** Dieses Dokument ordnet die Installer-Härtung fachlich ein. Es ist keine Konformitätserklärung, Zertifizierung, vollständige Normprüfung oder Freigabe des EOS-Gesamtprodukts. Die Zuordnung der Maßnahmen ist eine technische Arbeitsableitung, kein Normzitat. Tatsächliche Implementierungs- und Testergebnisse stehen in den jeweiligen Änderungs- und Prüfberichten.

## Produktgrenze und Fristen

Der geprüfte Repository-Stand ist ein Installer-/Wartungs-Fork. Zum auszuliefernden EOS-Produkt gehören darüber hinaus Hardware, Betriebssystem, Node.js, Controller, Admin, eigene und freigegebene Drittadapter, Geräteschnittstellen sowie Installations- und Updatekonfiguration. Diese Produktgrenze muss festgelegt werden. Die Verwendung von Open Source oder ausschließlicher Lokalbetrieb beseitigt die Herstellerverantwortung nicht; ein kommerziell unter eigener Marke bereitgestelltes, mit Geräten verbundenes EOS-System fällt nach der beschriebenen Nutzung voraussichtlich in den CRA-Anwendungsbereich. Produktkategorie und Bewertungsverfahren sind anhand der tatsächlichen Kernfunktion festzulegen, nicht anhand des Namens „EOS“. [R1, R2]

Die Hauptpflichten der Verordnung (EU) 2024/2847 gelten ab **11.12.2027**. Die Hersteller-Meldepflichten nach Artikel 14 gelten bereits seit **11.09.2026**, auch für zuvor in Verkehr gebrachte Produkte. Ein Codebefund ist nicht automatisch eine aktiv ausgenutzte Schwachstelle. Ein entsprechender Meldeprozess muss vorhanden sein. [R1, R3]

Für aktiv ausgenutzte Schwachstellen und schwerwiegende Sicherheitsvorfälle gelten grundsätzlich Frühwarnung binnen 24 Stunden und Meldung binnen 72 Stunden nach Kenntnis. Der Abschlussbericht folgt bei Schwachstellen spätestens 14 Tage nach verfügbarer Abhilfe; bei Vorfällen binnen eines Monats nach der 72-Stunden-Meldung. Die Kommission nennt hierfür die ENISA Single Reporting Platform. [R3]

## Verifizierter Referenzstand

Ein älteres Publikationsjahr macht eine weiterhin maßgebliche Norm nicht automatisch veraltet. Umgekehrt darf eine neue Entwurfsfassung nicht als verabschiedete Norm ausgegeben werden. Die folgenden Angaben wurden auf offiziellen Seiten geprüft; eine Volltextbewertung aller IEC-Muss-Anforderungen wurde nicht durchgeführt.

| Referenz | Verifizierter Stand | Verwendung für EOS |
| --- | --- | --- |
| IEC 62443-4-1 | 2018, Edition 1.0, veröffentlicht 15.01.2018 [I1] | Sicherer Entwicklungs- und Wartungsprozess des Herstellers. |
| IEC 62443-4-2 | 2019, Edition 1.0, veröffentlicht 27.02.2019; Korrigendum August 2022 enthalten [I2] | Technische Anforderungen an die jeweils abgegrenzte Komponente. |
| IEC 62443-3-2 | 2020, Edition 1.0, veröffentlicht 24.06.2020 [I3] | Systemrisikoanalyse, Zonen, Kommunikationsverbindungen und begründete Ziel-Sicherheitslevel. |
| IEC 62443-3-3 | 2013, Edition 1.0, veröffentlicht 07.08.2013; Korrigendum April 2014 enthalten [I4] | Sicherheitsanforderungen des integrierten Systems. |
| IEC 62443-2-4 | 2023, Edition 2.0, veröffentlicht 15.12.2023 [I5] | Eigene Integration, Inbetriebnahme und Wartungsdienstleistungen. |
| IEC 62443-2-1 | 2024, Edition 2.0, veröffentlicht 07.08.2024 [I6] | Betreiberprozesse und geregelte Übergabe der Verantwortung. |
| NIST SSDF | SP 800-218, Version 1.1, Februar 2022, final [N1] | Ergänzende Struktur für sichere Entwicklung. |
| NIST SSDF 1.2 | SP 800-218 Rev. 1, **Initial Public Draft** vom 17.12.2025 [N2] | Beobachten und bewerten; nicht als finalen Standard ausgeben. |
| OWASP ASVS | 5.0.0, von OWASP als aktuelle stabile Version ausgewiesen [O1] | Versionsgebundene Prüfkriterien für Admin-/Webfunktionen; ersetzt keine Gesamtproduktprüfung. |
| TLS 1.3 | **RFC 9846, Juli 2026**, ersetzt RFC 8446 von August 2018 [T1, T2] | Aktuelle TLS-1.3-Spezifikation. Die Protokollversion bleibt 1.3; das Update ist rückwärtskompatibel. |
| TLS 1.0/1.1 | Durch RFC 8996, März 2021, als veraltet eingestuft [T3] | Nicht für neue EOS-Sicherheitsprofile zulassen. |
| BSI TR-02102-2 | Amtlich indexierter Stand **2025-01 vom 21.01.2025** [B1] | Ergänzende Kryptografieempfehlung; Aktualität vor Kryptografiefreigabe erneut bestätigen. |

**Abrufgrenze BSI:** Die offizielle Suchindex-Fassung belegt 2025-01. Der direkte Seiten-/PDF-Abruf scheiterte; eine Ausgabe 2026 wurde nicht verifiziert. Deshalb wird weder eine solche Ausgabe erfunden noch 2025-01 uneingeschränkt als neueste Ausgabe bezeichnet. Eine konkrete BSI-Konformität des TLS-Profils ist hier nicht festgestellt.

**IEC-/CRA-Grenze:** Die genannten IEC-Ausgaben sind keine automatisch nachgewiesenen harmonisierten EN-Fundstellen zum CRA. Für eine Konformitätsvermutung sind konkrete EN-Fassung, Amtsblattfundstelle, Einschränkungen und abgedeckte Anforderungen gesondert zu sichern. Ein Normungsauftrag allein belegt dies nicht. Die Kommission beschreibt laufende Normungsarbeiten unter M/606. [R4] Ein fester Security Level wird nicht vorgegeben: Ziel, Komponentenfähigkeit und tatsächlich erreichtes Niveau sind unterschiedliche Aussagen. [I2, I3, I4]

## Thematische Zuordnung der Härtung

Die folgende Tabelle beschreibt Anforderungen und Nachweise. Sie behauptet nicht, dass jede Maßnahme bereits implementiert oder für alle Adapter nachgewiesen ist. CRA-Zuordnungen beziehen sich thematisch auf Anhang I und die technische Dokumentation; exakte Einzelnachweise sind am vollständigen Rechtstext zu vervollständigen. [R1, R2]

| Maßnahme / Nachweis | CRA-Bezug | IEC-Bezug und Grenze |
| --- | --- | --- |
| Minimale Hostrechte; keine allgemeinen passwortlosen Root-Werkzeuge für den Laufzeitbenutzer; geschützter CLI-Einstieg; kontrollierte Migration | Zugangskontrolle und sichere Voreinstellungen [R2] | 4-2/3-3: Berechtigungen und Systemintegrität. Testen, dass ein kompromittierter Adapter keine privilegierte Wartung starten kann. |
| TLS je tatsächlichem Kanal mit geprüfter Gegenstellenidentität, geschützten Schlüsseln und Rotation; kein stiller Klartext-Rückfall | Kryptografischer Schutz entsprechend Risikoanalyse [R2] | 4-2/3-3: Identifikation, Integrität und Vertraulichkeit; 3-2: Kommunikationsverbindungen. HTTPS im Browser beweist keine verschlüsselte Adapterkommunikation. |
| Sichere Ersteinrichtung; individuelle Zugangsdaten; Netzwerkfreigabe erst nach belastbar abgeschlossener Einrichtung | Sichere Voreinstellungen und Zugangskontrolle [R2] | 4-1: Sicherheitsanforderung und Validierung; 4-2/3-3: Authentifizierung. Abbruch, Reload, Restore und Zertifikatsfehler prüfen. |
| SFTP-Zielschlüssel vorab über vertrauenswürdigen Weg binden und bei abweichendem Schlüssel abbrechen | Sichere Bereitstellung als Beitrag zu Produktintegrität [R2] | 4-1: sichere Lieferung; 4-2/3-3: Gegenstellenidentität und Integrität. Kein Ersatz für signierte, versionsgebundene Produktupdates. |
| Positive und negative Tests; Ergebnisse mit Codeversion, Konfiguration, Rohbelegen und offenen Gates dokumentieren | Risikobewertung, technische Dokumentation und Schwachstellenbehandlung [R1, R2] | 4-1: Verifikation, Fehler- und Patchbehandlung. Ein Mocktest ist kein Hardware-/Anlagentest. |

Für das neu zu prüfende EOS-Kommunikationsprofil ist TLS 1.3 mit aktivierter Zertifikats- und Namensprüfung das technische Ziel. Das ist eine Produktentscheidung, keine Behauptung, der CRA schreibe pauschal genau diese Protokollversion vor. Protokollbibliothek und tatsächlich ausgehandelte Verbindung sind zu prüfen. Gemeinsame Laufzeitidentitäten oder gemeinsame Schlüssel erlauben weiterhin Zugriffe kompromittierter Adapter innerhalb dieser Rechte; Verschlüsselung ersetzt keine Trennung und Autorisierung. Steuerbefehle benötigen zusätzlich eine anwendungsseitige Prüfung auf Berechtigung, Frische und Wiederholung. [T1; technische Ableitung]

## Noch erforderliche Produkt- und Anlagenprüfungen

1. **Freigegebener Lieferstand:** Hardware/OS, Controller, Admin, Node.js und jeder ausgelieferte Adapter einschließlich Abhängigkeiten, SBOM, Updatekanal und Supportzeitraum festlegen. Eigene EOS-Adapterquellen fehlen im geprüften Installer-Repository.
2. **Echte Kommunikationsmatrix:** Browser, Datenbanken, Controller, Adapter, Mehrhost-Verbindungen, Fernwartung und Feldgeräte erfassen; Authentifizierung, Berechtigungen und Schutz jeder Verbindung belegen. Loopback-Isolation nicht als Verschlüsselung bezeichnen.
3. **Inbetriebnahme und Migration auf Zielhardware:** Frischinstallation, Bestandsmigration, fehlgeschlagene Einrichtung, Neustart, Backup/Restore, Zertifikatswechsel/-ablauf und Wiederanlauf testen. Neben erwünschter Ablehnung auch Verfügbarkeit und Wiederherstellung nachweisen.
4. **Adapterrechte und Isolation:** Benötigte Geräte-/Netzrechte einzeln rechtfertigen; Schreib- und Befehlsrechte prüfen; Verhalten bei kompromittiertem Adapter, manipulierten Werten und Ressourcenerschöpfung testen.
5. **Anlagenverhalten:** Kommunikationsverlust, veraltete Messwerte, manipulierte Sollwerte, Update und Lizenzzustände gegen die konkreten Grenzen von Wechselrichter, Speicher und Ladepunkt prüfen. Den sicheren Zustand je Anlage begründen; weder universelle Abschaltung noch eingefrorener Sollwert ist pauschal sicher. Unabhängige Geräteschutzfunktionen dürfen nicht umgangen werden.
6. **Herstellerorganisation:** Schwachstellenannahme/-bewertung, Meldeentscheidung, koordinierte Offenlegung, reproduzierbare Releases, Patchverteilung, Rollback, Wiederherstellung und Lebensende nachweisen. Vor Produktfreigabe aktuelle Rechts-/Normstände und die vollständigen anwendbaren Normtexte abgleichen.

Dies ist eine offene Nachweisliste, keine ausgeführte Testliste. Cybersecurity-Prüfungen belegen zudem keine elektrische oder funktionale Sicherheit, EMV-/Funkkonformität oder Einhaltung konkreter Netzanschluss- und Anlagenregeln. Deren Anwendbarkeit und Prüfverfahren müssen für die tatsächliche Hardware und den zugesicherten Einsatzzweck separat bestimmt werden.

## Primärquellen

Alle Abrufe/Indexprüfungen: **30.09.2026**. Rechtsgrundlage ist [Verordnung (EU) 2024/2847](https://eur-lex.europa.eu/eli/reg/2024/2847/oj). Der Volltextabruf war durch eine Robotprüfung eingeschränkt; die folgenden Kommissionsseiten stützen die hier verwendete Einordnung. Sie ersetzen keine vollständige rechtliche Konformitätsbewertung.

- **R1:** Europäische Kommission, [CRA-Zusammenfassung](https://digital-strategy.ec.europa.eu/en/policies/cra-summary), Seitenstand 03.12.2025.
- **R2:** Europäische Kommission, [Herstellerpflichten](https://digital-strategy.ec.europa.eu/en/policies/cra-manufacturers), Seitenstand 14.08.2026.
- **R3:** Europäische Kommission, [Meldepflichten](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), Seitenstand 11.09.2026.
- **R4:** Europäische Kommission, [Normung](https://digital-strategy.ec.europa.eu/en/policies/cra-standardisation), Seitenstand 31.07.2026.
- **I1–I6:** IEC-Kataloge: [62443-4-1](https://webstore.iec.ch/en/publication/33615), [62443-4-2](https://webstore.iec.ch/en/publication/34421), [62443-3-2](https://webstore.iec.ch/en/publication/30727), [62443-3-3](https://webstore.iec.ch/en/publication/7033), [62443-2-4](https://webstore.iec.ch/en/publication/67631), [62443-2-1](https://webstore.iec.ch/en/publication/62883); Publikationsdaten siehe Tabelle.
- **N1:** NIST, [SP 800-218 / SSDF 1.1 final](https://csrc.nist.gov/pubs/sp/800/218/final), Februar 2022.
- **N2:** NIST, [SP 800-218 Rev. 1 / SSDF 1.2 Initial Public Draft](https://csrc.nist.gov/pubs/sp/800/218/r1/ipd), 17.12.2025.
- **O1:** OWASP, [ASVS-Projektseite](https://owasp.org/projects/asvs), stabile Version 5.0.0 laut Seiteninhalt am Abrufdatum.
- **T1:** RFC Editor, [RFC 9846](https://www.rfc-editor.org/info/rfc9846/), Juli 2026; insbesondere Abschnitt 1.2 zur Ablösung von RFC 8446.
- **T2:** RFC Editor, [RFC 8446](https://www.rfc-editor.org/info/rfc8446/), August 2018; am Abrufdatum als durch RFC 9846 ersetzt gekennzeichnet.
- **T3:** RFC Editor, [RFC 8996](https://www.rfc-editor.org/info/rfc8996/), März 2021.
- **B1:** BSI, [TR-02102-2-Downloadseite](https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102-2.html) und amtlich indexiertes [PDF 2025-01](https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102-2.pdf?__blob=publicationFile&v=11); datiert 21.01.2025, Abrufgrenze oben erläutert.
