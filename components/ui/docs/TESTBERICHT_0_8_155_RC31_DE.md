# Testbericht NexoWatt UI 0.8.155 RC31

Stand: 2026-08-05

## Ergebnis

Die gezielte §14a-, Speicher-, Aktor-, Runtime-, Sprach- und FENECON-Regression wurde erfolgreich abgeschlossen. Die geprüften Skripte meldeten jeweils `OK`.

## Ausgeführte Kernprüfungen

- §14a-Zentralconstraint einschließlich Formeln, externer EMS-Sollwerte, automatischer Fachmodul-Anbindung, Upgrade-Deduplizierung und Wiederherstellung manueller Anforderungen
- §14a-Modul-Lifecycle und State-Objektvertrag
- Aktor-Shadow-, Authority- und Safety-Arbiter sowie Thermik-/Heizstab-Aktorpfade
- Speicher-App-Trennung, Topologie-Autorität, Policy-Baseline, Runtime-Szenarien, E3/DC-RSCP und AppCenter-DP-Persistenz
- FENECON-Hybrid-Dauerregelung und Tages-/PV-Regelpfad
- TS-Runtime- und EMS-Mirror-Synchronität
- DE/NL-Systemsprache und Runtime-Sprachwechsel
- TypeScript-Prüfung des §14a-Constraint-Helfers
- Publish-Metadaten, JSON, Konfliktmarker und JavaScript-Syntax
- `npm pack --dry-run` für Version 0.8.155

## Releasegrenzen

- Der separate NexoWatt-EEBUS-Adapter ist nicht Bestandteil dieses Pakets und wurde nicht Ende-zu-Ende geprüft.
- Eine neue zentrale Freigaberampe nach Aufhebung einer §14a-Grenze ist nicht Bestandteil von RC31; die Fachmodule übernehmen ihre vorhandene Regelung und stellen gehaltene Anforderungen wieder her.
- Vor einem Flotten-Rollout wird ein gestaffelter Feldtest auf einer ausgewählten Anlage empfohlen.
