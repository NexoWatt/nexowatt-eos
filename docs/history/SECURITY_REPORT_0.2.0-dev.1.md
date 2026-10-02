> Historischer Bericht der Lieferung `0.2.0-dev.1`. Die folgenden Ergebnisse
> gelten für den dort genannten Quell- und Buildstand, nicht automatisch für
> `0.2.0-dev.2`. Die damals verwendeten Artefakthashes stehen in den zugehörigen
> maschinenlesbaren Nachweisen.

# EOS 0.2.0-dev.1 – Änderungs- und Prüfbericht

Stand: 1. Oktober 2026. Produktverantwortung: NexoWatt/Hersteller. Diese Lieferung
ist ein vollständiger Entwicklungsquellstand mit einem begrenzten Admin-/UI-
Laborprofil. Sie enthält noch kein freigegebenes Anlagenprodukt. Die technischen
Maßnahmen unterstützen die CRA-Nachweisführung; dieser Bericht bescheinigt keine
CRA-/IEC-Konformität, Zertifizierung oder unabhängige Penetrationsprüfung.

## Was umgesetzt wurde

| Bereich | Änderung und Sicherheitswirkung |
| --- | --- |
| Controller 7.2.2 | Unveränderliches EOS-Profil; Paket-, CLI-, Hostbefehls- und Node-Startgrenzen; automatische sudo/setcap-Rechteausweitung entfernt. |
| Admin 7.10.11 | TLS 1.3, feste geschützte Schlüsselpfade, serverseitige Paket-/Shellsperren, PBKDF2-SHA256 mit 600.000 Iterationen für neue/geänderte Passwörter, gewartete OAuth-Abhängigkeit, korrigierte reale Gruppenansicht und entfernte Telemetrie-Plugin-Deklaration. |
| UI 1.0.21 | HTTPS und Anmeldung; zentraler Lizenzclient; lokaler gemeinsamer HMAC-Lizenzpfad entfernt; Testprofil sperrt physische Befehle und EMS-Aktivierung. |
| Ersteinrichtung | Lokaler Root-Einstieg mit geschützten Eingabedateien; frische DB-Policy, individuelle Zugangsdaten, genau zwei Adapter, feste Upload-Unit; tatsächliche HTTPS-Bereitschaft statt allein Alive-State. |
| Wartung | Dauerhafte Startsperre, kurzlebige an einen lebenden Prozess gebundene Ausnahme, Rollback und Aufräumen auch bei I/O-Fehlern. |
| Zertifikate | Getrennte HTTPS-Schlüssel; Ablaufprüfung; journalgestützte Redis-CA-/Webblatt-Erneuerung mit Rückfall-/Wiederaufnahmeverfahren. |
| Devices | Begrenzte verifizierte HTTPS-Abrufe; CAN-Aufrufe mit festen Programmen und validierten Argumenten. |
| EEBUS | Zertifikatsgebundene Peeridentität, Vertrauens-/Protokollprüfung, begrenzte Sitzungen und Fristen, korrigierte verzögerte Verbindungsbereinigung. |
| OCPP21 | TLS 1.3 und Clientzertifikate; Stations-ID an DNS-SAN gebunden, keine Klartextfreigabe. |
| Lieferkette | Exakte Labor-Lockdatei, Archivintegrität, deaktivierte npm-Lifecycle-Skripte, Controllertransformation, CycloneDX-SBOM und Dateinachweise. |

Vollständige Quellen aller sechs Komponenten sind enthalten. Die UI-Funktions-
und Gestaltungsquellen bleiben erhalten; der Sperrhinweis und Lizenz-/Anmeldepfad
sind angepasst. Das bedeutet nicht, dass sämtliche Gerätefunktionen in diesem
Lieferstand bereits ausführbar oder abgenommen sind.

## Architektur und Kommunikationsgrenzen

Die [Architekturdokumentation](../architecture/INTEGRATED_SYSTEM.md) beschreibt
Module, Datenflüsse, Rechte, Updates und Vertrauensgrenzen. EOS baut auf Linux,
Node.js und ioBroker auf; ein eigener Kernel oder eine eigene Runtime wurde
nicht entwickelt.

Die Objects-/States-Verbindungen verwenden TLS 1.3 mit CA-/Namensprüfung und
individuellen DB-Passwörtern. Adapter und Controller teilen derzeit weiterhin
Dienstnutzer und DB-Vertrauenszone. **Eine kryptografisch getrennte Identität und
Autorisierung je Adapter ist damit noch nicht umgesetzt.** Auch direkte lokale
Kanäle und jedes Geräteprotokoll brauchen eine eigene Bewertung. Modbus wird
nicht durch die interne Redis-Verschlüsselung abgesichert.

Admin und UI hören derzeit auf IPv4 `0.0.0.0`, HTTPS 8081/8188. Vorhandene Netze
werden nicht pauschal gesperrt. Tailscale-Anmeldung, Tailnet-Rechte, konkrete
Routen und tatsächliche Fernwartung wurden hier nicht eingerichtet oder
abgenommen; IPv6-Erreichbarkeit bleibt offen.

## Nachgewiesene Prüfungen

Die maschinenlesbare Zusammenfassung mit Befehlen, Umgebung und Rohbeleg-Hashes
steht in [verification-summary.json](../../reports/integration/verification-summary.json).
Prüfsummen dienen der Zuordnung und ersetzen keine Release-Signatur.

| Lauf | Ergebnis | Aussagegrenze |
| --- | --- | --- |
| Systemtests | 224 bestanden, 0 Fehler/Skip | Dateien, Parser, echte lokale Kryptografie/TLS sowie simulierte Host-Servicebefehle; keine Debian-systemd-Abnahme. |
| Neue Integrationsbausteine | 79 bestanden, 0 Fehler/Skip | Buildgrenzen, Enrollment, Startsperre, HTTPS-Bereitschaft, Zertifikate. |
| Bestehende Sicherheitsregression | 41 bestanden, 0 Fehler/Skip | Vorhandene CLI-/Host-/Policygrenzen. |
| Admin nach Vertragskorrektur | 31 Quell-, 41 Build-/Socket-/OAuth- und 40 Grenzfallprüfungen bestanden | Quellfälle überlappen Buildfälle; OAuth-Parent zählt mit. Frühere Regressionsläufe bleiben als vorherige Stände kenntlich. |
| UI | 43 bestandene Komponentenprüfungen nach Erststartkorrektur | Quell-/HTTP-/Lizenz-/Schreibgrenzen; Gesamtprozess separat. |
| Devices | 270 bestandene Prüfungen | Komponentensuite, keine realen Geräte. |
| EEBUS | 21 bestandene Protokoll-/Ressourcenprüfungen | 16 Frame-/PIN-Fälle und 5 Ressourcenfälle, darunter lokale TLS/WebSocket-Prüfung; keine vollständige SHIP/SPINE-Konformität. |
| OCPP | 25 Kernprüfungen; TLS/mTLS-Lauf mit 11 Verhaltensfällen und 2 Parent-Tests | Lokale Protokoll-/Zertifikatsprüfung, keine Wallboxabnahme. |
| Zertifikatsrotation | 58 gezielte Prüfungen und 1 echter Redis/AOF-Integrationstest | 44 Fälle überlappen die Systemtests, 14 den neuen Integrationslauf; Zielhost-Servicebetrieb offen. |
| Backup-Kryptografie | 6 TAP-Ergebnisse einschließlich Parent | Machbarkeitsprüfung des CMS-Containers; kein fertiges Backup-/Restore-Werkzeug. |
| Gemeinsamer Controller-/Admin-/UI-Prozesslauf | 7 Stufen bestanden, 8 TAP-Ergebnisse einschließlich Parent | Echte Redis-/Controller-/HTTPS-/OAuth-/Lizenzabläufe; ausdrücklich mit OS-Schnittstellen-Fixture und UID 0. |

Ergebnisse werden nicht zu einer irreführenden Gesamtzahl unabhängiger
Sicherheitsanforderungen addiert. Frühere fehlgeschlagene Versuche bleiben
sichtbar. Dazu gehören ein UI-Erststartfehler, ein Namespacethema der
Prozesskennung, ursprüngliche EEBUS-Übergangsfehler und Abweichungen bei
Testabhängigkeiten. Ein grüner Wiederholungslauf überschreibt diese Historie
nicht.

Der echte Controller-/Admin-/UI-Prozessversuch ist für Kandidat r4 bestanden:
Einrichtung, Upload, gemeinsamer Start, tatsächliche Root-Bereitschaftsprüfung,
Anmeldung, zentrale Lizenzaktivierung mit Grenzwerten, Sperre physischer Befehle
und Lizenzwiderruf. Der Rohbeleg und die exakt geprüfte Lockdatei sind in der
maschinenlesbaren Zusammenfassung gebunden.
Die Ausführungsumgebung verweigert `os.networkInterfaces()`. Ein ausdrücklich
gekennzeichneter Ersatz der Betriebssystem-Netzwerkschnittstellen in einer
hashgebundenen, wegwerfbaren Testkopie ermöglicht die Prüfung der darüberliegenden
Abläufe. Das Originalpaket bleibt unverändert. Solche Ergebnisse gelten nur
für dieses Labor mit Schnittstellen-Fixture und UID 0; sie sind keine native
Netzwerk-, Dienstnutzer- oder Hardwareabnahme.

## SBOM, Abhängigkeiten und Provenienz

Die [SBOM-Werkzeuge](../../tools/integration/README.md) unterscheiden Quell-/
Lockinventar, tatsächlich installierten npm-Baum und spätere Geräteinventur.
CycloneDX-JSON wird gegen mitgelieferte Schemas geprüft. Eingebettete bekannte
Bibliotheken werden zusätzlich erfasst; unbekannte Browserbundle-Inhalte werden
nicht aus einer Frontend-Lockdatei als bewiesen ausgegeben.

Für den Admin-/UI-Laborbaum sind 465 npm-Paketverzeichnisse beziehungsweise 425
unterschiedliche npm-Komponenten plus zwei eingebettete Pakete erfasst. Der
zugehörige Auditstand meldet drei moderate Paketknoten der esbuild-Kette.
Der separat bewertete Alle-Komponenten-Baum meldet zwölf Paketknoten, darunter
zwei kritische im noch gesperrten Lieferumfang. Paketknoten sind keine Zahl
unabhängiger CVEs. Die [maschinenlesbare Befundzuordnung](../../reports/integration/dependency-disposition.json)
hält die Paketmeldungen mit Audit-Hashes als weiter zu untersuchen fest.
Diese Meldungen und ihre konkrete Erreichbarkeit bleiben freigaberelevant; ein Paket-ZIP macht sie nicht erledigt.

OS-Pakete, Node-/Redis-Binaries, Firmware und native ARM64-Erweiterungen benötigen
eine aus dem tatsächlichen Geräteimage erzeugte weitere Inventur. Die vorliegende
npm-SBOM ist keine vollständige Betriebssystem-SBOM.

## Noch zu schließen

1. **Zielhost:** frische Debian-12-VM, danach Raspberry Pi 5 mit SSD; echte
   Dienstkonten, Mounts, Ports, Neustarts, Stromausfall und Datenträgerdruck.
   Auch die starke Passwortprüfung muss unter Pi-/VM-Last innerhalb der
   begrenzten Anmeldezeit funktionieren; die KDF-Stärke wird dafür nicht abgesenkt.
2. **Gerätebetrieb:** konkrete Geräte-/Wallbox-/Speicherverbindungen und
   gerätespezifische sichere Zustände bei Lizenz-, Netz-, Zeit- und Messwertfehlern.
3. **Erweiterungen:** zusätzliche Adapter brauchen Prüfung und neue freigegebene
   Artefakte. Das integrierte Enrollment akzeptiert derzeit genau Admin und UI.
   Der vorhandene additive Codewechsel allein erweitert dieses Profil nicht;
   kontrollierte Profilmigration und Instanzaufnahme fehlen noch.
4. **Backup/Restore:** vollständige verschlüsselte Offline-Sicherung,
   manipulationsgeprüfte Wiederherstellung, Datenmigration und Wiederanlauf.
   Der Backup-Adapter bleibt gesperrt; kein allgemeiner privilegierter Broker.
5. **Fernwartung und Bedienung:** Tailscale-Zugriffsabnahme, IPv6, reale Browser-
   Ersteinrichtung und Kompatibilität; Ablaufalarme und Web-CA-Kompromittierung.
6. **Produktfreigabe:** relevante Abhängigkeitsbefunde schließen, konkrete
   IEC-/ASVS-Einzelkontrollen zuordnen, Support-/Patch-/Meldeprozesse festlegen,
   CRA-Produktklasse und Konformitätsverfahren klären, unabhängige Prüfung planen.

Die [CRA-Matrix](../cra/INTEGRATED_TEST_REQUIREMENTS.md), das
[STRIDE-Modell](../security/INTEGRATED_TEST_THREATS.md) und die
[maschinenlesbaren Anforderungen](../../system/integration/requirements.json)
verbinden diese Arbeiten mit Nachweisen. Keine pauschale Erfüllung einer
Anforderung wird aus einzelnen bestandenen Tests abgeleitet.
