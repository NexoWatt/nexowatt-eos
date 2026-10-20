# Technisches Gerätenetz — native EOS-Testarchitektur

Bezug: `EOS-REQ-NETWORK-20261020`. Diese Ergänzung ersetzt weder das bestehende
PostgreSQL-/Adapter-Kommunikationsprofil noch den signierten R10-Lieferstand.

Der authentifizierte EOS-Admin bedient den root-eigenen Hostdienst ausschließlich
über `/run/nexowatt-eos-network/control.sock`. Der Dienst lauscht nicht auf TCP.
Er nimmt genau eine begrenzte JSON-Nachricht je Verbindung entgegen und prüft
Linux-Peercredentials, Operation und Parameter. Nur root und `eos-runtime`
erreichen die endlichen Operationen Status, Vorschau, Übernahme, Bestätigung,
Reservierung, Freigabe und Widerruf. Er akzeptiert keine Programme, Shelltexte,
Dateipfade oder nftables-Ausdrücke vom Aufrufer.

**Vertrauensgrenze:** Controller und Adapter verwenden weiterhin gemeinsam
`eos-runtime`. Die Webrollen werden am Admin geprüft; der Hostdienst kann damit
keine einzelne Adapteridentität oder Endbenutzerrolle beweisen. Ein bereits
kompromittierter zugelassener Adapter kann die erlaubten Gerätenetzoperationen
direkt anfordern. Die unabhängige Validierung im Host begrenzt sie auf das
dedizierte Netz; sie ersetzt keine Prozess-/OS-Isolation. Der Befund
`EOS-NET-20261020-01` bleibt offen und darf nicht als geschlossene CRA-Anforderung
geführt werden.

Die privilegierte Komponente liegt unter `/usr/lib/nexowatt-eos-network`, ihr
persistenter Zustand root-lesbar unter `/var/lib/nexowatt-eos-network`. Eine
eigene, gehärtete systemd-Unit betreibt sie außerhalb der Millisekunden-Regelung.
dnsmasq läuft mit eigener Dienstidentität `eos-network-dhcp` und nur den für DHCP
benötigten Fähigkeiten. Es bietet keinen DNS-Proxy, keine externen Includes und
keine Hooks an. Die Distribution liefert Python, iproute2, nftables und dnsmasq;
deren konkret installierte Paketstände gehören in das Hostinventar.

Das ausgewählte Interface muss hardwaregestütztes Ethernet, unbenutzt und frei
von einer fremden Netzverwaltung sein. Name, MAC, Interfaceindex, Managementroute
und Netzüberschneidungen werden vor der Übernahme geprüft. Ein anderer Anschluss
mit übernommenem Namen erhält dadurch keine bisherigen Freigaben. Der Hostdienst
startet bei Installation ohne Netzkonfiguration. Er ändert weder die
Kundenadresse noch eine globale Standardroute und startet keinen allgemeinen
Netzwerkmanager neu.

DHCP vergibt ein privates /24; Gateway und öffentliche DNS-Resolver werden
explizit angeboten. Der Host selbst vermittelt keine DNS-Anfragen. Der Gateway
ist auch ohne Internetfreigabe im Lease enthalten, seine Weiterleitung bleibt
gesperrt. Dadurch erfordert eine spätere Freigabe keinen DHCP-Neubezug.
Reservierungen werden gegen die aktuelle, gültige Lease und doppelte IP/MAC
geprüft. Ungeprüfte Gerätenamen gelangen nur als Text in die Oberfläche.

Die eigene Tabelle `inet eos_technical` begrenzt INPUT, FORWARD und NAT für das
Gerätenetz. Sie lässt Antworten auf vom EOS-Host aufgebaute Verbindungen zu,
schützt Managementdienste und erlaubt optional nur ausdrücklich ausgewählte
Geräteprofile: MQTT TCP 1883/8883, EEBUS-SHIP TCP 4712, OCPP TCP 9220 und mDNS
UDP 5353. Ein Portprofil ist kein Nachweis einer funktionierenden Geräteanbindung.
mDNS verwendet ein enges TTL-255-Profil, IPv6 ist hier geschlossen. Bestehende
weitere Firewalltabellen bleiben erhalten und können zusätzliche Sperren bewirken.

Internetfreigaben gelten für eine aktive MAC/IP-Zuordnung. Kernelsets mit
Timeout werden auf Hin- und Rückrichtung geprüft, auch für bestehende
Verbindungen. Besondere, private, verbundene und spezifisch geroutete Netze
einschließlich Kunden-/VPN-Netzen bleiben gesperrt. Zeitfenster werden nicht
persistiert und durch normalen Verkehr nicht verlängert. Eine Änderung der
Routingtopologie erfordert erneute Prüfung und führt im Zweifelsfall zur Sperre.

Vor Änderungen wird ein Wiederherstellungszustand geschrieben. Innerhalb von
90 Sekunden muss die neue Konfiguration bestätigt werden. Ein eigener
systemd-Wächter und die Startwiederherstellung bearbeiten unvollständige
Änderungen. Ein Fehler wird sichtbar gemeldet; ein fehlgeschlagener Rückfall
darf nicht als erfolgreiche Wiederherstellung erscheinen. Physische
Schutzfunktionen und vorhandene Anlagenlimits werden dadurch nicht ersetzt.

Der Host filtert **keinen direkten Verkehr zweier Geräte am selben Switch**.
Dafür wären Switch-Portisolation/VLANs erforderlich. Ebenso verschlüsselt die
Netztrennung keine Klartext-Modbus-/HTTP-Gerätekommunikation. Sie begrenzt deren
Erreichbarkeit; die bestehende verschlüsselte EOS-Kommunikation bleibt separat.

Technische Primärquellen der Implementierungsprüfung:

- https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- https://netfilter.org/projects/nftables/manpage.html
- https://wiki.nftables.org/wiki-nftables/index.php/Element_timeouts
- https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement
- https://www.freedesktop.org/software/systemd/man/257/systemd.service.html
- https://www.rfc-editor.org/rfc/rfc6762#section-11

Diese Quellen beschreiben Mechanismen. Sie sind keine Produktprüfung und keine
CRA-Konformitätserklärung.
