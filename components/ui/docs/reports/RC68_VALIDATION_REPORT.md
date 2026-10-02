# RC68-Validierungsbericht – NexoWatt UI 0.8.193

## Release-Ziel

RC68 ersetzt bei aktivierter §14a-Regelung den bisherigen pauschalen 0-W-Safety-Stopp bei fehlendem, ungültigem oder veraltetem §14a-/CLS-/EEBUS-Signal durch einen lokalen Pmin-Kommunikationsfallback. Der bestehende zentrale Single Writer sowie Netz-, Stations-, Phasen-, Geräte- und Safety-Grenzen bleiben unverändert übergeordnet.

## Umgesetzter Vertrag

- Direktansteuerung: je steuerbarem Ladepunkt höchstens 4.200 W netzwirksames Fallback-Cap.
- EOS-/EMS-Ansteuerung: gemeinsames Pmin-Budget einschließlich Gleichzeitigkeitsfaktor; der einzelne startbereite Ladepunkt kann innerhalb des Gesamtbudgets bis 4.200 W erhalten.
- Ein frisches inaktives §14a-Signal hebt den Fallback auf und gibt die normale EOS-Regelung frei.
- Ein frischer Dimmvertrag bleibt maßgeblich.
- Ein fehlendes oder veraltetes Signal führt weder zur unbegrenzten Freigabe noch zur pauschalen 0-W-Verriegelung.
- Der lokale Netzanschluss-, Stations- oder Phasen-Headroom darf das Fallback-Cap weiter reduzieren. Liegt die wirksame AC-Leistung unter der technischen Mindestleistung, bleibt der finale 0-W-Safety-Stopp zulässig.
- Physikalisch validierte lokale PV-Leistung kann zusätzlich zum netzwirksamen §14a-Anteil genutzt werden.
- Die alte Einstellung `release` wird sicher auf `local-pmin` migriert.

## Neue Diagnosewerte

- `para14a.communicationFallbackActive`
- `para14a.communicationFallbackReason`
- `para14a.fallbackEvcsCapW`
- `para14a.signalFresh`
- `para14a.signalStatus`
- `para14a.evcsTotalCapW`
- `para14a.totalCapW`

Der Safety-Envelope spiegelt Kommunikationsfallback, Grund und wirksames EVCS-Budget.

## Ausgeführte Prüfungen

Alle 238 geordneten Release-Prüfschritte wurden erfolgreich ausgeführt. Wegen der maximalen Laufzeit eines einzelnen Werkzeugprozesses erfolgte das Gate in deterministischen Bereichen; jeder einzelne Schritt besitzt ein erfolgreiches Ergebnis.

Besonders geprüft wurden:

- RC68 §14a-Kommunikationsfallback;
- §14a-Zentralconstraint und EEBUS-Direkt-API;
- Direkt- und EOS-/EMS-Modus;
- zwei EVCS mit 7.560-W-GZF-Gesamtbudget und 4.200-W-Gerätecap;
- fehlendes, veraltetes, frisches inaktives und frisches aktives Signal;
- Gateway-Failsafe trotz erreichbarer EEBUS-Instanz;
- lokale PV-Ergänzung;
- Netzanschluss-Headroom unterhalb der technischen AC-Mindestleistung;
- finaler Charging-Safety-Write;
- RC49 §14a-EVCS-Startregression;
- Stations-, Netz-, Phasen- und Multi-Lademanagement;
- Speicher-, Speicherfarm-, Tarif-, OCPP21-, RFID- und Availability-Regressionen;
- Betriebsstrategien-Grundvertrag;
- Lizenz-Bootstrap;
- SmartHome, NexoLogic, Mesh und Cross-App-Identifier-Audit;
- Paket-Runtime-Startprüfung.

## Quell- und Paketprüfung

- Version: `0.8.193`
- TypeScript-/TSX-Dateien im Projekt: 728
- kanonische produktive Runtimequellen: 111
- Runtime-TS-/TSX-Spiegel: 469
- `@ts-nocheck`-Budget: 60 Dateien / 160.329 Zeilen, Grenzwert 160.344
- Release-Artefaktmanifest: 271 geprüfte Paketdateien
- npm-Paketinhalt: 272 Dateien
- npm-Paketgröße: 7.527.744 Byte
- ungepackte npm-Größe: 16.823.255 Byte
- `publish:check`: bestanden
- `verify-publish.js`: bestanden
- `npm pack --dry-run`: bestanden
- JS-/MJS-Runtime-Startprüfung: 163 Dateien, bestanden

## Bekannte Freigabegrenze

RC68 ist ein fokussierter Feldtestkandidat und noch keine `1.0.0 Stable`. Vor der Stable-Kennzeichnung müssen mindestens reale Kommunikationsabbrüche und Wiederverbindungen, echte §14a-Dimmung, Direkt- und EMS-Ansteuerung, mehrere Ladepunkte, Netz-/Stations-/Phasengrenzen sowie ein mehrtägiger Dauerbetrieb ohne ungeklärten Tick-, Regel- oder Writerfehler abgeschlossen werden.

Der bereits gemeldete Ausbau des vorausschauenden Zeit-Ziel-Ladens mit gemeinsamer Preis- und PV-Slotplanung ist nicht Bestandteil dieses fokussierten §14a-Release und muss vor der allgemeinen Stable-Freigabe separat abgeschlossen und im Feld geprüft werden.
