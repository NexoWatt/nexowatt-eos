# NexoWatt EOS: Produktkennzeichnung und Herkunft

Stand: 01.10.2026. Änderungsbereich: Weboberflächen von EOS Admin und NexoWatt UI.
Diese Kennzeichnung ist Teil des gemeinsamen EOS-Hauptsystems auf ioBroker-Basis;
sie verändert weder Paketkennungen noch die Rechte oder Gerätefunktionen.

## Umsetzung

- Das vom Nutzer gelieferte `favicon.ico` wird bytegleich in den Admin-Quell-,
  Laufzeit- und Kompatibilitätspfaden sowie in der UI ausgeliefert. SHA-256:
  `c837651adbc7a00a044c4804c7140af99d3efdf54b0f4a97edf359e7b75593e1`.
  Die Datei enthält tatsächlich 16, 32, 48 und 64 Pixel große Bilder; der
  Admin-Manifest-Eintrag gibt genau diese Größen an.
- Das verbliebene blaue ioBroker-Zahnrad in
  `components/admin/src-admin/public/img/admin.png` ist durch das bereits
  vorhandene NexoWatt-Symbol ersetzt. Quell- und ausgelieferte Dateien stimmen
  überein. Hochauflösende vorhandene NexoWatt-PNGs und die Wortmarke bleiben
  erhalten; das kleine ICO wird nicht künstlich hochgerechnet.
- Alle 20 statischen UI-HTML-Seiten wählen genau ein lokales EOS-Favicon.
  Widersprüchliche, eingebettete alte Favicon-Kopien wurden entfernt. Die
  Versionskennung in den Asset-URLs verhindert die Weiterverwendung alter
  Browser-Cache-Einträge für die geänderten Ressourcen.
- Die bestehenden Anmelde- und Navigationslayouts bleiben erhalten. Der
  Produktuntertitel und die deaktivierte Anmeldeschaltfläche haben auf dem
  dunklen Hintergrund lesbare Farben. Die Schaltfläche bleibt deaktiviert.
- Der vorhandene DOM-Branding-Code übersetzt ausschließlich bekannte vollständige
  Produktlabels. Er ersetzt keine beliebigen Teilzeichenfolgen mehr. Code,
  Protokollausgaben und mit `data-eos-preserve-attribution` gekennzeichnete
  Herkunftsnachweise bleiben unverändert. Paket- und Protokollnamen wie
  `iobroker.eos-admin` werden nicht umbenannt.
- Frühere fehlerhafte Übersetzungen von `ioBroker GmbH` und `ioBroker.net`
  wurden in allen elf Quellsprachen berichtigt. Der bestehende ausgelieferte
  Übersetzungstext enthielt die korrekten Originalnamen bereits; die neue
  DOM-Begrenzung bewahrt diese. Das aktiviert keine Datenübermittlung und keine
  Cloud-Anbindung. Der Produkt-Supportlink verweist auf `NexoWatt/EOS/issues`.

## Rollenportal und persönliche Passwörter

Die vollständige Admin-Konsole bleibt dem Service vorbehalten. Ihre React-
Initialisierung benötigt rohe Controller-Objekte, die unter anderem native
Konfiguration enthalten können. Für Installateur und Benutzer wird diese
Konsole deshalb nicht gestartet. Nach erfolgreicher Kontextprüfung und dem
gegebenenfalls verlangten Passwortwechsel öffnet sich ein EOS-Portal:

- Beide Rollen erreichen das Cockpit über HTTPS auf demselben Host, Port 8188,
  sowie den eigenen Passwortdialog und die Abmeldung.
- Installateure können weiterhin die vorhandenen HTTP-Dialoge für sichere
  Basis-Einstellungen und die Verwaltung von Benutzerzugängen öffnen. Deren
  bestehende serverseitige Berechtigungsprüfung bleibt wirksam.
- Auch der Service erhält in der Admin-Werkzeugleiste einen Link zum eigenen
  Passwortdialog unter `index.html?eosPassword=1`. Der Dialog verwendet
  `POST /nexowatt/account/password`, den vorgesehenen CSRF-Header und einen
  Nachweis des aktuellen Passworts. Er verwendet keinen Roh-Socket-Schreibweg.

Die Anmeldung im Cockpit erfolgt mit demselben persönlichen Konto, aber einer
eigenen Sitzung. Eine gemeinsame SSO-Sitzung wird hier nicht behauptet. Das
Portal ist kein vollständiger Installationsassistent. Die gesperrten physischen
Steuerungen des Testprofils werden dadurch nicht freigegeben.

Die Frontend-Prüfung für neue persönliche Passwörter entspricht dem aktuellen
Vertrag: 15 bis 128 Unicode-Codepunkte, höchstens 256 UTF-8-Bytes, keine
Steuerzeichen und ein anderes Passwort als das bisherige. Es wird keine
Mischung aus Groß-/Kleinbuchstaben, Ziffern und Sonderzeichen erzwungen. Die
Serverprüfung bleibt ausschlaggebend. Der in diesem Profil gesperrte frühere
Passwortlos-Claim-Code ist kein zulässiger Ersteinrichtungsweg.

Eine Browserprüfung deckte einen weiteren Bestandsfehler auf: Der alte
Scroll-/Cleanup-Code entfernte sämtliche `.eos-first-login-overlay`-Elemente
und damit auch einen aktuellen Pflichtpasswortdialog. Aktuelle Passwort- und
Kontextprüfungsansichten tragen nun `data-eos-auth-boundary` und werden vom
Cleanup erhalten. Das Rollenportal bleibt ebenfalls erhalten. Bei nicht
verfügbarem Sicherheitskontext wird die gesperrte Wiederholungsansicht
angezeigt, keine leere oder ungeschützte Admin-Konsole.

## Bedrohungen und Grenzen

| STRIDE-Bezug | Risiko | Maßnahme und Nachweis |
| --- | --- | --- |
| Spoofing | Falsches oder altes Symbol erschwert die Zuordnung der lokalen Oberfläche. | Lokale Dateien, feste Asset-URLs und Vergleich mit dem gelieferten Datei-Hash; Browserprüfung der geladenen Logos. Ein Logo ist kein kryptografischer Identitätsnachweis. |
| Tampering / Repudiation | Globale Marken-Ersetzung verfälscht technische Diagnosen oder Urheber-/Dienstanbieterangaben. | Nur vollständige bekannte Produktlabels; echte Browser-DOM-Negativtests für Paketnamen, verschachtelten Code und Herkunftshinweise. |
| Information Disclosure | Extern nachgeladenes Logo erzeugt unbeabsichtigte Anfragen. | Diese Änderung verwendet ausschließlich lokale vorhandene oder gelieferte Dateien. In der Browser-Fixture sind externe Requests blockiert. |
| Elevation of Privilege | Sichtbar andere Marke wird mit wirksamer Zugriffstrennung verwechselt. | Branding verändert keine Autorisierung; Service-, Installateur- und Benutzerrechte sind getrennt serverseitig zu prüfen. |
| Information Disclosure | Initialisierung der Admin-Konsole könnte für die Darstellung rohe Objekte und Geheimnisse anfordern. | Nicht-Service-Rollen starten ein HTTP-Portal und nur zweckgebundene Dialoge. Backend-Socketgrenzen werden nicht gelockert. |
| Denial of Service | Historischer DOM-Cleanup entfernt einen verpflichtenden Passwortdialog. | Aktuelle Authentifizierungsansichten sind ausdrücklich vom Cleanup ausgenommen; realer Browser prüft Passwortpflicht und Kontextfehler. |

Upstream-Lizenzen, Drittanbieterhinweise, reale Paketnamen, externe Dienstnamen und
Diagnosedaten dürfen weiterhin ioBroker nennen. Das ist beabsichtigte korrekte
Herkunftskennzeichnung. Fremdadapter können eigene Herstellerlogos mitbringen;
ihre spätere Freigabe und Oberflächenprüfung bleibt ein gesonderter Schritt.

## Tatsächlich geprüft

`tests/integration/branding.test.cjs` prüft vier Gruppen statischer Verträge:
geliefertes ICO, Quellen-/Laufzeitspiegel und Manifest, alle statischen UI-Seiten,
korrekte Herkunfts- und Supportangaben. Die vorhandenen Admin-Prüfungen für
Branding, Login-Layout, ESM-Syntax und den Importgraphen werden zusätzlich
ausgeführt. Rohbelege und Dateihashes liegen unter
`reports/integration/branding/`.

`tests/integration/branding-browser.cjs` lädt die tatsächlich ausgelieferte
Admin-Oberfläche in Chromium 153 bei 1280 und 390 Pixeln. Es handelt sich um
eine lokale HTTP-Fixture mit serverseitigen HTML-Platzhaltern, ohne Controller,
echte Konten oder Geräte. Die Prüfung kontrolliert das sichtbare Login,
geladene Logos, dynamische Produktlabels und unveränderte technische/rechtliche
DOM-Inhalte. Screenshots wurden visuell geprüft. Sie belegen weder erfolgreiche
Anmeldung noch Rechte- oder TLS-Durchsetzung. Solche Nachweise gehören in den
separaten Controller-Integrationstest.

Die erweiterte Browserprüfung kontrolliert beide Rollenportale, die bedienbaren
Installateurdialoge, die geschützte Reihenfolge der Ersteinrichtung, den eigenen
Service-Passwortdialog und einen fehlgeschlagenen Sicherheitskontext. Eine lange
Passphrase ohne Kompositionsvorgabe erreicht den richtigen HTTP-Endpunkt mit
dem richtigen Header. HTTP-Antworten und Rollen sind in diesem Test Fixtures.

Zusätzlich wurden neun bestehende gezielte Admin-Prüfungen erfolgreich ausgeführt.
Der ebenfalls aufgerufene historische `nexowatt-first-login-selftest.cjs`
forderte dagegen ausdrücklich alte gemeinsame Startpasswörter, automatisch
zugeordnete Standardkonten und Kompositionsregeln und schlug fehl. Sein exakter
Text liegt jetzt unter
`components/admin/docs/security/historical/nexowatt-first-login-selftest.pre-roles-20261001.cjs.txt`;
der Fehler-Rohbeleg bleibt erhalten. Der aktuelle gleichnamige Prüfeinstieg führt
stattdessen die Verhaltenstests `test/eos-roles-account.test.cjs` aus. Die alten
Anforderungen werden damit nicht nachträglich als bestanden ausgegeben.

Beispiel zur Wiederholung mit extern bereitgestelltem Browser-Testwerkzeug:

```sh
node --test --test-reporter=tap tests/integration/branding.test.cjs
node components/admin/tools/nexowatt-branding-selftest.cjs
node components/admin/tools/nexowatt-login-layout-selftest.cjs
node components/admin/tools/nexowatt-esm-syntax-selftest.cjs
node components/admin/tools/nexowatt-frontend-graph-check.cjs
EOS_BROWSER_PUPPETEER=/absolute/path/to/puppeteer EOS_BROWSER_EXECUTABLE=/absolute/path/to/chromium node tests/integration/branding-browser.cjs
```

Alternativ kann `EOS_BROWSER_CHROMIUM_MODULE` auf das ESM-Einstiegsmodul einer
isoliert installierten `@sparticuz/chromium`-Testumgebung zeigen. Dieses Werkzeug
ist keine neue Produktabhängigkeit. Der Browser lief im Container ohne
Browser-Sandbox; das ist keine Änderung der Produktkonfiguration. Frühere
Startversuche scheiterten an einem veralteten Browserpfad beziehungsweise einer
temporären Font-Extraktion; nach Bereitstellung derselben lokalen Testwerkzeuge
bestand der dokumentierte Lauf.

Vor einer Auslieferung müssen die geänderten Admin-Artefakte im gemeinsamen
Freigabeprozess neu an die Prüfnachweise gebunden werden. Ein gültiger alter
Prebuilt-Hash ist kein Beleg für diese Änderung. Die neue Laufzeit-SBOM und die
Integritätsmanifeste gehören zum Gesamtlieferstand. Hardwareprüfung sowie
CRA-/IEC-Konformitätsbewertung werden durch diese Oberflächenprüfung nicht
ersetzt.
