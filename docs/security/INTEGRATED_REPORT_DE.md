# EOS 0.2.0-dev.2 – Änderungs- und Prüfbericht

Stand: 1. Oktober 2026. Diese Lieferung führt das konsolidierte NexoWatt-EOS-
Hauptrepository fort und ergänzt Produktmarke, reservierten Servicezugang sowie
persönliche Installateur-/Benutzerkonten. Sie enthält ein begrenztes Admin-/UI-
Laborprofil; physische Gerätefunktionen sind noch nicht zum Anlagenbetrieb
freigegeben. Dieser Bericht bescheinigt keine CRA-/IEC-Konformität,
Zertifizierung oder unabhängige Penetrationsprüfung.

## Änderungen und Wirkung

| Bereich | Umsetzung | Grenze |
| --- | --- | --- |
| Hauptsystem und Herkunft | `system/product.json` beschreibt EOS `0.2.0-dev.2`; Haupt-README und Architektur führen die zusammengelegten Komponenten. Historische ioBroker-Einführung separat mit Lizenzhinweisen erhalten. | Root-`package.json` bleibt technisches Installer-Paket; kein eigener Kernel und keine eigene JavaScript-Runtime. |
| Produktmarke | NexoWatt-Markierung in den Einstiegs-/Anmeldeflächen, vorhandene Wort-/Bildmarken und bereitgestelltes Favicon. | Technische ioBroker-Namen und Lizenz-/Copyrighttexte bleiben erhalten. Ein Logo ist kein Sicherheitsmerkmal. |
| Kontenprovisionierung | Rootgeschützte Kontendatei mit 2 bis 16 Konten, mindestens Installateur und Benutzer; individuelle Startpasswörter, getrennt vom gerätebezogenen Servicepasswort. | Lokale vertraute Einrichtung erforderlich; kein geheimnisloser Browser-Bootstrap. |
| Rollen | Admin ausschließlich NexoWatt Service; feste persönliche Gruppen mit ausgeschalteten generischen ACLs; serverseitige HTTP- und Socketgrenzen. | Keine Isolation gegen kompromittierten Adaptercode in derselben DB-/Dienstnutzer-Vertrauenszone. |
| Eigene Passwörter | Pflichtwechsel beim ersten Login; aktuelle Zugangsdaten erneut prüfen, enge Eingaben/Origin-/Headerprüfung, PBKDF2-SHA256 mit 600.000 Iterationen, Widerruf alter Sitzungen. | Keine MFA; KDF-Laufzeit unter Pi-/VM-Ziellast noch zu messen. |
| Admin-WebSocket | Hashgebundene Änderung des tatsächlichen `ws-server@4.5.1` auf 1 MiB entpackten Nachrichteneingang; geänderter Transport in der SBOM. | Kein pauschaler Schutz gegen Verbindungsfluten oder alle DoS-Szenarien; echter Frametestscope separat. |
| Mesh-/M2M-Grenze | Allgemeine Anmeldung schützt auch vorhandene Mesh-Endpunkte; anonyme Aufrufe werden mit HTTP 401 abgewiesen. | Unbeaufsichtigter Meshbetrieb bleibt gesperrt; keine eigene Maschinenidentität implementiert. Innere HMAC-/Bodylimit-Tests verwenden einen authentifizierten Testkontext. |
| Laufende Ereignisströme | SSE prüft aktuelle Sitzung und Rolle vor weiteren Nachrichten; abgemeldete oder abgelaufene Verbindungen werden geschlossen. | Nachricht und Berechtigungsprüfung bilden keine allgemeine atomare Datenbanktransaktion. |
| Browsercache | Geschützte HTML/API/JSON-Inhalte ohne Offline-Cache-Rückfall; alte EOS-Serviceworker-Caches entfernen. | Bereits gerenderter Fensterinhalt bleibt sichtbar; echte Browserinstallation/-aktualisierung gesondert abnehmen. |
| Nachweisführung | Neuer Quell-/Buildbezug, aktuelle Rollentests, Markenprüfung, Build-SBOM und STRIDE-Ergänzung. | Frühere Testergebnisse werden nicht auf die geänderten Dateien übertragen. |

Die vorhandenen UI-Gestaltungs- und Funktionsquellen bleiben erhalten. Der
aktuelle Testmodus blockiert physische Befehle auch mit gültiger Lizenz. Admin 7,
js-controller 7.2.2, TLS 1.3, zentrale Lizenzprüfung und die gesperrten dynamischen
Paket-/Hostbefehlswege bleiben Teil der Basis.

## Prüfstand und eindeutige Zuordnung

Aktueller maschinenlesbarer Index:
[`reports/integration/branding-roles/verification-summary.json`](../../reports/integration/branding-roles/verification-summary.json).
Er enthält die tatsächlich ausgeführten Befehle, Ergebnisse, Umgebung und
Quell-/Rohbelegbindung dieser Änderung. Prüfsummen dienen der Zuordnung und
ersetzen keine Release-Signatur. Für die Abnahme zählt der konkrete Lauf mit
seinem Artefaktbezug; die Existenz einer Testdatei ist kein Testergebnis.

### Tatsächlich ausgeführter Prozess- und Browserlauf r2

Der abschließende Paketkandidat **r2** hat den gemeinsamen Prozesslauf bestanden:
**14 benannte Stufen, 15 TAP-Ergebnisse einschließlich Parent, keine Fehler oder
übersprungenen Fälle**, Laufzeit rund 87,45 Sekunden. Der
[hashgebundene Bericht](../../reports/integration/branding-roles/ui-controller-summary.json)
nennt den Lock `b0db18741ac1aefbfb3ac15dfc74826aa551a84d327a6e0aae0be20178135ab6`
und die tatsächlich ausgeführten Programme. Der vorbereitende r1-Lauf bleibt
separat erhalten; der finale Befund stammt aus einem eigenen r2-Prozesslauf.

| Tatsächlicher Lauf | Beobachtetes Ergebnis | Geltungsbereich |
| --- | --- | --- |
| Controller, Admin, UI und zwei Redis-Dienste | Einrichtung, HTTPS-Anmeldung, persönliche Erst-/Folgepasswörter, Sitzungswiderruf zwischen beiden Ports, Rollen- und Lizenzgrenzen bestanden | Echte Prozesse im x86_64-Labor mit ausdrücklich gekennzeichneter OS-Schnittstellen-Fixture, UID 0; kein systemd-/Pi-Nachweis. |
| HeadlessChrome 153.0.8010.0 | Tatsächliche erste Passwortvergabe, persönliches Portal, Installateur-Dialoge und lizenziertes Cockpit geöffnet | Web-Sicherheitsfunktionen aktiv; Browser-Sandbox in der isolierten UID-0-Umgebung aus. Nur die beiden temporären Server-SPKI-Werte waren ausdrücklich zugelassen; Node-HTTPS-Prüfungen validierten zusätzlich CA, Namen und TLS 1.3. |
| Echter Admin-WebSocket | Nachricht mit 1.048.577 Bytes durch Close-Code 1009 abgewiesen, Admin danach weiter erreichbar | Nachweis dieses Grenzfalls; keine Last- oder Verbindungsflut-Abnahme. |
| r2-SBOM und Wiederholungsaufbau | Drei CycloneDX-Dateien schemageprüft; 465 installierte Paketmanifeste, unveränderter Lock, zwei lokale Archiv-SRIs und zehn transformierte Dateien übereinstimmend | Tatsächlicher r2-Baum mit drei bekannten eingebetteten Verzeichnissen; 46 passende Werkzeugtests bestanden. Keine vollständige OS-/Firmware-/Browserbundle-Inventur. |

Die ersten beiden r1-Versuche blieben als fehlgeschlagene Testversuche erhalten.
Korrigiert wurden zwei Erwartungen des Tests an den vorhandenen HTTP-Vertrag:
Explizite authentifizierte Bearer-Anfragen ohne Origin sind zulässig; widerrufene
Bearer-Tokens erhalten HTTP 401, während anonyme Navigation zum Login umleitet.
Der erfolgreiche dritte Lauf benutzt die korrigierten positiven und negativen
Fälle. Diese Vorgeschichte wird nicht als behobener Produktfehler dargestellt.

### Fehlgeschlagenes vollständiges UI-Prüfgate

**Der vollständige UI-Lauf `npm run test:all` für r2 ist fehlgeschlagen.**
Der unveränderte 99-Peer-Mesh-Timingtest meldete bei einem 250-ms-Takt in Runde 4
`stale_or_invalid_lease`. Der Rohbeleg steht in
[`test-all-final-r2.log`](../../components/ui/reports/security/roles-20261001/test-all-final-r2.log).
Die Ursache ist noch zu untersuchen; sie wird weder pauschal der Laborumgebung
zugeschrieben noch durch den erfolgreichen Rollen-/Browserlauf als erledigt
bewertet. Vorherige Gates dieses Laufs und separat bestandene nachgelagerte
Prüfungen ergeben keinen erfolgreichen vollständigen Gesamtlauf.

Genau eine separate Nachprüfung von `npm run test:mesh-coordinator` bestand:
792 Antworten, P95 92 ms, Maximum 121 ms. Dieser Einzelaufruf erfolgte im
geteilten Labor, ohne gelockerten Grenzwert; er klärt die Ursache des
fehlgeschlagenen vollständigen Laufs nicht. Das Gate
**`UI-MESH-PERF-20261001` bleibt offen**. Der
[abschließende UI-Komponentenbericht](../../components/ui/reports/security/roles-20261001/final-verification.json)
bindet beide Ergebnisse sowie die bestandenen 69 gezielten Komponentenfälle,
den TypeScript-Build und die finale Paketprüfung mit 402 Manifesteinträgen.
Einzelprüfungen werden nicht als erfolgreicher vollständiger Gesamtlauf addiert.
Unbeaufsichtigter Mesh-/M2M-Verkehr und physische Steuerung bleiben im gelieferten
Preview gesperrt; es liegt keine Produktfreigabe vor.

Der Änderungsumfang erfordert insbesondere:

- Validierung persönlicher Konten, reservierter Namen, Rollen, Geheimnisdateien
  und Passwortgrenzen sowie Erkennung von Konten-/ACL-/Markerabweichungen.
- Positive Anmeldung und eigene Erst-/Folgepasswortänderung; Ablehnung falscher
  aktueller Passwörter, fremder Zielkonten und unzulässiger Origins/Eingaben.
- Verweigerte Service-, Lizenz-, Update- und generische Socketzugriffe durch
  Installateur und Benutzer; zulässige begrenzte Installateurwege.
- Widerruf alter Admin-/UI-Sitzungen nach Konto-/Passwortänderung, neuer Login
  mit geändertem Passwort, erneute Berechtigungsprüfung laufender SSE-Verbindungen
  und fortbestehende physische Schreibsperre.
- Auslieferung der tatsächlichen NexoWatt-Markenbytes über beide HTTPS-Einstiege
  sowie Schutz vor Wiederausgabe privilegierter Offline-Cacheinhalte.
- Kompilierung, Komponentenregression, tatsächlicher gemeinsamer
  Controller-/Admin-/UI-Prozesslauf und SBOM-Bindung des daraus entstandenen Baums.

Die genauen Ergebnisse stehen im aktuellen Index und seinen Rohbelegen.
Geplante, nicht ausführbare oder fehlgeschlagene Fälle dürfen daraus nicht als
bestanden abgeleitet werden. Resultate werden nicht zu einer irreführenden Zahl
unabhängiger Sicherheitsanforderungen addiert; Parent-Tests und überlappende
Quell-/Buildfälle bleiben erkennbar.

Der frühere vollständige Bericht bleibt unter
[`SECURITY_REPORT_0.2.0-dev.1.md`](../history/SECURITY_REPORT_0.2.0-dev.1.md)
erhalten. Seine System-, Adapter-, Zertifikats- und R4-Prozessresultate sind
historische Evidenz. Der allgemeine Index `reports/integration/verification-summary.json`
und die dortigen Artefakthashes gehören zum Vorgängerstand, soweit sie nicht
explizit auf einen neuen Lauf verweisen.

Die vorhandene Ausführungsumgebung ist ein x86_64-Labor und keine installierte
Debian-12-/Raspberry-Pi-Anlage. Soweit der echte Prozessversuch eine ausdrücklich
gekennzeichnete OS-Schnittstellen-Fixture in einer wegwerfbaren, hashgebundenen
Kopie benutzt, ist diese Voraussetzung im Beleg auszuweisen. Ein solcher Lauf
belegt weder native Netzwerkerkennung noch unprivilegierten systemd-Zielbetrieb.
Die oben genannten Chromium-Browserwege wurden tatsächlich geprüft. Weitere
unterstützte Browser, Zertifikatseinrichtung und Serviceworker-Upgrade auf dem
Zielhost, Hardware und Gerätekommunikation bleiben getrennte Abnahmen.

## Architektur und Kommunikationsgrenzen

Die [Architektur](../architecture/INTEGRATED_SYSTEM.md) beschreibt Module,
Datenflüsse, Rechte, Updates und Vertrauensgrenzen. Die
[Marken-/Rollenanalyse](BRANDING_ROLES_DE.md) dokumentiert Einrichtungsdaten,
Schnittstellen und konkrete STRIDE-Szenarien für diese Änderung.

Objects und States verwenden TLS 1.3 mit CA-/Namensprüfung und getrennten
DB-Passwörtern. Controller und Adapter teilen weiterhin Dienstnutzer und
DB-Vertrauenszone. **Eine kryptografisch getrennte Identität und Autorisierung je
Adapter ist noch nicht umgesetzt.** Direkte Geräteprotokolle benötigen eine
eigene Bewertung; Modbus wird durch internes Redis-TLS nicht verschlüsselt.

Admin und UI verwenden IPv4-HTTPS auf 8081/8188. Bestehende Netze bleiben nutzbar,
sofern Betriebssystemrouten und Zugriffsschutz dies erlauben. Tailscale-Anmeldung,
Tailnet-Regeln und tatsächliche Fernwartung wurden damit nicht automatisch
eingerichtet; IPv6-Abnahme bleibt offen. Ein VPN ersetzt weder Anmeldung noch
Rollen oder Zertifikatsprüfung.

## SBOM, Abhängigkeiten und Herkunft

Der aktuelle installierte Admin-/UI-Baum wird separat unter
[`reports/integration/sbom/branding-roles/`](../../reports/integration/sbom/branding-roles/)
geführt. Maßgeblich sind dessen Build-Eingaben, genaue Lock-/Archivbindung,
Schema-/Coverageprüfung und Auditbelege. Quelleninventar, tatsächlich installierter
npm-Baum, bekannte eingebettete Pakete und spätere Geräteinventur bleiben
unterschiedliche Nachweisumfänge. Das Komponentenregister allein beweist keinen
installierten oder aktivierten Adapter. Eine Inventarlücke wurde geschlossen:
Neben `crypto-js` und der Lizenzclientkopie im Admin wird nun auch die tatsächlich
ausgelieferte Lizenzclientkopie in der UI mit eigenem Dateibaumhash und
UI-Abhängigkeitsverweis erfasst. Das sind drei eingebettete Paketverzeichnisse
mit zwei unterschiedlichen Paketidentitäten; es wurde dadurch kein zusätzlicher
Laufzeitcode installiert.

Die npm-Befunde des Vorgängers – drei moderate Paketknoten im Admin-/UI-Baum und
zwölf im separat bewerteten Gesamtbaum, darunter zwei kritische im inaktiven
Lieferumfang – bleiben historische Befunde. Sie gelten weder als neuer Auditlauf
noch allein durch diese Änderung als behoben. Die konkrete Erreichbarkeit und
Beseitigung relevanter Abhängigkeitsschwachstellen bleiben Freigabearbeiten.
Paketknoten sind keine Zahl unabhängiger CVEs.

OS-Pakete, Node-/Redis-Binaries, Firmware, native ARM64-Erweiterungen und vollständig
zugeordnete Browserbundle-Abhängigkeiten benötigen weitere Build-/Gerätenachweise.
Die npm-SBOM ist keine vollständige Betriebssystem-SBOM. Paketarchive und Lockdateien
unter `delivery/reproducible-roles-lab/` sind aktuelle Build-Eingaben, kein
signiertes Installationsbundle. Der ältere Ordner `delivery/reproducible-ui-lab/`
gehört zum Vorgänger und bleibt als historischer Lieferumfang erhalten.

## Verbleibende Freigabearbeiten

1. **UI-Gesamtprüfung:** Ursache des 99-Peer-/250-ms-Mesh-Timingfehlers bestimmen,
   erforderliche Korrektur nachweisen und das vollständige Pflichtgate erfolgreich
   abschließen. Der derzeit fehlgeschlagene Gesamtlauf ist kein bestandener Test.
2. **Zielhost und Browser:** frische Debian-12-VM, danach Raspberry Pi 5 mit SSD;
   echte Dienstkonten, Mounts, TLS-Vertrauen, weitere unterstützte Browser und Serviceworker-Update,
   Neustart, Stromausfall, Datenträgerdruck und Passwort-KDF unter Ziellast.
3. **Kontenbetrieb:** MFA, personenbezogene Servicezuordnung, sichere Übergabe,
   Rotation und abgenommene Wiederherstellung verlorener Servicezugänge.
   Dieser Stand verlangt einen frischen Enrollmentmarker Version 2;
   produktive Migration bestehender Konten ist nicht implementiert.
4. **Geräte und Erweiterungen:** sichere reale Geräteaktivierung und Failsafes;
   Zulassung zusätzlicher Adapter mit kontrollierter Profil-/Datenmigration.
   Das aktive Enrollment akzeptiert weiterhin genau Admin und UI. Unbeaufsichtigter
   Mesh-/M2M-Zugriff benötigt eine gesonderte Maschinenidentität; der neue
   HTTP-Anmeldeschutz antwortet auf anonyme Meshaufrufe mit 401.
5. **Backup und Isolation:** vollständige verschlüsselte Sicherung und geprüfter
   Restore; der Backup-Adapter bleibt gesperrt. Individuelle Adapteridentitäten
   und feinere DB-/Betriebssystemgrenzen sind noch zu entwickeln.
6. **Fernwartung und Zertifikate:** Tailscale-/IPv6-Abnahme, Zugriffsorganisation,
   Ablaufalarme, Rotation und Wiederherstellung nach Web-CA-Kompromittierung.
7. **Produktfreigabe:** relevante Abhängigkeitsbefunde schließen, konkrete
   anwendbare IEC-/ASVS-Kontrollen zuordnen, Support-/Patch-/Meldeprozesse und
   CRA-Produktklasse/Konformitätsverfahren klären, unabhängige Prüfung planen.

Die bisherige [CRA-Matrix](../cra/INTEGRATED_TEST_REQUIREMENTS.md), das
[STRIDE-Grundmodell](INTEGRATED_TEST_THREATS.md) und die neue Rollenbewertung
bilden zusammen die fortgeschriebene technische Dokumentation. Der alte
Anforderungsstand wird nicht durch Umbenennung als neu geprüft ausgegeben.
Es liegt keine pauschale Erfüllungs- oder Produktionsfreigabe vor.
