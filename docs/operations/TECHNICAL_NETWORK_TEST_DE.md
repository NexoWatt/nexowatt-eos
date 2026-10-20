# Gerätenetz im EOS-Admin — Vorbereitung und Pi-Abnahme

**R11 ist seit dem 20.10.2026 als signierter Teststand veröffentlicht;
Pi-, Anlagen- und Produktionsfreigabe bleiben offen.** Revision 11, Sequenz 14
installiert den neuen Admin und den zunächst unkonfigurierten Hostdienst
gemeinsam auf einem gesunden R10-Teststand. Ein R10-Paket enthält den
Netzbereich nicht. Die Veröffentlichung allein ändert keinen installierten Pi;
historische Downloads und Pins bleiben unverändert.

Build, Signatur, SBOM-Bindung und öffentlicher bytegenauer Downloadvergleich
sind abgeschlossen. Ausschließlich den
[verifizierten R11-Updatebefehl](../../delivery/public-update-test3-r11/UPDATE_COMMAND.txt)
beziehungsweise dessen identische Fassung in der [aktuellen README](../../README.md)
verwenden. [Lieferidentität](../../delivery/test-pi-0.2.0-test.3-r11/delivery.json),
[öffentlicher Readback](../../delivery/public-update-test3-r11/remote-readback.json)
und [Qualifikationsstand](../../reports/integration/network-test-20261020/qualification.json)
trennen die verfügbare Testlieferung von der noch offenen Zielabnahme.

## Voraussetzungen

- Vollständige Sicherung und bekannter Rückfall auf den bisherigen Teststand;
  lokale Konsole/SSH über den vorhandenen Kundenanschluss verfügbar halten.
- Ein gesunder, vollständig eingerichteter R10-Stand (Sequenz 13) unter Linux
  ARM64 mit Node 24.21.0; genaue Release-/Schlüsselidentität und Ausgangszustand
  prüft der Updatekoordinator.
- Debian-Zielprofil mit systemd und den Distributionspaketen Python 3,
  iproute2, nftables sowie dnsmasq-base. Der Hostinstaller lädt keine Pakete
  nach. Fehlende Werkzeuge führen zum Abbruch vor Installation.
- Ein zweiter, **dedizierter und nicht von NetworkManager/networkd verwalteter**
  Ethernetanschluss. USB-Ethernet ist möglich, sofern Treiber und stabile
  Geräteidentität verfügbar sind. Die konkrete Pi-/USB-Kombination bleibt zu
  prüfen. Die bestehende Kundenverbindung wird nicht übernommen.
- Getrennter Geräteswitch beziehungsweise getrennte Verkabelung. Den zweiten
  Anschluss niemals parallel am Kundenswitch anschließen. Endgeräte auf DHCP;
  kein zweiter DHCP-Server im technischen Netz; statische Fremdadressen
  gesondert prüfen. Ein freier /24-Bereich ohne Überschneidung mit Kunden/VPN.

Der erste Teststand übernimmt keine bestehenden NetworkManager-Verbindungen.
Ein solcher Anschluss erscheint mit Sperrgrund im Admin. Die Dedizierung muss
der OS-Administrator anhand des tatsächlichen Pi-Inventars vornehmen; nicht
blind `eth1` annehmen oder alle Netzwerkdienste abschalten. WLAN, VLANs und
beliebige individuelle Firewallregeln gehören nicht zu diesem Profil.

## Bedienung

1. Über HTTPS am EOS-Admin als Installateur oder Service anmelden. Service
   öffnet **Systemeinstellungen → Netzwerk · Gerätenetz und DHCP**; Installateure
   öffnen denselben Dialog über ihre **Basis-Einstellungen**. Endkunden erhalten
   keine Netzkonfiguration.
2. Den dedizierten Anschluss anhand Name/MAC wählen; EOS-IP, DHCP-Bereich und
   DNS-Resolver eintragen. Das Startprofil ist IPv4-/24. Benötigte
   Geräte-Dienstprofile gezielt auswählen; standardmäßig ist keines geöffnet.
3. **Konfiguration prüfen**, anschließend **Übernehmen und prüfen**. Die
   Kundenverbindung und das neue Gerätenetz prüfen, dann innerhalb von
   90 Sekunden bestätigen. Ohne Bestätigung wird der vorherige Zustand
   wiederhergestellt. Eine Sperre/Fehlermeldung nicht als Freigabe übergehen.
4. In der DHCP-Liste beim gewünschten Gerät **IP-Adresse immer diesem Gerät
   zuordnen** wählen. Die angezeigte MAC/IP wird reserviert. Lease-Daten sind
   keine aktive Geräteerkennung; eine gültige Lease bedeutet nicht sicher online.
5. Nur bei Bedarf für dieses Gerät Internet für 1, 5, 15, 30 oder 60 Minuten
   erlauben. Die Freigabe endet automatisch und kann vorher widerrufen werden.
   Kunden-, VPN- und lokale Sondernetze bleiben auch im Zeitfenster gesperrt.

Öffentliche DNS-Adressen werden den Endgeräten angeboten. Ohne Internetfenster
können diese keine externen DNS-Abfragen senden. Lokal über IP angebundene
Geräte bleiben davon unabhängig. Internet-/Herstellercloudabhängigkeiten eines
Gerätes sind deshalb bei dessen Inbetriebnahme zu berücksichtigen.

## Konkrete Zieltests

| Test | Sollverhalten | Zielstatus |
|---|---|---|
| Abgemeldet/Endkunde, direkter API-Aufruf | Keine Konfiguration, keine DHCP-/Gerätedaten, kein Auftrag | OFFEN Pi |
| Passwortwechsel/Abmeldung während Bedienung | Bestehender Zugriff verliert seine Berechtigung | OFFEN Pi |
| Kundenport mit DHCP-Testclient | Keine DHCP-Antwort von EOS | OFFEN Pi |
| Geräteport, zwei DHCP-Clients | Unterschiedliche gültige Adressen; keine Netzüberschneidung | OFFEN Pi |
| Reservierung, Clientneustart und EOS-Neustart | Dieselbe MAC erhält dieselbe IP | OFFEN Pi |
| Internetfenster mit laufender Verbindung | Nur ausgewähltes Gerät erreicht erlaubte Internetziele; Verbindung endet spätestens mit Frist | OFFEN Pi |
| Kunde/VPN/Administration aus Gerätenetz | Gesperrt, auch während Internetfreigabe; EOS→Geräte-Polling weiterhin möglich | OFFEN Pi |
| Unbestätigte Konfiguration/Prozessabbruch | Vorheriger Zustand wiederhergestellt oder eindeutiger Fehlerzustand, kein falscher Erfolg | OFFEN Pi |
| USB abziehen/anderes Interface mit gleichem Namen | Keine Übernahme alter Freigaben; Wiederanlauf erst nach Identitätsprüfung | OFFEN Pi |
| Neustart mit aktivem Internetfenster | Internetfreigaben starten geschlossen | OFFEN Pi |
| Bestehende Modbus/MQTT/OCPP/EEBUS-Geräte | Tatsächliche Kommunikation und Ausfallverhalten je konkretem Gerät prüfen | OFFEN Pi |
| Last, Historie und Backup gleichzeitig | 50-ms-/100-ms-Ziele messen; keine Echtzeitgarantie aus Unit-Tests ableiten | OFFEN Pi |

IPv6 ist auf dem technischen Port in diesem Profil gesperrt. IPv6-abhängige
EEBUS-/Matter-/Discovery-Funktionen sind damit **nicht freigegeben**. Auch ein
ausgewähltes mDNS-Portprofil bestätigt noch keine Herstellerkompatibilität.

## Fehler und Rückfall

Keine unbekannten Dienste, Routen oder Firewalltabellen löschen. Die
Release-Transaktion protokolliert Teilinstallationen; sie stellt bei einem
fehlgeschlagenen R11-Testwechsel die alten Admin-Assets sowie Releasezeiger
wieder her. Der neue Hostdienst startet zunächst unkonfiguriert. Sobald der
Installateur ein Gerätenetz eingerichtet hat, ist eine automatische Entfernung
des Hostaddons außerhalb des ursprünglichen Updateversuchs bewusst gesperrt.

Ein Fehler `NETWORK_INTERFACE_MANAGER_CONFLICT` verlangt eine geprüfte
Dedizierung des Anschlusses. `NETWORK_TOPOLOGY_CHANGED` verlangt eine Prüfung
von Anschluss, MAC und Routen. Bei `NETWORK_ROLLBACK_REQUIRED` lokale Konsole
verwenden und den dokumentierten Zustand sichern; nicht durch ein allgemeines
Firewall-Flush, Abschalten der Prüfung oder erzwungene Wiederholung umgehen.

Rückmeldungen enthalten Version/Releasekennung, Pi-/USB-Modell, OS-/Paketstände,
gewähltes Testszenario, Soll-/Ist-Verhalten und bereinigte Diagnosecodes. Keine
Passwörter, Tokens, Kundensicherungen oder kompletten produktiven Logs ins Repo.
