# NexoWatt EOS 0.8.168 RC44 – NexoLogic- und Kundenarbeitsbereich

## Ziel

RC44 behebt den im Feld bestätigten Verbindungsfehler des NexoLogic-Editors und trennt die Rollen eindeutig:

- **Kunde:** SmartHome bedienen und konfigurieren, Geräte koppeln, Datenpunkte auswählen, NexoLogic bearbeiten, Zeitprogramme und Szenen verwalten.
- **Installer/Admin:** EMS/App-Center, Lizenzverwaltung, Simulator und beliebige Hardware-Schreibtests.

Die bestehenden Energie-, Lade-, Speicher-, FENECON-, §14a- und SafetyEnvelope-Algorithmen werden nicht fachlich verändert.

## NexoLogic-Verbindungsfix

Der Editor speichert seine Bausteinbibliothek unter `nwLE.lib`. Der bisherige Porttyp-Lookup griff beim Abschluss einer Leitung jedoch auf das nicht vorhandene Objekt `nwLE.library` zu. Dadurch entstand im Browser eine JavaScript-Ausnahme, bevor ein Link im Graph gespeichert werden konnte.

RC44 verwendet ausschließlich `nwLE.lib.byType`, prüft die Porttypen und unterstützt drei Bedienwege:

1. Ausgang anklicken und anschließend kompatiblen Eingang anklicken.
2. Vom Ausgang zum Eingang ziehen.
3. Ausgang und Eingang per Tastatur mit Enter/Leertaste bedienen.

Kombinatorische Zyklen und unpassende Datentypen werden vor dem Anlegen blockiert. Ein Eingang behält weiterhin maximal eine Quelle.

## Desktop-Arbeitsfläche

NexoLogic ist bewusst eine Desktop-Funktion. Die Seite nutzt daher den vollständigen Browser-Viewport:

- linke Bausteinpalette;
- große zentrale Zeichenfläche;
- rechte Eigenschaftenleiste;
- voneinander unabhängige Scrollbereiche;
- vergrößerte Ports und visuelle Zielmarkierungen.

Unterhalb der vorgesehenen Desktopbreite erscheint ein Hinweis statt einer unübersichtlichen mobilen Bearbeitungsfläche.

## Kundenberechtigungen

SmartHome und NexoLogic werden nicht mehr durch eine Installer-Capability im HTML gesperrt. Die APIs verwenden den normalen Kundenarbeitsbereich und den bestehenden lokalen/Session-Vertrag. Die Standardkonfiguration `customerWritePolicy=all` erlaubt die lokale Kundenbedienung ohne Installerpasswort.

Der direkte Schreibtest auf beliebige fremde Datenpunkte bleibt bewusst geschützt, weil er die normalen Geräteverträge, Readback- und Sicherheitsgrenzen umgehen könnte.

## Branding

Alle kunden sichtbaren Produktbezeichnungen verwenden `NexoWatt EOS`. Technische Kompatibilitätsbezeichner wie der npm-Paketname, Plattformabhängigkeiten, `io-package.json` oder `system.adapter.*` bleiben intern unverändert, weil ein Umbenennen die Installation und Updates beschädigen würde.

## Feldabnahme

Vor Stable-Freigabe prüfen:

1. Zwei Bausteine per Klick verbinden, speichern, Seite neu laden.
2. Verbindung per Ziehen erstellen und per Rechtsklick entfernen.
3. Inkompatible Ports und Zyklusversuch werden blockiert.
4. SmartHome-Konfiguration und NexoLogic öffnen ohne Installer-Passwortdialog.
5. EMS/App-Center, Lizenz und Simulator bleiben gesperrt.
6. Einen bestehenden Datenpunkt ändern; Picker startet im bisherigen Elternordner.
7. Schalter, Dimmer, Jalousie, Klima und Szene mit realem Readback testen.
8. Adapter neu starten; keine Startflanken oder Zwischenwrites.
