# EOS-REQ-NETWORK-20261020 — Technisches Gerätenetz im EOS-Admin

Nutzerauftrag vom 20.10.2026: native Linux-/systemd-Basis weiterführen; zweiter
Ethernetanschluss, beim Pi optional USB-Ethernet; Netzverwaltung im eigenen
EOS-Admin; DHCP-Geräteliste, feste IP je MAC durch Auswahl; getrennte Netze und
zeitlich begrenzter Internetzugang. Veröffentlichung des geprüften Quellstands
auf `main` ausdrücklich autorisiert. Docker bleibt zurückgestellt.

| Kennung | Anforderung | Umsetzung / Nachweis |
|---|---|---|
| NET-01 | Nur Installateur/Service mit gültiger zentraler Sitzung darf konfigurieren | Admin-Rollenprüfung vor Parser und Auftrag; HTTPS, Same-Origin und eigener Header; HTTP-Negativtests |
| NET-02 | Kein DHCP im Kundennetz; explizit ausgewählter zweiter Anschluss | MAC/Interface/Index, Default-Route-/Manager-/Adressprüfung; eigene dnsmasq-Instanz; native Namespace-DORA |
| NET-03 | Adresse über DHCP zuweisen, vorhandene MAC/IP reservieren | begrenzte Lease-Liste; Checkbox; eindeutige Zuordnung; MAC hat Vorrang vor Client-ID |
| NET-04 | Standardmäßig keine Weiterleitung Geräte→Kunden/VPN/Internet | eigene nftables-Tabelle; geschlossene Weiterleitung; keine Bridge |
| NET-05 | Befristeter Internetzugriff je Gerät mit automatischem Ende | 60–3600 Sekunden; aktive MAC/IP-Lease; Kernel-Timeout für beide Richtungen einschließlich bestehender Verbindungen |
| NET-06 | Administration und vorhandene Regelung erhalten | Management-NIC nicht konfigurierbar; keine globalen Netzwerkneustarts; Hostdienst getrennt vom Controller |
| NET-07 | Fehler, Neustart, USB-Verlust und unbestätigte Änderung sicher behandeln | persistenter Änderungszustand, Bestätigungsfrist, unabhängiger Wächter, geschlossene Freigaben beim Start; Host-Fehlerfalltests |
| NET-08 | Keine pauschalen Rootrechte im Adapter | fester Unix-Socket, Peer-UID, endliche Operationen, feste Programme/Pfade, kein Shelltext |
| NET-09 | Lieferstand, Rückfall und Grenzen nachvollziehbar | neue R11-Sequenz statt Änderung signierter R10-Dateien; getrennte Paket-/Anlagenfreigabe; Bericht im gleichen Stand |

Der erste Hostvertrag unterstützt **ein dediziertes, nicht anderweitig verwaltetes
Ethernetinterface und ein privates IPv4-/24-Netz**. Die automatische Übernahme
eines von NetworkManager oder networkd verwalteten Anschlusses ist nicht Teil
dieser Freigabe. IPv6 wird an diesem Anschluss gesperrt. Gerätetypen, die IPv6
benötigen, sind darüber noch nicht qualifiziert. Keine WLAN-Konfiguration,
beliebigen VLANs, Bridges oder freie Firewallregel-Eingabe.

Leases zeigen DHCP-Zuordnungen, keine bewiesene aktuelle Erreichbarkeit. Eine
MAC-Reservierung ist keine Geräteauthentifizierung. Ein zweiter Port beweist
nicht die physische Trennung der angeschlossenen Switches.

Querverweise: [Architektur](../architecture/TECHNICAL_NETWORK_DE.md),
[Betrieb und Zieltest](../operations/TECHNICAL_NETWORK_TEST_DE.md),
[Prüfbeleg](../../reports/integration/network-test-20261020/README_DE.md),
bestehende `EOS-REQ-003/005/008/015` und Komponentenbefunde bleiben erhalten.
