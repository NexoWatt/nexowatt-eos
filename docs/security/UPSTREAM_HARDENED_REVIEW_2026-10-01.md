# Nachprüfung: ioBroker `--hardened` und Denis’ Rückmeldung

Stand: 01.10.2026. Zweck: Die vom Nutzer übermittelte Rückmeldung mit dem aktuellen Upstream-Quellstand abgleichen und die EOS-Nachweise fortschreiben. Keine Installation, Migration, Rechteänderung oder Nachricht an Dritte ausgeführt. Der bestehende EOS-Härtungskandidat wurde nicht durch Upstream-Code ersetzt.

## Quelle und tatsächlicher Prüfstand

- Repository: [ioBroker/ioBroker](https://github.com/ioBroker/ioBroker).
- PR [#760](https://github.com/ioBroker/ioBroker/pull/760), Commit [`2fd87093573971810cf7f7d2076354197f2bd956`](https://github.com/ioBroker/ioBroker/commit/2fd87093573971810cf7f7d2076354197f2bd956), Commitzeit 30.09.2026 21:23:31 UTC.
- Änderungstitel: `Add --hardened option to installer and fixer`.
- Fünf Dateien über die GitHub-Verbindung gelesen und gegen ihre Git-Blob-SHA-1 geprüft: `PARAMETERS.md`, `installer_library.sh`, `installer.sh`, `fix_installation.sh`, `node-update.sh`. Zusätzliche SHA-256 im maschinenlesbaren Nachweis.
- Vier Shellsyntaxprüfungen erfolgreich. Sieben isolierte, hashgebundene Quellfragmenttests erfolgreich. Kein vollständiger Installer-/Fixerlauf, keine tatsächliche sudo-Auswertung, Gruppenmigration oder Capabilityprüfung auf Hardware.
- Der direkte Abruf von `https://iobroker.net/install.sh` und `/fix.sh` scheiterte am Proxy-Verbindungszeitlimit. Der veröffentlichte Inhalt dieser Auslieferungsadressen wurde deshalb **nicht** bestätigt. Ein Git-Merge ist kein Nachweis des ausgelieferten Skripts.

Die beiden von Denis genannten Befehle stehen in der neuen Upstream-Dokumentation. Sie wurden hier weder ausgeführt noch als sofortige Anleitung für eine bestehende EOS-Anlage übernommen. Der EOS-Fork und sein lokaler Härtungskandidat werden durch einen Upstream-Merge nicht automatisch aktualisiert.

## Was bestätigt ist

1. Installer und Fixer erkennen `--hardened`. Ohne Parameter oder erkannten Bestandsmarker bleibt die bisherige weitreichende Policy bestehen; Hardening ist bei Upstream optional.
2. Im gehärteten Linux-Policyzweig entfallen `iobroker ALL=(ALL) ALL` und die NOPASSWD-Freigaben für allgemeine Rootwerkzeuge wie Paketverwaltung, `systemd-run`, `mount`, `docker` und `setcap`.
3. Dienststeuerung und die CLI unter dem Dienstkonto werden von `ALL` auf `%iobroker` begrenzt. Damit ist die Freigabe für beliebige lokale Benutzer im erzeugten Text beseitigt.
4. Ein exakt passender Marker in der sudoers-Datei erhält den Modus ohne erneut übergebenen Parameter. Die Schreibkette enthält `chown root`, Modus 0440 und eine `visudo`-Prüfung. Die tatsächlichen Eigentums-/Fehlerzustände wurden nicht am Host geprüft.
5. Im gehärteten Gruppenpfad wird Docker nicht neu zugeteilt; stattdessen wird seine Entfernung versucht. Andere aufgeführte Geräte-/Redis-Gruppen werden weiterhin aufgenommen, sofern vorhanden.

Belege: `installer_library.sh:660–783`; Parameterspezifikation: `PARAMETERS.md`, Abschnitt `Hardened mode`. Der FreeBSD-Zweig enthält entsprechende Änderungen, wurde aber nicht dynamisch geprüft. Keine Übertragung auf Windows behauptet.

## Präzisierungen und verbleibende Risiken

### UPH-001: Netzwerk-Capabilities bleiben im Linux-Installationspfad

`install_necessary_packages` enthält in `installer_library.sh:311–326` weiterhin `setcap` für die gemeinsame Node-Binärdatei. Außerhalb des Containerzweigs werden `cap_net_admin,cap_net_bind_service,cap_net_raw+eip` angefordert. Dieser Block hat keine `hardened`-Abfrage. Er wird im normalen Installer-/Fixerablauf erreicht.

**Nachweis:** statische Quellbeobachtung; kein tatsächliches Setzen oder Ausnutzen dieser Rechte. Dateisystem, Container und Hostkonfiguration können das Ergebnis beeinflussen. **Bedeutung:** Kein allgemeiner Rootzugriff allein aus diesen Capabilities abgeleitet; dennoch verbleiben erhebliche Netzwerkbefugnisse. Das bestehende EOS-Profil entfernt bekannte globale Node-Capabilities und begrenzt sie im systemd-Dienst; auch das benötigt reale Abnahme. Bezug: ursprüngliche Zusatzbeobachtung INS-008, EOS-REQ-002 und EOS-REQ-015. STRIDE: Tampering, Elevation of Privilege.

### UPH-002: Fehler beim Docker-Gruppenentzug nicht zuverlässig weitergegeben

Der Aufruf `gpasswd -d` in `installer_library.sh:776–783` wird nicht auf Erfolg geprüft. Der Schleifenlauf geht weiter. Im Stubtest schlägt die Entfernung fehl, nachfolgende Gruppenoperationen gelingen und der Gruppenblock endet trotzdem mit Exit 0.

**Grenze:** Kein reales Weiterbestehen einer Docker-Mitgliedschaft nach Installerlauf nachgewiesen. **Maßnahme:** Entfernung und tatsächliche Gruppenmitgliedschaft verifizieren, primäre Gruppe berücksichtigen, bei Fehler abbrechen und alte Prozesse kontrolliert beenden/neustarten. Eine geänderte Gruppendatenbank entzieht laufenden Prozessen nicht rückwirkend ihre Gruppen. Bezug: NW-EOS-260930-01, EOS-REQ-002/-014/-017. STRIDE: Elevation of Privilege, Tampering.

### UPH-003: Fehler beim Lesen des Modusmarkers wird wie fehlender Marker behandelt

`is_hardened_setup` unterscheidet in `installer_library.sh:684–687` nicht zwischen `grep`-Exit 1 (kein Treffer) und einem Lesefehler. Ohne ausdrückliches Flag führt der Policyzweig bei simuliertem Exit 2 in die normale breite Policy. Mit ausdrücklichem Flag bleibt er im Test gehärtet.

**Grenze:** Nur Entscheidung und Textgenerierung reproduziert; keine reale sudoers-Ersetzung nach einem Lesefehler getestet. Der weitere Fehlerpfad muss im vollständigen Fixerlauf geprüft werden. **Maßnahme:** erkannte Abwesenheit und unlesbare/fehlerhafte Policy unterscheiden; bei unbekanntem Zustand abbrechen. Bezug: NW-EOS-260930-01/-02, EOS-REQ-003/-014/-017. STRIDE: Tampering, Elevation of Privilege.

### Reichweite der Formulierungen

„Keinerlei sudo-Rechte“ ist für den generierten Text zu pauschal: `%iobroker` erhält weiter genau benannte sudo-Dienststeuerungsregeln. Ob und wie sie das Dienstkonto betreffen, ist mit dessen tatsächlicher Gruppenmitgliedschaft zu prüfen. Die gefährlichen allgemeinen Rootwerkzeuge werden im gehärteten Zweig aber ausdrücklich nicht mehr freigegeben.

„Kann den Host nicht übernehmen“ wird nicht als Sicherheitsgarantie übernommen. Die Änderung schließt bestimmte Eskalationswege; sie beweist keine vollständige Isolation. Andere sudoers-Dateien, Gruppen, Dateicapabilities, beschreibbare Wartungsprogramme, privilegierte Nachfolgeaufrufe und Betriebssystemlücken bleiben Teil des Bedrohungsmodells. Auch ohne Root kann ein kompromittierter Adapter im Rahmen seiner Runtime-Rechte Zustände, Konfiguration, Geheimnisse und Gerätefunktionen beeinflussen.

## Abgleich der ursprünglichen Befunde

| Ursprüngliche Kennung NW-EOS-260930 | Einordnung nach Rückmeldung und Quellprüfung |
|---|---|
| 01: weitreichende Dienstkonto-Rechte | Upstream bietet einen belegten Härtungsmodus. Erfolgreiche Migration, Fehlerpfade und effektive Rechte offen; nicht am EOS-Produkt geschlossen. |
| 02: Verwaltungszugriff aller lokalen Benutzer | Im gehärteten Policytext auf die ioBroker-Gruppe begrenzt. Tatsächliche Gruppen-/Rollentrennung und Rechtewirkung offen. |
| 03: schreibbarer globaler Verwaltungsbefehl | Voraussetzung einer Dienstkonto-Kompromittierung war bereits dokumentiert. Gerade für deren Eindämmung relevant; `--hardened` verlegt den Wrapper nicht aus dem Runtime-Baum. |
| 04: Updater-Log-Symlinks | Bedingte Eskalations-/Integritätskette bleibt relevant. `node-update.sh` enthält weiterhin den zeitbasierten Runtime-Pfad mit `touch`/`chown`. Keine neue reale Ausnutzung durchgeführt. |
| 05/06: optionaler Redis-Pfad | Auf diesen Pfad begrenzen; keine pauschale Betroffenheit jeder Installation. Sein Nichtgebrauch beweist umgekehrt keine verschlüsselte Controller-/Adapterkommunikation. |
| 07/11/12: Lieferung, Nachweise, unsicherer TLS-Workaround | Produktfreigabe, gebundene Artefakte, SBOM, sichere Build-/Updateverfahren bleiben EOS-Herstelleraufgaben. Ein Flag ersetzt diese Maßnahmen nicht. |
| 08: SFTP-Deploy | Upstream-Deploypfad getrennt von Kundenruntime bewerten; unverändert nicht durch den Härtungsmodus behoben. |
| 09/10: Windows-Profil | Für ein ausdrücklich nur Linux/RPi umfassendes Release außerhalb des Plattformprofils; bei späterem Windows-Support wieder relevant. Kein Windows-Fix behauptet. |

Die ersten beiden Punkte werden als **Upstream-Maßnahme verfügbar, EOS-Integration und reale Nachprüfung offen** fortgeschrieben. Die Rückmeldung erklärt das ursprüngliche Design, widerlegt aber nicht den damaligen Konfigurationsbefund. Keine Befundnummer wird still entfernt und keine CVE behauptet.

## Konsequenzen für das EOS-Produkt

- Den gehärteten Modus als verbindliche Produktvorgabe behandeln. Den bestehenden strengeren EOS-Kandidaten nicht blind durch diesen Upstream-Patch ersetzen: root-eigener CLI-Einstieg, Capabilitybegrenzung, kontrollierte Migration und weitere dortige Maßnahmen müssen erhalten bleiben.
- Benötigte OS-Pakete im geprüften Systembuild vorinstallieren. Adapter sollen diese nicht zur Laufzeit mit allgemeinen Rootrechten nachinstallieren.
- Backup-Mounts, Hostneustart und Wartung über einen getrennten Dienst mit wenigen festen Aktionen oder eine unabhängig berechtigte OS-Administration abwickeln. Backup/Restore und betroffene Adapter anschließend auf dem Zielabbild prüfen.
- Kuratiertes Repository als Angebots-/Versionsauswahl behandeln. Die im Nutzerzitat genannten zusätzlichen Installationswege und das normale Admin-Codeausführungsmodell müssen separat begrenzt werden. Sie wurden in dieser eng begrenzten Nachprüfung nicht erneut vollständig ausgeführt.
- Den JavaScript-Adapter, falls benötigt, als Codeausführung innerhalb der Runtime-Vertrauenszone behandeln. `exec=false` und keine zusätzlichen npm-Module begrenzen Funktionen, ersetzen aber keine belastbare Sandbox oder getrennte Dienstrechte.
- UI-Anmeldung, Lizenzvertrauen, interne TLS-/mTLS-Verbindungen, Adapterautorisierung und die 33 Integrationspunkte der vorherigen Etappe bleiben durch dieses Installerflag unverändert.

## Tests, Reproduktion und Dokumentationsgrenzen

```bash
EOS_UPSTREAM_INSTALLER_SOURCE=/path/to/pinned-upstream-files \
  python3 tests/integration/upstream-hardened-source.test.py
```

Benötigt wird `installer_library.sh` mit dem im Test gebundenen SHA-256. Das Skript lädt weder Quellen noch Pakete aus dem Netz. Es führt ausschließlich den gelesenen Policyblock vor den Dateischreiboperationen und den Gruppenblock mit inerten Stubs aus. Es führt niemals das komplette Installationsskript aus. Keine Rootwerkzeuge, echten Gruppenänderungen, Netzwerklistener oder Gerätebefehle. Die Tests belegen Text-/Kontrollfluss, keine reale sudo- oder Betriebssystemisolation.

Ergebnis: **7 Tests bestanden**. Darunter positive Kontrollfälle und Reproduktionen der beiden Fehlerpfade. Ein erster Lauf scheiterte an einer Namenskollision im neu erstellten Testharness; dieser Testfehler wurde korrigiert. Der alte Fehlerlog bleibt getrennt erhalten und wird nicht als Produktbefund oder erfolgreicher Test gezählt. Syntaxprüfungen: **4 erfolgreich**.

Rohbelege: `reports/upstream-hardened-20261001/`. Maschinenlesbarer Status mit Quell- und Testhashes: `system/integration/upstream-hardened-observations.json`. Historische Berichte bleiben auf ihren damaligen Quellenstand bezogen. Keine neue vollständige SBOM erzeugt, weil kein Produktbuild und keine neue Laufzeitkomponente integriert wurden. Keine CRA-/IEC-Freigabe abgeleitet.

Nächste Abnahme: gebundene Upstream-Quellen mit dem EOS-Profil zusammenführen; frische und bestehende Linux-Installation mit Erfolg und Fehlern der Migration prüfen; effektive sudo-/Gruppen-/Capabilityrechte und neue Prozesse testen; danach Gerätekommunikation, Backup/Restore und vorhandene UI-/EMS-Funktionen nachprüfen. Der aktuelle Produktstand bleibt nicht freigegeben.
