# Prüfbericht: EOS-Architektur und Entwicklungswerkzeuge

Stand 30.09.2026. Prüfumfang ist der erste Architektur- und Werkzeugstand auf Basis des lokalen Installer-Härtungscommits `1e6d0377d2cb184714f0d7f6f03066a2c1a150ac`. Die Datei `test-results.json` bindet die tatsächlich geprüften Eingaben durch SHA-256 und enthält Befehle, UTC-Zeitpunkte, Umgebung und Rohbelegverweise. Dieser Bericht ist keine Produktfreigabe.

## Ergebnis

| Tatsächlich ausgeführte Prüfung | Ergebnis | Rohbeleg |
|---|---|---|
| Architektur-/Referenzprüfer: Status, Module, Sicherheitsvorgaben, STRIDE-/Testverknüpfung, Parsergrenzen | 30 Tests bestanden | `blueprint.log` |
| Vertragsprüfer: Formate, Typen, Routen, Rechte, Zeitintervalle, Parsergrenzen, Fehlerausgaben | 31 Tests bestanden | `contracts.log` |
| Quell-SBOM: Format, begrenzter Scope, Datenminimierung, Git-Filter, Ausgabe-/Dateischutz | 21 Tests bestanden | `sbom.log` |
| Aktuelles Architekturmodell | Konsistent; 12 Module, 20 Anforderungen, 15 Bedrohungen, 40 geplante Produkttests | `blueprint-validation.log` |
| Drei synthetische Vertragsbeispiele | Gültig | `contract-examples.log` |
| Vorhandene und neu erzeugte Quell-SBOM | Offizielles CycloneDX-1.7-Schema und eingeschränkte Scope-Regeln bestanden | `sbom-*-validation.log`, `sbom-generation.log` |
| Entwicklungsabhängigkeiten | `pip check` bestanden | `dependency-consistency.log` |
| Neue CI-Schritte | YAML gelesen und Shellsyntax geprüft; kein GitHub-Lauf | `ci-static-validation.log` |

**82 automatisierte Werkzeugtests bestanden, keine fehlgeschlagenen Tests in diesem Lauf.** Die 40 geplanten Produkttests wurden nicht ausgeführt und zählen nicht zu diesen 82. Alle drei Werkzeug-Testskripte enthalten Positiv- und Negativfälle. Die SBOM-Generierung lieferte für denselben HEAD/Manifeststand byteidentische Ausgaben zum mitgelieferten Snapshot.

Geprüft wurde in einem Linux-x86-64-Entwicklungscontainer mit CPython 3.12, separater virtueller Umgebung und künstlichen Testdateien. Die exakten Versionen und Wheel-Hashes der sechs Entwicklungsabhängigkeiten stehen in `tools/architecture/requirements-linux-x86_64-py312.txt`. Die Installation dieses Locks wurde in einer frischen Umgebung ohne Paket-Buildskripte ausgeführt. Daraus wird keine Schwachstellenfreiheit dieser Abhängigkeiten abgeleitet.

## Review und nachgebesserte Werkzeugfehler

Im internen Review fielen zunächst ungeprüfte Erfüllungsangaben, erlaubte abweichende Admin-/Prozessvorgaben, falsch verknüpfte Testkennungen und ein Zahlenüberlauf auf. Diese Lücken wurden vor dem dokumentierten Gesamtlauf behoben. Der Blueprint-Leser wurde zusätzlich gegen blockierende Spezialdateien, finale Symlinks, ungültiges UTF-8 und übermäßige Verschachtelung abgesichert. Passende Negativtests sind Teil der 30 Blueprint-Tests. Diese Befunde betreffen das neue Entwicklungswerkzeug, nicht neu reproduzierte EOS-Produktlücken. Das interne Review ist keine unabhängige Zertifizierung.

## Erhalt des Bestands und offene Nachweise

In dieser Etappe wurden keine vorhandenen Installer-, UI-, Adapter- oder Regeldateien geändert. Geändert wurden README, Ignore-Regeln und Sicherheits-CI; hinzugekommen sind Architektur-/CRA-/Betriebsdokumentation, JSON-Verträge, lokale Werkzeuge, Tests und Teil-SBOM. Die frühere Installer-Prüfung ist unter `docs/security/TEST_REPORT.md` erhalten; ihre Tests wurden hier nicht erneut ausgeführt und nicht zur obigen Summe addiert.

Nicht geprüft sind vollständiger EOS-Build/Installation, tatsächliche Modultrennung, Netzwerk-TLS/mTLS, Schlüssel-/Lizenzsignaturen, Replay-Schutz laufender Dienste, signierte Updates, Stromverlust/Recovery, Backup-Rücksicherung, Admin-7-/UI-Kompatibilität und Verhalten realer Geräte. Die aktuellen vollständigen Komponentenquellen und Hardwareprofile fehlen im verfügbaren Installer-Repository. Auch ein vollständiger Schwachstellen- oder Lizenzscan des künftigen Produkts wurde nicht durchgeführt.

## SBOM und CRA/IEC

Die CycloneDX-Datei ist ausdrücklich `pre-build` und `incomplete`. Sie erfasst das beobachtete Root-Manifest `@iobroker/install@6.0.1` und dessen Git-/Hashbezug. Elf deklarierte Abhängigkeitsbereiche sind im Coverage-Bericht als unaufgelöst ausgewiesen. Der Snapshot ersetzt keine vollständige Build-/Geräte-SBOM. Die späteren Adapter-, OS-/Firmware- und Laufzeitbestandteile sind nicht inventarisiert.

Die CRA-/IEC-Zuordnung ist ein thematischer Nachweisplan. Produktkategorie, vollständige Klauselzuordnung, Herstellerprozesse, Supportfrist und erforderliches Bewertungsverfahren bleiben zu vervollständigen. Referenzstand und Quellen stehen in `docs/security/CRA_IEC_SCOPE.md`; die Systemanforderungen in `docs/cra/SYSTEM_REQUIREMENTS.md`. Es wird weder CRA-Konformität noch IEC-Konformität erklärt. Alle acht Produktfreigabegates in `system/product-plan.json` bleiben offen.
