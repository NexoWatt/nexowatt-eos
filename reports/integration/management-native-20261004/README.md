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
