# NexoWatt EOS 1.0.5 – offizielle Stable-Version

**Datum:** 2026-09-12  
**Basis:** vollständige Repository-ZIP 1.0.4

## Gezielte Korrektur

Die Kundenwahl „Speicher schützen“ ist von der Messwertqualität getrennt. In Auto,
Boost und Min+PV wird eine unbekannte Fahrzeuglast nicht mehr als 0 W und damit als
Freigabe der Speicherentladung behandelt. Alte Wattwerte werden nicht als aktuelle
Messwerte fortgeschrieben; Sollwerte ersetzen keine gemessene Fahrzeugleistung.

Bei unbekannter geschützter Fahrzeuglast pausiert die gesamte Speicherentladung.
Der NVP allein erlaubt keine verlässliche Trennung von Hauslast und Fahrzeuglast.
Daher kann während dieser Störung auch der Hausverbrauch vorübergehend Netzbezug
verursachen. Das ist der beabsichtigte konservative Fehlerfall, keine Änderung der
Normalregelung. Echter Gesamtüberschuss nach Haus und Fahrzeug darf weiterhin in
den Speicher geladen werden. Speicherentladung wird nicht als PV interpretiert.

Nach Rückkehr gültiger Telemetrie ist ohne manuellen Reset wieder der bisherige
Hauslastausgleich aktiv. Frisch bestätigter Stillstand/Standby blockiert ihn nicht.
Ein Wechsel auf „Mitnutzen“ oder reines PV-Laden wird bei der nächsten vollständigen
Policy-Auswertung berücksichtigt; reines PV aktiviert weiterhin keinen Speicherschutz.
Die AppCenter-Bedienfreigabe bleibt eine Bedienfreigabe, keine neue Installateursperre.

## Verteilung und Schutzpfade

Auto-PV-Priorität, Gebäudeverbrauch, Wallbox-Startminimum, Phasenwahl/-umschaltung,
Umschaltpausen, Tarif-/Ladezielfreigaben und bestehende Netz-/Stations-/§14a-Grenzen
bleiben unverändert. Im Normalbetrieb wird nur der frische geschützte Fahrzeuganteil
aus der zulässigen Speicherentladung entfernt. Unterhalb des technisch zulässigen
PV-Ladestarts bleibt ungenutzter Überschuss für den Speicher verfügbar.

Die Korrektur sitzt in der gemeinsamen EVCS-Speicher-Policy und der vorhandenen
asymmetrischen Speicherschranke vor den Ausgangspfaden. Die bestehenden Protokoll-Writer bleiben erhalten. Für E3/DC RSCP wird ein
0-W-Stopp wegen unbekannter geschützter Fahrzeuglast ausdrücklich mit dem bereits
vorhandenen IDLE-Modus gesendet: NORMAL würde die lokale Eigenverbrauchsregelung
wieder freigeben. Diese Auswahl gilt nur für den betreffenden Störfallbefehl; die
gespeicherte Einstellung `e3dcZeroMode` und alle normalen Schreibpfade bleiben erhalten. Ein notwendiger Stopp
läuft über die vorhandene Zero-Write-Firewall und darf dort nicht gehalten werden.

## Snapshot und Diagnose

Ein begrenzter JSON-Snapshot enthält Freigabeabsicht, aktuelle Wattwerte, Anzahl
unbekannter geschützter Ladepunkte und einen Zeitstempel. Er wird im bestehenden
Regeltakt veröffentlicht, ohne zusätzlichen Timer oder unbeschränkte Historie.
Bei unvollständigem Tick, abgelaufenem Snapshot oder Wiederanlauf werden alte Wattwerte
verworfen, eine bekannte Schutzanforderung aber konservativ beibehalten. Der nächste
vollständige gültige Snapshot ersetzt sie, einschließlich bewusster Modusänderungen.

Neue beziehungsweise ergänzte Diagnosewerte:

- `chargingManagement.control.storagePolicyJson`
- `chargingManagement.control.storageProtectionRequestedWallboxes`
- `chargingManagement.control.storageProtectedUnknownWallboxes`
- `chargingManagement.wallboxes.<Ladepunkt>.storagePolicyLoadUnknown`
- `speicher.regelung.evcsSpeicherSchutzLastUnbekannt`
- `speicher.regelung.evcsSpeicherSchutzUnbekannteWallboxen`
- vorhandene `evcsSpeicherSchutzAktion` / `evcsSpeicherSchutzJson`

## Prüfgrenzen und Inbetriebnahme

Die automatisierten Tests verwenden simulierte ioBroker-Zustände und Schreibziele,
keine reale Kundenanlage. Vor Kundenfreigabe sind Schützen/Mitnutzen, ein kontrollierter
Telemetrieausfall mit laufender Ladung, Wiederkehr gültiger Werte sowie PV-Übergabe
an Fahrzeug und Speicher zu prüfen. Ein defekter oder unerreichbarer Speicherwriter
kann physische Vorgaben nicht garantieren; vorhandene Geräteschutz-/Watchdogkonzepte
bleiben erforderlich. Die Releasebezeichnung ist keine Hardware-Zertifizierung.

Eine frische Online-Abhängigkeitsinstallation (`npm ci`) scheiterte in der Prüfumgebung
an Registry-/DNS-Fehlern (`EAI_AGAIN`). Build/Tests verwenden lokal vorhandene Werkzeuge:
Node.js 22.16.0, TypeScript 5.8.3, Node-Typen 22.19.7. Der Lockfile verlangt Node-Typen
22.19.21; eine frische Installation genau dieser Entwicklungsabhängigkeiten wird daher
nicht behauptet. Die Produktions- und Entwicklungsabhängigkeiten wurden nicht geändert.
Die npm-Versionsverfügbarkeit prüft weiterhin der bestehende Publish-Guard.

## Testpflege ohne Änderung des Frontends

Zwei ältere Prüfskripte (`evcs-visual-online-state` und `evcs-online-id-depth`)
prüften noch veraltete Funktionssignaturen beziehungsweise Quelltextzeilen. Beide
schlugen auch im unveränderten 1.0.4-Repository fehl. Ihre Erwartungen entsprechen
jetzt dem bereits vorhandenen Online-/OCPP-Vertrag. Die Kachelprüfung führt zusätzlich
die echten Frontend-Hilfsfunktionen für Online, Leerlauf, Störung und veralteten Status
aus. Die produktive Online-Ermittlung und das Wallbox-Frontend wurden nicht geändert.

## Automatisierte Freigabeprüfung

- TypeScript-Build, Typecheck, Runtime-Synchronität und vollständige `test:all`-Kette.
- Neuer Speicherschutztest: 87 Szenariogruppen und 960 deterministische Grenzfälle.
- Vorhandener 1.0.4-Test: 37 Szenariogruppen zur Auto-/PV-/Phasenregelung.
- Zusätzliche 57 Speicher-, EVCS- und PV-Prüfskripte, einschließlich beider aktualisierter Online-Verträge.
- 4.400 Vergleichsfälle gegen die unveränderte 1.0.4-Basis: bestehende Ergebnisfelder
  der normalen Speicherpolicy und der asymmetrischen Leistungsgrenze unverändert.
- Drei untergeordnete Speicher-Writer bytegleich auf Methodenebene. Im Dispatcher
  kommt ausschließlich die E3/DC-IDLE-Auswahl für den neuen Telemetrie-Stopp hinzu.
- Echte Modul-Ticks mit simulierten Lese-/Schreibdatenpunkten für signed/split,
  Sungrow und E3/DC; keine reale Hardware angesteuert.

Paketmanifest, npm-Pakettrockenlauf und abschließende ZIP-Prüfung gehören zur
Freigabe. Die frisch entpackte Repository-ZIP wird erneut gebaut und vollständig
getestet. Build-Zwischenstände und lokale Abhängigkeiten sind nicht Teil der ZIP.
