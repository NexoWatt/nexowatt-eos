# Testbericht – NexoWatt UI 0.8.161 RC37

## Ziel

Härtung aller Ladebetriebsarten mit Schwerpunkt auf dem Feldfehler, dass eine Wallbox nach Auswahl von **Boost** nach einem späteren EMS-Zyklus wieder **0 A** erhielt.

## Fachlicher Betriebsartenvertrag

- **Boost:** sofortiger maximal zulässiger Sollwert des Ladepunkts; optionaler Fahrzeug-/Ladebedarf-DP darf fehlen. Nur harte Netz-, Stations-, Phasen-, §14a-, Peak-, Geräte-, Offline- und Fehlergrenzen dürfen reduzieren oder stoppen.
- **Auto:** Budget-, Tarif- und Ziel-Ladelogik; ohne bestätigten Ladebedarf 0 A.
- **Min+PV:** technische Mindestleistung aus dem normalen Budget, Zusatzleistung nur aus physikalischem PV-Rest; ohne bestätigten Ladebedarf 0 A.
- **PV:** ausschließlich verfügbarer PV-Anteil mit Start-/Stop-Hysterese; ohne bestätigten Ladebedarf 0 A.
- **Aus:** immer 0 A / 0 W.

## Behobene Ursachen

1. Der Runtime-Abschluss setzte auch Boost bei fehlendem optionalem Ladebedarfsnachweis auf 0.
2. Der produktive TypeScript-Abschluss-Guard verlangte ebenfalls immer `connected`.
3. Zeit-Ziel-SoC-Wartezustände konnten Boost nachträglich stoppen.
4. Die weiche Hochlauframpe verhinderte den unmittelbaren Boost-Maximalwert.
5. Weiche Mindestreservierungen späterer Ports konnten den Boost-Grant reduzieren.
6. Alte `controlPreference=none`-Werte ließen vorhandene Sollwert-DPs in der Infrastrukturdiagnose als nicht steuerbar erscheinen.

## Regressionen

Geprüft werden insbesondere:

- Boost ohne optionalen Fahrzeugstatus mit 11,04 kW / 16 A;
- Auto ohne bestätigten Ladebedarf bleibt 0;
- Min+PV bei 0 W PV hält nur die technische Basis;
- PV bei 0 W PV bleibt 0;
- Aus bleibt 0;
- Boost ignoriert Ziel-SoC-Warten und weiche Ramp-up-Begrenzung;
- Gesamt-, Stations-, Phasen-, §14a- und Peak-Grenzen bleiben hart;
- Mehrladepunkt- und Stationspriorität;
- produktive TypeScript-Allocation, Write-Plan und JS-Executor/Fallback-Vertrag;
- EVCS-Input-Refresh, Statusnormalisierung, Speicherpolicy und Phasenumschaltung.

## Feldprüfung

Nach Installation ist bei einem Boost-Test zu beobachten:

1. `chargingManagement.wallboxes.<lp>.effectiveMode = boost`;
2. `targetCurrentA` beziehungsweise `targetPowerW` entspricht dem lokalen Maximum oder einem nachvollziehbaren Hard-Cap;
3. `reason` ist nicht `NO_VEHICLE`;
4. der NexoWatt-Devices-Alias `ctrl.currentLimitA`/`ctrl.powerLimitW` übernimmt den Sollwert;
5. `r.controlAccepted` bestätigt die Geräteumsetzung.

Falls Punkt 1–3 korrekt sind, Punkt 4–5 aber ausbleiben, liegt der nächste Fehlerpfad im NexoWatt-Devices-Adapter beziehungsweise im Herstellerprotokoll.
