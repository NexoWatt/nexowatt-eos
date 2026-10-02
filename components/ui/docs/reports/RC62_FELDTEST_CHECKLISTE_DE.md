# NexoWatt UI 0.8.187 RC62 – letzte Feldtest-Checkliste

## 1. Vorbereitung je Anlage

- [ ] Aktuelle NexoWatt-Konfiguration und ioBroker-Backup erstellt.
- [ ] Vorherige funktionierende NexoWatt-UI-Version lokal gesichert.
- [ ] Bei OCPP-Anlagen passende NexoWatt-OCPP21-Version und Konfiguration gesichert.
- [ ] NVP-, PV-, Speicher-, Ladepunkt- und Aktor-Datenpunkte auf korrekte Einheit und Vorzeichen geprüft.
- [ ] Update in einem frischen Projektordner installiert.
- [ ] NexoWatt-UI-Instanz vollständig neu gestartet.
- [ ] Browsercache neu geladen.
- [ ] Statusseite zeigt keinen roten Tickfehler und kein dauerhaft gestopptes Kernmodul.

## 2. Grundbetrieb

- [ ] Energieflusswerte aktualisieren sich plausibel.
- [ ] Netzbezug und Einspeisung haben das richtige Vorzeichen.
- [ ] Speicherleistung zeigt Laden und Entladen korrekt.
- [ ] Keine App schreibt ohne Installation, Aktivierung und Freigabe.
- [ ] Manuelle Bedienung lässt sich jederzeit sicher zurücknehmen.

## 3. Speicherregelung und Speicherfarm

- [ ] Einzel- oder Farmbetrieb erkennt alle aktiven Speicher.
- [ ] Bei Ladebedarf wird ein positiver Ladesollwert verteilt.
- [ ] Bei Entladebedarf wird ein korrekter Entladesollwert verteilt.
- [ ] SoC-Untergrenzen und Reservebereiche werden eingehalten.
- [ ] Farmverteilung reagiert auf unterschiedliche SoC-Werte.
- [ ] Kommunikationsausfall eines Speichers führt zum vorgesehenen Recovery-Verhalten.
- [ ] Adapterneustart während eines Sollwerts führt nicht zu einem hängen gebliebenen Befehl.

## 4. Ladepunkte

Für mindestens eine Alfen-/Modbus- und eine OCPP21-Anlage ausführen, soweit vorhanden:

- [ ] Kein Fahrzeug: keine unbeabsichtigte Leistungsreservierung.
- [ ] Fahrzeug verbunden: kontrollierter Startversuch funktioniert.
- [ ] Boost läuft mindestens zehn Minuten ohne Ein-/Aus-Pendeln.
- [ ] Min+PV startet, hält die Mindestleistung und regelt PV sauber nach.
- [ ] PV-Überschuss startet und pausiert ohne periodischen Offline-Zyklus.
- [ ] Auto berücksichtigt PV, Tarif und Zeit-Ziel gemeinsam.
- [ ] Zeit-Ziel erzeugt bei Bedarf eine reale Startanforderung.
- [ ] Günstiger Tarif wirkt gemäß gewählter Tarifstrategie.
- [ ] Teurer Tarif wartet nur, solange das garantierte Ziel nicht gefährdet ist.
- [ ] Stations- und Mehrladepunktgrenzen werden eingehalten.
- [ ] Echter Verbindungsabbruch wird sicher erkannt.
- [ ] 0-W-/Stop-Anforderung wird von der Hardware bestätigt.

## 5. §14a, Netzlimits und Parkregler

- [ ] §14a-Signal wird erkannt und protokolliert.
- [ ] Ladepunkte werden gemäß 4,2-kW-/Anlagenvertrag begrenzt.
- [ ] Speicher, Wärmepumpe/Klima und weitere steuerbare Verbraucher folgen der vorgesehenen Priorität.
- [ ] Netzanschlussgrenze wird bei einem Lastsprung eingehalten.
- [ ] Parkregler-Sollwert hat die vorgesehene übergeordnete Wirkung.
- [ ] Nach Ende der Begrenzung erfolgt ein kontrollierter Wiederanlauf.

## 6. Heizstab und thermische Geräte

- [ ] Heizstab PV-Auto läuft tagsüber nur mit realem Budget.
- [ ] Heizstab PV-Auto bleibt im konfigurierten Nachtfenster aus.
- [ ] Manual/Boost oder externe Handfreigabe funktioniert nachts wie vorgesehen.
- [ ] Safety-, Netz- und §14a-Stopp wirken auch bei Handfreigabe.
- [ ] Thermisches Gerät hält minimale Lauf- und Stillstandszeit ein.
- [ ] Maximale Abschaltdauer und Temperaturgrenze lösen die sichere Freigabe aus.
- [ ] Veralteter/fehlender Temperatursensor führt zum konfigurierten Fail-safe-Zustand.

## 7. Tarife, Peak-Shaving, Export Guard und MultiUse

- [ ] Tarifprovider liefert aktuelle Werte und Zeitstempel.
- [ ] Veralteter Tarifwert führt nicht zu einer unbegrenzten alten Entscheidung.
- [ ] Günstig-/Teuer-Klassifizierung stimmt mit der Anzeige überein.
- [ ] Peak-Shaving reagiert auf reale Lastspitzen, ohne Schwingen.
- [ ] Export Guard hält die konfigurierte Einspeisegrenze.
- [ ] MultiUse-SoC-Zonen greifen nur im vorgesehenen Bereich.
- [ ] Speicherregeln überschreiben sich nicht gegenseitig.

## 8. Betriebsstrategien

- [ ] Nur aktive und vollständig zugeordnete Ressourcen werden angezeigt.
- [ ] Strategie zuerst im Beobachtungsmodus geprüft.
- [ ] Entscheidungsgründe und blockierende Grenzen sind nachvollziehbar.
- [ ] Anschließend genau eine Ressource aktiv in Betrieb genommen.
- [ ] Ladepunkt nimmt nur über Auto → EOS Betriebsstrategie teil.
- [ ] Manuell, Boost, PV, Min+PV und Zeit-Ziel bleiben außerhalb der Strategie eigenständig.
- [ ] Deaktivierung oder abgelaufene Anforderung fällt sicher zurück.

## 9. SmartHome und NexoLogic

- [ ] Konfiguration laden, ändern, speichern und erneut laden funktioniert.
- [ ] Gerätetypen und Icons werden korrekt angezeigt.
- [ ] Kacheln lesen und schreiben nur die zugeordneten Datenpunkte.
- [ ] Szenen und Timer laufen ohne unbeabsichtigte Doppelbefehle.
- [ ] Player-, Sender- und Playlistbefehle aktualisieren die Ansicht.
- [ ] NexoLogic-Verbindungen, Simulation und Ausgänge funktionieren.

## 10. Mesh/Microgrid und Netzbetreiber-Schnittstelle

- [ ] Mesh nur bei tatsächlicher Nutzung aktivieren.
- [ ] Zwei reale Instanzen bestehen Handshake, Status und Command-Ack.
- [ ] Token, Cluster-ID und Receiver-Allowlist stimmen überein.
- [ ] Timeout oder nicht erlaubter Peer wird korrekt klassifiziert.
- [ ] Netzbetreiber-Schnittstelle bleibt ohne freigegebenen produktiven Treiber read-only.
- [ ] Hersteller-/Parkregler-Sollwerte erst nach dokumentierter Freigabe aktiv testen.

## 11. BHKW, Generator, Relais und Schwellwertsteuerung

- [ ] Schreibdatenpunkt, Datentyp, Skalierung und sicheren Aus-Wert geprüft.
- [ ] Ein-/Ausschaltung wird über einen separaten Rückmeldewert bestätigt.
- [ ] Schwellwert, Hysterese und Mindestlaufzeit verhindern Takten.
- [ ] Kommunikationsausfall führt zum festgelegten sicheren Zustand.
- [ ] Kein zweites Modul schreibt parallel auf denselben Aktor.

## 12. Neustart, Ausfall und Dauerbetrieb

- [ ] NexoWatt-UI-Neustart während Normalbetrieb bestanden.
- [ ] Neustart während Lade-, Speicher- oder Heizvorgang bestanden.
- [ ] Kurzzeitiger Netzwerkverlust bestanden.
- [ ] Datenpunktveraltung und Wiederkehr bestanden.
- [ ] Rollback auf die vorherige Version praktisch geprüft.
- [ ] Mindestens 24 Stunden ohne ungeklärten Tickfehler.
- [ ] Für Stable: möglichst sieben Tage Dauerbetrieb ohne ungewollte Stopps, Pendeln oder hängen gebliebene Sollwerte.

## Abnahme

- [ ] Keine ungeklärten roten Modulfehler.
- [ ] Keine unbeabsichtigte Geräteaktivierung.
- [ ] Keine unbestätigten Pflichtstopps.
- [ ] Keine ungeplanten Speicherfarm-Stopps.
- [ ] Alle sicherheitsrelevanten Befehle mit realer Rückmeldung geprüft.
- [ ] Anlage für weiteren Feldbetrieb freigegeben.
