# Native EOS-Gerätenetzverwaltung — Entwicklungsprüfung 20.10.2026

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
Backup-Laufzeitdateien und deren bestehende mitgelieferte CLI-Testdatei.

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
