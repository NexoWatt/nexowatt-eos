# Private GitHub-Testinstallation: Grenzen und Prüfungen

Der authentisch aus dem privaten Herstellerrepository bezogene README-Befehl
bindet den vollständigen Python-Loader an eine feste Git-Blob-ID und einen
separaten SHA-256. Ein ersetzter README-Befehl wäre selbst ein neuer
Vertrauensanker; ein Hash allein authentifiziert keine beliebige Downloadquelle.
GitHub-/Repository-Zugriffsrechte und Herstellerfreigabe bleiben deshalb relevant.

Die aktuelle Testlieferung liegt unter `delivery/bootstrap-test3-r2-apt` und bindet
den öffentlichen NWL2-Trustexport des vorhandenen lokalen Lizenzgenerators ein.
Der normale Aufruf `node cli.js trust <Ausgabedatei>` erzeugte einen neuen
öffentlichen Export mit `kid: nexowattEOS`, bytegleich mit der zuvor vorliegenden
Datei aus dem Downloadordner: 140 Bytes, SHA-256
`470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
Damit wurde die Zuordnung über den Generator festgestellt; die Prüfung beruht
nicht nur auf einem passenden Dateiformat. Dafür wurden kein privater Schlüssel
exportiert, keine Passphrase abgefragt und keine Lizenz ausgestellt.

Das neue Manifest enthält `ready: true`. Der frühere Einstieg mit fehlendem
Trust bleibt als unverändertes historisches Paket gesperrt. Seine Meldung
`BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING` tritt vor der Paketinstallation
auf. Betroffene Nutzer ersetzen den gesamten kopierten Block durch den aus der
[aktuellen README auf main](https://github.com/NexoWatt/nexowatt-eos/blob/main/README.md).
Der öffentliche Prüfschlüssel wird im Installerkit mitgeliefert; eine manuelle
Schlüsselübernahme oder Abschaltung der Prüfung auf dem Pi ist nicht nötig.

Der Loader akzeptiert nur ein exakt strukturiertes, erneut doppelt gehashtes
Manifest für `NexoWatt/nexowatt-eos` und die feste test.3-Revision 2. Er lädt
nur die drei bekannten Datenarchive und den gebundenen Vorbereitungscode.
Keine veränderlichen Branch-Downloads, Weiterleitungen oder Download-URL-Felder
werden ausgeführt. Dateilänge, Git-Blob-SHA-1 und SHA-256 müssen gemeinsam passen.
Der vorhandene Installer prüft darüber hinaus die Release-Signatur und sämtliche
Manifestdateien. Die historische test.3-Revision wird nicht überschrieben.

Der PAT kommt verdeckt aus `/dev/tty`. Vor dem Lesen werden Shell-Tracing,
automatischer Variablenexport und ein eventuell geerbtes Exportattribut entfernt.
curl erhält den Authorization-Header ausschließlich über Standardeingabe; Python
erhält ihn einmal über FD 3 und schließt diesen vor Netzwerk-/Unterprozessen.
Der PAT wird nicht in URL, argv, Umgebungsvariablen, Datei oder Protokoll abgelegt.
Er wird vor dem Installationsaufruf verworfen. Dies verspricht keine nachweisbare
vollständige Löschung aller internen Python-/TLS-Speicherkopien. Root und ein
kompromittierter Kernel bleiben außerhalb dieser Geheimnisschutzgrenze.

Alle Zielverbindungen verwenden geprüfte Zertifikate. Python bindet ausdrücklich
den geschützten Debian-CA-Pfad; Proxy-/TLS-Umgebungsvariablen steuern den Download
nicht. Der herstellerseitige Windows-Readback verwendet dessen OS-Zertifikate,
lehnt `SSL_CERT_FILE`/`SSL_CERT_DIR` vor dem Credentialabruf ab und ist **kein**
Nachweis für den CA-Pfad oder die UID-/Systemd-Grenzen auf Debian.

Alle Zielablagen werden privat und exklusiv angelegt. Der Hosthelfer wiederholt
die Frischsystemprüfung und prüft die drei bereits geladenen Dateien erneut
vor Entpacken oder APT. Kein Skip-/Force-/Offline-CLI-Schalter wurde ergänzt.
Vorhandene EOS-Daten und PostgreSQL-Cluster bleiben geschützt; ein abgebrochener
Teillauf ist zu prüfen und wird nicht automatisch überschrieben.

Die APT-Korrektur ergänzt ausschließlich `.pgp` neben `.gpg` und `.asc` für
einzelne Keyring-Dateinamen unter `/usr/share/keyrings/`. Das deckt die
[offizielle Raspberry-Pi-OS-ARM64-Vorlage](https://raw.githubusercontent.com/RPi-Distro/pi-gen/4d8ee447dd3d37e8b0ef8752e460d9082d9d435d/stage0/00-configure-apt/files/raspi.sources)
ab. Erlaubte Quellen, Distributionen, Komponenten, ARM64-Beschränkung,
Dateirechte und APT-Signaturprüfung bleiben bestehen. Inline-Schlüssel,
zusätzliche Trust-Optionen, andere Keyring-Verzeichnisse und zusätzliche
Architekturen werden dadurch nicht zugelassen.

Ungültige Deb822-Optionen liefern die festen Fehlercodes
`BOOTSTRAP_APT_SOURCE_OPTIONS_FIELDS`, `BOOTSTRAP_APT_SOURCE_OPTIONS_ENABLED`,
`BOOTSTRAP_APT_SOURCE_OPTIONS_ARCHITECTURES`,
`BOOTSTRAP_APT_SOURCE_OPTIONS_SIGNED_BY` oder
`BOOTSTRAP_APT_SOURCE_OPTIONS_COMPONENTS`. Die Diagnose enthält keine frei
übernommenen Inhalte der Paketquellen. Die tatsächliche Konfiguration des
gemeldeten Pi ist noch unbekannt; die allgemeine Kompatibilitätskorrektur
belegt deshalb nicht die konkrete Fehlerursache dieses Geräts.

Die bisherigen Lieferordner bleiben unverändert. Der neue README-Block bindet
den geänderten Bootstrap und sein neues Manifest; alte, bereits kopierte
Blöcke laden weiterhin die jeweils alte Version. Die signierte Runtime
test.3 Revision 2 mit Sequenz 5 bleibt unverändert.

Der GitHub-PAT ersetzt weder den öffentlichen NWL2-Lizenzprüfschlüssel noch eine
Gerätelizenz. Die Schlüsselzuordnung erfolgt vor dem Paketbau; auf dem Pi wird
sie nicht erneut erfragt. Die belegte Herkunft aus dem lokalen Generator ist
noch kein Nachweis einer echten signierten Lizenzannahme auf dem Zielgerät.
UUID-Anzeige, Frontendpasswort, Lizenzrechte und technische Steuerungssperren
bleiben bestehen.

Die Tests verwenden isolierte Daten und prüfen auch falsche Hashes, Größen,
Weiterleitungen, Authfehler, manipulierte Helfer, fehlenden Herstellertrust,
Tokenweitergabe und geschützte Dateitypen. Eine vollständige Pi-Neuinstallation,
reale systemd-/PostgreSQL-/TLS-Abnahme, Abbruch-/Reboottest,
Browser-Gesamtlauf einschließlich CA-Vertrauen, reale Lizenzannahme und sämtliche
Geräte-/Hardwaretests bleiben **OFFEN**. Neuinstallation ist kein Flottenupdate;
eine dauerhafte Signatur-/Update-/Rollbackkette wird damit nicht bereitgestellt.

Die Nachweise zur aktuellen Lieferung stehen im
[Prüfbericht zur APT-Kompatibilitätskorrektur](../../reports/integration/github-bootstrap-apt-20261003/).
Die einmalige Herstellertrust-Zuordnung ist im
[vorherigen GitHub-Prüfbericht](../../reports/integration/github-bootstrap-ready-20261003/README.md)
dokumentiert.
