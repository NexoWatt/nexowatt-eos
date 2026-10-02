# Testbericht – NexoWatt UI 0.8.160 RC36

## Fehlerbild

Bei FENECON/OpenEMS war in einem älteren Zwischenstand `aliases.ctrl.powerSetpointW` im Feld **FENECON FEMS-NVP-Ziel** gespeichert worden. Die lokale AppCenter-Validierung verlangte deshalb fälschlich einen nicht vorhandenen `ctrlBalancing0/SetGridActivePower`-Datenpunkt und verhinderte das Speichern. Gleichzeitig konnte die direkte ESS-Kommandofamilie fehlen.

## Korrektur

- FEMS-NVP-Ziel ist in `Automatisch` und `Direkte ESS-Leistung` optional.
- `SetActivePowerEquals`/706 beziehungsweise `aliases.ctrl.powerSetpointW` wird aus der falschen nativen Rolle nach `targetPowerObjectId`/`setSignedPowerId` migriert.
- Netzleistungs-Messwerte werden aus der Schreibrolle entfernt.
- Die Migration erfolgt in UI, Installer-Backend, Einzel-Speicher-Mapping und Speicherfarm-Normalisierung.
- Der explizite FEMS-NVP-Expertenmodus bleibt fail-closed und akzeptiert ausschließlich einen echten `SetGridActivePower`-Aktor.

## Regressionen

- FENECON Hybrid Controller einschließlich direkter Sollwert-Readback-Regelbasis;
- Einzel-Speicher-Migration ohne vorhandenen nativen FEMS-DP;
- Speicherfarm-Migration derselben vertauschten Rolle;
- AppCenter-Quellprüfung auf optionales FEMS-Feld und automatische Verschiebung;
- Storage Runtime Scenarios, NVP Fast Servo/Controller, Actual-Power Balance, Command-Family Readback und Zero-Write Firewall;
- EVCS Input Refresh, §14a/EEBUS Direct API, Runtime-Executables und Runtime-Mirrors;
- `verify-publish.js`, `npm pack --dry-run` und `npm publish --dry-run` auf dem exakt gepackten Artefakt.
