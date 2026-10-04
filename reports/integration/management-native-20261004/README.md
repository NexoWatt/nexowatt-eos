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
