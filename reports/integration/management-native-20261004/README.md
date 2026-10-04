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
