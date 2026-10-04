# Lokaler Vorprüfungsnachweis – 04.10.2026

**7/7 PASS, 0 übersprungen.** Rohbeleg: `local-preflight.tap`, SHA-256
`85a64c90fcb370fb508f3f9ddbcf0e7f6dca262d1e6dfe610551cffcfc08e3aa`.
Alle sieben Management-CJS-Dateien und die PostgreSQL-Labor-Fixture bestehen
`node --check`; `git diff --check` ist erfolgreich.

Umgebung: Linux x64, Node **24.19.0**, UID 0. Die native Integration verlangt
ausdrücklich Node **24.21.0** und eine unprivilegierte UID. Sie wurde hier nicht
ausgeführt; die UID-Map enthält nur UID 0 und PostgreSQL ist nicht vorhanden.

Tatsächlich geprüft: Authentifizierung aller 22.841 Dateien des veröffentlichten
R7-Bundles (`d400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3`),
Ablehnung eines anderen Schlüssels, echte NWL2-Signaturprüfung und verschlüsselter
Speicher des R7-Lizenzkerns einschließlich Ablehnung einer fremden UUID, Ablehnung
des Root-Fixtures außerhalb des expliziten Wegwerf-Labors und Ausschluss fremder
Fehler-/Secret-Texte aus den festen HTTPS-Diagnosefeldern.
Die zusätzliche Profilprüfung führt den tatsächlichen Produktionsvalidator aus:
festes Managementprofil zugelassen, andere Hosts/Ports/DB-Namen abgewiesen;
Standard-Coreprofil unverändert und unbekannte Fixtureprofile abgewiesen.
Das ist Konfigurationsvalidierung, kein lokaler PostgreSQL-/TLS-Verbindungsnachweis.
Der siebte Vertrag prüft zusätzlich die sichere Unterscheidung fester Bootstrap-,
Lizenz-, Dateizugriffs- und Assertionfehler; fremde Texte und unbekannte Codes
werden auch bei passendem Präfix nicht ausgegeben.

Dateibindung der Fullmanagement-Testlogik:
`management.integration.cjs` SHA-256
`a4b70b00ddd8516508b0f7cc9f8cb022bbcf53980e54ce51655a9f5af32fdc79`.
`tests/postgresql/fixtures/lab-cluster.cjs` SHA-256
`78be6ae90f7660da129d7b3a802d4e5bef1aae58e31f9077f345a83c3c499e1c`.
Die native Ausführung gegen PostgreSQL 17.11, tatsächliche Listenerbereitschaft,
PID-Lebenszyklus und Neustart sind erst durch den kommenden CI-Lauf nachweisbar.
Pi-/systemd-/Browser-/Reboot-/Anlagenabnahme bleibt **OFFEN**.

## Erster nativer CI-Lauf: Fixturefehler vor Controllerstart

Quellstand `a616f8657aa466c0cd5099fc81e500f803e19ceb`,
[Security-Run 37214743158](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37214743158),
Job `111472858660`: Der native Lauf endete am 04.10.2026 um 15:58:34 UTC mit
`POSTGRESQL_LOCAL_PROFILE_REQUIRED`, bevor ein Controller gestartet wurde.
`bootstrap.assertRuntimeConfig` wies den dynamischen Laborport und `eos_lab`
korrekt ab; der Produktvertrag verlangt `127.0.0.1:15432/eos`.

Korrektur ausschließlich im Labor: explizites festes Managementprofil im
vorhandenen privaten PostgreSQL-Fixture, unveränderter Standard für Coretests,
explizite Management-Metadatenguards. Produktvalidator, TLS, Rollen, signierte
R7-App und Bereitschaftskriterien wurden nicht gelockert. Dieser Lauf belegt
keinen zusätzlichen Produktionsfehler. Erneuter nativer Management-Lauf bleibt
bis zu dessen tatsächlichem Ergebnis **OFFEN**.

## Zweiter nativer CI-Lauf: Bootstrap-/Enrollment-Phase offen

Quellstand `8da2c18c9b807d5a954399761646ad91311cd51d`, Job `111475085849`,
Artefakt `11308526368`: native PostgreSQL-Rollen/mTLS und gewöhnliches CLI-Setup
bestanden. Die anschließende Sammelphase Bootstrap/Enrollment/Lizenz scheiterte
vor jedem Controllerstart mit `MANAGEMENT_STAGE_FAILED`. Dieser generische Code
erlaubt keine Zuordnung zu einem Produkt- oder Fixturefehler.

Der einzige aggregierte Indikator `PERMISSION_DENIED` kann vom erwarteten
Setup-Schreibversuch auf die schreibgeschützte Konfiguration stammen; er beweist
keinen zusätzlichen Dateirechtefehler. Die neue reine Harness-Diagnostik trennt
CLI- und Controllerindikatoren, protokolliert die Instanzzahl als begrenzte Zahl
und acht feste Teilschritte einschließlich Initialisierung, Enrollment und
Lizenzspeicher. Eine überprüfte literale Fehlercode-Liste ersetzt pauschale
Präfixfreigaben. Produktfunktionen und Bestehenskriterien bleiben unverändert.
Die konkrete Ursache und der nächste native Lauf bleiben **OFFEN**.
