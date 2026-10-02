# NexoWatt UI 0.8.163 RC39 – zentraler Sicherheitsvertrag

RC39 ergänzt die bestehende EMS-Planung um eine unabhängige, fail-closed Freigabe direkt an jedem sicherheitsrelevanten Hardware-Schreibpunkt.

## Freigabevoraussetzungen

Positive flexible Lasten benötigen gleichzeitig:

- eine konfigurierte Netzanschlussleistung größer 0 W,
- einen frischen und plausiblen NVP-/Netzzählerwert,
- bei aktivem Phasenlimit vollständige und frische Messwerte aller konfigurierten Phasen,
- einen gesunden §14a-Pfad, sofern §14a in der Anlage aktiviert ist,
- einen aktuellen SafetyEnvelope aus demselben EMS-Zyklus,
- keinen gelatchten Sicherheits- oder Hardware-Write-Fehler.

0 W beziehungsweise AUS bleibt unabhängig vom Freigabestatus immer zulässig.

## Geschützte Writer

Die finale Prüfung gilt für EVCS, Speicher-Netzladung, Speicherentladung, Thermik, Heizstab, Multi-Use, sicherheitsrelevante Schwellwertregeln und budgetierte NexoLogic-Ausgänge. Der Regelplan allein ist keine Hardwarefreigabe.

## §14a

Gesamt-, App- und Geräte-Caps werden unmittelbar vor dem Write erneut geprüft. 0 W, `forceZero` und `emergencyStop` sind eindeutige Stopps. Bei verlorener EEBUS-/Gateway-Frische greift der lokale fail-closed Zustand; ein Kommunikationsausfall darf die zulässige Leistung nicht erhöhen.

## Grenzen des Software-Schutzes

Der SafetyEnvelope ersetzt keine Sicherungen, Leitungsschutzschalter, Gerätegrenzen, Schütze oder die elektrische Anlagenplanung. Diese Schutzorgane müssen eine Überlast auch bei Ausfall von ioBroker, Netzwerk, Zähler oder EOS verhindern.
