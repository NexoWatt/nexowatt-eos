# Lokaler Vorprüfungsnachweis – 04.10.2026

**8/8 PASS, 0 übersprungen.** Rohbeleg: `local-preflight.tap`, SHA-256
`60da3d488fd6dfd7d4aebdd93f2000a9a4a5ed8020446e0e900859df399499d5`.
Alle acht Management-CJS-Dateien und die PostgreSQL-Labor-Fixture bestehen
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
Der achte Vertrag reproduziert mit dem authentischen R7-`createUuid` und einem
reinen Objectstore-Double den ungültigen CI-Sentinel und dessen Ablehnung durch
den echten Lizenzkern. Ein frischer Prozess mit dem echten `ci-info` bestätigt
die Abschaltung durch `CI=false`, auch bei gesetzten Providerkennzeichen.
Normale UUID-Erzeugung wurde lokal nicht als bestanden gewertet: Die
Arbeitsumgebung kann keine Netzwerkinterfaces auflisten (`uv_interface_addresses`).
Es gibt keinen OS-Mock, keinen manuell ersetzten UUID-Wert und keine Ausnahme vom
Lizenzvalidator. Der normale UUID-/Lizenzpfad muss im nativen Gesamtlauf bestehen.

Dateibindung der Fullmanagement-Testlogik:
`management.integration.cjs` SHA-256
`9ac43df3dc0d35872c7dd0a1c0b361714c0f99b8e6495f082dd93fee37a96593`.
`environment.cjs` SHA-256
`e0ebd31f427ccabf712467f07918551b16e3d59a88901c2373c988aa0a6a1616`.
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

## Dritter nativer CI-Lauf: ungültiger CI-Sentinel bestätigt

Quellstand `7c97504b4f6a8869f760de1a7bf5540a77e33c85`, Artefakt `11308867039`:
Instanzzahl 0, Produktionsinitialisierung und Enrollment sowie UUID-/Trust-/
Issuerlesen bestanden. Ausschließlich `license-verify-and-store` scheiterte mit
`LICENSE_UUID_INVALID`; noch kein Controller wurde gestartet. `PERMISSION_DENIED`
stammt eindeutig aus `cli-setup`.

Ursache im Labor: Sein bisheriges `CI=true` veranlasste das echte R7-`createUuid`,
den upstream CI-Sentinel statt einer normalen UUID zu speichern. Der unveränderte
Produkt-Lizenzvalidator wies diesen korrekt ab. CLI und Controller erhalten jetzt
über denselben streng begrenzten Environment-Helper explizit `CI=false`; keine
Providerumgebung wird übernommen und keine UUID manuell ersetzt. Normaler
nativer UUID-/Lizenzpfad und vollständiger Managementstart bleiben bis zum
kommenden erfolgreichen Gesamtlauf **OFFEN**.
