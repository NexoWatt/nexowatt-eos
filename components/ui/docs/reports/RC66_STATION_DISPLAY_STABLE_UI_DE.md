# NexoWatt UI 0.8.191 RC66 – Responsive Stationsseiten

## Ziel

RC66 modernisiert ausschließlich die Stations-/Kioskseiten der Ladeinfrastruktur. Die bestehende Lade-, Stations-, §14a-, Tarif-, Speicher- und Single-Writer-Regelung bleibt unverändert. Die Seite zeigt die bereits vom NexoWatt-Lademanagement berechneten Zustände und sendet Bedienhandlungen weiterhin ausschließlich als herstellerneutrale Charging-Management-Intents.

## Neue Oberfläche

- Originales NexoWatt-EOS-Logo im Stationsheader.
- Vollbildlayout für typische 16:9-Stationsdisplays ohne vertikales oder horizontales Scrollen.
- Bis zu vier Ladepunkte nebeneinander in einer Zeile.
- Fünf bis acht Ladepunkte automatisch verdichtet in maximal zwei Zeilen.
- Dynamische Statusleiste für Modus, Ziel-Laden, Tarif, PV, Speicher, Stationslimit, Kommunikation und Meldungen.
- Stationsübersicht mit Gesamtleistung, Solaranteil, Tagesenergie/Kosten, aktivem Modus, Kommunikation und Kurzentscheidung.
- Kompakte LP-Karten mit Leistung, Fahrzeugzustand/SoC, Session, Kosten, Preis, Solar-/Netzanteil, Modus, Regelung, Ziel-Laden, Speicheroption und AC-Phasenmodus.
- Eigener Bereich „EOS Entscheidung – warum gerade so?“ mit realen Regelgründen.
- Eigener Fehler-/Warnbereich für Kommunikations-, Messwert-, Mapping-, Aktor- und Geräteprobleme.
- CSV-Export aus der sichtbaren Stationsoberfläche entfernt; der Service-/Adminexport bleibt backendseitig verfügbar.

## Responsive Verhalten

- Desktop/Kiosk im Querformat: kein Seitenscrollen, mehrere LPs passen in den sichtbaren Bereich.
- Kurze 1366×768-Displays: automatische Verdichtung von Header, Karten, Typografie und Diagnose.
- Tablet/Portrait: bedienbare zweispaltige bzw. einspaltige Fallback-Darstellung; dort ist vertikales Scrollen zulässig, weil die Touch-Bedienbarkeit Vorrang hat.

## Codequalität

Die verständlichen Stationswarnungen und EOS-Entscheidungsgründe werden durch einen neuen typgeprüften, read-only Präsentationshelfer erzeugt. Dieser Helfer besitzt keinen State- oder Hardware-Writer. Das vorhandene `@ts-nocheck`-Budget wurde durch RC66 nicht erhöht.

## Sicherheitsvertrag

Die Stationsseite schreibt niemals direkt auf OCPP-, Modbus-, MQTT- oder Herstellerdatenpunkte. Alle Befehle laufen weiterhin über:

```text
Stationsseite
  → NexoWatt Charging-Management Intent
  → Stations-/Netz-/Phasen-/§14a-/Safety-Grenzen
  → bestehender Single Writer
  → Wallbox/Ladestation
```

## Felddiagnose

Die Seite zeigt unter anderem:

- Offline-/Verbindungsstatus,
- veraltete Messwerte und Ladebudgets,
- aktive §14a-, Netz- und Phasenbegrenzungen,
- Tarifstatus und Tarifaktualität,
- Zielzeit-Override,
- Datenpunkt-Mappingprobleme,
- unbestätigte Hardwarebefehle,
- Availability-/RFID-Sperrgründe,
- den aktuellen Fachgrund des Lademanagements.

## Validierung

Das Layout wurde in echten Chromium-Renderläufen mit 4 LPs bei 1920×1080, 1600×900 und 1366×768 sowie mit 5, 6 und 8 LPs geprüft. In den Querformatprüfungen blieben Dokument, Footer und LP-Karten vollständig innerhalb des Viewports.
