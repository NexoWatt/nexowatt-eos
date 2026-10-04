# Lokaler Vorprüfungsnachweis – 04.10.2026

**11/11 PASS, 0 übersprungen.** Rohbeleg: `local-preflight.tap`, SHA-256
`25a02c16357da80eafce78b074b7a160a7fd63e9aa34d31e46291b8d8e147552`.
Alle zehn Management-CJS-Dateien und die PostgreSQL-Labor-Fixture bestehen
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
Der UUID-Vertrag reproduziert mit dem authentischen R7-`createUuid` und einem
reinen Objectstore-Double den ungültigen CI-Sentinel und dessen Ablehnung durch
den echten Lizenzkern. Ein frischer Prozess mit dem echten `ci-info` bestätigt
die Abschaltung durch `CI=false`, auch bei gesetzten Providerkennzeichen.
Normale UUID-Erzeugung wurde lokal nicht als bestanden gewertet: Die
Arbeitsumgebung kann keine Netzwerkinterfaces auflisten (`uv_interface_addresses`).
Es gibt keinen OS-Mock, keinen manuell ersetzten UUID-Wert und keine Ausnahme vom
Lizenzvalidator. Der normale UUID-/Lizenzpfad muss im nativen Gesamtlauf bestehen.

Der Auth-Vertrag prüft die begrenzte Auswertung von OAuth-/Lizenzstatus-
Antwortformen: fehlende Anmeldung, ungültiger Token, abgelehnte oder fremd
gebundene Lizenz scheitern; der Ergebnisbericht enthält keine UUID oder Tokens.
Das ist Parservalidierung, kein lokaler HTTPS-Anmeldenachweis.
Der Log-Vertrag prüft echte private Dateien: pro Start nur neue Bytes,
farbige Fehlerzeilen erkannt, keine Rohtexte ausgegeben, unprivate Dateien,
Trunkierung, Verzeichnis, Symlink und FIFO abgewiesen. Der Leser prüft vor dem
Öffnen den regulären Dateityp und verwendet zusätzlich `O_NOFOLLOW|O_NONBLOCK`.
Ein zusätzlicher Inventarvertrag prüft unveränderte, hinzugefügte, entfernte und
geänderte Dateien ohne Vergleichsausnahmen. Diagnose enthält nur Anzahlen,
höchstens acht Pfad-Hashes und die zwei festen Namen `iob`/`iobroker`; fremde
Dateinamen und Inhalte werden nicht ausgegeben.

Zusätzlicher tatsächlicher Logger-Versuch: der authentifizierte R7-Export
`@iobroker/js-controller-common-db/build/cjs/lib/common/logger.js:logger` wurde
mit `loggerConfiguration(privateTempDirectory)`, `umask(0o077)` und ausschließlich
abgeschalteter Konsolenausgabe ausgeführt. Nach `log.info` und 500 ms lieferte
der gleiche `RuntimeLog`-Leser:
`{"actualR7Logger":true,"dateFilenameMatched":true,"privateFileMode":384,"bytesReadPositive":true,"indicators":["LICENSE_VALID"]}`.
Der tatsächliche Dateiname entsprach `runtime.YYYY-MM-DD.log`, Modus 384 ist
oktales 0600. Der Versuch belegt Datei-Transport und Leser, keinen Adapterstart.

Dateibindung der Fullmanagement-Testlogik:
`management.integration.cjs` SHA-256
`0bcc2a7110f79e9653120b13537133c32316bf1e09ba63f2a2eb576d6726d527`.
`authenticated-license.cjs` SHA-256
`ccc784d9f2e438429209a8b90ae5be5c8c8ff026bdc0d4db2f865d5e98c8beea`.
`runtime-log.cjs` SHA-256
`a1f03530769aa70034983c54cdbc4aa14ecf2d3b4c59a15edd05478973dfab22`.
`environment.cjs` SHA-256
`e0ebd31f427ccabf712467f07918551b16e3d59a88901c2373c988aa0a6a1616`.
`tests/postgresql/fixtures/lab-cluster.cjs` SHA-256
`78be6ae90f7660da129d7b3a802d4e5bef1aae58e31f9077f345a83c3c499e1c`.
Der fünfte native Lauf belegt PostgreSQL 17.11, tatsächliche Listenerbereitschaft,
echte HTTPS-Anmeldung, aktuelle PIDs und Neustart. Der vollständige Erfolg mit
unveränderter App-Inventur dieser neuen Harness-Fassung bleibt nachzuweisen.
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

## Vierter nativer CI-Lauf: Readiness bestätigt, stdout-Nachweis korrigiert

Quellstand `83a8dab5138842cc06ac63d25a8d022dca611fb2`, Artefakt `11309007699`:
normale UUID, Lizenzprüfung/Speicher, Enrollment und Uploads bestanden.
Core war nach 825 ms bereit, beide Adapter meldeten nach 6054 ms `alive`.
Die historische Einmalprobe sah nach 22 ms Admin bereit und UI noch nicht bereit;
die korrigierte Produktionsprobe erreichte beide nach 3434 ms innerhalb ihres
festen 5-Sekunden-Budgets. Controller-Prozessfehlerindikatoren waren leer.

Der Test scheiterte danach am eigenen Warten auf `LICENSE_VALID` in der
Controller-stdout-Ausgabe. Der echte Controller verwirft jedoch stdout seiner
Daemon-Adapter; diese Bedingung war als Lizenznachweis ungeeignet. Die PID-Prüfung
und der Neustart wurden noch nicht erreicht. Das ist kein nachgewiesener
Produkt-Lizenzfehler und kein vollständiger Fullmanagement-PASS.

Korrektur ausschließlich im Test: tatsächliches Admin-OAuth-Login und geschützte
Lizenzstatusabfrage mit gemeinsamer 5-Sekunden-Frist, unveränderter TLS-Prüfung
und exakter UUID-/Lizenzbindung. Der echte private Datei-Logger liefert frische
Adapterfehler pro Start und nach beiden Stopps; alte Zeilen können den zweiten
Start nicht bestehen lassen. Die PID-Datei muss die aktuelle Controller-PID und
genau die beiden bestätigten Adapter-PIDs enthalten; alle müssen leben. Das
Readiness-Gate und die Produkt-App bleiben unverändert. Nächster nativer Lauf
und physische Pi-Abnahme bleiben **OFFEN**.

## Fünfter nativer CI-Lauf: Neustart bestanden, letzte Sammelphase offen

Quellstand `f0ed9bf5da8ca36e1f6ce5c805b6af8a4ef2a688`, Artefakt `11309880103`:
beide Starts bestanden Produktionsreadiness, echte Admin-OAuth-Anmeldung,
geschützten gültigen Lizenzstatus mit UUID-Bindung, genau drei aktuelle lebende
PIDs und Laufzeitlogprüfung. Die Logindikatoren beider Starts enthielten nur
`LICENSE_VALID`. Erster Start: korrigierte HTTPS-Probe 2231 ms; zweiter Start:
214 ms. Die letzte Sammelphase scheiterte mit `MANAGEMENT_ASSERTION_FAILED`.
Das allein unterscheidet Exitcode-, Enrollment- und Inventarprüfung nicht;
`sourceAppBytesUnchanged: false` ist kein gesicherter nativer Dateidifferenzbefund.

Konkreter unabhängig reproduzierter Fixturefehler: Die tatsächliche signierte
R7-Setup-Methode legt bei beschreibbarem App-Root die vorher fehlenden Startwrapper
`iob` und `iobroker` an (`setupSetup.js`, Linux-Zweig). Der Methodenversuch nutzte
unveränderten authentifizierten Code mit Scratch-Pfadbindung und einer gedoppelten
DB-Fortsetzung; echte Dateischreibaufrufe erzeugten genau diese zwei Dateien.
Er belegt den Setup-Schreibpfad, keinen vollständigen nativen Setupdurchlauf.
Leere Verzeichnisse gehören dagegen nicht zu `inventoryTree`; `controller/tmp`
kann allein keine Inventardifferenz verursachen.

Die Harness setzt jetzt den App-Schreibschutz vor Setup/Uploads. Die optionalen
Launcher-Schreibversuche liegen bereits upstream in einem nichtkritischen
try/catch; der Produktcode wird nicht geändert. Es werden weder Wrapper
vorerzeugt noch Dateinamen ausgefiltert oder die Ausgangsinventur neu angesetzt.
Die letzte Phase führt drei feste Teilschritte und begrenzte Differenzdiagnose.
Ein echter unprivilegierter Schreibschutz-/Setup-Gesamtlauf bleibt der nächste
native CI-Nachweis; lokal ist nur UID 0 verfügbar. Vollständiger Fullmanagement-
PASS und Pi-/Anlagenabnahme bleiben offen.
