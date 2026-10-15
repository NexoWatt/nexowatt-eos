# Sechs eigene Adapter: begrenzter EOS-Testupdate

Die aktuelle veröffentlichte Anleitung steht immer in der [README](../../README.md).
Diese Seite beschreibt den neuen **Testkandidaten**, nicht allein durch ihre
Existenz einen veröffentlichten oder auf dem Pi bestandenen Installationsweg.

## Voraussetzungen

- Funktionsfähiger, vollständig eingerichteter R9-Teststand, Sequenz 12,
  Node 24.21.0 auf ARM64. Für eine Neuinstallation oder einen defekten R8-/R9-
  Zustand ist dieser Updatekoordinator nicht vorgesehen.
- Admin/UI-Anmeldung und PostgreSQL müssen vor dem Update funktionieren.
- Wartungsfenster mit sicherem Anlagenzustand und separater geeigneter
  Rückfallsicherung; das Update unterbricht den Controller vorübergehend.
- Ausschließlich den tatsächlich veröffentlichten, hashgepinnten Befehl aus
  der README verwenden. Keine Parameter erfinden, Signaturprüfung auslassen,
  Dateien in bestehenden signierten Releases austauschen oder Sperren entfernen.

## Was der Teststand einrichtet

Admin, UI, Devices, EEBUS, OCPP und Backup sind als feste eigene Adapter zur
Ausführung vorgesehen. Bestehende UUID, zentrale Home-/Pro-Lizenz, Konten,
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

Erwartetes Erfolgssignal des neuen Koordinators:
`phase: SIX_OWN_ADAPTER_TEST_ACTIVE`, `sequence: 13`, `adaptersEnabled: 6`.
Dies ist kein Nachweis physischer Geräteabnahme oder allgemeiner Fehlerfreiheit.

## Bei einem Fehler

Den bereinigten Fehlercode und die Fehlerphase melden; keine Passwörter,
Lizenzschlüssel, privaten Zertifikate oder vollständigen privaten Journale posten.
Nicht wiederholt installieren oder den Wartungslock eigenmächtig löschen.

`restoredPreviousActive: true` bedeutet nur dann einen bestätigten Rückfall,
wenn der Koordinator auch die Bereitschaft des authentifizierten R9 geprüft hat.
Andernfalls bleibt die Installation absichtlich gestoppt/gesperrt und benötigt
gezielte Diagnose. Neu hochgeladene, nicht mehr referenzierte statische
Adapterdateien dürfen bei einem Rückfall verbleiben; fremde Daten werden nicht
pauschal entfernt.

Technischer Umfang und tatsächliche Prüfgrenzen:
[Koordinatorbericht](../../reports/integration/own-adapter-test-20261015/update-coordinator.md)
und [Backup-Layoutprüfung](../../reports/integration/own-adapter-test-20261015/controller-backup-state.md).
