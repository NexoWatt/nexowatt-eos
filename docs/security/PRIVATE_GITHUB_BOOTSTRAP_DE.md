# Private GitHub-Testinstallation: Grenzen und Prüfungen

Der authentisch aus dem privaten Herstellerrepository bezogene README-Befehl
bindet den vollständigen Python-Loader an eine feste Git-Blob-ID und einen
separaten SHA-256. Ein ersetzter README-Befehl wäre selbst ein neuer
Vertrauensanker; ein Hash allein authentifiziert keine beliebige Downloadquelle.
GitHub-/Repository-Zugriffsrechte und Herstellerfreigabe bleiben deshalb relevant.

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

Der GitHub-PAT ersetzt weder den öffentlichen NWL2-Lizenzprüfschlüssel noch eine
Gerätelizenz. Die Schlüsselzuordnung ist eine Herstellerentscheidung vor dem
Paketbau; auf dem Pi wird sie nicht erneut erfragt. UUID-Anzeige, Frontendpasswort,
Lizenzrechte und technische Steuerungssperren bleiben bestehen.

Die Tests verwenden isolierte Daten und prüfen auch falsche Hashes, Größen,
Weiterleitungen, Authfehler, manipulierte Helfer, fehlenden Herstellertrust,
Tokenweitergabe und geschützte Dateitypen. Eine vollständige Neuinstallation,
Abbruch-/Reboottest, Browser-CA-Vertrauen, reale Lizenzannahme und sämtliche
Geräte-/Hardwaretests bleiben **OFFEN**. Neuinstallation ist kein Flottenupdate;
eine dauerhafte Signatur-/Update-/Rollbackkette wird damit nicht bereitgestellt.
