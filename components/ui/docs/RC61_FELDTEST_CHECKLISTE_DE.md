# RC61 – Feldtest-Checkliste je NexoWatt-EOS-Anlage

## Vorbereitung

- [ ] Konfiguration und aktuelle Adapterversion sichern.
- [ ] Bei OCPP zuerst NexoWatt OCPP 0.4.1 installieren.
- [ ] Danach NexoWatt UI 0.8.186 RC61 installieren.
- [ ] Beide betroffenen Instanzen vollständig neu starten.
- [ ] Keine roten Tickfehler im Status.

## Speicher und Speicherfarm

- [ ] Topologie zeigt `farm` oder den erwarteten Einzelspeicher.
- [ ] Be-/Entladevorgabe ungleich 0 W erreicht die Hardware bei realem Bedarf.
- [ ] Richtungswechsel funktioniert ohne unnötige 0-W-Zwischenrunde.
- [ ] Ein fehlgeschlagener positiver Wallbox-Start stoppt die Speicherfarm nicht.
- [ ] Ein echter globaler Safety-Stopp sperrt Speicher und flexible Verbraucher weiterhin.

## Ladepunkte

- [ ] Kein Fahrzeug: 0 W und keine Startreservierung.
- [ ] Verbunden/startfähig: kontrollierter Mindestleistungs-Startversuch.
- [ ] Auto Standard funktioniert.
- [ ] PV-Überschuss startet und pausiert zuverlässig.
- [ ] Min+PV hält die Mindestleistung stabil.
- [ ] günstiger Tarif wird gemäß gewählter Tarifstrategie genutzt.
- [ ] Zeit-Ziel erzeugt eine echte Mindestanforderung, sofern erforderlich.
- [ ] §14a-, Stations-, Netz- und Phasengrenzen bleiben wirksam.

## OCPP21 zusätzlich

- [ ] Zuordnung verwendet ausschließlich direkte `ocpp21.*`-Datenpunkte.
- [ ] `eosSafeZeroProfile=true`.
- [ ] `requestedChargeLimit` entspricht der EOS-Anforderung.
- [ ] `appliedChargeLimit` entspricht nach Bestätigung der angewendeten Grenze.
- [ ] `hardwareCommandConfirmed=true` nach stabiler Übernahme.
- [ ] 0-W-Pause ergibt `chargeLimitReason=explicit-zero-profile` oder eine gleichwertig bestätigte Nullvorgabe.
- [ ] Echte WebSocket-Trennung wird als offline erkannt.

## Heizstab

- [ ] `PV-Auto nachts sperren` ist entsprechend Kundenwunsch aktiviert.
- [ ] Nachtbeginn und Nachtende stimmen mit der Anlage überein.
- [ ] Tagsüber regelt PV-Auto normal.
- [ ] Im Nachtfenster bleibt PV-Auto aus.
- [ ] Manual 1/2/3 funktioniert nachts.
- [ ] Boost funktioniert nachts.
- [ ] Externe manuelle KNX-/Relais-Freigabe wird nachts nicht vom PV-Auto überschrieben.
- [ ] §14a- und Safety-Grenzen bleiben bei Handfreigabe wirksam.

## Abnahme

- [ ] Mindestens 24 Stunden ohne ungeklärten Tickfehler.
- [ ] Keine ungewollten Ladeabbrüche oder Start-Stopp-Pendelbewegungen.
- [ ] Keine unbeabsichtigten Speicherfarm-Stopps.
- [ ] Ereignislog und Diagnosewerte archiviert.
- [ ] Auffälligkeiten mit Uhrzeit, Modus, Ladepunkt und Diagnosewerten dokumentiert.
