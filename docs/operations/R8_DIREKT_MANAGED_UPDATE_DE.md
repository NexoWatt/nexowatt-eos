# R8 direkt auf den verwalteten Teststand aktualisieren

Stand: 23.10.2026. Der neue Quellpfad aktualisiert ein gesundes R8 direkt von
Sequenz 11 auf die neue verwaltete Basis mit Sequenz 15. R9, R10 und R11 werden
weder heruntergeladen noch installiert oder gestartet. Das tatsächliche signierte
Paket liegt inzwischen vor und hat die unabhängige Signatur- und vollständige
Archivprüfung bestanden. Es ist als
[GitHub-Testrelease](https://github.com/NexoWatt/nexowatt-eos/releases/tag/managed-test-15-95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534)
mit Kennzeichnung `prerelease` veröffentlicht. Der vollständige öffentliche
Rücklesetest, die Bereitstellung des signierten leeren Update-Kanals und die
bytegenaue öffentliche Rückprüfung des Betreiberbefehls sind abgeschlossen und
im [Veröffentlichungsnachweis](../../reports/integration/managed15-publication-20261023/README_DE.md)
dokumentiert. Der Befehl ist für den kontrollierten R8-Test verwendbar. Die bisherigen
R9-/R11-Befehle sind kein Ersatz dafür.

Ziel sind Node.js 24.22.1, js-controller 7.2.5, die sechs eigenen Adapter und die
[automatischen Sicherheitsupdates](AUTOMATISCHE_SICHERHEITSUPDATES_DE.md).
Weitere freigegebene Node-24-Versionen werden anschließend automatisch über die
signierte Herstellerkette installiert. Linux-Sicherheitsupdates bleiben innerhalb
der vorhandenen Debian-Version automatisch. Hauptversionswechsel sind gesperrt.

## Gültiger Ausgangszustand

Der Koordinator verlangt genau das veröffentlichte R8 mit Sequenz 11,
Release-ID `eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`,
altem Prüfschlüsselhash
`bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5`
und `/usr/bin/node` 24.21.0 auf Linux ARM64. Beide Werte stammen aus der
historischen signierten Lieferung. Der Erststart muss abgeschlossen sein,
PostgreSQL und Controller müssen gesund laufen, und die vorhandenen
Release-Dateien und systemd-Units müssen unverändert authentifiziert werden.

Die vier zusätzlichen Adapter dürfen noch nicht als Instanzen existieren.
Der Admin muss seine bereits in R8 enthaltene Rechteprojektion vollständig
abgeschlossen haben. Abweichende oder unvollständige Installationen werden vor
Datenbankänderungen abgewiesen. Bereits vorhandene Wartungssperren, ein fremder
Update-Dienst oder eine fremde APT-/Dienstneustart-Policy werden nicht überschrieben.

Die Linux-Werkzeuge `ip`, `nft` und `dnsmasq` müssen bereits aus den freigegebenen
Distributionspaketen vorhanden sein. R8 allein garantiert insbesondere
`nftables`/`dnsmasq-base` nicht. Fehlende Werkzeuge führen vor der Umstellung zum
Abbruch. Der Migrationskoordinator installiert keine beliebigen OS-Pakete und
ersetzt weder `/usr/bin/node` noch die bestehende PostgreSQL-Installation.
Ein aktiver APT-/dpkg-/EOS-Sicherheitsupdatelauf wird nicht beendet; in diesem
Fall wird die Migration verschoben.

## Einmaliger, authentifizierter Übergang

Der Hersteller erstellt aus dem fertig signierten Sequenz-15-Paket einen
separaten öffentlichen Einstieg mit festem Archiv-, Skript-, Release- und
Schlüsselhash. Dieser Einstieg verankert den dauerhaften Hersteller-Prüfschlüssel
mit Hash `518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40`.
Dieser später am 23.10.2026 bestätigte Ersatzschlüssel wird verwendet, weil auch
die Passphrase des ersten Ersatzschlüssels nicht mehr verfügbar ist. Die beiden
früheren öffentlichen Schlüssel und Prüfberichte bleiben historisch erhalten;
eine Kompromittierung wurde nicht gemeldet. Der
[Änderungs- und Prüfvermerk](../../reports/integration/manufacturer-key-replacement-20261023-2/README_DE.md)
trennt die neue Herstellerbindung vom unveränderten R8-Ausgangsvertrauen und
vom weiterhin qualifizierten Laufzeitstand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Eine bereits ausgeführte Vertrauensumstellung auf Geräten ist damit nicht belegt.
Der alte R8-Schlüssel ist keine allgemeine Berechtigung zur Schlüsselrotation.
Der Betreiber verwendet den vollständig veröffentlichten, unveränderten Befehl
aus [R8_UPDATE_COMMAND.txt](../../delivery/r8-managed15/R8_UPDATE_COMMAND.txt).
Diese Datei enthält den vom unveränderten Generator erzeugten Befehl.
Die vollständige öffentliche Rückprüfung und die Feed-Bereitstellung sind
nachgewiesen; dieses Dokument enthält keinen ungepinnten Download-Aufruf.

Vor diesem einmaligen Systemwechsel müssen eine aktuelle Sicherung und ein
geprüfter Rückfallstand vorhanden sein. Der Test bleibt bei
`physicalControlEnabled: false`; physische Regelung wird nicht freigegeben.
Den optionalen alten `pgsql`-Provider weder aktivieren noch für
Wiederherstellungen verwenden. Der Vorgang läuft unter einem zeitlich
begrenzten systemd-Koordinator weiter, auch wenn die SSH-Verbindung abbricht.
Der Koordinator prüft das neue ARM64-Node-/Native-Paar vor dem Stoppen des
Controllers. Eine private, dauerhaft geschriebene Planung erfasst Hoständerungen
und die eng begrenzte Datenbankanpassung. Der gemeinsame Wartungs-Lock verhindert
parallele EOS- und Linux-Installationen.

Bestehende Konten, Passwort-Hashes, Rollen, Einstellungen, UUID, Lizenzvertrauen,
Lizenzen, TLS-Zertifikate und Nutzdaten werden nicht neu eingerichtet. Das
PostgreSQL-Schema muss exakt gleich bleiben. Im vorhandenen Bootstrap-Marker
ändert sich ausschließlich die Controller-Version von 7.2.2 auf 7.2.5.
Vier zusätzliche Adapterinstanzen werden mit leeren Gerätebeständen und ohne
physische Freigabe ergänzt. Die beiden vorhandenen Management-Instanzen bleiben
unverändert. Die neue Netzverwaltung startet unkonfiguriert.

Die systemd-Units wechseln auf die signierte Node-Datei des jeweils aktiven
Releases. Erst nach erfolgreichen Datenbank-, Adapter- und HTTPS-Prüfungen
werden der Update-Dienst und der Linux-Sicherheitsupdate-Timer aktiviert. Die
ursprünglichen öffentlichen und privaten Lizenz-/TLS-Schlüssel bleiben am Pi;
der private Hersteller-Signierschlüssel gehört weiterhin nur auf den
Signierrechner und darf kein Bestandteil der Lieferung sein.

## Kontrollierter Test mit PuTTY

1. Die oben genannten Ausgangsbedingungen, aktuelle Sicherung und den geprüften
   Rückfallstand sicherstellen. Die Anlage bleibt ohne physische Steuerung.
2. Per PuTTY am R8-Test-Pi anmelden. Die Datei
   [R8_UPDATE_COMMAND.txt](../../delivery/r8-managed15/R8_UPDATE_COMMAND.txt)
   öffnen und deren **vollständige einzelne Befehlszeile** unverändert im
   SSH-Terminal ausführen. Bei der `sudo`-Abfrage das Passwort des Pi-Benutzers
   eingeben. Der Hersteller-Signierschlüssel wird hierfür nicht benötigt.
3. Den Abschluss beziehungsweise eine konkrete Fehlermeldung abwarten. Nach
   erfolgreichem Abschluss ausschließlich folgenden Versions-/Dienststatus und
   die vier öffentlichen Releasefelder prüfen:

```bash
/opt/nexowatt/eos/current/node-runtime/bin/node --version

systemctl show \
  nexowatt-eos-controller.service \
  nexowatt-eos-postgresql.service \
  nexowatt-eos-updates.service \
  nexowatt-eos-os-updates.timer \
  --property=Id,ActiveState,SubState,Result --no-pager

sudo /usr/bin/python3 -I -B - <<'PY'
import json
from pathlib import Path

state = json.loads(Path("/etc/nexowatt-eos/release-state.json").read_text())
fields = ("releaseId", "sequence", "nodeVersion", "profile")
print(json.dumps({key: state.get(key) for key in fields}, indent=2))
PY
```

Erwartet sind Node `v24.22.1`, Sequenz `15`, Profil `test` und Release-ID
`95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534`.
Controller, PostgreSQL und Updatedienst sollen aktiv laufen; der
OS-Update-Timer soll aktiv auf den nächsten Termin warten. Diese Abfrage liest
keine Geräte-, Lizenz- oder Kundendaten aus. Eine erfolgreiche Statusabfrage ist
noch keine vollständige Pi-, Wiederherstellungs- oder Anlagenabnahme.
`/usr/bin/node` bleibt absichtlich auf dem vorhandenen Systemstand; für EOS ist
die oben abgefragte gebündelte Node-Datei maßgeblich. Anschließend im Admin unter
System/Grundeinstellungen → EOS-Updates → Updates prüfen den Kanalabruf prüfen.
Beim zunächst leeren gültigen Feed ist „kein Update verfügbar“ korrekt.

## Fehler und Rückfall

### `REPAIR_CONTROLLER_BUSY` in `SOURCE_VERIFY`

Beim gemeldeten Pi-Versuch vom 24.10.2026 war der Controller am ersten
Dienstzustandscheck nicht exakt `active`. Dieser Fehlername bedeutet hier
**nicht**, dass ein laufender Controller gestoppt werden soll. Der Abbruch liegt
vor Aktivierungssperre, Release-Installation sowie Host-/Datenbankmigration.
`manualRecoveryRequired:true` ist in dieser frühen Fehlerausgabe pauschal und
belegt allein keine begonnene Migration. Der Nachlauf
`REPAIR_NO_INCOMPLETE_TRIAL` bedeutet, dass er keine Aktivierungssperre vorfand.
Ein aktueller Dienstzustand ist dadurch noch nicht bekannt.

Zuerst diesen ausschließlich lesenden Statusblock auf dem Pi ausführen:

```bash
systemctl show \
  nexowatt-eos-controller.service \
  nexowatt-eos-postgresql.service \
  nexowatt-eos-upload.service \
  nexowatt-eos-r8-managed-update.service \
  --property=Id,LoadState,ActiveState,SubState,Result,ExecMainCode,ExecMainStatus,MainPID,NRestarts,ConditionResult,AssertResult \
  --no-pager
```

Bis zur Auswertung keinen erneuten Updateversuch, Neustart, `reset-failed` oder
manuelles Löschen von Sperren durchführen. Keine vollständigen Konfigurationen,
Umgebungsvariablen oder ungefilterten Journale übermitteln. Der
[Befundvermerk](../../reports/integration/r8-controller-precondition-20261024/README_DE.md)
trennt die gemeldete Beobachtung von der Quellprüfung und den offenen Hostdaten.

### Fehler nach Beginn der Umstellung

Ein fehlgeschlagener Testwechsel stellt soweit überprüfbar die ursprünglichen
Datenbankmarker, Host-Units, R8-Releasezeiger, Releasezustand und R8-Webdateien
wieder her. Erst ein erneuter positiver Bereitschaftsnachweis erlaubt den Start
von R8 und das Entfernen der eigenen Sperren. Unbekannte Änderungen,
unterbrochene Wiederherstellung oder fehlgeschlagene Prüfungen halten den
Controller gestoppt und die Wartungssperre gesetzt. Es gibt keine Force-Option.

Private Pläne und Journale liegen unter `/etc/nexowatt-eos/r8-managed-*`.
Netzwerk- und Update-Nachweise bleiben für die Diagnose erhalten. Das beim
Übergang angelegte leere Wartungs-Lockfile und gegebenenfalls ein unprivilegiertes
Netzwerk-Dienstkonto bleiben beim Rückfall bestehen; ein gehaltener Lock-Inode
wird nicht gelöscht. Wiederholung nach einem begonnenen fehlgeschlagenen
Migrationsversuch erfordert eine Prüfung der erhaltenen Belege. Es werden keine
alten Lieferarchive umgeschrieben und keine Nutzdaten rekursiv gelöscht.

## Tatsächlicher Prüfstand

Die [Migrationsbelege](../../reports/integration/r8-direct-managed-20261022/README.md)
trennen isolierte Vertrags-/Fehlertests, tatsächliche Dateisystemoperationen und
noch offene Zielsystemprüfungen. Die Tests verwenden für systemd, Datenbank,
Releaseinventar und native ARM64-Proben ausdrücklich Testdoubles. Sie belegen
keine auf einem Pi ausgeführte Migration.

Die inzwischen erhaltene signierte Lieferung bestand am 23.10.2026 die
Ed25519-Signaturprüfung und den vollständigen Archiv-Readback mit 22.606
Payload-Dateien. Payload-Vertrag, 646 SBOM-Komponenten und die Herkunft von
169 Quell-/Hostdateien wurden geprüft. Die erneut unabhängig abgerufenen
CI-Nachweise binden den Laufzeitinhalt; deren 15 historische native Tests wurden
nicht erneut ausgeführt. Details stehen im
[Archivprüfbericht](../../reports/integration/managed15-archive-verification-20261023/README_DE.md).
Dies ist keine pauschale Geheimnisfreiheits-, Produktions- oder Anlagenfreigabe.

Das signierte Paket ist als Testrelease veröffentlicht. Öffentlicher
Rücklesetest, gültiger signierter leerer Feed und bytegenaue Rückprüfung des
Betreiberbefehls sind im
[Veröffentlichungsbericht](../../reports/integration/managed15-publication-20261023/README_DE.md)
abgeschlossen dokumentiert. Der vollständige R8-systemd-/PostgreSQL-Test einschließlich
Abbruch/Neustart, Wiederherstellung und physischer Anlagenabnahme bleibt offen.
Es gibt keine Produktions- oder CRA-Freigabe.
