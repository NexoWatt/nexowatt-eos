# R8 direkt auf den verwalteten Teststand aktualisieren

Stand: 23.10.2026. Der neue Quellpfad aktualisiert ein gesundes R8 direkt von
Sequenz 11 auf die neue verwaltete Basis mit Sequenz 15. R9, R10 und R11 werden
weder heruntergeladen noch installiert oder gestartet. Ein veröffentlichtes,
signiertes Paket und ein bytegenau zurückgelesener Betreiberbefehl stehen für
diesen Pfad noch aus. Die bisherigen R9-/R11-Befehle sind kein Ersatz dafür.

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
mit Hash `d8808e00b958f476684005a95f543d9dfb3d4532bd54f31552a701d1e6aabdf6`.
Dieser am 23.10.2026 bestätigte Ersatzschlüssel wird verwendet, weil die
Passphrase des zuvor vorgesehenen Herstellerschlüssels nicht mehr verfügbar
ist. Der [Änderungs- und Prüfvermerk](../../reports/integration/manufacturer-key-replacement-20261023/README_DE.md)
trennt die neue Herstellerbindung vom unveränderten R8-Ausgangsvertrauen und
vom weiterhin qualifizierten Laufzeitstand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Eine bereits ausgeführte Vertrauensumstellung auf Geräten ist damit nicht belegt.
Der alte R8-Schlüssel ist keine allgemeine Berechtigung zur Schlüsselrotation.
Der Betreiber muss später den vollständig veröffentlichten, unveränderten Befehl
verwenden; dieses Dokument enthält bewusst keinen ungepinnten Download-Aufruf.

Vor diesem einmaligen Systemwechsel müssen eine aktuelle Sicherung und ein
geprüfter Rückfallstand vorhanden sein. Der Vorgang läuft unter einem zeitlich
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
Signierrechner und ist kein Bestandteil der Lieferung.

## Fehler und Rückfall

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
keine auf einem Pi ausgeführte Migration. Signierung, öffentlicher Readback,
vollständiger R8-Systemd-/PostgreSQL-Test einschließlich Abbruch/Neustart,
Wiederherstellung und physische Anlagenabnahme bleiben offen.
