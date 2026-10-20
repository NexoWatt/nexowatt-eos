# Native EOS-Gerätenetzverwaltung — Entwicklungsprüfung 20.10.2026

**Aktueller Veröffentlichungsstand:** R11 ist signiert und öffentlich verfügbar.
Der [abgeschlossene CI-/Liefernachweis](#abgeschlossene-qualifikation-und-veröffentlichung-am-20102026)
steht am Ende dieses Berichts; die folgenden Entwicklungs- und Fehlversuchsbelege
bleiben als historische Prüfschritte erhalten.

Anforderung: [EOS-REQ-NETWORK-20261020](../../../docs/requirements/EOS-REQ-NETWORK-20261020.md).
Dieser Stand implementiert das native Linux-/systemd-Testprofil und bereitet
R11 (test.3, Sequenz 14) vor. Eine Quellcode-Veröffentlichung ist keine
Installation auf dem Pi. Der tatsächliche Auslieferungsstatus ergibt sich erst
aus dem gesonderten signierten Lieferbeleg und öffentlichen Downloadvergleich.
Historische signierte R10-Dateien wurden nicht verändert.

## Änderung und Zweck

Im EOS-Admin können Installateur und Service einen dedizierten zweiten
Ethernetanschluss auswählen, ein privates /24-Gerätenetz prüfen und bestätigen,
DHCP-Zuordnungen sehen, MAC/IP reservieren und zeitlich begrenzten Internetzugang
je Gerät erteilen oder widerrufen. USB-Ethernet gehört zum vorgesehenen
Zieltest. Ohne Internetfenster bleibt die Weiterleitung gesperrt; Kunden-/VPN-
und besondere Netze bleiben auch während eines Fensters geschützt.

Der privilegierte Hostdienst akzeptiert nur feste Operationen über einen
lokalen Socket. Die Verwaltungsschnittstelle und fremd verwaltete Anschlüsse
sind ausgeschlossen. Ein unabhängiger Wächter bearbeitet unbestätigte
Änderungen, Prozessabbruch und Topologieänderungen. Die neue Controller-
Abhängigkeit wartet beim Start auf den Netzwerkdienst. Geräteprofile erlauben
nur die dokumentierten MQTT-/SHIP-/OCPP-/mDNS-Ports; kein freier Firewalltext.

Die beauftragten Influx-Korrekturen wurden aus dem aktuellen Quellstand neu
umgesetzt, da der frühere lokale Commit in diesem Checkout nicht verfügbar war.
Ihr [eigener Bericht](../native-influx-recovery-20261020/README.md) trennt
aktuelle Belege von früheren Angaben. R11 erlaubt dafür genau drei geänderte
Backup-Laufzeitdateien, deren bestehende mitgelieferte CLI-Testdatei und
das dazugehörige geprüfte `release-manifest.json`.

## Tatsächlich lokal ausgeführte Prüfungen

Umgebung: Linux x64, Node **24.19.0**, Python **3.12.14**. Der signierte
Ziel-/CI-Stand verlangt separat Node **24.21.0**. Die folgenden Zahlen sind
Prüfgruppen mit teils überlappenden Tests, keine addierbare Gesamtzahl.

| Prüfung | Ergebnis | Beleg / Grenze |
|---|---|---|
| Netzwerkpolicy, Hosttransaktionen, Installer und IPC | 86/86 bestanden | `network-unit.log`; Hostbefehle injiziert, IPC über tatsächliche Socketpaare |
| HTTP, Update, Signatur-/Publikationsgrenzen und SBOM | 138/138 bestanden | `network-release-contracts.tap`; temporäre Dateien und kontrollierte Doubles |
| Python-Publikationsgrenzen | 19/19 bestanden | `publication-python.log`; kein Produktionsupload |
| Admin HTTP und bestehende Sitzungs-/Ressourcenschutztests | 67/67 bestanden | `admin-node-tests.log` |
| Bestehende Admin-Sicherheitsgrenzen | 41/41 bestanden | `admin-boundaries.log` |
| Admin-Panel in echtem Chromium | 5/5 bestanden, kein Skip | `admin-browser-tests.log`; HTTP-Antworten simuliert |
| Admin TypeScript ohne Ausgabe | bestanden | `admin-typescript.log`, Exit 0 |
| Admin-Quell-/Build-Siegel und Postbuild-Parität | bestanden | 1491 Dateien, 28 Backenddateien; kein vollständiger React-Neubuild behauptet |
| Vollständiger unsignierter Paketbaum und Übergang R10→R11 | bestanden | `unsigned-assembly-rehearsal.json`; 22.346 Dateien, kein signierter CI-Build |
| GitHub-Workflow-Syntax/Expressions | bestanden | `workflow-validation.log`; gepinntes actionlint 1.7.12 |

Der Browserlauf verwendete Playwright 1.62.1 und einen ausschließlich im
lokalen Prüfscratch installierten Chromium-153-Build. Die CI installiert die
separat gesperrten Browser-Testabhängigkeiten und den Playwright-Browser. Die
mobilen Ansichten wurden visuell geprüft:
[Netzkonfiguration](admin-network-mobile.png),
[DHCP-Geräte](admin-network-mobile-devices.png).

Die echte DHCP-/nftables-Namespace-Prüfung konnte lokal mangels erlaubter
Netzwerk-Namespace-Erzeugung und Distributionswerkzeugen nicht laufen. Sie wird
**nicht als bestanden gewertet**. `.github/workflows/eos-network.yml` fordert
alle 23 benannten Paket-/DHCP-Prüfungen in einem isolierten Linux-Runner und
bindet den Beleg an den exakten sauberen Commit. R11 darf erst nach erfolgreicher
Netzwerk- und bestehender nativer Adapterqualifikation signiert werden.

### Nachprüfung des ersten nativen CI-Laufs

Der tatsächliche Ubuntu-24.04-Lauf
[39387040029, Job 118509241005](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39387040029/job/118509241005)
am Commit `e8edca868d3cec4a22fb267f15b417654985603b` ist **fehlgeschlagen**:
Der IPv4-Positivvortest bestand; der folgende
`fixture_ipv6_route_positive` scheiterte vor dem Laden der EOS-Firewallregeln.
Dieser Lauf enthält keinen Socketfehlercode oder IPv6-Routingzustand. Eine
vorübergehend noch nicht fertige Nachbarerkennung ist deshalb nur eine
Vermutung; eine konkrete Kernelursache ist bisher nicht nachgewiesen.

Die vier Positivvortests verlangen nun innerhalb eines gemeinsamen Budgets
von jeweils höchstens fünf Sekunden eine tatsächliche Echo-/DNS-Antwort.
Begrenzte Wiederholungen gelten ausschließlich vor dem Laden der Policy.
Alle 23 verpflichtenden Prüfnamen, einmaligen Negativproben mit 0,7 Sekunden
Socketlimit und die bestehende Ablaufprüfung bleiben erhalten. Fehlversuche
protokollieren Phase, Fehlercode, ausgewählte Quelladresse sowie begrenzte
Adress-, Routen- und Nachbartabellenauszüge aus den drei Prüf-Namespaces.
Die Isolationsprüfung bleibt vor jedem ausgeführten Befehl aktiv.

Acht neue lokale Harness-Tests prüfen Wiederholungen, gemeinsames Zeitbudget,
fehlende Route, hängenden Unterprozess, verspätete Antwort, Fehlerdiagnostik
und Isolationsabbruch mit kontrollierten Doubles. Eine falsche Echoantwort
bricht die Prüfung weiterhin ab und zählt niemals als Verbindungssperre. Befehl:
`PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s tests/network -p 'test_native_namespace.py' -v`.
Ergebnis: **8/8 bestanden**. Das beweist keine echte IPv6-Reparatur; der erneute
native CI-Lauf sowie Pi-/systemd-/USB-Abnahmen bleiben bis zu ihrem tatsächlichen
Ergebnis offen. Produktcode und Firewallpolicy wurden hierfür nicht verändert.

Der folgende echte CI-Job `118514685362` am Stand `7b979d9`
([Rohbeleg](ci-second-native-failure.json)) bestand alle vier
Positivvortests; IPv6 benötigte drei Versuche und 2,107 Sekunden. Der Lauf
scheiterte danach an einem eindeutig gemeldeten Syntaxfehler der zusätzlichen
unabhängigen **Testtabelle** `eos_test_unrelated`: Zwischen den schließenden
Chain-/Tabellenklammern fehlte ein Zeilenabschluss oder Trennzeichen. Die
Fixture verwendet jetzt einen mehrzeiligen nftables-Block mit getrennten
Abschlüssen. Dies war das einzige eingebettete nft-Regelliteral im Harness;
die EOS-Policy und sämtliche 23 Pflichtprüfungen bleiben unverändert. Die
erfolgreichen Vortests belegen nun die tatsächliche IPv6-Erreichbarkeit in
diesem isolierten Lauf; die vollständige Paket-/DHCP-Prüfung bleibt bis zum
erneuten nativen CI-Lauf offen.

Der dritte tatsächliche Job `118517365967` am Commit
`cd0195d4bc3ed5dda1eb71632187a19d7d668646`
([Rohbeleg](ci-third-native-failure.json)) bestand die ersten elf Prüfungen,
einschließlich geladener EOS-Firewall, Managementzugang, freigegebenem
Geräteport und vom EOS-Host begonnener Verbindung. Er scheiterte danach mit
`TECHNICAL_DHCP_OFFER_MISSING`. Der Test beobachtete Angebote nur zwei Sekunden;
die [offizielle dnsmasq-FAQ](https://thekelleys.org.uk/dnsmasq/docs/FAQ)
dokumentiert bereits zwei bis drei Sekunden Wartezeit für die reguläre
Adresskonfliktprüfung vor einer dynamischen Vergabe. Dieser konkrete
Zeitbudgetfehler wird auf sechs Sekunden korrigiert. Dass er den gemeldeten
Ausfall vollständig erklärt, muss der nächste tatsächliche Lauf zeigen.

Dasselbe volle Fenster gilt für den Negativtest auf dem Managementnetz;
ein nach drei Sekunden eintreffendes Angebot darf niemals als Sperre gelten.
Die ICMP-Konfliktprüfung bleibt aktiv. Der Harness erfasst Angebotswartezeit,
empfangene DHCP-Paketzähler und bei Fehlern begrenzte, nicht blockierende
stderr-Auszüge seiner Kindprozesse; ausführlichere DHCP-Protokollierung gilt
nur für die Testinstanz. Vier zusätzliche kontrollierte Tests prüfen gültige
ausgehende Paketbytes, eine verzögerte DORA-Antwort, das volle Managementfenster
einschließlich später unerlaubter Angebote und die begrenzte Logausgabe.
Ergebnis: **12/12 Harness-Tests, 98/98 gesamte Python-Netzwerktests bestanden**.
Der [Prüflog](ci-dhcp-followup-network.log) und die
[Befehls-/Hashbindung](ci-dhcp-followup-network.json) halten diesen lokalen
Nachprüfungsstand fest.
Produktcode, DHCP-Konfiguration und Firewallregeln bleiben unverändert;
die vollständige native Qualifikation bleibt offen.

## Unabhängige Prüfung und Korrekturen

Während der Prüfung behoben wurden unter anderem veraltete Sitzungsfreigaben
zwischen Parsing und Hostauftrag, irreführender grüner UI-Status bei Dienstfehler,
Werteverlust beim Speichern deaktivierter Formulare, mobile Überläufe sowie
Notfall-Firewallregeln auf einem inzwischen umbenannten Managementanschluss.
Die Startfreigabe verlangt jetzt aktuelle vertrauenswürdige Interface-
Identität, Rolle und Adressprüfung. Der R11-Rückfall prüft und lädt außerdem
die alten signierten Admin-Assets, bevor R10 erneut starten darf.
Die R11-SBOM verwendet ein eigenes Profil mit festem R9-App-Ursprung,
R10-Updateausgangspunkt und signierter Sequenz 14; alte R10-Marker können
nicht als R11 umgedeutet werden.

## Offene Grenzen und nächste Abnahme

- Reale systemd-Installation, Mount-/Capability-Regeln, Update/Rückfall,
  Stromausfall und Pi-/USB-Verhalten bleiben offen.
- Die gemeinsame OS-Identität `eos-runtime` ist keine Trennung einzelner
  Adapter. Webrollen beweisen gegenüber dem Host keine separate
  Caller-Identität. `EOS-NET-20261020-01` bleibt offen.
- Nur ein dedizierter, nicht von NetworkManager/networkd verwalteter
  Ethernetport und IPv4-/24 sind vorgesehen. IPv6 ist gesperrt; entsprechende
  EEBUS-/Matter-/Discovery-Funktionen sind noch nicht qualifiziert.
- DHCP-Leases beweisen keine aktuelle Erreichbarkeit; MAC ist keine
  Geräteauthentifizierung. Direkter Verkehr am selben Switch wird nicht vom
  EOS-Host gefiltert. Gerätekommunikation wird durch die Netztrennung nicht
  automatisch verschlüsselt.
- Der derivative App-SBOM bindet den App-Dateibaum. Python-, nftables-,
  dnsmasq-, systemd-, OS-/Firmwarestände gehören zusätzlich ins Zielinventar.
  Bekannte frühere Abhängigkeitsbefunde bleiben erhalten.
- 50-/100-ms-Ziele, konkrete Gerätefunktionen und Anlagenfreigabe sind nicht
  aus diesen Tests abzuleiten. Keine Produktions- oder CRA-Freigabe.

[Zieltestmatrix und Betrieb](../../../docs/operations/TECHNICAL_NETWORK_TEST_DE.md) ·
[Architektur und Vertrauensgrenzen](../../../docs/architecture/TECHNICAL_NETWORK_DE.md) ·
[R11-Auslieferungsweg](release/README.md) ·
[Maschinenlesbarer Prüfstand](verification.json).

## CI-Nachprüfung des ersten veröffentlichten Stands

Quellcommit `f3e3e0233e947e2019bda0a649f238840fa925a3`, Anforderungscommit
`e8edca868d3cec4a22fb267f15b417654985603b`: Die vier nativen
PostgreSQL-/Management-/Adapterläufe, der Admin-Browserlauf und die
Netzwerkvertragsprüfungen bestanden. Die Gesamtqualifikation blieb wegen
des IPv6-Positivvortests und zweier veralteter Test-/Manifestbindungen rot.
Es wurde daher kein R11-Paket signiert. Einzelstatus: `ci-first-run.json`.

Die Erwartung für die ausdrücklich zugelassene Sequenz 14 wurde korrigiert;
Sequenzen außerhalb 13/14 erhalten weiterhin keinen erweiterten Adapterumfang.
Nach erneuter Compiler-Parität wurden ausschließlich die vier vorhandenen
Größen-/Hashwerte im Backup-Publishmanifest erneuert; dessen unveränderter
Prüfer bestätigt alle 141 Einträge. Der R11-Übergang erlaubt genau dieses
zusätzliche Metadaten-Dokument, keine beliebigen Backup-Paketänderungen.

Der erste unsignierte Paketbeleg bleibt ein historischer Diagnosebeleg des
ursprünglichen Quellstands. Der korrigierte Kandidat muss vollständig aus dem
neuen sauberen Commit gebaut und erneut nativ qualifiziert werden. Lokale
Nachprüfungen: `ci-followup-local.json`, `ci-followup-workflows.log`. Rohe
Namespace-Diagnosen werden in einem separaten CI-Artefakt erhalten; sie können
das erfolgreiche, quellgebundene Signierungsartefakt nicht ersetzen.

## CI-Nachprüfung des zweiten veröffentlichten Stands: R6-Testkontext

Im Anforderungscommit `7b979d9b00f94edeb4b899fa49e50fd5024a30f8`
bestand der zuvor fehlgeschlagene Sequenztest; auch der Adapter-/Backup-Job
bestand. Der Security-Lauf `39388691376`, Job `118514685598`, erreichte danach
die R6-Prüfungen und scheiterte mit `R6_ADMIN_SOURCE_SEAL`: Die gültige aktuelle
Admin-Versiegelung enthält nun `docs/EOS_NETWORK_DE.md`, das außerhalb des
historischen R6-Quellumfangs liegt. Dieser Befund ist keine ungültige aktuelle
Dateiversiegelung und berechtigt nicht zur Erweiterung des alten Builders.

Die Korrektur betrifft nur den Testkontext. Die 1.522 Einträge des erhaltenen
R6-Quellbindungsbelegs werden mit festem SHA-256
`bbbb583883aacc97e7206655d61614a72ec20c19033afa68a0ec655ae11049b0`
gegen die unveränderte R6-Pfadzuordnung geprüft. Ein eigener Test prüft alle
aktuellen Admin-Dateihashes und verlangt weiterhin die Ablehnung des neu
hinzugekommenen Dokuments durch den historischen Builder. R6-Builder,
Freigabepins, Auslieferungsdateien und die aktuelle Versiegelung bleiben
unverändert.

Die vollständige lokale R6-CI-Stufe bestand anschließend: 15 Node-Tests für
Builder/derivativen SBOM sowie 9 Python-Publikationstests, jeweils ohne
Überspringen. Die separate lokale Folgeprüfung der R7-/R8-/R9-Verträge und
öffentlichen R8-/R9-/R10-Auslieferungswege bestand mit 282 Node-Tests und
ohne Überspringen; [Zusammenfassung und Einzelprotokolle](retained-contracts-followup/summary.json)
binden diese Nachprüfung an ihren Quellstand und die lokale Node-Version.
Das sind Quell- und Publikationsvertragsprüfungen;
ein neuer vollständiger CI-Lauf des endgültigen Quellcommits sowie echte
systemd-/Pi-Abnahme bleiben erforderlich. Die zweite CI-Anforderung ist
dadurch nicht nachträglich erfolgreich oder für eine Signierung verwendbar.

## Abgeschlossene Qualifikation und Veröffentlichung am 20.10.2026

Der endgültige Quellcommit `cdf897240272b2adeeeec3e0511fcd1593984687`
bestand die vollständige Qualifikation:

| Prüfung | Ergebnis | Exakter Lauf / Beleg |
|---|---|---|
| EOS Security | 8/8 Jobs erfolgreich | [39390449098](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39390449098), [Quellbindung](release/native-workflow.json) |
| Native Netzwerkqualifikation | 23/23 Paket-/DHCP-Prüfungen bestanden | [39390449320](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39390449320), [Rohbeleg](release/network-native-evidence.json) |
| CodeQL | erfolgreich | [39390449132](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39390449132) |
| Signierung und Veröffentlichung | 4/4 Jobs erfolgreich | [39391220133](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39391220133) |

R11 (`0.2.0-test.3`, Sequenz 14) ist damit als signierte Testauslieferung
veröffentlicht. Release-ID:
`d7b7105ce6e3ac85a828c3e441271c4597b58886456afb0075893472fe788582`.
Der [Lieferbeleg](../../../delivery/test-pi-0.2.0-test.3-r11/delivery.json)
bindet 22.346 signierte Dateien und das Archiv mit 89.047.948 Bytes,
SHA-256 `b7a261d587ce79cf6d01b2e683cb41652e5660456e2560d651c97743a57a4793`.
Der [Buildnachweis](release/build-verification.json) hält die zum Buildzeitpunkt
geprüfte Signatur, SBOM-/Quellenbindung und unveränderten historischen Lieferdateien
fest. Sein `published: false` bleibt die korrekte historische Buildphase.

Der [öffentliche Readback](../../../delivery/public-update-test3-r11/remote-readback.json)
belegt den bytegenauen HTTPS-Download von Archiv, Schlüssel und Liefermetadaten
am Asset-Commit `c51f6324b6acf6d9e81cb0a550d0bc8975df143d`.
Der [verifizierte Updatebefehl](../../../delivery/public-update-test3-r11/UPDATE_COMMAND.txt)
bindet den Einstieg an Commit `69ba537984299bcfaf7ddfd2ab2156b1c27721e8`;
der [Befehlsnachweis](../../../delivery/public-update-test3-r11/command-verification.json)
und der veröffentlichte Command-Commit `90d5b171ae13d2d8fa844f9bc9472190cd083b3d`
halten diese Veröffentlichung fest. Der aktuelle maschinenlesbare Gesamtstand
ist [qualification.json](qualification.json). Die anfängliche
[verification.json](verification.json) und frühere fehlgeschlagene CI-Belege
werden nicht rückwirkend umgedeutet.

Die 23 Netzwerkprüfungen liefen mit echten Paketen in isolierten Linux-
Namespaces. Sie belegen keine Installation oder Unterbrechung unter systemd
auf dem konkreten Pi. Pi-/ARM64-/USB-Verhalten, Stromausfall, vollständige
Wiederherstellung, Geräte- und Anlagenabnahme sowie die 50-/100-ms-Ziele bleiben
offen. Der Updatebefehl wurde veröffentlicht, aber durch diese Veröffentlichung
nicht auf einem Zielgerät ausgeführt. R11 ist keine Produktions- oder CRA-Freigabe.
