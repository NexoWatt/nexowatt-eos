# Lokaler Vorprüfungsnachweis – 04.10.2026

**5/5 PASS, 0 übersprungen.** Rohbeleg: `local-preflight.tap`, SHA-256
`f88dbe21ba5011a91f31af95bc7b4fd950d2307645943d984619e1a2935fa02c`.
Alle sieben CJS-Dateien bestehen `node --check`.

Umgebung: Linux x64, Node **24.19.0**, UID 0. Die native Integration verlangt
ausdrücklich Node **24.21.0** und eine unprivilegierte UID. Sie wurde hier nicht
ausgeführt; die UID-Map enthält nur UID 0 und PostgreSQL ist nicht vorhanden.

Tatsächlich geprüft: Authentifizierung aller 22.841 Dateien des veröffentlichten
R7-Bundles (`d400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3`),
Ablehnung eines anderen Schlüssels, echte NWL2-Signaturprüfung und verschlüsselter
Speicher des R7-Lizenzkerns einschließlich Ablehnung einer fremden UUID, Ablehnung
des Root-Fixtures außerhalb des expliziten Wegwerf-Labors und Ausschluss fremder
Fehler-/Secret-Texte aus den festen HTTPS-Diagnosefeldern.

Dateibindung der Fullmanagement-Testlogik:
`management.integration.cjs` SHA-256
`de847409766ae80ff7cf393ab2baec8c585db140fbe3b0dfe9228a9a619275c4`.
Die native Ausführung gegen PostgreSQL 17.11, tatsächliche Listenerbereitschaft,
PID-Lebenszyklus und Neustart sind erst durch den kommenden CI-Lauf nachweisbar.
Pi-/systemd-/Browser-/Reboot-/Anlagenabnahme bleibt **OFFEN**.
