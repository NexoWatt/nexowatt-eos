# Testbericht – NexoWatt UI 0.8.157 RC33

## Ziel

Härtung des lesenden EVCS-Datenpfads, nachdem bei zwei Feldanlagen Wallboxwerte beziehungsweise NexoWatt-Spiegelstates nicht mehr aktualisiert wurden. Die Änderung darf keine bestehende Lade-, Speicher-, §14a-, EEBUS- oder Aktorlogik verändern.

## Umgesetzte Schutzmaßnahmen

- zentrale Multi-Binding-Registry für alle lesenden Ladepunkt-Datenpunkte;
- mehrere Ladepunkte dürfen dieselbe Stations-ID für Online, Heartbeat oder Status verwenden;
- automatische Auflösung und zusätzliche Subscription von ioBroker-Alias-Read-Quellen;
- Initialwerte werden über die konfigurierte Alias-ID gelesen;
- 3-Sekunden-Sicherheitsabruf umfasst alle EVCS-Eingänge und schreibt auch die lokalen `evcs.<n>.*`-Spiegelstates;
- Quellzeitstempel bleiben im internen Cache erhalten und werden nicht durch eigene `ack=true`-Spiegelereignisse ersetzt;
- neue Rohspiegel für Fahrzeugverbindung, Ladebedarf, Heartbeat und Phasenrückmeldung;
- keine Änderung an Sollwerten, Regelbudgets, Schreibintervallen oder Hardware-Autorität.

## Automatisierte Regressionen

Erfolgreich geprüft wurden insbesondere:

- `test:evcs-input-refresh-hardening` inklusive dynamisch extrahierter produktiver Methoden;
- gemeinsame Stations-Online- und Heartbeat-IDs für mehrere Connectoren;
- Alias-Zielereignis mit erneutem Read der konfigurierten Alias-ID;
- Wiederherstellung eines lokalen EVCS-Spiegels durch den Poll-Pfad;
- keine doppelten Spiegelwrites bei identischer Quellprobe;
- Spiegelaktualisierung bei neuem Quellzeitstempel trotz unverändertem Wert;
- Wh→kWh-Normalisierung über den bestehenden EVCS-Einheitenvertrag;
- EVCS-Online-, Status-, Ladebedarfs-, Phasen- und Speicherassistenz-Regressionen;
- §14a-/EEBUS-Direkt-API sowie Actuator-Authority- und Safety-Arbiter;
- TypeScript-Runtime-Synchronität, Runtime-Mirror-Hashes und JavaScript-Syntax.

## Feldtest

Die automatische Prüfung deckt den Adapterdatenpfad ab. Für die finale Feldfreigabe ist auf einer betroffenen Anlage zu kontrollieren:

1. Original-DP des Geräte-/Herstelleradapters;
2. lokaler Spiegel `nexowatt-ui.0.evcs.<n>.*`;
3. Runtime-Diagnose unter `chargingManagement.wallboxes.lp<n>.*`;
4. Verhalten bei aktiver Lade-/PV-Regelung über mindestens einen vollständigen Ladevorgang.

Der Patch verändert bewusst keine Schreibfrequenz. Sollte bereits der Original-DP des Herstelleradapters bei aktiver Regelung einfrieren, muss anschließend separat die Schreib-/Lese-Warteschlange des jeweiligen Geräteadapters untersucht werden.
