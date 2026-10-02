# RC63-Feldtest-Checkliste

## Vorbereitung

- [ ] RC62-Konfiguration und Adapterordner sichern.
- [ ] RC63 `0.8.188` in einen frischen Projektordner entpacken und veröffentlichen/installieren.
- [ ] NexoWatt-UI-Instanz vollständig neu starten.
- [ ] Bei OCPP21 direkte native `ocpp21.*`-Zuordnungen kontrollieren.

## Wallbox-Verfügbarkeit

- [ ] Station „An“, RFID aus: `availability` bleibt `true`.
- [ ] Fahrzeug anstecken und laden.
- [ ] Ladevorgang beenden beziehungsweise Fahrzeug voll: nur Leistung 0 W, keine Stationssperre.
- [ ] Stecker ziehen: nur Leistung 0 W, keine Stationssperre.
- [ ] PV-/Tarifpause auslösen: nur Leistung 0 W, keine Stationssperre.
- [ ] §14a-/Netz-/Safety-Reduktion auf 0 W: Station bleibt Operative.
- [ ] Station ausdrücklich „Aus“: `availability=false`.
- [ ] Station wieder „An“: `availability=true` und alte Inoperative-Verriegelung wird aufgehoben.
- [ ] RFID-Whitelist aktiv, unbekannter Tag: Sperre aktiv.
- [ ] autorisierter RFID-Tag: Freigabe aktiv.
- [ ] Kundenschalter „Aus“ bleibt auch bei autorisiertem RFID-Tag gesperrt.

## Speicher-Netzladen

- [ ] AppCenter-Freigabe aus: kein Netzladen.
- [ ] Tarif günstig + Preis frisch + manuelles NT aktiv + Speicherpriorität: Netzladen erlaubt.
- [ ] Tarif günstig außerhalb NT: kein Netzladen.
- [ ] Tarif neutral oder teuer in NT: kein Netzladen.
- [ ] Preis veraltet/fehlend: kein Netzladen.
- [ ] Zeitvariables Netzentgelt aus: kein Netzladen.
- [ ] fehlende HT/NT-Zeit: kein Netzladen.
- [ ] fehlende aktuelle Quartalszeit: kein Netzladen.
- [ ] Negativpreis außerhalb NT: kein Netzladen.
- [ ] reale PV-Einspeisung/NVP-Überschuss: PV-Laden bleibt möglich.
- [ ] Speicherfarm und Einzelspeicher jeweils prüfen.

## Wiederanlauf

- [ ] Adapterneustart bei operativer Wallbox.
- [ ] Adapterneustart während Speicher-Netzladesperre.
- [ ] Konfiguration bleibt erhalten.
- [ ] Keine Tickfehler unter Status.
- [ ] Kein hängen gebliebener positiver Wallbox- oder Speicher-Sollwert.
