# EOS 0.2.0-test.2 – PostgreSQL-Installationskandidat

Vollständige Schritte: `docs/operations/POSTGRESQL_TEST_INSTALLATION_DE.md` im Repository. Nur frischer, isolierter Debian-13-Lite-Pi5 ARM64, kein Produktivsystem und keine bestehende EOS-Installation überschreiben.

Enthalten: js-controller 7.2.2, EOS Admin 7.10.11, aktuelle UI 1.0.21, PostgreSQL-Objects-/States-Backends 0.1.0-dev.1, pg 8.23.1, Host-/Ersteinrichtungsprogramme, Betriebssystemupdate-Dienst, signierte Runtime-npm-SBOM. Devices/EEBUS/OCPP21/Backitup sind im vollständigen Quellrepository, nicht aktive Runtime-Komponenten. Kein Redis-Server erforderlich. Die Datenbank selbst kommt aus den offiziellen Debian-Paketen und wird auf dem Ziel separat inventarisiert.

Der private Test-Releaseschlüssel ist nicht enthalten. Öffentlicher Testschlüssel (SHA256 über PEM-Dateibytes):

`432c1aabeeb35b4e28ac6aaef7d991275f7b1d667e4ad0269bb903bd13134f9a`

Signierter Releasebezeichner:

`4eb22e942f31a1730bcecb6d91a374546fbef6dee021db0440bcf6859ee74d27`

18.052 signierte Payload-Dateien. ARM64 und Node 24.21.0 sind fest gebunden. Den Schlüssel und die Lieferprüfsumme aus der bestätigten Übergabe verwenden; eine daneben liegende Prüfsumme allein authentifiziert keine fremde Quelle. Das offizielle Node-ARM64-Archiv liegt unverändert im historischen `delivery/test-pi-0.2.0-test.1/`; dessen EOS-Runtime bleibt zurückgezogen und darf nicht installiert werden.

Für die Ersteinrichtung braucht es persönliche Service-/Installateur-/Benutzerpasswörter und euren echten öffentlichen Hersteller-Lizenz-Trust-Export. Keine Standardpasswörter und kein erfundener Lizenzschlüssel. Kein freigeschalteter Anlagenbetrieb, keine native PG-/Systemd-/Pi-Abnahme und keine CRA-/IEC-Konformitätserklärung. Der Installer führt echte Zielprüfungen aus und stoppt bei Fehlern. Testdauer zunächst höchstens 30 Tage; Zertifikatsrotation/Backup/Wiederherstellung/per-Adapter-Isolation sind noch offene Freigabethemen.
