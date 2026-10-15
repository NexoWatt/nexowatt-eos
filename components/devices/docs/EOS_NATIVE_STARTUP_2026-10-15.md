# Passiver EOS-Start ohne native Gerätetreiber

Stand: 15.10.2026. Bezug: EOS-Quellbasis
`71155ef851c791cda380bbaa216ac5178335e466`, Devices 0.5.169,
Arbeitsänderung für den R10-Testkandidaten. Kein eigenständiges neues npm-Release.

## Befund NW-EOS-261015-NATIVE-01

Der native Sechs-Adapterlauf `38685673610` auf Linux x64 erreichte keine frischen
Lebenszeichen aller Adapter (`OWN_NATIVE_ALL_ALIVE_DEADLINE`). Der bisherige
bereinigte Bericht nannte keine betroffene Instanz. Die Modulprüfung mit dem
tatsächlichen R9-Abhängigkeitsbaum reproduziert einen konkreten Startblocker:
`bootstrap.js` installierte den Sungrow-Patch beim Import; außerdem importierte
`main.js` unmittelbar `DeviceRuntime`. Beide Wege laden Modbus/Serialport und
damit die fest auf Linux ARM64/Node 24.21.0 gebundene native Bibliothek, obwohl
noch kein Gerät konfiguriert war. Auf x64 folgt `NATIVE_HOST_CONTRACT`, bevor der
Devices-Adapter seinen Lizenzclient initialisieren kann.

## Änderung und Sicherheitsgrenze

Bootstrap lädt nur den Adapter. Erst im bestehenden autorisierten Gerätestart,
nach Prüfung der Konfiguration und des Templates, wird der idempotente
Sungrow-Patch installiert und `DeviceRuntime` geladen. Installation des Patches
erfolgt weiterhin vor Konstruktion, Objektinitialisierung und `start()`.

Die zentrale Lizenzprüfung, EOS-Plattformzulassung, native Host-/Pfad-/Hashprüfung
und alle Regeltakte bleiben unverändert. Ein leeres System bleibt ausdrücklich
offline hinsichtlich physischer Geräte. Ein abgelehnter nativer Treiber wird
nicht ersetzt oder deaktiviert; das betreffende Gerät startet nicht. Dies macht
die ARM64-Treiber nicht auf x64 nutzbar und ist keine Freigabe für x64-Anlagen.

## Tatsächliche Prüfungen

Umgebung: Linux x64, Node 24.19.0 (nicht die qualifizierte 24.21.0), isolierter
Quellprüfstand ohne physische Ziele.

- 32 Tests bestanden: `node --test components/devices/test/nativeStartup.test.js
  components/devices/test/globalConnection.test.js
  components/devices/test/licenseControl.test.js
  components/devices/test/sungrowFastFeedbackPatch.test.js`.
- Neue Regressionen prüfen Bootstrap ohne Treiberimport, leere Erstinbetriebnahme,
  Lizenz-/Plattformablehnung, Reihenfolge des Sungrow-Patches und weiterhin
  verweigerten Gerätestart bei `NATIVE_HOST_CONTRACT`. Diese Tests verwenden
  Adapter-/Runtime-Stubs und sind keine native Integration.
- Separater Modulimport mit tatsächlich extrahiertem R9-Appbaum und aktuellen
  eigenen Paketdateien: Devices-Bootstrap vor Änderung fehlgeschlagen, nach
  Änderung erfolgreich. Direkter Import von `DeviceRuntime` wird auf dem
  gleichen x64-Host weiterhin mit `NATIVE_HOST_CONTRACT` verweigert.

Der native CI-Lauf mit allen sechs Prozessen, Lizenzwechseln, Backup und Neustart
bleibt bis zum neuen CI-Ergebnis offen. Er wird vom Gesamtfreigabebericht auf
den endgültigen Commit gebunden. Auch ein erfolgreicher x64-Lauf ohne Geräte
belegt weder Pi- noch Feldprotokoll-/Anlagenbetrieb.

## Prüfung auf dem Testgerät

Vor Update gültige Sicherung und den veröffentlichten Rückfallweg bereithalten.
Nach dem signierten Gesamtupdate ohne Geräte überprüfen: Devices bleibt aktiv,
`info.connection` bleibt false, zentrale Lizenzanzeige und Admin-Konfiguration
sind erreichbar. Nach bewusstem Einrichten eines bekannten Geräts echte
Messwerte, Verbindungsabbruch/Wiederkehr und vorhandene Steuerfunktionen prüfen.
Bei Sungrow zusätzlich unveränderte Vorzeichen, Rückmeldung und Pollintervalle
prüfen. Keine Schutzfunktionen oder Anlagenlimits für den Test verändern.

Freigabestatus: Quellkorrektur lokal geprüft; signiertes R10-Paket, nativer
Gesamtlauf, ARM64/Pi, echte Geräte und Reaktionszeiten separat nachzuweisen.
