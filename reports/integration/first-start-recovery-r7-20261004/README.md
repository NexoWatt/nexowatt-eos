# R4-Erststart nach R7 wiederherstellen

Änderung `EOS-FIRST-START-RECOVERY-R7-01`, 04.10.2026. Quellbasis und konkrete
Dateihashes stehen in `verification.json`; Rohbeleg `tests.tap`.

Die gemeldete Wartungssperre stammt vom fehlgeschlagenen R4-Erststart. Ein
abgeschlossener Erststart, wie ihn der vorhandene R6-Updater verlangt, ist damit
nicht nachgewiesen. Der separate neue Koordinator akzeptiert deshalb nur den
engen, authentifizierten R4-Zustand mit bereits vollständig gespeicherten
Enrollment-/Handoff-/Lizenzdaten und fehlendem Erststartabschluss.

Die ursprüngliche Beschränkung des Entwurfs auf Schema 3 war falsch und wurde
vor Veröffentlichung anhand des authentifizierten R4-Archivs berichtigt. R4
erzeugt Schema 2 mit acht historischen Einstellungsfeldern. Der korrigierte
Helfer prüft genau diese Form, einschließlich der damaligen ausdrücklichen
unlizenzierten Auswahl ohne vorhandenen Lizenzspeicher.

Änderungen: kontrollierte Übernahme der alten Sperre unter zusätzlichem
exklusivem Wächter; privates Root-Journal; Signatur-/Datei-/Schema-/Unit-Bindung;
begrenzte, nur lesende PostgreSQL-Vorprüfung mit TLS-1.3 und Vergleich der
Passwort-, Konfigurations- und UUID-Bindung; authentifizierte Prüfung der
bestehenden verschlüsselten Lizenz; kontrollierter Start und HTTPS-Prüfung;
Erststartabschluss erst nach erfolgreicher Bereitschaft. Keine neuen
Benutzerzugänge, Lizenzschlüssel, Zertifikate oder Datenbankschemata.

Die automatische Rücknahme ist auf eigene bekannte Zwischenstände begrenzt.
Bei Fehlern werden Stoppen und Sperren versucht; fremde Pointer
oder Abschlussdateien bleiben unangetastet. Der Systemd-Nachlauf kann nur den
eigenen durch Invocation-ID und Sequenz gebundenen Versuch stoppen.
Bei fehlgeschlagenem Stoppen oder nicht sicher rücknehmbaren Fremdänderungen
lautet der Status `RECOVERY_REQUIRED`; dieser Status bestätigt keinen gestoppten
Controller. `RESTORED_STOPPED` setzt eine bestätigte Stopprückmeldung voraus.

Ausgeführt: `node --test tests/system/recover-r4-first-start-to-r7.test.cjs`.
Die Tests benutzen reale Dateien, Modusprüfung, `fsync`, exklusive Dateien,
atomaren Austausch und Pointer. Systemd, installierter Signaturbaum, native
ARM64-Probe sowie Hardwarebereitschaft sind ausdrücklich injizierte Grenzen.
Die Tests prüfen Erfolg, unzulässige Ausgangszustände, Lizenz-/Passwort-/UUID-
Bindung, Fehler an mehreren Übergängen einschließlich spätem Abschluss,
Erhaltung fremder Änderungen und begrenzte PostgreSQL-SELECTs mit TLS-Prüfung.

Zusätzlich ausgeführt: `tests/system/recover-r4-first-start.integration.cjs` mit
`EOS_R4_RECOVERY_BUNDLE` und `EOS_R4_RECOVERY_KEY` auf das tatsächlich ausgepackte
R4-Paket. Der Test authentifiziert Signatur und Inventar, Release-ID, Schlüsselpins
und historische Policy. Er führt den vollständigen `verifyFirstStart`-Kollektor
gegen tatsächliche R4-Policy, Enrollment-Code und Adapterpakete aus. Zustand,
Handoff und verschlüsselte Lizenzdateien sind echte temporäre Dateien; Lizenz-
Signaturen und Speicherung verwenden echte Ed25519-/AES-Verfahren mit nur im
Speicher erzeugtem Test-Ausstellerschlüssel. Nur PostgreSQL-Transport und die
Testkonto-/Wurzelzuordnung sind injiziert. Positive lizenzierte/unlizenzierte
Fälle und negative Schema-, Einstellungs-, Marker-, Passwort-, UUID-, Namespace-
und Lizenzfälle sind geprüft. Dies ist weiterhin kein nativer Pi-/PostgreSQL-Test.

**OFFEN:** vollständige Anwendung auf dem konkreten R4-Pi; echte PostgreSQL-
Bestandsprüfung mit dessen verschlüsselter Lizenz; signierter R7-Artefakt-/
Einstiegsnachweis; reale Systemd-Signal-/Neustart-/Login-Tests. Isolierte
Ergebnisse bestätigen diese offenen Punkte nicht. Das R7-Testprofil erteilt
keine physische Anlagen- oder Produktionsfreigabe.

Restpunkt: Bestehender privater Handoff, Setup-Code und Lizenz-Übergabedatei
werden absichtlich erhalten. Handoff und Übergabe können trotz verschlüsselter
aktiver Lizenz einen geschützten, unverschlüsselten Token enthalten. Eine
vollständige Erststart-Geheimnisbereinigung wird nicht behauptet; diese Dateien
gehören nicht zu den veröffentlichten Nachweisen.

Betriebsablauf: [Wiederherstellung](../../../docs/operations/RECOVER_R4_FIRST_START_R7_DE.md).
