# Prüfstand dev7 / PostgreSQL test.2

02.10.2026. `verification-summary.json` bindet die ausgeführten Tests an ihre Rohlogs, Befehle, Umgebung und Quellhashes. `artifact-verification.json` prüft zusätzlich den tatsächlich signierten ARM64-Payload, die Verbindung zur aktuellen Runtime-Quelle, die Modulimporte, die zusätzliche systemd-Grammatikprüfung und die source-/runtime-SBOM-Schemata.

| Prüfung | Tatsächlich ausgeführt |
|---|---|
| System/Installer/Zertifikate/Verträge | 323 bestanden; überwiegend Unit-/Kommando-/Clientdoubles, echte OpenSSL-Prüfungen enthalten |
| PostgreSQL-Backend-Verträge | 98 bestanden, ein nativer TLS-Labortestblock übersprungen (Root-only-Umgebung) |
| SQL/RLS unter PGlite/WASM | 11 Node-Testeinträge einschließlich Sammeltest, 10 SQL-Fälle; keine native PG17-Abnahme |
| Ausgewählte UI-Rollen/SSE/Update-Status-Regressionen | 60 bestanden; kein vollständiger Browser-/Gerätelauf |
| Python-Eingaben/OS-Update-Verträge/SBOM-Bindung | 60 bestanden; keine reale APT-Update-Transaktion |
| Zusätzliche Quelleninventar- und PG-Unit-Grammatikprüfung | 5 + 1 bestanden |

In Summe 558 bestandene automatisierte Testeinträge, ein übersprungener nativer Testblock. Diese Zahl ist kein Sicherheitsgrad oder Konformitätsnachweis. Keine unabhängigen Penetrationstests, kein gestarteter nativer PostgreSQL-Server, kein realer Controllerprozess mit PostgreSQL und keine Pi-Abnahme in dieser Umgebung.

Die Paketprüfung `packaging-pattern-review.json` scannt die neuen Runtime-Archivdateien entpackt im Speicher. Hash-identische historische Archive verwenden ihren unveränderten früheren Detailnachweis. Keine vollständige Geheimniserkennung oder Schwachstellenfreiheit behauptet. Ein aktueller vollständiger Dependency-Audit wurde nicht ausgeführt; die dafür zuvor verweigerte Online-Offenlegung wurde nicht umgangen.

`runtime.cdx.json`: tatsächlicher installierter npm-Baum und bekannte eingebettete Kopien, 482 npm-Installationsorte + 3 eingebettete Paketkopien. `source-locks.cdx.json`: 6 Adapterquellen und 4.313 deklarierte Lockeinträge, **kein** Nachweis einer Installation all dieser Pakete. `sbom-validation.json`: beide Schemata ohne Validierungsfehler. Node-Archiv, Debian-Pakete und Firmware sind gesondert zu erfassen; der OS-Updater erzeugt die Geräte-SBOM aus tatsächlichen installierten Paketen.

`assembly.json` beschreibt den offline erzeugten Ableitungsbuild aus dem authentifizierten historischen ARM64-Artefakt, den neu gepackten UI-/Backendquellen und dem separat festgelegten öffentlichen pg-Treiberbaum. Die Original-Git-Historie war nach Workspaceverlust nicht mehr vorhanden: dev6 wurde aus dem vollständigen zuvor gelieferten ZIP anhand dessen Datei-/Modus-/Hashmanifest wiederhergestellt. Neue lokale Commits sind keine Fortsetzung der verlorenen Original-Git-Objektdatenbank. Der ursprüngliche Commit und ZIP-Hash bleiben im Bericht erhalten.

Installation: `docs/operations/POSTGRESQL_TEST_INSTALLATION_DE.md`. Sicherheits-/STRIDE-Vermerk und offene Befunde: `docs/security/POSTGRESQL_TEST_INSTALLATION_DE.md`. Architekturerweiterung: `docs/architecture/POSTGRESQL_TEST_HOST_DE.md`.
