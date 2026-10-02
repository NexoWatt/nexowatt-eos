# NexoWatt EOS Admin 7.10.11 – Prüfung und Übergabe

30.09.2026. **Integrationsstand; keine Serienfreigabe, keine Zusicherung von
Lückenfreiheit und kein IEC-/CRA-Konformitätsnachweis.** Keine Installation auf
einer Live-Anlage, keine Veröffentlichung und keine Nachrichten an Dritte.

## Umfang und Ergebnis

Fortsetzung von 7.10.10 auf dem vollständig übergebenen 7.10.9-Repository; kein
Admin-8-Rebase. Vollständige Quellen, vorliegende Frontendbasis, aktualisierte
Backend-Runtime, SDK, Dokumentation und Rohbelege werden gemeinsam geliefert.
README.md bleibt unverändert identisch zum vorgegebenen Lizenztext.

Separat liegt der neue Offline-Keygen 1.0.0 vor. Er erzeugt Ed25519-signierte
NWL2-Lizenzen für Home/Pro, System-UUID, erlaubte Adapter, ausdrückliche Mengen und
Gültigkeitszeit. Der private Herstellerschlüssel wird erst auf dem Herstellerrechner
generiert und mit scrypt/AES-256-GCM passphrasengeschützt gespeichert. Er wird
niemals im Admin-Paket verteilt. Der Generator hat keine externen npm-Abhängigkeiten.

Die Verbindung Generator → Admin-Verifikation → reale verschlüsselte Datei →
Adapter-Guard wurde lokal mit echter Kryptografie und Dateien geprüft. Datenbank
und Messagebox sind in diesem Test simuliert. Home schaltet keine Pro-Funktion
frei; UUID-Manipulation, geänderte signierte Rechte und Ablauf werden abgewiesen.
Ein fehlerhafter Import ersetzt eine gültige Lizenz nicht. Verbraucher erhalten
kurze geprüfte Berechtigungen, keinen Lizenzcode oder Tresorschlüssel.

Die Adapterintegration ist weiterhin eine Aufgabe pro Verbraucherrepository.
Die Lieferung ändert keine anderen installierten Adapter. Alle Betriebsbefehle,
Queues und optionalen Pro-Funktionen müssen serverseitig geprüft werden. Der
Admin bleibt zur Lizenzverwaltung, Sicherheitswartung und Wiederherstellung
zugänglich; physische Schutzfunktionen dürfen bei Lizenzverlust nicht entfallen.

## Sicherheitsänderungen und Befundstatus

| Befund | Änderung in diesem Stand | Nachweis und verbleibende Grenze |
| --- | --- | --- |
| EOS-SESSION-004 | Access-/Refresh-Token an Kontensicherheit und neue Widerrufsgeneration gebunden; sofortiger Socketwiderruf, erneute Authentifizierung nach Neustart; Authentifizierungsrennen und verpasste Ereignisse geprüft | 15 Fälle mit Original-OAuth-Modell v1.4.0, simuliertem DB/Socket und echtem 5-s-Wächter. Voller Controller-/Express-/Mehrbrowsernachweis bleibt offen. |
| EOS-AUTH-004 | Laufzeit erzwingt Anmeldung in Webserver und Socketkonfiguration; auth=false gibt keinen Standardbenutzer mehr frei | Tatsächliche ausgelieferte Methoden im Backend-Harness; bestehende Konfiguration kann das Schutzprofil nicht abschalten. |
| EOS-TRANSPORT-001 | HTTP bindet nur an Loopback; Host-/Peer-Grenze; externe MCP-Erweiterung und SSO deaktiviert | Helper-Tests und Quellverdrahtung geprüft. HTTPS-Zertifikat, Tunnel, Reverseproxy und reale Clients vor Ort prüfen. |
| EOS-HTTP-RES-001 | Asynchron begrenzte gzip-Vorschau, gecachte Systeminformation, gemeinsames Uploadbudget und Abbruch-/Restore-Schutz | 18 Fälle einschließlich echter gzip-/Dateisystem- und Symlinkprüfungen; echter Multipart-Parser/TLS noch offen. Budget pro Prozess, keine OS-Quota. |
| EOS-NET-001 | Hostgebundene HTTPS-Abrufe ohne Redirects, Größenlimits, höchstens 5 s Gesamtbudget; News teilen dieses Budget; keine Rohantwortlogs | Simulierter HTTPS-Transport einschließlich DNS-/Body-Stall und Größenabwehr. Reale Provider-/Zertifikatsintegration offen. |
| EOS-SUPPLY-001 | Unbelegte automatische Installationen gesperrt, alte Richtlinien auf none; Metadaten sind kein Herkunftsbeweis. CI veröffentlicht/merged nicht automatisch | 25 AutoUpdate-Fälle und echte Browseransichten. Bereits laufende Controllerjobs werden nicht rückwirkend abgebrochen; sicherer manueller Releaseprozess bleibt nötig. |
| LIC-06 | Öffentlicher Trust-Anker samt gesamter Pfadkette muss root-kontrolliert sein; Links, fremde Eigentümer, Schreibrechte, Inodewechsel und Dateiwachstum geprüft | 5 zusätzliche Trust-Fälle innerhalb der 79 Lizenztests; Windows-Admin ohne ACL-Provisionierung verweigert. |
| CRA-ADM-02 | Passender neuer separater Keygen erstellt und Austausch geprüft | Produktiven Herstelleranker erzeugen/provisionieren und Rotation am Zielsystem prüfen. Alte NW1-Schlüssel müssen kontrolliert neu ausgestellt werden. |

Detailberichte: `docs/security/SESSION_REVOCATION_2026-09-30.md`,
`docs/operations/WEB_SECURITY_PROFILE_2026-09-30.md`,
`docs/security/AUDIT_BACKEND_2026-09-30.md` sowie
`reports/security/SUPPLY_CHAIN_AND_BUILD_AUDIT.md`.

## Prüfung und Belege

Der finale Lauf ist in `raw/final-7.10.11/results.json` mit Kommandos, UTC-Zeit,
Laufzeit und Rückgabecode gebunden. Rohbelege liegen daneben. Die vollständige
Paket-/Stabilitätskette, npm-Pack-Dry-Run, Inventar- und Fallbackprüfungen sind
bestanden. Die alte Passwort-Testfixture wurde um den zwingenden Widerruf vor dem Schreiben
erweitert. Alte statische Prüfungen wurden auf die neue sofortige Updatesperre
und den ausgelagerten Systeminfo-Helper angepasst; Feldprüfungen und funktionale
Negativtests bleiben erhalten. Frühere Läufe vor Codeabschluss bzw. diesen
Testanpassungen liegen unter `raw/pre-freeze-7.10.11/` und
`raw/pre-regression-adjustments-7.10.11/`.

Fälle, die in Sammelläufen wiederholt werden, werden nicht mehrfach
als unterschiedliche Tests gezählt.

| Gruppe | Fälle | Verfahren |
| --- | ---: | --- |
| Admin-Lizenzverifikation, Ablage, Dienst, SDK, HTTP-Handler, Trust | 79 | Echte Kryptografie/temporäre Dateien; DB, Bus und Routenharness simuliert |
| Backend-Berechtigungsgrenzen | 40 | Tatsächlicher ausgelieferter JavaScript-Code isoliert ausgeführt; zusätzliche Verdrahtungsprüfung |
| Sitzungswiderruf | 15 | Originales Upstream-OAuth-Modell, kontrollierte Rennen, echte Timer; kein Live-Controller |
| Webressourcen | 18 | Source und ausgelieferte JS-Helper; echter gzip/Filesystem, Transport/Parsergrenze simuliert |
| Automatische Updates | 25 | Ausgelieferte Managerlogik mit simuliertem Controller |
| Lock-Provenienz-Gate | 11 | Aufnahme-/Ablehnungsfälle ohne Netz oder Paketinstallation |
| Separater Keygen | 21 | Core und echter lokaler HTTP-Server |
| Keygen-Browserprüfung | 22 | Echter HTTP/TCP-Server und Chromium 153, einschließlich Home/Pro und Downloads |
| Generator/Admin/Client-Austausch | 1 umfassender Ablauf | Echte Signaturen und verschlüsselte Ablage; simulierte ioBroker-Anbindung |

Die Keygen-Belege befinden sich im **separaten** Repository unter `reports/`;
keine Kopie des privaten Herstellerwerkzeugs steckt im Admin-Paket. Die dortigen
Browserbilder enthalten keine Tokens/Passphrasen. Gefundene und behobene Fehler
(POST-Abbrucherkennung, veraltete Lizenzanzeige und Headerdeadline) sind im
Peerreview dokumentiert. Dieser interne zweite Review ist kein unabhängiger
Penetrationstest oder Zertifizierungsbericht.

## Build- und Lieferkettengrenze

Der Lock-Aufnahmecheck ist ausdrücklich **BLOCKED**: 563 Backend-Einträge haben
keine belegte Registry-Herkunft und keine starke Integritätsangabe. Das sind
Metadatenlücken, keine 563 behaupteten CVEs. Prüfsummen wurden nicht erfunden.
Frontend-Lock: keine entsprechenden Lücken. Inventar: Backend 788, Frontend 768
Lock-Komponenten; 9/19 nicht aufgelöste Referenzkanten. Diese CycloneDX-Dateien sind
Lock-Referenzinventare, keine Behauptung über den tatsächlich installierten Baum.

Kein npm ci, kein regulärer vollständiger TypeScript-/Frontend-/Backend-Build und
kein aktueller Online-Advisoryscan wurden hier ausgeführt. Gezielte Backenddateien
wurden mit Node-TypeScript-Transformation und lokalem Babel-CommonJS-Emitter erzeugt;
`fallback-build-provenance.json` nennt Quellen, Hashes, Verfahren und Grenzen.
Das ist keine TypeScript-Typprüfung. Der große React-Bestand stammt weiterhin aus
der Eingangsquelle, ergänzte Overlays sind getrennt geprüft. Node 24.19.0 wurde
verwendet; Windows/NTFS, macOS und Node 22 wurden nicht ausgeführt.

CI ist vorbereitet, aber nicht auf einem externen Repository ausgeführt. Das
fehlende Herkunfts-/Integritätsgate blockiert dort absichtlich die Installation
und die normale Buildkette. Automatische Freigabe-/Merge-/Publishaktionen wurden
entfernt; Actions-Revisionen sind aus offiziellen Quellen belegt.

## Verbleibende Freigabehindernisse

1. NexoWatt Release/Plattform: Lock-Herkunft auflösen, sauberen Normalbuild mit
   Typprüfung/Lint/echter SBOM/Advisoryauswertung nachweisen; kontrollierte
   Herausgeber-, Update- und Rollbackkette einrichten.
2. NexoWatt Adapterentwicklung: alle Verbraucherrepositories umstellen, tatsächliche
   systemweite Mengen zählen und jeden Betriebs-/API-/Queuepfad prüfen. Die Client-
   Angabe allein verhindert keine Überschreitung über mehrere Instanzen.
3. NexoWatt Systementwicklung: reale Login-/Refresh-/WebSocket-/TLS-/Multipart-/
   Controllerintegration, Provisionierung, Backup und Wiederherstellung testen.
   Gerätespezifische sichere Zustände samt unabhängigen Watchdogs nachweisen.
4. NexoWatt Plattform/Security: zusätzliche Host-/Socket-/DB-Umwege aus
   EOS-HOST-001 und Zugangsdaten/OS/SSH/DB aus EOS-PROVISION-002 prüfen. Gleichberechtigte
   ioBroker-Prozesse bleiben eine gemeinsame Vertrauensdomäne.
5. NexoWatt Hersteller/PSIRT: CRA-Produktabgrenzung, Klassifikation, Support,
   Schwachstellen-/Meldeverfahren, technische Unterlagen, Normenauswahl und
   erforderliches Konformitätsverfahren nach der fortgeschriebenen CRA-Arbeitsliste
   abschließen; unabhängige Prüfung risikogerecht durchführen.

AES-GCM schützt eine isoliert abgegriffene Lizenzdatei. Ein Angreifer mit lokalem
Ablageschlüssel, Prozessrechten oder root kann Daten entschlüsseln oder JavaScript
ändern. UUID allein ist kein Hardware-Kopierschutz. Der Transportcode `.nwl` ist
signiert und lesbar; die Verschlüsselung erfolgt beim Admin-Import. Höhere
Schutzgrenzen erfordern beispielsweise getrennte Dienste, sichere Boot-/Updatekette
und hardwaregebundene Schlüssel mit eigener Prüfung.

## Übergabe und Betrieb

Vor dem Update `START_HERE_7.10.11.md` und die Installations-/Rückfallanleitung lesen.
Besonders relevant sind der Wechsel von LAN-HTTP auf Loopback/HTTPS, die verpflichtende
Anmeldung und neue Sitzungen. Es ist kein pauschales Sicherheits-Update für alle
bereits installierten NexoWatt-Adapter. Die Repository-Manifeste und ZIP-Prüfung
binden die mitgelieferten Belege an genau diesen Arbeitsstand.
