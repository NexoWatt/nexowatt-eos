# EOS-Admin: System · Netzwerk

Quelländerung vom 20.10.2026 auf Basis von EOS R10. Die Quelländerung allein
aktualisiert kein Gerät und verändert keine bereits signierte R10-Lieferung.

## Bedienung

Service öffnet **Systemeinstellungen → Netzwerk · Gerätenetz und DHCP**.
Installateure erreichen denselben Dialog über ihre **Basis-Einstellungen**.
Endkunden erhalten weder den Eintrag noch Zugriff auf die Netzwerk-API.

1. Den separaten technischen Ethernet- oder USB-LAN-Anschluss auswählen. Der
   Hostdienst prüft die konkrete Schnittstelle und deren MAC-Adresse; der
   Anschluss mit der Standardroute steht nicht zur Auswahl.
2. EOS-Adresse und DHCP-Bereich innerhalb eines privaten IPv4-/24-Netzes
   eingeben. Der Host prüft unter anderem Überschneidungen und bestehende
   Verwaltung der Schnittstelle. Öffentliche DNS-Adressen für spätere
   Internet-Wartung explizit eintragen.
3. Nur benötigte eingehende Gerätedienste auswählen: MQTT TCP 1883/8883,
   EEBUS SHIP TCP 4712, OCPP TCP 9220 oder mDNS UDP 5353. Die Auswahl öffnet
   den vorgesehenen Firewallpfad, startet und konfiguriert aber keinen Adapter.
4. **Konfiguration prüfen**, anschließend **Übernehmen und prüfen** wählen.
   Die Verbindung kontrollieren und die vom Hostdienst verlangte Bestätigung
   innerhalb des angezeigten Zeitfensters ausführen. Keine automatische
   Bestätigung und kein automatischer Wiederholungsversuch bei Zeitüberschreitung.
5. DHCP-Geräte erscheinen unter **Gemeldete Geräte**. Mit **Reservieren** wird
   die aktuell gemeldete IP-Adresse dieser MAC-Adresse fest zugeordnet. Ein
   gültiger DHCP-Lease ist kein Nachweis der gegenwärtigen Geräteerreichbarkeit.
6. Eine Internet-Wartungsfreigabe gilt für ein ausgewähltes Gerät und 1, 5, 15,
   30 oder 60 Minuten. **Jetzt sperren** beendet sie früher. Die eigentliche
   zeitliche Durchsetzung liegt beim Hostdienst/Kernel, nicht beim Browser.

Ein fehlender Hostdienst wird ausdrücklich angezeigt. Nach einem fehlgeschlagenen
Statusabruf werden alte DHCP-, Freigabe- und Bestätigungsdaten entfernt und
Schreibaktionen gesperrt. Erst ein erfolgreicher neuer Abruf lädt die aktuelle
Konfiguration. Netzwerkabfragen finden nur bei geöffnetem Dialog statt.

## Schnittstelle und Sicherheitsgrenzen

Alle Schnittstellen liegen unter `/nexowatt/network/` und benötigen eine aktuelle
HTTPS-Anmeldung als Installateur oder Service. Beide Prüfungen vor und nach dem
JSON-Parser lesen die tatsächliche widerrufbare Sitzung erneut; ein zuvor von
Middleware gesetztes `req.user` reicht nicht. URL-Tokens werden hier nicht
akzeptiert. Passwortpflicht, Kontosperrung und Rollenänderungen werden über die
bestehende EOS-Sitzungsprüfung berücksichtigt.

| Methode / Pfad | Nutzdaten |
|---|---|
| GET `status` | keine |
| POST `preview`, `apply` | `{config}` |
| POST `confirm` | `{transactionId}` |
| POST `reservation` | `{mac, ip, reserved}` |
| POST `grant` | `{mac, ip, durationSeconds}` |
| POST `revoke` | `{mac, ip}` |

Schreibanfragen verlangen `X-NexoWatt-EOS-Network: 1`, HTTPS-Same-Origin und
striktes JSON bis 16 KiB. Cookies ohne Origin reichen nicht. Explizite
Bearer-Clients ohne Cookies dürfen entsprechend der vorhandenen Origin-Policy
ohne Origin arbeiten. Die HTTP-Schicht prüft genaue Feldlisten, Typen,
Listenlängen, den Dienst-Portkatalog und Zeitgrenzen; die vollständige
Netzwerkprüfung erfolgt erneut im Hostdienst.

Der Admin besitzt keine Root-Ausführung. Er sendet ausschließlich die sieben
definierten Operationen über `/run/nexowatt-eos-network/control.sock`.
Der Client begrenzt Nachrichten auf 64 KiB, gleichzeitige Anfragen auf vier und
die gesamte Socket-Laufzeit auf fünf Sekunden. Socket und Timer werden bei
Abbruch geschlossen. Interne Fehlertexte werden nicht an Browser weitergereicht.

Der Host akzeptiert nur vorgesehene lokale Prozessidentitäten und validiert seine
Operationen selbst. Das bestehende gemeinsame Betriebssystemkonto der EOS-Adapter
bleibt jedoch eine gemeinsame Vertrauenszone. Diese Änderung schafft **keine
Prozessisolation zwischen Adaptern**. Eine kompromittierte Anwendung mit derselben
OS-Identität kann die begrenzte Hostschnittstelle erreichen; ihre Auswirkungen
werden durch die Hostvalidierung begrenzt, nicht durch die Browserrolle.

## Prüfungen

`node --test components/admin/test/eos-network-http.test.cjs` führt isolierte
Tests der tatsächlichen ausgelieferten HTTP-/Socket-Module und der
Sitzungsanbindung aus. Diese Tests ersetzen keinen echten DHCP-/Firewalltest.

Die separate private Testumgebung in `tests/network/browser/` bindet Playwright
an eine exakte Version. Nach `npm ci --ignore-scripts --prefix tests/network/browser`
und Installation des passenden Chromium kann der Browserlauf mit
`NODE_PATH="$PWD/tests/network/browser/node_modules" node --test components/admin/test/eos-network-browser.test.cjs`
gestartet werden. Er verwendet echte Browserinteraktionen und die ausgelieferten
JS-/CSS-Dateien, aber eine ausdrücklich simulierte Netzwerk-API.

Die Browser-, systemd-, Netzwerk- und Pi-Prüfergebnisse sowie verbleibende
Freigabegrenzen müssen im gemeinsamen Änderungsbericht ausgewiesen werden.
Diese Dokumentation bescheinigt keine bestandene Zielgeräteprüfung.

### Lokaler Prüfstand am 20.10.2026

- Netzwerk-HTTP-/Socket-/Sitzungstests: 29/29 bestanden; zusammen mit den
  vorhandenen Sitzungs- und Ressourcenprüfungen 67/67 bestanden, keine ausgelassen.
- Sicherheitsgrenzen: 41/41 isolierte Prüfungen bestanden.
- Browser: 5/5 bestanden, keine ausgelassen; echte Chromium-Interaktionen mit
  der beschriebenen API-Testumgebung. Mobile Ansicht und seitlich scrollbarbare
  Gerätetabelle wurden zusätzlich per Screenshot geprüft. Der Lauf deckt
  Vorschau, Übernahme/Bestätigung, reservierte IP, begrenzte Freigabe/Widerruf,
  Rollenentzug und den Verlust aktueller Statusdaten ab.
- TypeScript: `tsc --noEmit -p tsconfig.build.json` im Admin-Verzeichnis nach
  lockfilegebundenem `npm ci --ignore-scripts` bestanden. Der vorhandene React-Build
  wurde nicht neu erzeugt. Die neuen JS-/CSS-Dateien und die Backendmodule
  sind zwischen Quelle und Auslieferung bytegleich; die kleinen Änderungen
  an `web.ts` und `build/lib/web.js` wurden gemeinsam geprüft.
- Der bestehende `nexowatt-patch-built-frontend.cjs`-Postbuild-Guard bestand.
  Die Einträge in beiden HTML-Dateien und die neuen Assets sind zusätzlich
  im Browser-/Paritätstest gebunden. Ein späterer vollständiger Frontendbuild
  übernimmt die öffentliche Quelle und prüft diese Invarianten erneut.

Der lokale Browserlauf verwendete Playwright 1.62.1 mit dem npm-Paket
`@sparticuz/chromium` 153.0.0 als ausschließlich temporärem Testbrowser.
Der reguläre Playwright-Browserdownload war in dieser Umgebung nicht erreichbar.
Die CI installiert weiterhin den zu Playwright gehörenden Chromium. Keine
zusätzliche Browserabhängigkeit wurde in den Admin-Laufzeitumfang aufgenommen.
Ein alternativer lokaler Browserpfad wird nur für Tests über
`EOS_NETWORK_BROWSER_EXECUTABLE` gesetzt. Zielgeräte-, systemd- und reale
Netzwerkprüfungen sind dadurch weiterhin nicht bescheinigt.
