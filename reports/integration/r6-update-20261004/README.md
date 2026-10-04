# Gezieltes R4/R5-zu-R6-Testupdate

04.10.2026 · Basis `e699a6d575974574ffc4f48d47fe647f6f147f2a`.
Neuer separater Einstieg: `tools/system/update-test-to-r6.cjs`.
Der bestehende R4→R5-Updater und seine Tests sind bytegleich erhalten.

## Vertrag

Akzeptiert werden ausschließlich die fest hinterlegten R4-/R5-Release-IDs,
öffentlichen Schlüsselhashes und Sequenzen 7/8. Installierter Pointer, geschützter
Release-State, vollständiges signiertes Inventar und Schlüssel müssen passen.
Ziel ist nur `0.2.0-test.3`, Testprofil, Sequenz 9, Linux ARM64, Node 24.21.0.
Neue Release-ID und öffentlicher Schlüsselhash sind Pflichtargumente und dürfen
keiner Baseline entsprechen. Der unveränderliche Download-Einstieg bindet diese
Pins nach dem R6-Build; der Updater enthält keine selbstreferenzielle Ziel-ID.

```text
--bundle ABSOLUT --public-key ABSOLUT --expected-release-id SHA256 --expected-key-sha256 SHA256
```

Root, vertrauenswürdige Werkzeuge, systemd-Invocation, bestehende Initialisierung,
abgeschlossener Erststart mit `physicalControlEnabled:false`, aktive PostgreSQL-
Unit, unveränderte Systemdateien/DB-Schema und unveränderte Adapterzulassungen sind
Pflicht. Es gibt keine generische Migration oder Umgehungsoption.

Der tatsächliche Abschlussmarker besitzt sechs gebundene Felder. Bei R4 muss seine
Release-ID R4 sein. Bei R5 darf er R5 sein; eine verbliebene R4-ID ist ausschließlich
mit dem geschützten, exakten `ACTIVE`-Journal des erfolgreichen R4→R5-Updates und
dem weiterhin vollständig authentifizierten alten R4-Release zulässig. Fehlende,
unvollständige oder fremde Herkunft wird abgelehnt. Das alte Journal und der
Abschlussmarker bleiben bytegleich; R6 schreibt separat
`/etc/nexowatt-eos/test-update-r6-status.json`.

Konten/Passwörter, UUID, Lizenz, Datenbank, CA, Zertifikate und installierte Systemdateien
werden nicht neu provisioniert oder migriert. Nur der Controller wird angehalten.
Nach verifiziertem Staging/native Probe erfolgen Pointer-/Statewechsel und ein
beaufsichtigter Start mit frischen Adapter-/HTTPS-Bereitschaftsprüfungen. Die
Wartungsoperation bleibt kompatibel `test-release-repair`; neue Lock-/Journaldaten
binden zusätzlich `targetSequence:9`. Anlagenadapter werden nicht freigegeben.

## Fehlerverhalten

Vor dem ersten Stop-Versuch wird ausschließlich das eigene Schloss entfernt.
Ab dem ersten Stop-Versuch bleibt es bei Fehlern bestehen. Wiederhergestellt werden
nur exakt wiedererkannte eigene Pointer-/Statewerte; der alte Controller wird
nicht automatisch gestartet. Fremde Werte bleiben unverändert. Ausgaben lauten
`REPAIR_TRIAL_FAILED_RESTORED_STOPPED` oder `REPAIR_RECOVERY_REQUIRED`.

Die beaufsichtigte One-shot-Unit benötigt `ExecStopPost` mit
`--quiesce-incomplete`. Der Nachlauf beendet ausschließlich die eigene Invocation
mit Zielsequenz 9. Er widerruft die Startfreigabe und stoppt den Controller auch
bei fehlgeschlagener Freigabenlöschung. Fremde Wartungsvorgänge werden nicht
über ein altes Journal übernommen. Ein fsync-Fehler nach Entsperren erstellt die
Sperre vor dem Rückstellen neu. PostgreSQL und SSH werden nicht angehalten.

## Tatsächliche Tests

`node --test --test-reporter=tap tests/system/update-test-to-r6.test.cjs`:
**60/60 bestanden**, Linux x64 / Node 24.19.0.

Beide Baselines durchlaufen reale temporäre Dateisystemtransaktionen mit
atomaren Writes, Symlinks und fsync. Eingespritzte Fehler betreffen Readiness,
Stop, native Probe, Journal-I/O, Entsperr-fsync, fremde Pointer/States/Konfiguration,
Tool-/Eigentümerprüfung und die Provenienz des R4-Markers. Weitere Negativfälle
prüfen Schlüssel-/Release-Pins, Sequenz/Profile/Plattform, Schema/Systemdateien,
Zulassungsänderungen, Symlinks und Hardlinks. Manipulierte Kandidatensignaturen
und Dateiinhalte durchlaufen zusätzlich den echten Ed25519-/Inventarverifier mit
flüchtigen, ausschließlich im Test erzeugten Signierschlüsseln.

Systemd, installierte Baselineinventare, native ARM64-Probe und Bereitschaftsdienste
sind ausdrückliche Doubles. Keine tatsächliche Pi-, Controller-/PostgreSQL-/HTTPS-
Integration oder SIGKILL-/SSH-Abbruchprüfung wird behauptet. Rohbeleg und Dateihashes:
`updater-tests.tap`, `updater-evidence.json`. Die endgültige R6-Manifest-/Katalogbindung
muss der Bundle-Build gegen die tatsächlichen authentifizierten Baselines ausführen.

## Zieltest bleibt OFFEN

Vor dem Bediener-Test Sicherung und nachgewiesenen Rückfallweg erhalten. Nach dem
separat gepinnten Download prüfen: Passwortlogin, vorhandene Lizenz/UUID/Objekte,
Admin/UI-Erreichbarkeit und weiterhin gesperrte Anlagensteuerung. Bei abgebrochenem
Versuch Schloss/Journal prüfen; keine pauschale Schlosslöschung oder manuelle
Stateüberschreibung. Das Paket begründet keine Produktions-/Hardware- oder
CRA-/IEC-Freigabe.
