# Vollständiger nativer Managementstart

Der erste Lauf auf Quellcommit `a616f8657aa466c0cd5099fc81e500f803e19ceb`
verwendete Node 24.21.0 und native PostgreSQL 17.11 auf Linux x64.
[Securitylauf 37214743158](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37214743158)
hat Architektur-, Sicherheits-, Produktvertrags- und Core-Neustartprüfungen
bestanden. Der Managementjob `111472858660` scheiterte vor dem Controllerstart
mit `POSTGRESQL_LOCAL_PROFILE_REQUIRED`: Die neue Fixture verwendete noch den
dynamischen Laborport und Datenbanknamen `eos_lab`, die das unveränderte
Produktprofil korrekt ablehnt. Das ist ein Testaufbaufehler und kein Nachweis
eines neuen Fehlers auf dem Pi. Die Korrektur muss das Labor auf das gültige
Produktprofil ausrichten; die Produktprüfung bleibt unverändert.

Die beiden Originaldateien aus Artefakt `11307574409` stehen unter `initial-ci/`.
Nicht erreichte Nachweisfelder sind dort `false`; das behauptet keine tatsächlich
beobachtete Änderung des App-Baums. Die vollständige Start-/Neustartabnahme ist
bis zum nachgewiesenen korrigierten Lauf offen. Physische Adapter bleiben aus;
Pi, systemd, Browser-Login und Anlagenfreigabe werden hier nicht bescheinigt.

## Zweiter nativer Lauf

Quellcommit `8da2c18c9b807d5a954399761646ad91311cd51d`,
[Securitylauf 37215512304](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37215512304),
Managementjob `111475085849`: Native mTLS-/Rollenprüfung und gewöhnliches
ioBroker-Setup bestehen. Die Sammelstufe Bootstrap/Erstregistrierung scheitert
mit `MANAGEMENT_STAGE_FAILED`; es wurde noch kein Controller gestartet.
Artefakt `11308526368` ist unverändert unter `second-ci/` erhalten.
Der aggregierte Hinweis `PERMISSION_DENIED` stammt aus der Kindprozessausgabe
und kann bereits durch den erwarteten Setup-Schreibversuch auf die absichtlich
schreibgeschützte Konfiguration entstanden sein. Er beweist keine Ursache des
Einrichtungsfehlers. Die Stufendiagnose muss genauer werden; Produktvalidierung,
TLS und Sicherheitsprüfungen bleiben unverändert verbindlich. Kein nativer
Gesamterfolg und keine R8-Signierung oder Pi-Abnahme aus diesem Lauf.

## Dritter Lauf: Ursache der Einrichtungslücke bestimmt

Quellcommit `7c97504b4f6a8869f760de1a7bf5540a77e33c85`,
[Securitylauf 37216490922](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37216490922),
Managementjob `111477944477`, Artefakt `11308867039` unter `third-ci/`.
Die feineren Unterphasen bestätigen erfolgreiches Produktions-Bootstrap,
Passwortableitung und Erstregistrierung gegen native PostgreSQL. UUID, Trust
und temporärer Lizenzschlüssel werden erfolgreich gelesen. Ausschließlich
`license-verify-and-store` scheitert mit `LICENSE_UUID_INVALID`.

Der tatsächliche R7-Upstream-Code erzeugt bei `CI=true` eine feste CI-Testkennung
anstelle einer gewöhnlichen Geräte-UUID. Die unveränderte Lizenzprüfung weist
sie korrekt ab. Der Laboraufruf hatte `CI=true` ausdrücklich in seine sonst
streng beschränkte Kindprozessumgebung gesetzt. Korrektur: Die Produktprozesse
verwenden dort explizit `CI=false` und führen die normale UUID-Erzeugung aus;
keine UUID wird von Hand ersetzt und keine Lizenzprüfung abgeschwächt.
Der Testprozess selbst bleibt im CI-Betrieb. Lokale Prüfungen des echten
R7-CI-Sentinels und der tatsächlichen ci-info-Erkennung sind getrennt vom
anschließenden vollständigen nativen Lauf nachzuweisen.

Die Prozessindikatoren ordnen das erwartete `PERMISSION_DENIED` ausschließlich
dem Setup-CLI zu. Noch kein Controllerstart; daher weiterhin keine vollständige
Management- oder Pi-Abnahme. Dieser Laborbefund erklärt nicht nachträglich den
unvollständig protokollierten früheren R7-Abbruch auf dem Pi.

## Vierter Lauf: echte HTTPS-Bereitschaft nachgewiesen

Quellcommit `83a8dab5138842cc06ac63d25a8d022dca611fb2`,
[Securitylauf 37217178522](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37217178522),
Managementjob `111479950840`, Artefakt `11309007699` unter `fourth-ci/`.
Normale UUID-Erzeugung, vollständige Erstregistrierung, signierte Lizenzablage
und Upload beider zugelassenen Managementpakete bestehen mit nativer PostgreSQL.
Controller, Admin und UI starten tatsächlich aus dem authentifizierten R7-App-Baum.

Die alte einmalige HTTPS-Prüfung erreicht Admin, verfehlt aber die UI nach 22 ms.
Die korrigierte Produktionsprüfung erreicht beide Oberflächen innerhalb ihres
unveränderten Zeitbudgets nach 3434 ms. Dies reproduziert den Bereitschaftsfehler
und belegt dessen Korrektur im nativen Labor. Es beweist nicht, dass dies die
einzige Ursache des unvollständig protokollierten früheren Pi-Abbruchs war.

Der Gesamtlauf scheitert anschließend in der zusätzlichen Stufe
`license-and-pids` mit `MANAGEMENT_DEADLINE`. Die Testannahme, der tatsächliche
Adapter müsse `LICENSE_VALID` in die Standardausgabe des Controllers schreiben,
ist falsch: Der Controller ignoriert die Standardausgabe seiner Adapterprozesse.
Die Lizenzablage ist bestanden; ein ungültiger laufender Lizenzstatus ist damit
weder nachgewiesen noch ausgeschlossen. Die nachgelagerte PID-Prüfung und der
Neustart wurden noch nicht erreicht. Der Ersatz muss den echten authentifizierten
Admin-Lizenzstatus prüfen und Adapterfehler über frische private Laufzeitprotokolle
erfassen. Keine Produktvalidierung wird dafür abgeschwächt.

Der getrennte native Core-Test und CodeQL (Lauf `37217178519`) bestehen.
Noch keine erfolgreiche vollständige Managementabnahme, R8-Signierung oder
Pi-/Anlagenfreigabe. Nicht erreichte boolesche Nachweisfelder in den unveränderten
Artefakten bedeuten fehlenden Nachweis, keinen beobachteten App-Baum-Unterschied.

## Fünfter Lauf: Anmeldung, Lizenz, aktuelle PIDs und Neustart bestehen

Quellcommit `f0ed9bf5da8ca36e1f6ce5c805b6af8a4ef2a688`,
[Securitylauf 37218432059](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37218432059),
Managementjob `111483642862`, Artefakt `11309880103` unter `fifth-ci/`.
Beide tatsächlichen Starts erreichen Controller, Admin und UI. Echte HTTPS-
Anmeldung und geschützte Lizenzstatusabfrage bestätigen jeweils `LICENSE_VALID`
mit der registrierten Gerätebindung. Die PID-Datei enthält jeweils exakt den
aktuellen Controller und beide zugelassenen lebenden Adapterprozesse.

Die alte Einzelprüfung verfehlt bei beiden Starts die UI; die korrigierte Prüfung
besteht nach 2231 beziehungsweise 214 ms. Die vollständige Bereitschaft wird nach
8402 beziehungsweise 5568 ms erreicht. Die frischen privaten Laufzeitlogs beider
Starts enthalten ausschließlich den Indikator `LICENSE_VALID`, keine erkannten
Fehlerindikatoren. Der kontrollierte erste Stop und erneute Start bestehen;
`productionReadinessPassed` und `restartPassed` sind im Originalbeleg `true`.

Der Gesamtlauf bleibt **FAIL**: In der letzten Sammelphase nach dem zweiten Stop
tritt `MANAGEMENT_ASSERTION_FAILED` auf. Die bisherige Diagnose unterscheidet dort
noch nicht Controller-Exitstatus, Enrollment-Verifikation und abschließenden
App-Dateivergleich. `sourceAppBytesUnchanged: false` bezeichnet deshalb weiterhin
den fehlenden Abschlussnachweis und beweist allein keine tatsächlich veränderte
Datei. Die Inventarisierung erfasst nur Dateien/Symlinks; das vom Labor angelegte
leere Controller-`tmp`-Verzeichnis erklärt eine Dateidifferenz nicht.

Die vier übrigen Security-Jobs einschließlich nativem Core-Neustart sind grün.
R8 bleibt bis zur geklärten und bestandenen letzten Phase unsigniert; keine
Pi-, systemd-, Browser- oder Anlagenabnahme wird aus diesem Lauf abgeleitet.

## Sechster Lauf: vollständige native Managementabnahme bestanden

Quellcommit `ffe4d54221d8518471cebcaa16abcbc93ae392d3`,
[Securitylauf 37219317424](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37219317424),
Managementjob `111486240716`, Artefakt `11310076557` unter `sixth-ci/`:
**8/8 PASS, 0 Fehler, 0 übersprungen.** Der App-Schreibschutz gilt jetzt bereits
vor gewöhnlichem Setup und Upload. Beide Starts bestehen aktuelle Heartbeats,
HTTPS-Bereitschaft, echte Admin-Anmeldung, gültige gerätegebundene Lizenz und
die exakten drei lebenden Prozesse. Frische Adapterlogs und beide Stopps bestehen.
Die Abschlussprüfung bestätigt unveränderte Einrichtung und **0 hinzugefügte,
0 entfernte, 0 veränderte Anwendungsdateien**. Der normale zweite Controllerstop
hat den tatsächlichen Upstream-Exitcode 1 ohne Signal.

Die vollständige Bereitschaft wird nach 8902 und 5249 ms erreicht. Alle fünf
Security-Jobs sind erfolgreich; auch [CodeQL 37219317491](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37219317491)
ist vollständig bestanden. Dies bestätigt das native Linux-x64-Labor mit
Node 24.21.0 und PostgreSQL 17.11, keinen physischen Pi-/Systemd-Mount-/Browser-
oder Anlagenbetrieb.

## Wiederholung im ersten R8-Auslieferungslauf

Der Markercommit `301afe587a3f63cc909cc95e7d1af4b92f4b82b2` bindet ausschließlich
den zuvor geprüften unmittelbaren Elterncommit `ffe4d54221d8518471cebcaa16abcbc93ae392d3`.
[Auslieferungslauf 37219795121](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37219795121)
besteht Request-Gate und beide nativen Pflichtprüfungen. Managementjob
`111487790517`, Artefakt `11309931680` unter `first-delivery-ci/`: erneut **8/8 PASS**,
beide Starts mit Anmeldung/Lizenz/PID korrekt, alle Abschlussfelder erfolgreich,
0 Dateidifferenzen. Bereitschaft nach 7791 beziehungsweise 5147 ms.

Erst der getrennte Buildjob `111488548753` bricht mit `BUNDLE_SIZE` ab; keine
Lieferung und kein Pi-Befehl wurden veröffentlicht. Die Verträge einschließlich
68 Recoveryprüfungen und 10 Prüfungen am authentischen R4-Paket bestehen davor.
Ursache ist die Hersteller-Historieninventur: Sie behandelt alle alten
`delivery/`-Archive gemeinsam als einen Runtime-Payload. Der vollständige
Git-Baum des Markercommits enthält dort 123 Dateien mit 1.091.881.744 Byte,
also 18.139.920 Byte mehr als dessen unveränderte 1-GiB-Grenze. Keine einzelne
Datei überschreitet das bestehende 128-MiB-Dateilimit. Der Aufruf liegt vor
Payloadaufbereitung und Signierung. Die R8-Builder-/Verifier-Korrektur muss diese
getrennte Archivhistorie prüfen, ohne Produkt-/Payloadgrenzen zu verändern.
