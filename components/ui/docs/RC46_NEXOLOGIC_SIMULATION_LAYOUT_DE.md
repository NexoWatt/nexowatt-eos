# NexoWatt EOS 0.8.170 RC46 – NexoLogic Simulation und geordnete Arbeitsfläche

## Ziel

RC46 erweitert den NexoLogic-Editor um eine sichere Inbetriebnahme- und Diagnoseebene, ohne die produktive NexoLogic-Engine oder die EMS-, Lade-, Speicher-, FENECON- und §14a-Regelungen umzubauen.

## Geordnete Platzierung

Neue Bausteine werden beim Anklicken der Palette automatisch in Funktionsspuren einsortiert:

- Eingänge und Konstanten links,
- Logik-, Zeit-, Rechen- und Regelbausteine in der Mitte,
- Datenpunktausgänge und Szenenauslöser rechts.

Die automatische Platzierung sucht innerhalb der jeweiligen Spur eine freie Position und verhindert Überlappungen. Bewusst per Drag-and-drop gesetzte Positionen bleiben erhalten. Die Schaltfläche **Auto-Anordnung** ordnet auch einen bestehenden Graphen anhand seiner Verbindungen neu an.

## Schreibfreier Testmodus

Der neue NexoLogic-Testmodus läuft ausschließlich im Browser. Er führt keine API-POSTs und keine Hardware-Schreibzugriffe aus. Für DP-Eingänge können Testwerte vorgegeben werden. Die Simulation unterstützt alle 41 aktuell angebotenen Bausteintypen und zeigt:

- Live-Ausgangswerte direkt am Baustein,
- aktuelle Werte auf den Verbindungsleitungen,
- eine chronologische Trace-Ansicht,
- hypothetische Datenpunkt- und Szenenaktionen als „würde schreiben/auslösen“,
- virtuelle Zeit mit Schritt, +1 Sekunde und +1 Minute.

Eine bereits gespeicherte und aktive Serverlogik läuft unabhängig weiter. Der Browser-Testmodus greift nicht in diese produktive Ausführung ein.

## Bearbeitungssicherheit

Der Editor besitzt nun:

- Rückgängig/Wiederholen mit bis zu 60 Zuständen,
- lokale Entwurfssicherung im Browser,
- Wiederherstellungsangebot nach einem unbeabsichtigten Verlassen oder Browserabbruch,
- Tastenkürzel für Speichern, Rückgängig, Wiederholen und Testmodus.

Der lokale Entwurf wird spätestens beim Verlassen der Seite unmittelbar geschrieben. Nach erfolgreichem Speichern auf dem EOS-System wird der lokale Entwurf entfernt.

## Prüfung

RC46 wird durch echte Chromium-Browsertests abgesichert. Geprüft werden insbesondere:

- automatische Spurplatzierung ohne Überlappungen,
- Auto-Anordnung verbundener Graphen,
- Simulation aller 41 Bausteintypen,
- gleichzeitige Live-Werte an Bausteinen und Leitungen,
- Trace der hypothetischen Ausgangsbefehle,
- vollständige Schreibfreiheit der Simulation,
- Rückgängig/Wiederholen und lokaler Entwurf,
- bestehende Verbindungserstellung und Scrollbereiche.
