# Sechs eigene Adapter: begrenzter EOS-Testupdate

Stand: 15. Oktober 2026. **R10 (`0.2.0-test.3`, Sequenz 13) ist signiert,
veröffentlicht und öffentlich zurückgelesen.** Der native Sechs-Adapter-Test
einschließlich Backup-Inhalten, Migrationsrückfall und Neustart ist bestanden.
Ein Update auf dem physischen Test-Pi wurde damit noch nicht durchgeführt.

Der geprüfte vollständige Updatebefehl steht in
[UPDATE_COMMAND.txt](../../delivery/public-update-test3-r10/UPDATE_COMMAND.txt)
([fest veröffentlichter Stand](https://github.com/NexoWatt/nexowatt-eos/blob/f264bb9f7510a0e2d21637a39f8b9fc9464bdec9/delivery/public-update-test3-r10/UPDATE_COMMAND.txt)).
Er gehört ausschließlich zur R10-Release-ID
`9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0`.

## Voraussetzungen

- Funktionsfähiger, vollständig eingerichteter R9-Teststand, Sequenz 12,
  Node 24.21.0 auf ARM64. Für eine Neuinstallation oder einen defekten R8-/R9-
  Zustand ist dieser Updatekoordinator nicht vorgesehen.
- Admin/UI-Anmeldung und PostgreSQL müssen vor dem Update funktionieren.
- Wartungsfenster mit sicherem Anlagenzustand und separater geeigneter
  Rückfallsicherung; das Update unterbricht den Controller vorübergehend.
- Ausschließlich den oben verlinkten veröffentlichten, hashgepinnten Befehl
  verwenden. Keine Parameter erfinden, Signaturprüfung auslassen,
  Dateien in bestehenden signierten Releases austauschen oder Sperren entfernen.

## Was der Teststand einrichtet

Admin, UI, Devices, EEBUS, OCPP und Backup werden als sechs feste eigene
Adapterinstanzen aktiviert. Bestehende UUID, zentrale Home-/Pro-Lizenz, Konten,
Passwörter und Gerätezertifikate werden nicht ersetzt.

Die vier zusätzlichen Adapter starten mit einer **nicht konfigurierten**
Testkonfiguration: keine geratenen Geräteadressen, keine automatische EEBUS-
Kopplung, kein ungeschützter OCPP-Listener und keine ungeprüften Backupziele.
Sie warten auf die bewusste Einrichtung. „Prozess läuft“ bedeutet deshalb nicht
„Anlage angeschlossen“ oder „Regelung abgenommen“.

Der Updateprüfer verlangt deshalb zusätzlich frische Startzustände: EEBUS muss
auf Einrichtung warten; mit gültiger Energielizenz muss OCPP auf seine sichere
Transporteinrichtung warten und Backup vollständig initialisiert sein. Ohne
gültige Energielizenz müssen OCPP und Backup beide ihren Lizenzwartezustand
melden. Ein laufender Prozess mit Initialisierungsfehler gilt nicht als bereit.

## Nach einem bestätigten Erfolg testen

1. Admin und UI über die vorhandenen vertrauenswürdigen HTTPS-Adressen anmelden.
2. Sichtbarkeit und laufenden Status aller sechs Instanzen prüfen.
3. Zentrale Home-/Pro-Lizenz nach Neuladen kontrollieren; keinen Schlüssel in
   Diagnoseausgaben weitergeben.
4. Pi kontrolliert neu starten; Anmeldung, Lizenzstatus und alle sechs
   Instanzen erneut prüfen.
5. Danach Geräteprotokolle und Backupziel einzeln einrichten. Verbindungsstatus,
   Messwerte, Einheiten und Ausfallverhalten zuerst prüfen, bevor schreibende
   Anlagenbefehle freigegeben werden.
6. Ein erzeugtes logisches Backup auf Inhalt prüfen. Es ist noch kein
   nachgewiesenes vollständiges EOS-Systembackup; Restore erfordert den dafür
   vorgesehenen, gesondert geprüften Betreiberablauf.

Erwartetes Erfolgssignal des R10-Koordinators:
`phase: SIX_OWN_ADAPTER_TEST_ACTIVE`, `sequence: 13`, `adaptersEnabled: 6`.
Dies ist kein Nachweis physischer Geräteabnahme oder allgemeiner Fehlerfreiheit.

## Tatsächlicher Prüfstand und verbleibende Grenzen

Der [Sicherheitslauf 38717983127](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717983127)
bestand mit 8/8 Jobs. Der native Own-Adapter-Job bestand mit 15/15 TAP-Tests,
21/21 Freigabechecks und 16 fehlerfreien Laufzeit-Scans. Zwei echte logische
Backup-Archive wurden inhaltlich geprüft; Migrationsrückfall, erneute Anwendung
und Neustart bestanden ebenfalls. Der
[Auslieferungslauf 38718750400](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38718750400)
ist erfolgreich abgeschlossen. Auch der
[CodeQL-Lauf 38717982998](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982998)
ist erfolgreich abgeschlossen; die verbleibenden Analysegrenzen stehen im
[Prüfbericht](../../reports/integration/own-adapter-test-20261015/README_DE.md).

Offen bleiben die Installation und Abnahme auf dem Pi, echte Geräte-/Stations-
und Hardwaretests sowie die vollständige Wiederherstellung. Bekannte
[Forge-/AJV-Befunde](../../reports/integration/own-adapter-test-20261015/dependency-review/README_DE.md)
bleiben dokumentiert und offen. R10 ist eine begrenzte Testlieferung ohne
Produktions- oder CRA-Freigabe.

## Bei einem Fehler

Den bereinigten Fehlercode und die Fehlerphase melden; keine Passwörter,
Lizenzschlüssel, privaten Zertifikate oder vollständigen privaten Journale posten.
Nicht wiederholt installieren oder den Wartungslock eigenmächtig löschen.

Auch nach bestätigtem Rückfall zu laufendem R9 bleibt der geschützte
Migrationsplan erhalten. Ein erneuter Versuch kann deshalb mit
`REPAIR_ENROLLMENT_PLAN` abbrechen. Den Plan nicht löschen; die erhaltenen
Belege ermöglichen die gezielte Diagnose des vorherigen Versuchs.

`restoredPreviousActive: true` bedeutet nur dann einen bestätigten Rückfall,
wenn der Koordinator auch die Bereitschaft des authentifizierten R9 geprüft hat.
Andernfalls bleibt die Installation absichtlich gestoppt/gesperrt und benötigt
gezielte Diagnose. Neu hochgeladene, nicht mehr referenzierte statische
Adapterdateien dürfen bei einem Rückfall verbleiben; fremde Daten werden nicht
pauschal entfernt.

Technischer Umfang und tatsächliche Prüfgrenzen:
[Koordinatorbericht](../../reports/integration/own-adapter-test-20261015/update-coordinator.md)
und [Backup-Layoutprüfung](../../reports/integration/own-adapter-test-20261015/controller-backup-state.md).
