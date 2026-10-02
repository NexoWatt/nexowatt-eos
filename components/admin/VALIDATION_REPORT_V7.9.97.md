# NexoWatt EOS Admin 7.9.97 – Release-Validierung

## Ziel

7.9.97 korrigiert die Login-Regression aus 7.9.96 und verbindet die ausschließlich lesende EMS-Live-Diagnose mit der produktiven, authentifizierten EOS-Admin-Verbindung.

## Automatisiert bestanden

- Paket- und Versionskonsistenz für `package.json`, `io-package.json`, Lockdateien, Frontend-Version und Repository-Eintrag
- vollständige EOS-Stabilitätskette einschließlich Rollen, Erstanmeldung, Kontoverwaltung, Datapunktbedienung, Update und Runtime-Bereinigung
- Login-Layoutvertrag: 430 × 540 px Außenrahmen, 370 px Kartenbreite, automatische Kartenhöhe, keine innere Scrollfläche
- Browser-Layoutprüfung bei 1920 × 1080 und 1366 × 768, jeweils normal und mit Fehlermeldung
- verpflichtende persönliche Kennwortvergabe nach Anmeldung mit dem Erstkennwort `nexowatt`
- EMS-Verbindungsübergabe aus der produktiven `AdminConnection`; der generische Adapter-Konfigurationssocket überschreibt sie nicht mehr
- verzögerter Socket-Aufbau mit automatischem Neuversuch und sofortiger Aktualisierung nach `nexowatt-eos-admin-socket-ready`
- Endkundenbetrieb ohne verpflichtenden Zugriff auf `system.adapter.*.alive`
- EMS-Browserprüfung mit verzögert bereitgestellter Verbindung und Live-Vertrag `nexowatt-ui.0.info.adminOverview.*`
- rein lesender EMS-Pfad ohne `setState`, `setForeignState`, `sendToHost`, `writeFile` oder `extendObject`
- Quell-/Build-Spiegel für Login-CSS, Login-Runtime und EMS-Runtime
- Syntaxprüfung der geänderten JavaScript-, CJS- und TSX-Dateien
- `npm run check:eos-release`
- `npm publish --dry-run --tag latest`
- direkter Publish-Dry-Run des erzeugten Tarballs
- flacher Merge über einen vorhandenen 7.9.96-Ordner einschließlich Entfernung der veralteten v96-Browser-Runtime

## UI-Kompatibilität

Für Live-Daten benötigt die Kachel `iobroker.nexowatt-ui` ab Version **0.8.198**. Diese Version veröffentlicht den read-only Diagnosevertrag unter `info.adminOverview.*`. Fehlt der Vertrag, zeigt EOS Admin einen konkreten Hinweis auf Version, Neustart oder Leserechte, statt dauerhaft bei „Verbindung wird aufgebaut“ stehenzubleiben.

## Noch auf dem realen EOS-System abzunehmen

Vor dem kommerziellen Rollout muss die Installationsabnahme auf mindestens einem echten EOS-System erfolgen:

1. Update von 7.9.96 auf 7.9.97 mit anschließendem Browser-Hard-Reload.
2. Normale Anmeldung und bewusst falsches Passwort ohne Scrollleiste.
3. Erstanmeldung eines zurückgesetzten Benutzers mit `nexowatt` und anschließender persönlicher Kennwortvergabe.
4. UI-Adapter mindestens 0.8.198 neu starten und Live-Diagnose für Admin, Installateur und Endkunde prüfen.
5. Neustart des EOS-Rechners und erneute Prüfung von Anmeldung, Übersicht und Adapterstatus.

Erst nach diesen realen Systemprüfungen ist die Feldfreigabe für den Verkauf vollständig abgeschlossen.
