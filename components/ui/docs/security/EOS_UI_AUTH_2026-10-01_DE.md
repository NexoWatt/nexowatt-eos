# EOS UI: Zugriffsschutz und Sitzungswiderruf

Stand: 01.10.2026. Entwicklungsstand auf Basis des vom Nutzer gelieferten vollständigen UI-Repositorys 1.0.21. Keine Produktionsfreigabe und keine neue offizielle Stable-Version. Die Versionsfelder und historischen Stable-Dokumente bezeichnen die Ausgangsbasis; den abweichenden Quellstand identifizieren Git-Commit, Liefermanifest und SHA-256 des ZIPs.

## Auftrag und Vertrauensgrenzen

Die Kundenoberfläche und die technische Einrichtung müssen über bestehende EOS-Benutzer bedienbar bleiben, einschließlich Service über Tailscale. Netz-Erreichbarkeit ist keine Benutzerberechtigung: Es gibt keine neue LAN-IP-Freigabeliste, die Bind-Adresse bleibt unverändert (Standard `0.0.0.0`). Der vorhandene Anmeldedialog und die vorhandenen Kunden-, Installer- und Admin-Rollen bleiben die Bedienwege. Die grafischen Oberflächen und die EMS-Regelalgorithmen wurden nicht geändert.

Der Browser übergibt einen zufälligen Sitzungstoken; die UI prüft serverseitig das aktive ioBroker-Benutzerobjekt, die Passwortrevision und die aktuellen Rollen. Das Controller-Passwortverfahren bleibt maßgeblich. Der zusätzliche SHA-256-Wert im flüchtigen Sitzungsspeicher dient nur zum Erkennen einer Änderung des vorhandenen Passwort-Hashes; er ist kein neues Passwortspeicherverfahren. Revisionen erscheinen nicht in API-Antworten oder Logs.

## Implementierte Änderungen

| Anforderung | Umsetzung | Nachweis |
| --- | --- | --- |
| EOS-AUTH-01: keine anonymen Kundenbefehle | `requireAuth` verlangt aktuelle `frontend.open`-Berechtigung; auch alte `all`/`lan`-Policies und `auth.enabled=false`/`protectWrites=false` öffnen den Handler nicht | HTTP-Tests mit verweigerter und erfolgreicher Test-Datenpunktschreibung |
| EOS-AUTH-02: aktuelle Kontoberechtigungen | Benutzer muss existieren, Typ `user` und `common.enabled=true` besitzen; Passwortänderung sowie Änderung zugewiesener Rollen/Gruppen widerrufen die Sitzung beim nächsten geprüften Zugriff | Aktive Sitzung nach Gruppenentzug, Gruppendeaktivierung, Kontodeaktivierung, Löschung und Passwortänderung gesperrt |
| EOS-AUTH-03: Fehler verweigern Zugriff | Objektlesefehler und alte Sitzungen ohne Revisionsdaten werden abgewiesen; keine Rückkehr zum Auth-aus-Admin-Bypass | Datenbankfehler- und Altsitzungstests |
| EOS-AUTH-04: sichere Cookie-Verarbeitung | Maximal 8192 UTF-8-Bytes und 64 Einträge; kein Objekt-Prototyp; Kodierungsfehler, doppelte Namen und widersprüchliche Session-Aliase liefern keine Sitzung | Echte HTTP-Anfragen plus isolierter Parser-Test |
| EOS-AUTH-05: Lebenszyklus | Ablauf und Logout während laufender Prüfung bleiben wirksam; Passwortrevision vor/nach Gruppenlesung geprüft; TTL auf 5–120 Minuten begrenzt | Nebenläufigkeitstests; Sitzung bleibt nach Ablauf nicht nutzbar |
| EOS-AUTH-06: Login-Eingaben | String-Typen, Benutzername bis 256 UTF-8-Bytes, Passwort bis 4096 UTF-8-Bytes; kein implizites JSON-Casting; Passwortwechsel während Login erzeugt keinen Token | Typ-/Längen-, Passwortwechsel- und Rate-Limit-Tests |
| EOS-SERVICE-01: Service aus allen Netzen | Keine IP-Beschränkung im Auth-Gate; erfolgreicher Nachweis hängt von Rolle statt Adressbereich ab | Synthetische LAN-, öffentliche, Tailscale-IPv4- und Tailscale-IPv6-Adressen; kein echter Tunneltest |

Cookies `nw_session` und `installer_session` bleiben kompatibel, sofern beide bei gemeinsamer Übertragung denselben Wert tragen. Die Server-Antworten bleiben für die vorhandene UI verwendbar (`401` für fehlende Anmeldung, `403` für fehlende Berechtigung). Die öffentlichen Sicherheitsinformationen zeigen stets die wirksame Policy `session`.

Konfigurierte direkte Benutzerzuweisungen (`adminUsers`, `installerUsers`, `customerUsers`) bleiben eigenständige Rollenzuweisungen. Ein Gruppenentzug entfernt keine weiterhin explizit konfigurierte Benutzerrolle. Für einen vollständigen Entzug sind alle Zuweisungen zu entfernen oder das Benutzerkonto zu deaktivieren. Konfigurationsänderungen werden wie bisher beim Neustart der Adapterinstanz übernommen; dadurch gehen die flüchtigen Sitzungen verloren.

Ein ausdrücklich aktivierter Trusted-Header-Proxy bleibt eine getrennte, bestehende Authentifizierungsquelle. Ein korrektes Proxy-Secret mit Rollenassertion kann weiterhin autorisieren. Das ist weder mTLS noch durch den ioBroker-Gruppenwiderruf automatisch kontrolliert. Der Modus ist standardmäßig deaktiviert und muss im EOS-Gesamtsystem separat durchgesetzt/geprüft werden.

## STRIDE für diese Änderung

| Kategorie | Bedrohung | Maßnahme und verbleibende Grenze |
| --- | --- | --- |
| S – Identitätsvortäuschung | Offene Kundenbefehle, fingierte Cookies, alter Admin-Bypass | Echte Anmeldung und serverseitige Sitzungsdaten; Transportverschlüsselung bleibt ein separater offener Befund |
| T – Manipulation | Entzogene Rechte werden aus dem Sitzungs-Cache weiterverwendet | Aktuelle Konto-/Gruppenprüfung; neu berechnete Capabilities statt alter Wildcards |
| R – Abstreitbarkeit | Sicherheitsrelevante Änderungen sind nicht zuordenbar | Anforderungen, Quelländerungen und Testprotokolle dokumentiert; manipulationsgeschützte produktive Auditierung ist damit noch nicht umgesetzt |
| I – Offenlegung | Passwort-/Revisionswerte in Fehlern oder Statusantworten | Generische Loginfehler; keine Revisionen im API-Output; öffentliche Telemetrie und HTTP sind weiterhin gesondert zu bewerten |
| D – Dienstverweigerung | Ungültige Cookies werfen Decoderfehler; aufwendige Login-Eingaben | Begrenzte Cookies/Eingaben; kein Decoderwurf; bestehendes Login-Rate-Limit. Verteilte Last, hängende Controller-Aufrufe und unbeschränkte Gesamtgröße der Login-/Sitzungs-Maps sind nicht abschließend gelöst |
| E – Rechteausweitung | Alte Kunden-/Installer-Wildcards oder neue Gruppenrechte ohne erneute Anmeldung | Aktuelle Rolle und Revisionsbindung; Rechteänderung erfordert neue Anmeldung. Ein kompromittiertes Adapter-/Controller-Konto liegt außerhalb dieser HTTP-Sitzungsgrenze |

Benutzer- und Gruppenlesungen sind keine gemeinsame atomare Transaktion. Ein Befehl, der die Autorisierungsprüfung bereits erfolgreich passiert hat, wird bei einem anschließenden Entzug nicht rückwirkend zurückgenommen. Es wurden keine Verzögerungs- oder Lastgarantien für eine reale Anlage gemessen. Die automatische Regelung wird durch diesen HTTP-Sitzungsmechanismus nicht an eine Browser-Anmeldung gekoppelt.

## Abhängigkeiten

Der Ausgangsstand meldete im produktiven npm-Audit betroffene Pakete `express`, `body-parser` und `qs`; die Paketanzahl ist nicht mit drei unabhängig ausnutzbaren EOS-Lücken gleichzusetzen. Express wurde innerhalb der vorhandenen Hauptversion auf 4.22.3 aktualisiert, `body-parser` auf 1.20.8 und `qs` auf 6.16.0. Vorher-/Nachher-Audit, Lockdatei und CycloneDX-Inventare liegen im Nachweisordner. Die lokale Erreichbarkeit der gemeldeten Bibliotheksfehler aus EOS wurde nicht als Angriff auf eine Anlage erprobt.

Die direkten Runtime- und Entwicklungsabhängigkeiten sind auf die tatsächlich aufgelösten Versionen festgelegt. Weitere betroffene transitive Entwicklungsabhängigkeiten wurden innerhalb ihrer bestehenden Versionsbereiche aktualisiert. Die nicht in Quellen, npm-Prüfskripten oder den vorhandenen Tests verwendete Entwicklungsabhängigkeit `@iobroker/testing` wurde entfernt; damit entfällt auch ihre betroffene Mocha-/esbuild-register-Kette. Es wurde kein Testschritt gestrichen. Die vollständige Suite wird ohne dieses Paket ausgeführt. Die Laufzeit- und die vollständige Build-SBOM werden getrennt geliefert.

Primärquellen, abgerufen am 01.10.2026:

- [qs: GHSA-4mjr-xmp4-gh2g](https://github.com/ljharb/qs/security/advisories/GHSA-4mjr-xmp4-gh2g)
- [body-parser: GHSA-v422-hmwv-36x6](https://github.com/expressjs/body-parser/security/advisories/GHSA-v422-hmwv-36x6)
- Weitere vom npm-Audit gelieferte Referenzen sind unverändert im JSON-Protokoll enthalten. Ein fehlender Audit-Fund ist kein Nachweis allgemeiner Fehlerfreiheit.

## Migration und Service

1. Vor einer Testinstallation die vorhandene Konfiguration und das Benutzer-/Gruppenmodell sichern. Ein aktives EOS-Admin-Konto mit bekanntem individuellem Passwort muss für die Wiederherstellung erreichbar sein. Es werden keine Standardpasswörter oder neuen Benutzer angelegt.
2. Auf einem getrennten Testsystem den vollständigen Stand aufbauen. Bestehende Einstellungen `all`, `lan`, `enabled=false` und `protectWrites=false` werden zur Laufzeit eingeschränkt; die gespeicherten Konfigurationsobjekte werden dabei nicht eigenmächtig überschrieben.
3. Mit Kundenrolle einloggen und vorhandene Geräte bedienen; technische Konfiguration mit Installer und Lizenz-/Mailverwaltung mit Admin prüfen. Laufende Browser-Sitzungen gehen bei Adapterneustart verloren; bestehende Bedienautomationen ohne Sitzung müssen angepasst werden.
4. Den Servicezugang über das vorgesehene Tailnet mit berechtigtem Servicegerät und anschließendem EOS-Login testen. Erreichbarkeit des UI-Ports, Tailnet-Regeln und tatsächliche Zertifikats-/Transportkonfiguration sind Teil der Anlagenabnahme. Die UI setzt keine Tailnet-Regeln und installiert Tailscale nicht.
5. Gruppen-/Passwortentzug testen, laufende Regelung beobachten und RPi5/SSD-Neustart prüfen. Ein Rückfall auf 1.0.21 stellt auch dessen offene Schreibpolicy wieder her und ist keine Sicherheitslösung.

## Befundstatus und Freigabe

| Vorheriger Befund | Status dieses Entwicklungsstands |
| --- | --- |
| NW-UI-260930-02: anonyme Kunden-Schreibzugriffe | Code korrigiert; automatischer HTTP-Nachweis, Anlagenabnahme offen |
| NW-UI-260930-05: Rollenentzug ohne Sitzungswiderruf | Code korrigiert für UI-Sitzungen; explizite Benutzerrollen/Trusted-Header-Grenze beachten |
| NW-UI-260930-06: fehlerhafte Cookie-Kodierung | Parser korrigiert; HTTP- und Parser-Nachweis |
| NW-UI-260930-01: unverschlüsselter HTTP-Dienst | Offen; keine TLS-/Zertifikatsbereitstellung in dieser Änderung |
| NW-UI-260930-03: mitgelieferter HMAC-Lizenzschlüssel | Offen; zentrale asymmetrische Lizenzmigration erforderlich |
| NW-UI-260930-04: Lizenzdaten in native | Offen; mit Lizenz-/Admin-Migration gemeinsam behandeln |

Dieser Baustein liefert technische Nachweise für die EOS-Sicherheitsakte. Er bescheinigt weder CRA- noch IEC-Konformität. Vollständige interne Transportabsicherung, Prozessisolation, Gesamt-SBOM einschließlich Linux/Controller/aller Adapter, signierte Updates, Herstellerprozesse und Anwendungssicherheit der konkreten Energieanlage bleiben Freigabeaufgaben. Die Tests ersetzen keine IEC-Prüfung und keine RPi-/Feldabnahme.

Reproduzierbare Befehle: `npm ci --ignore-scripts`, `npm run build:ts`, `npm run test:eos-auth-security`, `npm run test:all`, `npm run docs:check`, `npm run publish:check`, `npm pack --dry-run --json --ignore-scripts`. Release-Artefakte werden nach bewusstem Build und Dokumentationspflege versiegelt; Prüfungen dürfen abweichende Dateien nicht selbst neu versiegeln. Die vollständige `prepublishOnly`-Kette wird im Overlay-Test nur gegen eine lokale Testregistry ausgeführt. Es findet keine Veröffentlichung statt.

Verbindliche Ergebnisse und Grenzen dieses Laufs: `reports/security/auth-20261001/verification-summary.json` und die dort referenzierten unveränderten Protokolle. Die CycloneDX-Dateien beschreiben ausschließlich das UI-npm-Projekt, nicht das gesamte EOS-Gerät.
