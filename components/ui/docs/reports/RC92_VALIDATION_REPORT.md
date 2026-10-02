# RC92 – History Mobile Touch: Validierungsbericht

## Umfang

RC92 (`0.8.217`) verändert ausschließlich die mobile Interaktion und Darstellung der Historienseite sowie den Service-Worker-Cache-Key. Die produktiven Regelpfade für EMS, NVP, Ladepunkte, Speicher, Tarife, §14a, Forecast und Hardware-Writer bleiben unverändert gegenüber RC91.

Ein Bytevergleich bestätigte **169 unveränderte kritische Produktivdateien** aus `main.js`, `ems/`, `backend/` und den zugehörigen kanonischen TypeScript-Runtimes. In diesen Bereichen wurde keine Datei verändert.

## Behobene Fehler

1. `touch-action: none` blockierte vertikales Seitenscrollen auf Hauptchart, KPI-Karten und Preis-Chart.
2. Touch-Ereignisse wurden sofort als Diagrammgeste übernommen; vertikales Wischen konnte dadurch nicht zuverlässig scrollen.
3. Smartphone-Taps öffneten den Desktop-Auswertungspfad nicht zuverlässig. Dadurch fehlten die Werte des ausgewählten Zeitpunktes beziehungsweise Balkens.
4. Tooltips waren relativ zum langen Seitencontainer positioniert und konnten nach dem Scrollen außerhalb des sichtbaren Viewports liegen.
5. Mehrere Resize- und Settle-Renderings belasteten den mobilen Hauptthread unnötig.
6. Ältere RC78–RC82-Regressionstests hatten den früheren Service-Worker-Key `v491` fest verdrahtet. Sie prüfen jetzt den stabilen Cache-Namensvertrag statt eine veraltete konkrete Releasenummer; RC92 selbst prüft ausdrücklich `v492`.

## Neuer Bedienvertrag

- **Kurzer Tap:** ausgewählte Werte anzeigen.
- **Tag:** Leistung in kW am ausgewählten Zeitpunkt.
- **Woche/Monat/Jahr:** Energie in kWh für den ausgewählten Balken.
- **Vertikale Bewegung:** natives Browser-Scrollen ohne `preventDefault()`.
- **Eindeutig horizontale Bewegung in der Tagesansicht:** vorhandener Zeitraum-Zoom.
- **Tooltip:** viewportfest, Safe-Area-kompatibel und bei langem Inhalt intern scrollbar.
- **Preis-Chart:** Tap und vertikales Scrollen werden ebenfalls getrennt behandelt.

## Kommentare und Wartbarkeit

Die kanonische Quelle `src-ts/runtime-executables/www/history.ts` dokumentiert direkt:

- die Trennung von Tap, vertikalem Scrollen und horizontalem Tages-Zoom;
- warum `preventDefault()` erst nach eindeutig erkannter Zoomgeste zulässig ist;
- die Umrechnung von Viewport- in Canvas-Koordinaten;
- die mobile, viewportfeste Wertekarte;
- die Bündelung mehrfacher Canvas-Zeichnungen;
- die Begründung für den neuen Service-Worker-Cache-Key.

## Automatische Prüfungen

`scripts/verify-rc92-history-mobile.cjs` prüft statisch und in Chromium mit einem emulierten 390-px-Touchgerät:

- kein `touch-action: none` auf der Historienseite;
- vertikales Wischen auf dem Hauptchart verändert `scrollY`;
- eine Scrollgeste öffnet kein Wertefenster;
- Tages-Tap zeigt Leistung, Erzeugung und Verbrauch in kW;
- Wochen-Tap zeigt Energie, Erzeugung und Verbrauch in kWh;
- das Wertefenster bleibt innerhalb des Smartphone-Viewports;
- horizontaler Tages-Zoom verändert den Zeitraum und zeigt „Zoom zurück“;
- die generierte `www/history.js` stammt aus der kanonischen TypeScript-Quelle.

Zusätzlich bestanden die Runtime-/Mirror-/Syntaxprüfungen sowie die bestehenden Fachtests für OCPP, Auto-Modus, Speicher, NVP, Soft-/Hard-Limit, 0-Einspeisung, §14a, PV-Prognose, SSE/Heap, Diagnose und AppCenter. Die sehr lange monolithische Gesamtkette wurde in der Prüfumgebung in geordnete Abschnitte aufgeteilt; alle darin definierten Einzelprüfungen wurden ausgeführt und bestanden.

## Feldtest

Da RC92 einen Frontend-Codepfad gegenüber RC91 ändert, soll auf allen Feldtestanlagen exakt `0.8.217` eingesetzt werden. Der Stable-Dauerlauf beginnt mit diesem Stand neu. Zu prüfen sind insbesondere Safari/Chrome auf Smartphones, Tag/Woche/Monat/Jahr, Scrollen direkt auf dem Chart, Antippen mehrerer Zeitpunkte sowie der horizontale Tages-Zoom.
