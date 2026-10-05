# R8 → R9: enger TEST-Updater und Fehlerpfade

Stand: 05.10.2026. Quellbasis `4e171e42a290119f285714beb86b669c71db7171`,
zusätzlich SHA-256-Bindung der geprüften Dateien in `source-hashes.json`.
Prüfumgebung: Linux x64 / Node.js 24.19.0; Zielvertrag: Linux ARM64 / Node.js
24.21.0. Dieser Beleg umfasst Quellcode und isolierte Fehlerfalltests. Eine
signierte R9-Lieferung, Veröffentlichung und Pi-Installation sind separate Schritte.

## Geltungsbereich und Änderung

`EOS-R9-UPDATE-01`: `tools/system/update-test-to-r9.cjs` akzeptiert ausschließlich
die aktive, erfolgreich eingerichtete und erneut auf Erreichbarkeit geprüfte
R8-TEST-Installation mit Sequenz 11, Release
`eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`
und öffentlichem Schlüsselfingerabdruck
`bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5`.
Die neue Sequenz ist 12; Release und neuer öffentlicher Schlüssel müssen im
unveränderlichen Download-Einstieg separat gepinnt sein.

Vor Änderungen werden alte/neue Signatur- und Inhaltsnachweise, Hostplattform,
Node-Version, geschützte Pfade, konkrete Systemdateien und unveränderte
Katalogfreigaben geprüft. Die SQL-Schemadatei, das Controllerprofil
`app/node_modules/iobroker.js-controller/eos-test-profile.json` und alle
`system/`-Dateien müssen identisch bleiben. Komponentenstände dürfen sich ändern; ihre Ausführungsrechte
werden dabei nicht erweitert. Die aktuelle Lieferkette hält zwei
Verwaltungsadapter zur Ausführung frei; vier weitere eigene Adapter bleiben
installiert und zurückgestellt. Der Updater selbst gibt keine Hardwareadapter frei.

Die R8-Abschlussdatei muss exakt auf R8 verweisen und bleibt bytegleich erhalten.
Auch Controllerkonfiguration, Geräteidentität, Trust und Web-Zertifikate/Schlüssel
bleiben unverändert. Es gibt keine Datenbank-, Passwort-, UUID-, Lizenz- oder
TLS-Migration und keine erneute Ersteinrichtung. Vor dem ersten R9-Trialstart
werden `current` und `release-state.json` auf dasselbe neue Release gestellt;
das ist Voraussetzung der neuen Adapter-Plattformprüfung.

## Start, Rückfall und Sperren

Der Aufruf verlangt Root, den exakten Zielruntimevertrag und eine gültige
systemd-`INVOCATION_ID`. Öffentliche Argumente sind nur `--bundle`, `--public-key`,
`--expected-release-id` und `--expected-key-sha256`. Testabhängigkeiten existieren
nur an der importierten Funktionsschnittstelle; es gibt keinen CLI-Schalter für
andere Rootpfade, Berechtigungsprüfungen oder unsignierte Inhalte.

Vor der Sperre muss der bisherige Controller aktiv sein; frische Adapter-
Heartbeats und geprüfte HTTPS-Endpunkte belegen die Ausgangserreichbarkeit. Unter
einem eigenen privaten Aktivierungslock plus Koordinator-Guard werden Kandidat
und nativer Modulprobe vorbereitet. Erst danach stoppt der Updater den Controller.
Die neue kontrollierte Trialfreigabe wird nach neuer Readiness entzogen; erst
nach persistentem ACTIVE-Bericht werden die eigenen Sperren entfernt.

Scheitert der Trial, darf nur der eigene exakte Zustand zurückgesetzt werden.
Fremde Pointer-, State-, Konfigurations- oder Koordinatorbytes werden nicht
überschrieben. Nach bestätigtem Stopp, authentifiziertem altem R8-Lieferbaum und
unveränderten Konfigurationsbytes versucht der Updater R8 kontrolliert neu zu
starten. Erst bestätigte R8-Readiness und persistenter RESTORED_ACTIVE-Bericht
erlauben das Entsperren. Das fehlgeschlagene Update liefert dann weiter Exit 1,
aber `restoredPreviousActive: true` und `manualRecoveryRequired: false`.

Ohne diesen Nachweis bleibt der eigene Controller gestoppt und gesperrt, soweit
Stopp und Eigentum nachweisbar sind; die Meldung ist RESTORED_STOPPED oder
RECOVERY_REQUIRED. Fehlgeschlagene Stopps werden ausdrücklich nicht als
Stillstand bescheinigt. Bei fremder Koordinatorübernahme werden dessen Sperren
und Laufzustand nicht überschrieben. Nach Fehlern beim Entsperren wird zuerst der
Boot-Lock rekonstruiert, bevor ein fehlender eigener Guard angelegt wird.
`--quiesce-incomplete` ist für ExecStopPost vorgesehen und greift nur für die
eigene Invocation und Zielsequenz 12. Ursprüngliche Fehlerstage, feste Fehlercodes
und begrenzte Fehlergründe bleiben erhalten; private Ausnahmetexte werden nicht
ausgegeben.

## Ausgeführte Prüfungen

```bash
node --test --test-reporter=tap tests/system/update-test-to-r9.test.cjs
node --check tools/system/update-test-to-r9.cjs
git diff --check -- tools/system/update-test-to-r9.cjs tests/system/update-test-to-r9.test.cjs
```

Ergebnis: **19 Testgruppen bestanden, 0 Fehler, 0 übersprungen**. Mehrere Gruppen
prüfen verschiedene gezielt injizierte Fehler. Rohprotokoll: `updater.tap`.
Abgedeckt sind der Erfolgspfad, R8-Zulässigkeit und Abschlussdatei, unveränderte
System-/SQL-/Katalogrechte, aktive Ausgangsreadiness, Pins/Dateirechte/Links,
staging/native Probe, alle Stop-/State-/Trial-/Permit-/Start-/Bericht-/Unlock-
Grenzen, erfolgreicher und gescheiterter R8-Rückfall, fremde Zustandsänderungen,
zwei aufeinanderfolgende Durabilityfehler und invocationgebundene
ExecStopPost-Behandlung. Negative Bundleprüfungen verwenden echte flüchtige
Ed25519-Testschlüssel und den echten Verifizierer für Signatur-/Payloadmanipulation.

Reale temporäre Dateien, atomare Umbenennungen, Symlinks und fsync werden verwendet.
Systemd, native Zielprobe, Baseline-Inventar und DB-/HTTPS-Readiness sind in diesen
Tests ausdrücklich ersetzt. Sie führen keine Installation, Datenbankmigration,
Gerätekommunikation oder tatsächliche Dienststeuerung aus.

Der koordinierende Root-Agent hat die Quellpfade einschließlich Rückfall,
Koordinatoreigentum und Quiesce zusätzlich gelesen; dabei wurden keine weiteren
Blocker berichtet und der unveränderte Profilhash als Pflichtprüfung ergänzt.
Dies ist eine interne Quellprüfung innerhalb derselben Assistenzsitzung, keine
externe oder zertifizierende Sicherheitsprüfung.

## Offen und Bedienung auf dem Zielgerät

**OFFEN:** vollständig signierter R9-Build mit Liefernachweisen, tatsächlicher
Pi/systemd-/HTTPS-Lauf, Anmeldung sowie Home/Pro-Aktivierung und Rückfall auf der
konkreten Anlage. Ein x64-Mocktest ist keine ARM64- oder Produktionsfreigabe.

Vor einem autorisierten Pi-Test aktuelle Sicherung und bisherigen signierten
R8-Lieferstand erhalten. Nur den später separat veröffentlichten gepinnten
Einstieg verwenden. Soll: R9 wird aktiv, ursprüngliche R8-Abschlussdatei bleibt
unverändert, EOS-Verwaltung antwortet, keine erneute Einrichtung/Schlüsseleingabe.
Bei fehlgeschlagenem Trial gilt nur eine explizite RESTORED_ACTIVE-Meldung als
geprüfter laufender Rückfall. RESTORED_STOPPED oder RECOVERY_REQUIRED erfordern
Auswertung der festen Fehlerstage und des geschützten Journals; keine Sperre
manuell löschen und keinen fremden State/Pointer überschreiben.
