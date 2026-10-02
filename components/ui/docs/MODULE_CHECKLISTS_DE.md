# NexoWatt UI – Modul-Checklisten

Diese Checklisten sollen bei jeder Änderung genutzt werden.

## 1. Energiefluss / Speicher

Nach Änderung prüfen:

- Split-DP Laden/Entladen funktioniert.
- Signed Speicher-DP funktioniert.
- Speicher 0 W bleibt 0 W.
- Kein DP -> Fallback nur bei belastbarer Bilanz.
- Speicherfarm beeinflusst Einzelanlage nicht.
- LIVE-Dashboard zeigt gleiche Werte wie Status/Zentrale Messbasis.
- History schreibt keine falschen Werte.

## 2. Heizstab

Nach Änderung prüfen:

- Speicherreserve bleibt gespeichert.
- PV-Auto-Schwellen bleiben gespeichert.
- Stufen-DP-Zuordnung bleibt gespeichert.
- Netzbezug erlaubt/verboten wirkt.
- Speicherentladung erlaubt/verboten wirkt.
- Heizstab nutzt Core-Limits und nicht eigene abweichende Bilanzlogik.

## 3. EVCS

Nach Änderung prüfen:

- EVCS unsichtbar, wenn keine Wallbox vorhanden ist.
- EVCS sichtbar, wenn echte Ladepunkte konfiguriert sind.
- EVCS-Leistung wird nicht doppelt in Gebäudeverbrauch gezählt.
- EVCS-Reports erscheinen nur bei vorhandener EVCS-Konfiguration.
- KI gibt keine EV-Empfehlungen ohne Wallbox.

## 4. Speicherfarm

Nach Änderung prüfen:

- Farm unsichtbar, wenn nicht aktiv.
- Farm sichtbar, wenn aktiv und echte Farm-Speicher vorhanden sind.
- Farm-States beeinflussen normale Einzelanlage nicht.
- Farm-Tabelle bleibt PC/Tablet/Smartphone bedienbar.

## 5. KI-Berater

Nach Änderung prüfen:

- Kundenschalter An/Aus wirkt.
- KI schaltet keine Geräte.
- Wetterprognose wird nur genutzt, wenn aktiv/vorhanden.
- Peak-Warnung bei 90 % Netzanschluss.
- Speicher-SoC kommt nicht aus falschem Farm-Default.
- Keine EVCS-/Farm-Vorschläge ohne echte Hardware.

## 6. History

Nach Änderung prüfen:

- Tag/Woche/Monat/Jahr funktionieren.
- Legende passt zu vorhandenen Features.
- EVCS/Farm nicht anzeigen, wenn nicht vorhanden.
- Speicherwerte entsprechen LIVE-Werten.
- Keine UI-Elemente laufen mobil aus dem Layout.

## 7. SmartHome

Nach Änderung prüfen:

- Gebäudestruktur lesbar.
- aktive Auswahl lesbar.
- Kacheln stehen sauber.
- Drawer auf Smartphone funktioniert.
- Installer-Konfiguration nicht im Kundenbereich.

## 8. Lizenz

Nach Änderung prüfen:

- gültiger Key bleibt erhalten.
- leerer Key wird korrekt erkannt.
- maskierter Key überschreibt nichts.
- Lizenzstatus wird im Frontend korrekt angezeigt.

## 9. ioBroker-Stabilität

Nach Änderung prüfen:

- Adapter startet.
- Webserver startet.
- `info.connection=true` nach Start.
- `info.connection=false` nach Stop.
- keine hängenden Timer.
- npm pack funktioniert.
- Git-Konfliktmarker fehlen.
