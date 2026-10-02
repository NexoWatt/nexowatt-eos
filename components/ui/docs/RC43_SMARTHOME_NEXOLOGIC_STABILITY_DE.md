# RC43 – SmartHome- und NexoLogic-Stabilisierung (0.8.167)

RC43 stabilisiert den vollständigen SmartHome-Kern und NexoLogic, ohne die bewährten EMS-, Lade-, Speicher-, FENECON-, §14a- oder SafetyEnvelope-Regelparameter neu abzustimmen.

## NexoLogic

- Atomarer Start: Zuerst werden alle Eingänge gelesen und geprüft, erst danach werden konsistente Ausgänge freigegeben.
- Fehlende, ungültige oder veraltete Werte werden nicht als echte `0` interpretiert.
- Beim Start entstehen standardmäßig keine künstlichen Flanken, Impulse oder Szenenaufrufe.
- Deaktivieren, Löschen, Reload und Adapterstopp führen Ausgänge nach einer konfigurierbaren Ruhewertstrategie sicher zurück.
- Graphen werden vor der Aktivierung auf IDs, Ports, Datentypen, Pflichtparameter und unzulässige kombinatorische Zyklen geprüft.
- Speichern erfolgt transaktional; bei einem Aktivierungsfehler bleibt die zuletzt funktionierende Konfiguration aktiv.
- Zwei-Punkt-Regler und Mischermotor planen notwendige zeitgesteuerte Neuberechnungen unabhängig von neuen Eingangstelegrammen.
- Zustandsbehaftete Bausteine können ihren Zustand versioniert wiederherstellen.
- Ausgangsbefehle werden generationstreu serialisiert, damit alte asynchrone Writes neuere Entscheidungen nicht überschreiben.

## SmartHome

- Gemeinsamer, versionierter Gerätevertrag für Schalter/Taster, Dimmer, RGB/RGBW/Tunable White, Beschattung, Klima, Player/TTS, Szenen, Kameras, Widgets und schreibbare Wertgeber.
- Unbekannte, veraltete, offline oder fehlerhafte Daten werden sichtbar von echten AUS-/0-Werten unterschieden.
- Beschattungsbefehle berücksichtigen Sperre, Wind-, Regen- und Frostalarm; unsichere Schutzrückmeldungen blockieren Bewegungsbefehle fail-closed.
- Klimabefehle berücksichtigen Fensterkontakt und Gerätestörung.
- Szenen werden vollständig vorgeprüft, serialisiert ausgeführt und gegen Rekursion, fehlende Ziele, read-only Geräte und ungemappte Aktionen geschützt.
- SmartHome-Konfigurationen werden vor dem Speichern normalisiert und validiert. Aktivierung und Persistenz besitzen Rollback auf den vorher funktionierenden Stand.
- Die Datenpunktauswahl öffnet beim Ändern eines bereits zugeordneten Datenpunkts wieder direkt im aktuellen Objektordner – in SmartHome, NexoLogic und AppCenter.

## Abgrenzung

RC43 liefert den stabilen, verkaufsfähigen Kern für übliche Gebäudeautomation. Erweiterte Engineering-Funktionen wie Offline-Simulation, Einzelschritt-Trace, Undo/Redo, wiederverwendbare Sublogiken und ein öffentliches Baustein-SDK bleiben eigenständige Ausbaustufen und verändern die Sicherheitsfreigabe dieses Kerns nicht.
