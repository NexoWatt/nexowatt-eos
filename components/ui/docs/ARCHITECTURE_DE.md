# NexoWatt EOS – Architekturübersicht

Stand: 1.0.11. Den Einstieg in konkrete Funktionen und Abläufe bietet der [Quellcode-Wegweiser](QUELLCODE_WEGWEISER_DE.md). Die [Code-Landkarte](CODEMAP_DE.md) unterscheidet Originalquellen und generierte Ausgaben.

## Adapter und Kommunikation

`src-ts/runtime-executables/main.ts` verbindet ioBroker-Zustände, Zustands-Cache, Webserver, authentifizierte APIs, SSE-Liveupdates, Lizenzprüfung und EMS-Lebenszyklus. Dashboard, History, SmartHome und App-Center nutzen diese Schnittstellen. Zustandsnamen, Einheiten und API-Felder sind gemeinsame Verträge; Änderungen müssen alle betroffenen Leser und Schreiber berücksichtigen.

## Energie- und Laderegelung

Die Engine und der Modulmanager unter `src-ts/runtime-executables/ems/` koordinieren Messwerte, regelmäßige Berechnungen und das Stoppen der Module. Regelmodule bestimmen Budgets und Sollwerte. Zentrale Datenpunkt-/Schreibfunktionen führen freigegebene Befehle aus; Roh-Datenpunktzugriffe dürfen Schutz-, Einheiten- und Schreibregeln nicht umgehen.

Ladepunkte haben explizite elektrische Grenzen. AC-Netzstrom und DC-Ausgangsstrom sind unterschiedliche Größen; die Umrechnung braucht den richtigen Spannungs-/Phasenbezug. Speicherregelung und Ladebetrieb teilen sich Netz-, SOC- und Leistungsgrenzen. Fehlende oder veraltete Messwerte sind kein gültiger Nullwert.

## Oberflächen und Rollen

Die Browserquellen unter `src-ts/runtime-executables/www/` arbeiten mit HTML/CSS unter `www/`. React-Admin-Quellen liegen unter `src-admin-tab/src/`; ihre Bundles werden erzeugt.

Kunden bedienen bereits konfigurierte SmartHome-Geräte. SmartHome-Einrichtung, NexoLogic-Editor und Datenpunktzuordnung benötigen Installer/Admin mit echter Sitzung. Die Kundenansicht erhält ihre Raumstruktur über das getrennte Lesemodell `/api/smarthome/layout`; offene Kundenbedienung hebt die technischen Rollenprüfungen nicht auf. SMTP-Versandkonfiguration und Lizenzverwaltung bleiben Admin-Aufgaben; entscheidend ist die serverseitige Berechtigung, nicht allein ein ausgeblendeter Menüpunkt. App-Center-Funktionsgrenzen können über einen eigenen Endpunkt ohne Lizenzschlüssel gelesen werden.

## Benachrichtigungen

Der Adapter sammelt relevante Zustände. `notification-policy` erkennt Ereignisse und bestimmt Eskalation, Wiederholschutz und Versandfälligkeit. `notification-mail` verwaltet verschlüsselte Zugangsdaten, Versandhistorie und SMTP-Verbindung. Harte Fehler werden bei Erkennung fällig, normale Fehler werden alle 30 Minuten gesammelt, übrige Meldungen täglich. Ein SMTP-Ausfall kann die Zustellung verzögern; Annahme durch SMTP ist keine garantierte Zustellung ins Postfach.

## Dokumentation und Prüfung

[Deutsche Modulkommentare und fachliche Funktionskommentare](DOKUMENTATIONSSTANDARD_DE.md) gehören zur laufenden Pflege. Der generierte [Katalog](QUELLCODE_VERKNUEPFUNGEN_DE.md) verbindet Dateien, Imports und benannte Funktionen; dynamische API-/State-Verbindungen müssen zusätzlich fachlich beschrieben werden. Release- und Regressionstests prüfen Quellen, Laufzeit, Berechtigungen, Regelung und Dokumentationsstand.
