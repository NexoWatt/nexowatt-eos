# Installationsvorprüfung, 01.10.2026

Die neue lesende Vorprüfung bindet das signierte integrierte Testpaket, dessen
Katalog, Paketbaum/SBOM und die geschützten Einrichtungsdateien an dieselben
Validatoren wie die Installation. Sie verändert keine Dienste, Konten oder
Zertifikate. Die Prüfung der Admin-/UI-Ports 8081/8188 ist außerdem im eigentlichen
signaturprüfenden Installer und dessen Host-Recheck enthalten. Ein Aufruf ohne
separate Vorprüfung umgeht diese Prüfung nicht. Beim bisherigen Core-Profil
bleiben die Webports unberücksichtigt.

Hostprüfungen erlauben nur geschützte ausführbare Systemwerkzeuge; geschützte
Distributionssymlinks bleiben erlaubt. Veränderbare Pfade, Setuid/Setgid,
Node-Dateicapabilities, unzugängliche Laufzeitpfade, unbelegte oder fehlerhafte
Werkzeugantworten sowie ein nicht antwortender systemd-Manager verhindern die
Installation. OpenSSL wird lesend nach TLS-1.3-Ciphers geprüft. Eine Redis-Version
beweist keine TLS-Unterstützung: Der tatsächliche authentifizierte TLS-Handshake
bleibt im Bootstrap vor dem Controllerstart erforderlich.

Mit Node 24.21.0 bestanden **72 von 72 Tests**, ohne ausgelassene Tests. Diese
umfassen echte Signatur-/Payload-/SBOM-Prüfungen an kleinen Paketfixtures,
geschützte Einrichtungsdateien, negative Berechtigungs- und Eingabefälle sowie
Orchestrierung mit simulierten Host- und Schreibgrenzen. Die Fixtures sind kein
lauffähiges Produkt. Die bestehenden Onboarding- und Releaseprüfungen liefen mit.

Eine Installation auf dem Test-Pi oder einer gestarteten Debian-VM, die
ARM64-Laufzeit, der tatsächliche Redis-TLS-Handshake und die Systemd-Sandbox auf
dem Zielgerät wurden in diesem Prüfauftrag **nicht ausgeführt**. Der derzeitige
vollständige Installationspfad lautet `eos-base install --start yes` und danach
`onboard-ui`; dabei bleiben die Adapter bis zum Enrollment deaktiviert.
`--start no` alleine initialisiert die Datenbanken nicht.

Maschinenlesbare Ergebnisse, Quellhashes, STRIDE-Bedrohungen, verbleibende Risiken
und die genaue Prüfgrenze stehen in [verification-summary.json](verification-summary.json).
Der vollständige bereinigte Testlauf steht in
[raw/node24.21.0-final.tap](raw/node24.21.0-final.tap).
Dies ist ein Implementierungsnachweis für das Testgrundsystem, keine
Produktionsfreigabe, Normprüfung oder CRA-Konformitätserklärung.
