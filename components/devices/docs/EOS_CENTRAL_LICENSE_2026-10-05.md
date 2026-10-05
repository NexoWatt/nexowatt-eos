# Zentrale EOS-Systemlizenz – Devices

Stand: 05.10.2026, Arbeitsstand auf Basis `4e171e4`, Adapter 0.5.169; keine Veröffentlichung, kein Gerätezugriff. Kennung **DEV-LIC-20261005**. Verantwortlichkeit: EOS-Entwicklung; Hardwareabnahme durch Anlagenbetreiber offen.

## Änderung und Sicherheitsgrenze

Devices startet Geräte ausschließlich innerhalb des verifizierten EOS-Release-/Profilpfads und nach Freigabe des lokal eingebetteten kanonischen Clients aus `components/admin/packages/eos-license-client`. Der einzige Lizenzgeber ist `eos-admin.0`, Feature `energy`, Edition Home oder Pro. Schlüssel, Lizenz-Token und Online-Aktivierung verbleiben zentral; der Adapter erhält nur kurzlebige Entscheidungen. Ein nacktes ioBroker-System und eine fehlende/abgelaufene/abgelehnte Lizenz berechtigen nicht zum Start oder Steuern. Die lokale Messagebox ist keine Isolation gegen kompromittierte Prozesse desselben ioBroker-/OS-Benutzers.

Ohne anfängliche Freigabe bleibt die Administrationsdiagnose verfügbar. Nach zentraler Aktivierung startet die fehlende Geräteinitialisierung automatisch, höchstens einmal gleichzeitig. Lizenzverlust während des Betriebs stoppt keine Anlage pauschal und trennt keine laufende Telemetrie. Die Software verwirft wartende Befehle und Wiederholungen. Nach Wiederfreigabe werden neue Befehle angenommen; alte Sollwerte werden nicht automatisch wieder abgespielt. Geräte müssen ihre vorhandenen eigenen Schutz- und Kommunikationsausfallfunktionen behalten. Ein vor Widerruf bereits übertragener Hardwarebefehl kann nicht zurückgenommen werden.

Geprüfte Grenzen: rohe/Legacy-/v1-Aliasbefehle, vorbereitende Writes, Warteschlangen, Watchdogs, Restore/Keepalive/Wiederholungen, Sungrow-Heartbeat, Modbus TCP/RTU/ASCII (auch nach Buswarteschlangen), MQTT-Publishes einschließlich zyklischer Gruppen, HTTP-, UDP-, CAN- und 1-Wire-Schreibaufrufe sowie TA-CMI-Brückenausgabe. Vor jedem physischen Modbus-/UDP-Dispatch erfolgt eine erneute Prüfung. Ein Widerrufszähler schützt asynchrone Aufträge auch dann, wenn zwischenzeitlich eine neue Freigabe erteilt wurde. Beim regulären Adapter-Unload werden ebenfalls keine neuen Gerätebefehle mehr gesendet; geräteseitige Kommunikationsausfallreaktionen sind daher Teil der noch offenen Anlagenabnahme.

TA CMI liefert nach Lizenzverlust keine alten `toCmi`-Werte als neue Steuerfreigabe aus; betroffene Register/Coils werden bis zu einem frischen Befehl abgelehnt. `fromCmi`-Telemetrie bleibt erhalten. MQTT hält alte Schreibgruppen nach Wiederfreigabe bis zum nächsten ausdrücklichen Befehl gesperrt.

## Mengen und Inventar

Alle `system.adapter.nexowatt-devices.N`-Instanzen werden aus der Objektdatenbank gelesen. Gezählt werden konfigurierte, nicht explizit deaktivierte Geräte, auch bei einer momentan gestoppten Instanz. Klassifikation stammt ausschließlich aus mitgelieferten kanonischen Templates: `evCharger` zählt einen Ladepunkt; `storageSystem`, `battery` und `batteryInverter` zählen je eine Speicherressource. Benutzereigene Kategorieangaben senken diese Zahlen nicht. Unbekannte Templates, doppelte IDs, ungültige Listen, fehlende eigene Instanz oder nicht lesbare Daten verweigern die Freigabe. Mehr als 1000 Instanzen/4096 Geräte pro Instanz sowie Werte oberhalb der maximalen Lizenzgrenzen werden abgelehnt.

Inventarprüfung und zentrale Prüfung werden alle fünf Sekunden erneuert. Objektänderungen sperren sofort; eine Inventarprüfung ist höchstens zehn Sekunden verwendbar. Datenbankabfragen haben zwei Sekunden Entscheidungsfrist; ein noch offener Aufruf wird nicht durch weitere Anfragen vervielfacht. Änderungen an der eigenen laufenden Geräteauswahl verlangen wie bisher einen Konfigurationsneustart; zentrale Lizenzaktivierung allein verlangt keinen Neustart.

**Offener Befund DEV-LIC-01 (P2):** Das vorhandene Datenmodell enthält keine eindeutige physische Anlagenidentität für Kombinationen aus Speicher, Batterie und Wechselrichter. Deshalb werden getrennte konfigurierte Ressourcen konservativ getrennt gezählt, ohne geratenes Zusammenführen. Dies kann eine Freigabe unnötig verweigern. Inventar außerhalb der Devices-Instanzen, insbesondere eigenständige Fremdadapter/OCPP-Geräte, wird durch diese Komponente nicht nachgewiesen. Nächster Schritt: zentrale, explizite physische Ressourcenidentität und adapterübergreifende Zuordnung mit EOS-Betreiber festlegen. Eine vollständige physische Gesamtanlagenzählung wird nicht behauptet.

## Kompatibilität und Herkunft

Keine Änderung der Templates, Registeradressen, Geräteprotokolle, Datenpunktpfade, Einheiten oder bestehenden Geräteschutz-Opt-ins. Bestehende Positivtests erhalten ausdrücklich eine simulierte gültige Lizenz; in Produktcode existiert kein Test-/Konfigurations-Bypass. Es wurden keine fehlenden Gerätetreiber erfunden: alle von `DeviceRuntime` importierten Treiber liegen im aktuellen Arbeitsbaum vor. Die historische Quellenkennzeichnung `selected-files` bleibt als Herkunftsangabe erhalten und ist kein Vollständigkeitsnachweis des ursprünglichen Herstellerarchivs.

## Prüfbeleg

Umgebung: Linux, Node 24.19.0; isolierter Arbeitsbaum ohne angeschlossene Hardware. Quellbindung: [Dateihashes](reports/central-license-20261005/source-sha256.tsv).

| Prüfung | Ergebnis | Rohbeleg |
| --- | --- | --- |
| `node --test test/licenseControl.test.js` | 14 bestanden, 0 Fehler | [Lizenzpfade](reports/central-license-20261005/license-paths.log) |
| `npm test` | 284 Tests, 275 bestanden, 9 übersprungen, 0 Fehler | [Regression](reports/central-license-20261005/regression.log) |
| `npm run verify:release` | bestanden: Syntax, Versionen, 195 Templates, Alias-/Legacy-Verträge | [Paketstruktur](reports/central-license-20261005/release-guard.log) |
| `git diff --check -- components/devices` | bestanden | keine Whitespacefehler |

Die vierzehn Lizenztests führen tatsächliche Methoden aus, mit gemockter EOS-Umgebung und kontrollierten Transporten: fehlender Guard, raw/alias, Widerruf/Wiederfreigabe, alte asynchrone Aufträge, Modbus-Lock und gemeinsame RTU-/ASCII-Buswarteschlangen mit ursprünglichem Auftraggeber, UDP-Socket-Wartezeit, MQTT-Gruppen, CMI-Ausgabe, instanzübergreifendes Inventar, echter kanonischer Antwortvalidator, Erststart-Wiederaufnahme, Single-flight-Datenbanktimeout und Ablauf einer kurzlebigen Lease. Die übrigen neun Transporttests sind wegen hier nicht installierter MQTT-/Modbus-/Axios-Abhängigkeiten ausdrücklich **OFFEN**; keine neue Abhängigkeit wurde installiert. Syntax-/Release-Guard-Erfolg bedeutet keine Anlagen- oder Produktionsfreigabe.

## Passender Hausanlagentest (OFFEN)

1. Vorherige geprüfte EOS-Version und Konfiguration sichern; Rückfall als vollständiger EOS-Releasewechsel vorbereiten. Geräteausfallreaktionen und vorhandene Anlagenlimits vor dem Test prüfen.
2. Ohne gültige zentrale Lizenz starten: keine Geräteinitialisierung/Schreibbefehle; Admin-Diagnose bleibt erreichbar. Zentral Home/Pro aktivieren: Geräte starten innerhalb des Prüfzyklus, ohne gesonderten Lizenzschlüssel.
3. Bestehende Messwerte, Einheiten und Datenpunktnamen vergleichen; einen geeigneten, ungefährlichen freigegebenen Testbefehl über bisherigen Rohpfad und Alias durchführen.
4. Zentrale Lizenz im kontrollierten Test verweigern/ablaufen lassen: keine neuen, verzögerten oder zyklischen Steuerwrites; Telemetrie und physische Geräteschutzfunktionen beobachten. Es darf kein künstlicher pauschaler Stopp gesendet werden. Watchdog-/Timeoutreaktion der konkreten Geräte dokumentieren.
5. Wiederfreigeben: keine Wiederholung alter Aufträge; einen frischen Befehl ausgeben. Bei TA CMI betroffenen Ausgang einzeln neu setzen; bei MQTT frische Schreibgruppe bestätigen.
6. Mehrere Instanzen mit Ladepunkten/Speichern testen: gemeinsame Mengen müssen begrenzen. Unbekannte/inkonsistente Konfiguration muss gesperrt bleiben. Bei Abweichungen auf den gesicherten vollständigen Stand zurückfallen und Geräte-/Firmware-/EOS-Version sowie bereinigte Beobachtung festhalten.

Keine Prüfung an Raspberry Pi, Live-Anlage, installierter EOS-Umgebung oder Hardware wurde ausgeführt. Keine Zertifizierung oder Konformitätsaussage.
