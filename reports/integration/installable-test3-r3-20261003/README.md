# Test.3 Revision 3: Sudo-Prüfung des Hostinstallers

03.10.2026. Runtime `0.2.0-test.3`, Lieferrevision **3**, signierte Sequenz **6**.
Ziel bleibt ein frischer isolierter Debian-13-ARM64-Testhost.

Diese Revision korrigiert die Auswertung einer erfolgreichen Root-Abfrage der
Sudo-Rechte eines EOS-Dienstkontos. Exitcode `0` mit einer vollständigen,
eindeutigen Kein-Recht-Meldung wird akzeptiert; erteilte Rechte, Warnungen,
Fehler und unvollständige Antworten bleiben gesperrt. Die gemeinsame Prüfung
wird von beiden Hostinstallern verwendet. Der Redis-Installationsstopp bleibt
unverändert bestehen.

Der Ablauf in [build-revision.cjs](build-revision.cjs) übernimmt den vorhandenen
App-Baum von Revision 2 bytegleich und prüft beide Inventare. Lockdatei, SBOM,
Build- und Transformationsbelege bleiben mit ihrer ursprünglichen Herkunft
erhalten. Der Runtime-Payload wird aus den aktuellen Host-/Runtimequellen neu
zusammengestellt, vollständig geprüft, mit einem flüchtigen Ed25519-Testschlüssel
signiert und erneut vollständig aus dem Archiv gelesen. Es wurde keine neue
npm-Installation durchgeführt; der private Testschlüssel wird nicht gespeichert.

Die 53 neuen Sudo-Regressionen sowie 20 vorhandene Archiv-/Katalog-/Checkouttests
laufen vor dem Bau. Sie sind lokale Prüfungen; POSIX-Eigentumsmetadaten der neuen
Installer-Fixtures werden auf Windows modelliert. Native Sudo- oder OS-Konten-
Operationen werden dadurch nicht nachgewiesen.

Das tatsächlich erzeugte Archiv, Signaturprüfung, Quellbindung, App-Wiederverwendung
und die unveränderten historischen Lieferungen werden in `build-verification.json`,
`archive-delivery-verification.json`, `signed-source-binding.json`, `app-reuse.json`
und `historical-delivery-preservation.json` dokumentiert.

[Sudo-Befund, Nutzer-Pi-Beobachtung und neue Bootstrap-Nachweise](../github-bootstrap-sudo-20261003/README.md).

**OFFEN:** vollständige Pi-Installation, native Sudo-/Linux-ARM64-/PostgreSQL-/
Systemd-/POSIX-/TLS-Abnahme, Wiederanlauf des abgebrochenen Test-Pi, tatsächlicher
Browserablauf mit Lizenz und Passwortvergabe, Reboot, Recovery, Backup/Restore
und sämtliche Hardware-/Anlagentests. Keine Produktionsfreigabe.
