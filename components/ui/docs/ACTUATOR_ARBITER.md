# NexoWatt Aktor-Arbiter

## Ziel

Der Aktor-Arbiter verhindert, dass mehrere EMS-Module denselben externen
Hardware-Datenpunkt mit widersprüchlichen Werten beschreiben. Er sitzt zentral
vor `setForeignStateAsync()` und `setForeignStateChangedAsync()`.

## Betriebsarten

### `shadow`

- beobachtet und diagnostiziert Schreibanforderungen,
- verändert oder blockiert keine Hardware-Writes,
- dient als feldkompatibler Rückfallmodus.

### `enforce-safety`

- setzt ausschließlich sicherheitskritische Steuerhoheit durch,
- normale EMS-/Komfortmodule untereinander bleiben zunächst unverändert,
- greift nur bei Aktoren, die durch die Stufe-A-Mappingmatrix als reale
  Hardware-Aktoren erkannt wurden.

## Prioritätsklassen

| Priorität | Klasse |
|---:|---|
| 1000 | Notstopp, Failsafe, Hardware-Safety |
| 950 | §14a / Netzbetreiber |
| 920 | Grid-Constraints / harte Netzgrenzen |
| 850 | Peak-Shaving / Anschlusslimit |
| 750 | befristeter manueller/API-Override |
| 600 | normale Speicher-, EVCS-, Thermik- und Heizstabregelung |
| 500 | MultiUse, Threshold, BHKW, Generator, Relais |
| 400 | NexoLogic |

## Leases

- Safety-Controller aus dem normalen EMS-Modulzyklus besitzen ihre Hoheit im
  selben Regelzyklus. Im nächsten Zyklus muss die Safety-Anforderung erneut
  bestätigt werden.
- Manuelle/API-Anforderungen besitzen standardmäßig eine befristete Lease von
  fünf Minuten.
- Höhere Prioritäten dürfen niedrigere Leases übernehmen.
- Ein identischer sicherer Refresh-Wert darf weiter ausgeführt werden.
- Deadband-/idempotent übersprungene Safety-Sollwerte registrieren einen
  Intent, ohne einen unnötigen Geräte-Write auszulösen.

## Feldschutz

- Initialisierungs-Writes erzeugen keine Lease.
- Nicht gemappte Bridge-/Command-States werden nicht blockiert.
- Blockierte Writes aktualisieren keinen lokalen Write-Cache.
- Blockierte Pulsbefehle erzeugen keinen nachgelagerten Reset-Timer.
- Fehlgeschlagene Hardware-Writes erzeugen keine Steuerhoheit.
- Der Shadow-Modus kann im Admin unter `Diagnose → Aktor-Arbiter` aktiviert
  werden, ohne andere Regelparameter zu verändern.

## Interne Diagnose

Die komprimierte AppCenter-Anzeige verwendet nur:

- Arbiter-Modus,
- offene Aktorkonflikte,
- blockierte Writes nur bei tatsächlichem Auftreten.

Ausführliche Daten liegen unter `ems.diagnostics.stageA.*`, insbesondere:

- `authorityActiveLeaseCount`,
- `authorityBlockedWriteCount`,
- `authorityPreventedConflictCount`,
- `authorityUnresolvedConflictCount`,
- `authorityActiveJson`,
- `authorityBlockedWritesJson`.

## Nächste Migrationsstufe

C3 bindet Threshold, Thermik, Heizstab, MultiUse und NexoLogic einzeln an eine
vollständige fachliche Aktorentscheidung. Jede Migration benötigt eigene
Runtime- und Hardware-Readback-Tests.
