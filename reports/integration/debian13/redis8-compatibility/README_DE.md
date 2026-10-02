# EOS: Redis-8-Kompatibilitätsprüfung, 1. Oktober 2026

**Ergebnis: Funktionale Kompatibilitätsprüfungen bestanden; Installation und Produktfreigabe gesperrt.**

Offizielle Debian-Quellen von Redis `5:8.0.2-3+deb13u2` wurden über HTTPS geladen. Größen und SHA256 der beiden Archive entsprechen der offiziellen `.dsc`; deren OpenPGP-Signatur wurde nicht unabhängig verifiziert. `dpkg-source --no-check -x` hat sämtliche Debian-Patches ohne Fehler angewendet. Der lokale Build mit `make -j2 BUILD_TLS=yes MALLOC=libc` war erfolgreich. Nichts wurde nach `/usr` installiert.

Mit diesem tatsächlichen Redis-Prozess, Node 24.21.0 und der bestehenden EOS-Anwendung bestanden die UI-/Controller-/Browser-Integration (16 TAP-Tests einschließlich Eltern-Test, 15 fachliche Stufen) sowie die Zertifikatsrotation mit realem AOF (1 Test). Beide Läufe endeten mit Exitcode 0, ohne ausgelassene Tests; die ausschließlich neu angelegte `/etc/nexowatt-eos`-Testfixture wurde jeweils entfernt. Die Testdateien wurden unverändert ausgeführt.

Der Debian-Sicherheitstracker führt dieselbe Redis-Paketversion für `CVE-2026-81934` als verwundbar. Betroffen ist die TLS-Verarbeitung. Die Tests sind deshalb ausschließlich isolierte Kompatibilitätsnachweise; sie genehmigen weder Installation auf dem Pi noch Produktbetrieb oder Weitergabe. Das Abschalten von TLS ist keine akzeptierte Lösung für EOS.

Die Ausführung erfolgte unter Ubuntu 24.04 auf x64, mit OpenSSL 3.0.13 und root sowie einer expliziten Loopback-Interface-Fixture. Der selbst gebaute Redis verwendet libc und gebündelte Abhängigkeiten, während Debian Systembibliotheken, jemalloc, systemd-Unterstützung und andere Hardening-Flags einsetzt. ARM64, Debian-13-Binärpakete, deren OpenSSL 3.5, unprivilegierte Dienstkonten, systemd-Sandboxing und echte Pi-Hardware wurden damit nicht abgenommen.

Maschinenlesbare Nachweise: `verification-summary.json`, `source-verification.json`, `security-blocker.json`, `test-results.json`. Unveränderte Rohdaten: `raw/dpkg-source.log`, `raw/build.log`, beide TAP-Dateien und die abgerufene Debian-Advisory-HTML. Quellen und Patches liegen unter `source/` beziehungsweise `redis-8.0.2/`.

Nach beiden erfolgreichen Tests trat im Hilfsskript ein Pfadfehler bei der Zusammenfassung auf. `summary-wrapper-error.json` hält diesen Fehler fest. Die Zusammenfassung wurde anschließend aus den bereits vorhandenen Ergebnissen erstellt; die Tests wurden dafür nicht erneut ausgeführt. Dies ist kein verschwiegenes oder durch Wiederholen ersetztes Testergebnis.

Die Lizenzpflichten für Redis 8 (laut Debian-Copyright wahlweise RSALv2, SSPLv1 oder AGPLv3) sind gesondert zu prüfen. Dieser Nachweis enthält keine CRA-, IEC- oder Penetrationstest-Freigabe.
