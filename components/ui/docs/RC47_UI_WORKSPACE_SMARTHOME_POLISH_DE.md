# RC47 – NexoLogic-Arbeitsfläche und SmartHome-Kachelpolitur

## Ziel

RC47 verbessert ausschließlich die Bedien- und Darstellungsqualität der bereits stabilisierten NexoLogic- und SmartHome-Oberflächen. Die produktiven EMS-, Lade-, Speicher-, FENECON-, §14a-, Safety-, Authentifizierungs- und Hardware-Writer-Verträge werden nicht verändert.

## NexoLogic

Der Logikeditor erbt nicht mehr die allgemeine Inhaltsbreitenbegrenzung des Cockpits. Auf Desktop-Systemen nutzt die Engineering-Arbeitsfläche nahezu die vollständige Browserbreite. Die linke Bausteinpalette und die rechte Eigenschaftenleiste bleiben kompakt; der zusätzliche Platz steht der mittleren Zeichenfläche zur Verfügung.

Geprüfter Referenz-Viewport: 2048 × 1100 Pixel.

- äußerer Editor nahezu bündig zum Viewport,
- mittlere Zeichenfläche mindestens 1.300 Pixel breit,
- vorhandene Seiten-, Canvas-, Palette- und Eigenschaften-Scrollbereiche bleiben bedienbar,
- bestehende Verbindungserstellung, Auto-Anordnung, Simulation, Undo/Redo und lokale Entwurfssicherung bleiben unverändert funktionsfähig.

## SmartHome

Alle vorhandenen Basistypen verwenden ein gemeinsames Bedienkarten-System:

- Schalter,
- Dimmer,
- Farbe,
- Jalousie/Rollladen,
- Raumtemperatur/Klima,
- Szene,
- Sensor/Wert,
- Player,
- Kamera,
- Widget.

Die Kacheln erhalten einheitliche Abstände, Iconflächen, Statusanzeigen, Bedienfelder, Fokuszustände und Qualitätskennzeichnungen. Aktive, veraltete, offline befindliche und fehlerhafte Geräte bleiben visuell unterscheidbar. Auf Desktop-Systemen wird die verfügbare Seitenbreite besser ausgenutzt; Tablet- und Mobilumbrüche bleiben erhalten.

## Sicherheits- und Funktionsabgrenzung

RC47 verändert keine Geräteverträge, Datenpunktzuordnungen, API-Aufrufe, Schreibwerte, Rückmeldeprüfungen oder Berechtigungen. Die Änderung liegt ausschließlich in `www/styles.css` sowie den notwendigen Versionskennungen und Releaseunterlagen.

Byte-identisch gegenüber 0.8.170 bleiben unter anderem:

- `main.js`,
- alle Lade- und Lastmanagementmodule,
- Netzanschluss- und Phasenschutz,
- §14a und EEBUS,
- Safety Envelope,
- Speicher und Speicherfarm,
- FENECON/FEMS und FENECON-NVP-Shadow,
- Heizstab, Thermik und Multi-Use,
- NexoLogic-Runtime und SmartHome-JavaScript-Verträge.

## Prüfungen

- echter Chromium-Test der NexoLogic-Viewportbreite,
- echter Chromium-Test aller zehn SmartHome-Basistypen,
- keine überlappenden Kacheln,
- keine unnötige horizontale SmartHome-Seitenüberbreite,
- bestehende NexoLogic-Verbindungs-, Scroll- und Simulationsprüfungen,
- SmartHome-Funktions-, Szenen-, Transaktions- und Rollenprüfungen,
- vollständige TypeScript-Gesamtsuite,
- Runtime-/Spiegelabgleich,
- Paket- und Secret-Prüfung.
