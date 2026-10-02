# Installation, Test und Rückfall – 7.10.11

Die Anmeldung ist im Sicherheitsprofil verpflichtend. Ein alter `auth=false`-Wert wird zur Laufzeit für HTTP und WebSockets übersteuert; eine Standardbenutzer-Identität ohne Anmeldung gewährt keine Rechte. Der gespeicherte Altwert ist keine Ausnahme vom Schutzprofil.

**Integrationsstand ohne Serienfreigabe.** Weiterentwicklung des vollständig
gelieferten 7.10.10 auf der 7.10.9-Basis. Keine Live-Anlage wurde verändert.

## Vorbereitung und Wiederzugang

1. Konsistente verschlüsselte Sicherung von ioBroker, Konfiguration und lokalem
   Lizenzverzeichnis anlegen. Vorherige vollständige Version aufbewahren.
2. Individuellen Administratorzugang und unabhängigen OS-/SSH-/Konsolenzugang
   testen. Gemeinsame alte Startkennwörter sind bereits seit 7.10.10 gesperrt.
3. Zuerst getrennte Linux-Testinstanz mit unterstütztem Node 22 oder 24 nutzen;
   dieser Lieferlauf prüft Node 24. Konkrete Controller-/Adapterversionen erfassen.
4. **HTTP bindet nur noch an 127.0.0.1 beziehungsweise ::1.** Der bisherige Zugriff
   über die LAN-IP fällt dadurch bei unverschlüsselter Konfiguration weg. Vor dem
   Update HTTPS mit gültigem Zertifikat konfigurieren oder einen funktionierenden
   Tunnel zum Loopback-Port vorbereiten. Standardport aus der tatsächlichen
   Instanzkonfiguration verwenden. Ein SSH-Beispiel mit bewusst einzusetzenden
   Werten: `ssh -N -L 18081:127.0.0.1:ADMIN_PORT OS_BENUTZER@EOS_HOST`; danach
   `http://127.0.0.1:18081` im eigenen Browser. Keine Platzhalter wörtlich ausführen.
   HTTP-Host-Prüfung akzeptiert nur Loopback-Literale; beliebige Proxy-Hostnamen
   oder Forwarded-Header gewähren keine Ausnahme.
5. Nach Installation neu anmelden. Alte Sitzungen und Tokens werden bewusst
   nicht übernommen. Änderungen an Kennwort, Kontenstatus und Rollen benötigen
   anschließende erneute Anmeldung. Tests mit mehreren Browsern/Refresh-Tokens
   und offenen WebSockets am realen Controller bleiben Pflicht.

## Generator und Aktivierung

1. Das separate Keygen-Paket auf dem Herstellerrechner entpacken. Dort den
   persönlichen Signaturschlüssel mit langer Passphrase neu erzeugen; niemals
   einen hier gelieferten Testschlüssel als produktiven Vertrauensanker nutzen.
   Start und Backup sind im Keygen-README beschrieben. Private Dateien bleiben
   außerhalb beider Repositories und werden nicht auf die Anlage kopiert.
2. Nur `license-trust.json` mit den öffentlichen Schlüsseln auf dem Gerät
   provisionieren. Fingerabdruck über einen kontrollierten zweiten Weg abgleichen.
   Unter Linux müssen Datei **und sämtliche Vorfahren** root gehören, ohne
   Gruppen-/Weltschreibrechte oder symbolische Verknüpfungen. Standardziel:
   `/etc/nexowatt/license-trust.json`, Datei 0644, Herstellerverzeichnis 0755.
   Die Trust-Datei darf genau einen Hardlink haben. Keine rekursiven pauschalen
   Rechteänderungen am ioBroker-Datenbaum durchführen. Windows-Admin-Provisionierung
   wird ohne ACL-Nachweis abgewiesen; das ist vom Windows-Keygen zu unterscheiden.
3. Admin neu starten. Als Administrator `/nexowatt/license` öffnen und die
   dort angezeigte System-UUID übernehmen. Im Generator Home oder Pro, erlaubte
   kanonische Adapternamen, tatsächliche Mengen und Gültigkeitsdauer wählen.
4. Den erzeugten NWL2-Code über HTTPS oder den geschützten Loopback-Zugang
   importieren. Danach enthält die lokale Datei nur authentifizierten Ciphertext.
   Status und Adapterantworten enthalten keinen Code und keinen Ablageschlüssel.
5. Alte NW1-/HMAC-Lizenzen kontrolliert neu ausstellen. Es gibt keinen alten
   gemeinsamen Schlüssel und keine automatische unsignierte Migration.
6. Jeden Verbraucheradapter mit `packages/eos-license-client/` und dem Leitfaden
   anbinden. Ohne geprüfte Backend-Integration bewirkt dieser Admin kein neues
   Lizenzverhalten in anderen bereits installierten Adaptern.

## Zielsystemprüfung

- Home/Pro mit richtiger und falscher UUID, Adapterliste und Mengen testen.
  Pro-Funktionen benötigen ihre eigene Funktionsprüfung unmittelbar vor der Aktion.
- Manipulierte/abgelaufene/entfernte Lizenzen sowie Dienst- und Busausfall müssen
  gesperrte Arbeitsfunktionen ergeben. Höchstens 15 Sekunden alte Freigaben sind
  technisch möglich; eine blockierte Laufzeit benötigt unabhängige Gerätewatchdogs.
- Individuell geprüften sicheren Gerätezustand beim Lizenzverlust erreichen;
  physische Schutzfunktionen und notwendige Notregelungen erhalten.
- Mit zwei Geräten Passwortwechsel, Reset, Rollenentzug, Kontensperre und Neustart
  prüfen: alte Access-/Refresh-Tokens und WebSockets dürfen keine Rechte behalten.
- Remote-HTTP und DNS-Rebinding ablehnen; HTTPS, Host-Prüfung, lokale Einrichtung
  und Zertifikatserneuerung prüfen. Upload-Abbruch und erschöpftes Uploadbudget testen.
- Automatische Updates sind bis zum nachgewiesenen Herausgeber-/Integritäts-/
  Rollbackverfahren gesperrt. Manuelle Sicherheitsupdates bleiben durch berechtigte
  Administratoren möglich. Die externe MCP-Erweiterung ist deaktiviert; Chat-Befehle
  bleiben durch die bestehende EOS-Policy gesperrt.
- Sauberes npm ci, normale vollständige Builds, Typprüfung, tatsächliche Build-SBOM
  und Advisory-Auswertung vor Veröffentlichung ausführen. Vorhandene Lock-SBOMs
  sind keine installierte Komponentenliste.

## Rückfall

Admin stoppen und den vorherigen vollständigen Stand einschließlich konsistenter
Konfiguration zurückspielen. Lizenzdatei und lokaler AES-Schlüssel nur gemeinsam
und für dieselbe UUID wiederherstellen. Einen beschädigten Tresor nicht durch
automatische Neuerzeugung verdecken. Hersteller-Signierschlüssel und seine Passphrase
werden separat gesichert und niemals für die Wiederherstellung an Kunden verteilt.

Ein Rückfall auf alte Software kann bekannte Sicherheitslücken wieder öffnen und
ist kein Sicherheitsnachweis. Testgrund, Versionen, Soll/Ist, Konfiguration und
bereinigte Rohbelege festhalten; betriebliche Sicherheit unabhängig vom Admin erhalten.
