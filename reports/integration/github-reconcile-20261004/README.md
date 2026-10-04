# Übernahme auf den aktuellen GitHub-Stand

Nachweis: `EOS-GITHUB-RECONCILE-20261004`, 04.10.2026.
Geprüfte GitHub-Basis: `4ac429e1f4f06a249053487f719f670a8d03472b` auf
`NexoWatt/nexowatt-eos`, Zweig `main`. Der Nutzer hat das direkte Hochladen
beauftragt. `AGENTS.md` verlangt direkte Änderungen auf `main`; `PARAMETERS.md`
dokumentiert die bestehende öffentliche Bereitstellung seit 03.10.2026.

## Ursache und Auswahl

Die zuvor im Chat bereitgestellte vollständige ZIP wurde aus der gelieferten
dev.8-ZIP weiterentwickelt. Beim GitHub-Abgleich wurde der weiterentwickelte
R5-Stand gefunden: vollständiger erforderlicher Paketumfang, NWL3-Systemedition,
Minimal-Erststart, Korrekturen des Datenbank-Lebenszyklus und ein bereits
veröffentlichter, eng begrenzter R4→R5-Reparaturweg. Ein vollständiges Kopieren
der älteren ZIP darüber würde neuere Änderungen und die Lieferidentität ersetzen.

Deshalb werden die zusätzlichen Produktlogo-, Browsercache- und Anmeldekorrekturen
auf dem aktuellen `main` zusammengeführt. Bestehende R5-Ladeschutzregeln bleiben
in beiden Admin-HTML-Dateien erhalten. Die bereits eingebauten NexoWatt-Assets
werden wiederverwendet; Rechte-/Lizenzhinweise und technische Paketnamen bleiben
bestehen. Der neue Git-Stand erhält keine erfundene ältere Historie.

Der vorhandene Admin-Schutz mit 15 Sekunden für die Passwortprüfung, zwei
begrenzt belegten Rechenslots und gesonderter Prüfung verspäteter Token-Proofs
bleibt erhalten. Ergänzt wird die frühe Ablehnung ungültiger oder überlanger
Zugangsdaten vor Datenbank- und Passwortarbeit. Die Browseranmeldung erhält
Fehlerbehandlung, eine begrenzte Wartezeit und Schutz vor Doppelaufrufen.

## Erhaltene Produktbasis

- `runtime/onboarding`, Enrollment, PostgreSQL-Lebenszyklus und Systeminstaller
  bleiben auf dem vorhandenen R5-Stand.
- Der Assistent verlangt UUID, Home-/Pro-Lizenz und Adminpasswort; Kundenanlage
  und Geräte werden später eingerichtet. Der lokale Besitzcode bleibt erforderlich.
- NWL3-Systemlizenzen und bestehende NWL2-Beschränkungen bleiben erhalten.
  Der separat dokumentierte Keygen 1.0.2 wird nicht durch den älteren NWL2-
  Generator aus der ZIP ersetzt.
- R5 führt Controller und sechs Produktadapter als tatsächlich gebündelte
  Pakete. Paketbeilage bedeutet keine Freigabe der physisch steuernden Adapter.
- Die Quelllizenz, Drittanbieterhinweise, Herstellertrust, bisherigen
  Signaturen und alle vorhandenen Lieferdateien werden nicht ersetzt.

Das in der separaten ZIP gelieferte test.3 mit Sequenz 4 wird nicht über das
vorhandene R5 mit Sequenz 8 geschrieben. Seine anders aufgebaute Erststart-/
Wiederherstellungsimplementierung und die zugehörigen Testbelege werden nicht
als aktive R5-Funktionen ausgegeben. Für den Pi ist die aktuelle GitHub-README
maßgeblich; der ältere ZIP-Installer ist kein R4-/R5-Bestandsupdater.

## Nachweise und Grenzen

- `preserved-system.md`, `preserved-system.json` und `preserved-system.tap`:
  gezielte Prüfung des erhaltenen Erststart-/Lizenzvertrags.
- Die `admin-*`-Dateien in diesem Verzeichnis dokumentieren die Prüfung des
  zusammengeführten Session-Moduls und reale lokale HTTPS/OAuth-Anfragen.
- `../branding-main-20261004/` dokumentiert Logo-, Cache-, Paket- und
  Quell-/Buildprüfungen einschließlich der abschließenden Admin-Versiegelung.

Die jeweiligen Testzahlen gelten für ihre Läufe und werden nicht zu einer
vermeintlich unabhängigen Gesamtzahl addiert. Frühere Nachweise bleiben
historische Nachweise ihrer damaligen Bytes.

Dieser Commit ist eine geprüfte **Quellaktualisierung**, kein neu gebautes oder
signiertes Pi-Update. Die vorhandenen R5-Archive und ihre SBOM beschreiben
weiterhin die bisherigen R5-Bytes. Ein künftiges Paket mit diesen Ergänzungen
benötigt eine neue Lieferrevision, Signatur, SBOM-Bindung und passende Prüfungen.
Die Veröffentlichung des Quellcodes installiert nichts auf dem Pi.

Browser-Sichtprüfung, echter Pi-/systemd-/PostgreSQL-Betrieb, erneuter Geräte-
und Anlagenbetrieb sowie Wiederherstellungsabnahme sind nicht ausgeführt.
Keine Produktionsfreigabe oder CRA-/IEC-Konformität wird behauptet.
